/**
 * Phase 4: Stream Monitor
 * Real-time stream metrics tracking for AI responses
 */

import { EventEmitter } from "events";

/**
 * Stream metrics snapshot
 */
export interface StreamMetrics {
  // Timing metrics
  startTime: number;
  endTime?: number;
  elapsedMs: number;
  firstChunkMs?: number;          // Time to first chunk (TTFC)
  avgChunkIntervalMs?: number;    // Average time between chunks

  // Token metrics
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  tokensPerSecond: number;        // Token generation speed

  // Chunk metrics
  chunkCount: number;
  totalChunkBytes: number;
  avgChunkSize: number;
  minChunkSize: number;
  maxChunkSize: number;

  // Status
  status: "streaming" | "completed" | "error" | "cancelled";
  error?: Error;

  // Cost estimation
  estimatedCost?: number;
}

/**
 * Streaming session info
 */
export interface StreamSession {
  id: string;
  provider: string;
  model: string;
  metrics: StreamMetrics;
  createdAt: Date;
}

/**
 * Stream monitor events
 */
export interface StreamMonitorEvents {
  "stream:start": (session: StreamSession) => void;
  "stream:chunk": (session: StreamSession, chunk: string) => void;
  "stream:complete": (session: StreamSession) => void;
  "stream:error": (session: StreamSession, error: Error) => void;
  "metrics:update": (session: StreamSession) => void;
}

/**
 * Pricing per 1M tokens (approximate)
 */
const PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  "claude-opus-4-5": { input: 15, output: 75 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 0.25, output: 1.25 },
  // OpenAI
  "gpt-4o": { input: 5, output: 15 },
  "gpt-4-turbo": { input: 10, output: 30 },
  "o1": { input: 15, output: 60 },
  // Google
  "gemini-3-pro": { input: 1.25, output: 5 },
  "gemini-3-flash": { input: 0.075, output: 0.3 },
  // Local
  "local": { input: 0, output: 0 },
};

/**
 * Stream Monitor class for tracking streaming metrics
 */
export class StreamMonitor extends EventEmitter {
  private sessions: Map<string, StreamSession> = new Map();
  private currentSessionId: string | null = null;
  private chunkTimestamps: number[] = [];

  constructor() {
    super();
  }

  /**
   * Start a new streaming session
   */
  startSession(options: {
    id?: string;
    provider: string;
    model: string;
    promptTokens?: number;
  }): string {
    const id = options.id || this.generateSessionId();
    const now = Date.now();

    const session: StreamSession = {
      id,
      provider: options.provider,
      model: options.model,
      createdAt: new Date(),
      metrics: {
        startTime: now,
        elapsedMs: 0,
        promptTokens: options.promptTokens || 0,
        completionTokens: 0,
        totalTokens: options.promptTokens || 0,
        tokensPerSecond: 0,
        chunkCount: 0,
        totalChunkBytes: 0,
        avgChunkSize: 0,
        minChunkSize: Infinity,
        maxChunkSize: 0,
        status: "streaming",
      },
    };

    this.sessions.set(id, session);
    this.currentSessionId = id;
    this.chunkTimestamps = [now];

    this.emit("stream:start", session);

    return id;
  }

  /**
   * Record a chunk received
   */
  recordChunk(sessionId: string, chunk: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const now = Date.now();
    const chunkSize = chunk.length;

    // Update timing metrics
    session.metrics.elapsedMs = now - session.metrics.startTime;

    // First chunk timing
    if (session.metrics.chunkCount === 0) {
      session.metrics.firstChunkMs = session.metrics.elapsedMs;
    }

    // Track chunk timestamps for interval calculation
    this.chunkTimestamps.push(now);

    // Update chunk metrics
    session.metrics.chunkCount++;
    session.metrics.totalChunkBytes += chunkSize;
    session.metrics.avgChunkSize =
      session.metrics.totalChunkBytes / session.metrics.chunkCount;
    session.metrics.minChunkSize = Math.min(
      session.metrics.minChunkSize === Infinity ? chunkSize : session.metrics.minChunkSize,
      chunkSize
    );
    session.metrics.maxChunkSize = Math.max(session.metrics.maxChunkSize, chunkSize);

    // Estimate tokens (rough: ~4 chars per token)
    const estimatedTokens = Math.ceil(chunkSize / 4);
    session.metrics.completionTokens += estimatedTokens;
    session.metrics.totalTokens =
      session.metrics.promptTokens + session.metrics.completionTokens;

    // Calculate tokens per second
    if (session.metrics.elapsedMs > 0) {
      session.metrics.tokensPerSecond =
        (session.metrics.completionTokens / session.metrics.elapsedMs) * 1000;
    }

    // Calculate average chunk interval
    if (this.chunkTimestamps.length > 1) {
      const intervals: number[] = [];
      for (let i = 1; i < this.chunkTimestamps.length; i++) {
        intervals.push(this.chunkTimestamps[i] - this.chunkTimestamps[i - 1]);
      }
      session.metrics.avgChunkIntervalMs =
        intervals.reduce((a, b) => a + b, 0) / intervals.length;
    }

    // Update cost estimation
    session.metrics.estimatedCost = this.calculateCost(session);

    this.emit("stream:chunk", session, chunk);
    this.emit("metrics:update", session);
  }

  /**
   * Complete a streaming session
   */
  completeSession(
    sessionId: string,
    usage?: { promptTokens: number; completionTokens: number }
  ): StreamMetrics {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const now = Date.now();

    session.metrics.endTime = now;
    session.metrics.elapsedMs = now - session.metrics.startTime;
    session.metrics.status = "completed";

    // Update with actual usage if provided
    if (usage) {
      session.metrics.promptTokens = usage.promptTokens;
      session.metrics.completionTokens = usage.completionTokens;
      session.metrics.totalTokens = usage.promptTokens + usage.completionTokens;

      if (session.metrics.elapsedMs > 0) {
        session.metrics.tokensPerSecond =
          (session.metrics.completionTokens / session.metrics.elapsedMs) * 1000;
      }
    }

    // Final cost calculation
    session.metrics.estimatedCost = this.calculateCost(session);

    this.emit("stream:complete", session);
    this.emit("metrics:update", session);

    // Cleanup
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
    this.chunkTimestamps = [];

    return session.metrics;
  }

  /**
   * Mark session as error
   */
  errorSession(sessionId: string, error: Error): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.metrics.endTime = Date.now();
    session.metrics.elapsedMs = session.metrics.endTime - session.metrics.startTime;
    session.metrics.status = "error";
    session.metrics.error = error;

    this.emit("stream:error", session, error);
    this.emit("metrics:update", session);

    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
  }

  /**
   * Cancel a streaming session
   */
  cancelSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.metrics.endTime = Date.now();
    session.metrics.elapsedMs = session.metrics.endTime - session.metrics.startTime;
    session.metrics.status = "cancelled";

    this.emit("metrics:update", session);

    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
  }

  /**
   * Get current session metrics
   */
  getCurrentMetrics(): StreamMetrics | null {
    if (!this.currentSessionId) return null;
    const session = this.sessions.get(this.currentSessionId);
    return session?.metrics || null;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): StreamSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): StreamSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get recent sessions
   */
  getRecentSessions(limit: number = 10): StreamSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Calculate aggregate stats across all sessions
   */
  getAggregateStats(): {
    totalSessions: number;
    completedSessions: number;
    errorSessions: number;
    totalTokens: number;
    totalCost: number;
    avgTokensPerSecond: number;
    avgFirstChunkMs: number;
  } {
    const sessions = Array.from(this.sessions.values());

    const completed = sessions.filter((s) => s.metrics.status === "completed");
    const errors = sessions.filter((s) => s.metrics.status === "error");

    const totalTokens = sessions.reduce((sum, s) => sum + s.metrics.totalTokens, 0);
    const totalCost = sessions.reduce(
      (sum, s) => sum + (s.metrics.estimatedCost || 0),
      0
    );

    const avgTokensPerSecond =
      completed.length > 0
        ? completed.reduce((sum, s) => sum + s.metrics.tokensPerSecond, 0) /
          completed.length
        : 0;

    const sessionsWithTTFC = completed.filter((s) => s.metrics.firstChunkMs !== undefined);
    const avgFirstChunkMs =
      sessionsWithTTFC.length > 0
        ? sessionsWithTTFC.reduce((sum, s) => sum + (s.metrics.firstChunkMs || 0), 0) /
          sessionsWithTTFC.length
        : 0;

    return {
      totalSessions: sessions.length,
      completedSessions: completed.length,
      errorSessions: errors.length,
      totalTokens,
      totalCost,
      avgTokensPerSecond,
      avgFirstChunkMs,
    };
  }

  /**
   * Clear all sessions
   */
  clearSessions(): void {
    this.sessions.clear();
    this.currentSessionId = null;
    this.chunkTimestamps = [];
  }

  /**
   * Calculate estimated cost for a session
   */
  private calculateCost(session: StreamSession): number {
    const modelKey = this.normalizeModelName(session.model);
    const pricing = PRICING[modelKey] || PRICING["local"];

    const inputCost = (session.metrics.promptTokens / 1_000_000) * pricing.input;
    const outputCost = (session.metrics.completionTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * Normalize model name for pricing lookup
   */
  private normalizeModelName(model: string): string {
    const lower = model.toLowerCase();

    if (lower.includes("opus")) return "claude-opus-4-5";
    if (lower.includes("sonnet")) return "claude-sonnet-4-5";
    if (lower.includes("haiku")) return "claude-haiku-4-5";
    if (lower.includes("gpt-4o")) return "gpt-4o";
    if (lower.includes("gpt-4-turbo")) return "gpt-4-turbo";
    if (lower.includes("o1")) return "o1";
    if (lower.includes("gemini") && lower.includes("pro")) return "gemini-3-pro";
    if (lower.includes("gemini") && lower.includes("flash")) return "gemini-3-flash";

    return "local";
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Format metrics for display
 */
export function formatStreamMetrics(metrics: StreamMetrics): {
  duration: string;
  speed: string;
  tokens: string;
  cost: string;
  ttfc: string;
} {
  const duration =
    metrics.elapsedMs >= 1000
      ? `${(metrics.elapsedMs / 1000).toFixed(1)}s`
      : `${metrics.elapsedMs}ms`;

  const speed = `${metrics.tokensPerSecond.toFixed(1)} tok/s`;

  const tokens = `${metrics.completionTokens.toLocaleString()} tokens`;

  const cost =
    metrics.estimatedCost !== undefined
      ? `$${metrics.estimatedCost.toFixed(4)}`
      : "-";

  const ttfc =
    metrics.firstChunkMs !== undefined ? `${metrics.firstChunkMs}ms` : "-";

  return { duration, speed, tokens, cost, ttfc };
}

/**
 * Singleton instance
 */
let streamMonitorInstance: StreamMonitor | null = null;

/**
 * Get the global stream monitor instance
 */
export function getStreamMonitor(): StreamMonitor {
  if (!streamMonitorInstance) {
    streamMonitorInstance = new StreamMonitor();
  }
  return streamMonitorInstance;
}

/**
 * Reset the global stream monitor instance
 */
export function resetStreamMonitor(): void {
  if (streamMonitorInstance) {
    streamMonitorInstance.clearSessions();
  }
  streamMonitorInstance = null;
}
