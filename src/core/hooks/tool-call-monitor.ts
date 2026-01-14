/**
 * Tool Call Monitor Hook
 * Monitors and logs tool execution for debugging and analysis.
 * Adapted from Oh-My-OpenCode patterns for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "./types";
import logger from "../../shared/logger";

/**
 * Tool call statistics
 */
export interface ToolCallStats {
  /** Tool name */
  toolName: string;
  /** Number of calls */
  callCount: number;
  /** Number of successful calls */
  successCount: number;
  /** Number of failed calls */
  errorCount: number;
  /** Total execution time in ms */
  totalDurationMs: number;
  /** Average execution time in ms */
  avgDurationMs: number;
  /** Last call timestamp */
  lastCallTime: number;
}

/**
 * Session tool stats
 */
export interface SessionToolStats {
  /** Session ID */
  sessionId: string;
  /** Total tool calls */
  totalCalls: number;
  /** Total errors */
  totalErrors: number;
  /** Stats by tool */
  byTool: Map<string, ToolCallStats>;
  /** Session start time */
  startTime: number;
}

/**
 * Tool call monitor options
 */
export interface ToolCallMonitorOptions {
  /** Log each tool call */
  logCalls?: boolean;
  /** Log tool errors */
  logErrors?: boolean;
  /** Warn on slow tools (ms threshold) */
  slowToolThresholdMs?: number;
  /** Track stats */
  trackStats?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: ToolCallMonitorOptions = {
  logCalls: false,
  logErrors: true,
  slowToolThresholdMs: 5000,
  trackStats: true,
  debug: false,
};

/**
 * Active tool calls (for duration tracking)
 */
const activeToolCalls = new Map<string, { toolName: string; startTime: number }>();

/**
 * Session stats storage
 */
const sessionStats = new Map<string, SessionToolStats>();

/**
 * Get or create session stats
 */
function getSessionStats(sessionId: string): SessionToolStats {
  let stats = sessionStats.get(sessionId);
  if (!stats) {
    stats = {
      sessionId,
      totalCalls: 0,
      totalErrors: 0,
      byTool: new Map(),
      startTime: Date.now(),
    };
    sessionStats.set(sessionId, stats);
  }
  return stats;
}

/**
 * Get or create tool stats
 */
function getToolStatsForSession(sessionStats: SessionToolStats, toolName: string): ToolCallStats {
  let stats = sessionStats.byTool.get(toolName);
  if (!stats) {
    stats = {
      toolName,
      callCount: 0,
      successCount: 0,
      errorCount: 0,
      totalDurationMs: 0,
      avgDurationMs: 0,
      lastCallTime: 0,
    };
    sessionStats.byTool.set(toolName, stats);
  }
  return stats;
}

/**
 * Generate call ID for tracking
 */
function generateCallId(sessionId: string, toolName: string): string {
  return `${sessionId}:${toolName}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create tool call monitor hook
 */
export function createToolCallMonitorHook(
  options: ToolCallMonitorOptions = {}
): Hook {
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  } as Required<ToolCallMonitorOptions>;

  return {
    name: "tool-call-monitor",
    description: "Monitors tool execution for debugging and analysis",
    events: ["tool.before", "tool.after", "tool.error", "session.deleted"],
    priority: 100, // Highest priority to capture all events

    async handler(context: HookContext): Promise<HookResult | void> {
      const { sessionId, event, data } = context;

      // Clean up on session delete
      if (event === "session.deleted") {
        sessionStats.delete(sessionId);
        // Clean up any active calls for this session
        for (const key of activeToolCalls.keys()) {
          if (key.startsWith(`${sessionId}:`)) {
            activeToolCalls.delete(key);
          }
        }
        return;
      }

      if (!data) return;

      const toolData = data as {
        toolName?: string;
        args?: unknown;
        result?: unknown;
        error?: unknown;
        callId?: string;
      };

      const toolName = toolData.toolName || "unknown";

      if (event === "tool.before") {
        const callId = toolData.callId || generateCallId(sessionId, toolName);

        // Track start time
        activeToolCalls.set(callId, {
          toolName,
          startTime: Date.now(),
        });

        // Update stats
        if (mergedOptions.trackStats) {
          const stats = getSessionStats(sessionId);
          stats.totalCalls++;
          const toolStats = getToolStatsForSession(stats, toolName);
          toolStats.callCount++;
          toolStats.lastCallTime = Date.now();
        }

        if (mergedOptions.logCalls) {
          logger.info(
            `[tool-call-monitor] Tool call started: ${toolName}`,
            { sessionId, callId }
          );
        }

        // Return call ID for tracking
        return {
          continue: true,
          modified: {
            ...toolData,
            _callId: callId,
          },
        };
      }

      if (event === "tool.after") {
        const callId = toolData.callId;
        let durationMs = 0;

        if (callId) {
          const activeCall = activeToolCalls.get(callId);
          if (activeCall) {
            durationMs = Date.now() - activeCall.startTime;
            activeToolCalls.delete(callId);
          }
        }

        // Update stats
        if (mergedOptions.trackStats) {
          const stats = getSessionStats(sessionId);
          const toolStats = getToolStatsForSession(stats, toolName);
          toolStats.successCount++;
          toolStats.totalDurationMs += durationMs;
          toolStats.avgDurationMs =
            toolStats.totalDurationMs / toolStats.successCount;
        }

        // Warn on slow tools
        if (durationMs > mergedOptions.slowToolThresholdMs) {
          logger.warn(
            `[tool-call-monitor] Slow tool execution: ${toolName} took ${durationMs}ms`
          );
        }

        if (mergedOptions.debug) {
          logger.debug(
            `[tool-call-monitor] Tool completed: ${toolName} (${durationMs}ms)`
          );
        }

        return;
      }

      if (event === "tool.error") {
        const callId = toolData.callId;

        if (callId) {
          activeToolCalls.delete(callId);
        }

        // Update stats
        if (mergedOptions.trackStats) {
          const stats = getSessionStats(sessionId);
          stats.totalErrors++;
          const toolStats = getToolStatsForSession(stats, toolName);
          toolStats.errorCount++;
        }

        if (mergedOptions.logErrors) {
          const errorMessage =
            toolData.error instanceof Error
              ? toolData.error.message
              : String(toolData.error);
          logger.error(
            `[tool-call-monitor] Tool error: ${toolName} - ${errorMessage}`
          );
        }

        return;
      }

      return;
    },
  };
}

/**
 * Get stats for a session
 */
export function getToolStats(sessionId: string): SessionToolStats | undefined {
  return sessionStats.get(sessionId);
}

/**
 * Get all session stats
 */
export function getAllToolStats(): Map<string, SessionToolStats> {
  return new Map(sessionStats);
}

/**
 * Clear stats for a session
 */
export function clearToolStats(sessionId?: string): void {
  if (sessionId) {
    sessionStats.delete(sessionId);
  } else {
    sessionStats.clear();
  }
}

/**
 * Get summary stats
 */
export function getToolStatsSummary(sessionId: string): {
  totalCalls: number;
  totalErrors: number;
  errorRate: number;
  topTools: Array<{ name: string; calls: number; avgMs: number }>;
} | null {
  const stats = sessionStats.get(sessionId);
  if (!stats) return null;

  const topTools = Array.from(stats.byTool.values())
    .sort((a, b) => b.callCount - a.callCount)
    .slice(0, 10)
    .map((t) => ({
      name: t.toolName,
      calls: t.callCount,
      avgMs: Math.round(t.avgDurationMs),
    }));

  return {
    totalCalls: stats.totalCalls,
    totalErrors: stats.totalErrors,
    errorRate: stats.totalCalls > 0 ? stats.totalErrors / stats.totalCalls : 0,
    topTools,
  };
}

