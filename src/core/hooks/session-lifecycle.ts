/**
 * Session Lifecycle Hook
 * Manages session lifecycle events and cleanup.
 * Adapted from Oh-My-OpenCode patterns for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "./types";
import logger from "../../shared/logger";

/**
 * Session state
 */
export interface SessionState {
  /** Session ID */
  sessionId: string;
  /** Session start time */
  startTime: number;
  /** Last activity time */
  lastActivityTime: number;
  /** Session status */
  status: "active" | "idle" | "compacting" | "ended";
  /** Message count */
  messageCount: number;
  /** Tool call count */
  toolCallCount: number;
  /** Error count */
  errorCount: number;
  /** Custom metadata */
  metadata: Record<string, unknown>;
}

/**
 * Session lifecycle options
 */
export interface SessionLifecycleOptions {
  /** Idle timeout in ms (after which session is marked idle) */
  idleTimeoutMs?: number;
  /** Session timeout in ms (after which session is ended) */
  sessionTimeoutMs?: number;
  /** Enable auto-cleanup of old sessions */
  autoCleanup?: boolean;
  /** Cleanup interval in ms */
  cleanupIntervalMs?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: SessionLifecycleOptions = {
  idleTimeoutMs: 300000, // 5 minutes
  sessionTimeoutMs: 3600000, // 1 hour
  autoCleanup: true,
  cleanupIntervalMs: 60000, // 1 minute
  debug: false,
};

/**
 * Session states storage
 */
const sessions = new Map<string, SessionState>();

/**
 * Cleanup timer
 */
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Get or create session state
 */
function getOrCreateSession(sessionId: string): SessionState {
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      startTime: Date.now(),
      lastActivityTime: Date.now(),
      status: "active",
      messageCount: 0,
      toolCallCount: 0,
      errorCount: 0,
      metadata: {},
    };
    sessions.set(sessionId, session);
  }
  return session;
}

/**
 * Update session activity
 */
function updateActivity(session: SessionState): void {
  session.lastActivityTime = Date.now();
  if (session.status === "idle") {
    session.status = "active";
  }
}

/**
 * Cleanup old sessions
 */
function cleanupSessions(timeoutMs: number): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [sessionId, session] of sessions.entries()) {
    if (session.status === "ended") {
      sessions.delete(sessionId);
      cleaned++;
      continue;
    }

    if (now - session.lastActivityTime > timeoutMs) {
      session.status = "ended";
      sessions.delete(sessionId);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Start cleanup timer
 */
function startCleanupTimer(options: Required<SessionLifecycleOptions>): void {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const cleaned = cleanupSessions(options.sessionTimeoutMs);
    if (cleaned > 0 && options.debug) {
      logger.debug(`[session-lifecycle] Cleaned up ${cleaned} expired sessions`);
    }
  }, options.cleanupIntervalMs);
}

/**
 * Stop cleanup timer
 */
function stopCleanupTimer(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * Create session lifecycle hook
 */
export function createSessionLifecycleHook(
  options: SessionLifecycleOptions = {},
  callbacks?: {
    onSessionStart?: (sessionId: string) => void;
    onSessionEnd?: (sessionId: string, state: SessionState) => void;
    onSessionIdle?: (sessionId: string) => void;
  }
): Hook {
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  } as Required<SessionLifecycleOptions>;

  // Start cleanup timer if enabled
  if (mergedOptions.autoCleanup) {
    startCleanupTimer(mergedOptions);
  }

  return {
    name: "session-lifecycle",
    description: "Manages session lifecycle events",
    events: [
      "session.start",
      "session.end",
      "session.idle",
      "session.deleted",
      "message.before",
      "message.after",
      "tool.before",
      "tool.after",
      "tool.error",
      "session.error",
    ],
    priority: 99, // Very high priority

    async handler(context: HookContext): Promise<HookResult | void> {
      const { sessionId, event, data } = context;

      if (event === "session.start") {
        const session = getOrCreateSession(sessionId);
        session.status = "active";

        if (mergedOptions.debug) {
          logger.debug(`[session-lifecycle] Session started: ${sessionId}`);
        }

        callbacks?.onSessionStart?.(sessionId);

        return;
      }

      if (event === "session.end" || event === "session.deleted") {
        const session = sessions.get(sessionId);
        if (session) {
          session.status = "ended";

          if (mergedOptions.debug) {
            const duration = Date.now() - session.startTime;
            logger.debug(
              `[session-lifecycle] Session ended: ${sessionId} ` +
              `(duration: ${Math.round(duration / 1000)}s, ` +
              `messages: ${session.messageCount}, ` +
              `tools: ${session.toolCallCount})`
            );
          }

          callbacks?.onSessionEnd?.(sessionId, session);
          sessions.delete(sessionId);
        }

        return;
      }

      if (event === "session.idle") {
        const session = sessions.get(sessionId);
        if (session) {
          session.status = "idle";
          callbacks?.onSessionIdle?.(sessionId);
        }

        return;
      }

      // Track activity
      const session = getOrCreateSession(sessionId);
      updateActivity(session);

      if (event === "message.before" || event === "message.after") {
        if (event === "message.after") {
          session.messageCount++;
        }
        return;
      }

      if (event === "tool.before" || event === "tool.after") {
        if (event === "tool.after") {
          session.toolCallCount++;
        }
        return;
      }

      if (event === "tool.error" || event === "session.error") {
        session.errorCount++;
        return;
      }

      return;
    },
  };
}

/**
 * Get session state
 */
export function getSessionState(sessionId: string): SessionState | undefined {
  return sessions.get(sessionId);
}

/**
 * Get all sessions
 */
export function getAllSessions(): Map<string, SessionState> {
  return new Map(sessions);
}

/**
 * Get active session count
 */
export function getActiveSessionCount(): number {
  return Array.from(sessions.values()).filter(
    (s) => s.status === "active" || s.status === "idle"
  ).length;
}

/**
 * Set session metadata
 */
export function setSessionMetadata(
  sessionId: string,
  key: string,
  value: unknown
): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.metadata[key] = value;
  }
}

/**
 * Get session metadata
 */
export function getSessionMetadata(
  sessionId: string,
  key: string
): unknown | undefined {
  return sessions.get(sessionId)?.metadata[key];
}

/**
 * Cleanup and stop lifecycle management
 */
export function cleanup(): void {
  stopCleanupTimer();
  sessions.clear();
}

export type { SessionLifecycleOptions, SessionState };
