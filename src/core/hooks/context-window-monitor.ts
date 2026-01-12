/**
 * Context Window Monitor Hook
 * Monitors context window usage and displays warnings when approaching limits.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "./types";
import logger from "../../shared/logger";

/**
 * Context window monitor options
 */
export interface ContextWindowMonitorOptions {
  /** Default token limit */
  defaultLimit?: number;
  /** Experimental extended limit */
  experimentalLimit?: number;
  /** Warning threshold (0-1) */
  warningThreshold?: number;
  /** Critical threshold (0-1) */
  criticalThreshold?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: ContextWindowMonitorOptions = {
  defaultLimit: 200_000,
  experimentalLimit: 1_000_000,
  warningThreshold: 0.7,
  criticalThreshold: 0.9,
  debug: false,
};

/**
 * Sessions that have been reminded
 */
const remindedSessions = new Map<string, "warning" | "critical">();

/**
 * Calculate token usage ratio
 */
function calculateUsageRatio(currentTokens: number, maxTokens: number): number {
  if (maxTokens <= 0) return 0;
  return currentTokens / maxTokens;
}

/**
 * Format token count for display
 */
function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return String(tokens);
}

/**
 * Create context window monitor hook
 */
export function createContextWindowMonitorHook(
  options: ContextWindowMonitorOptions = {}
): Hook {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  return {
    name: "context-window-monitor",
    description: "Monitors context window usage and warns when approaching limits",
    events: ["tool.after", "message.after", "session.deleted"],
    priority: 50,

    async handler(context: HookContext): Promise<HookResult | void> {
      const { sessionId, event, data } = context;

      // Clean up on session delete
      if (event === "session.deleted") {
        remindedSessions.delete(sessionId);
        return;
      }

      // Extract token usage from data
      const tokenData = data as {
        currentTokens?: number;
        maxTokens?: number;
        usage?: {
          inputTokens?: number;
          outputTokens?: number;
          totalTokens?: number;
        };
      };

      let currentTokens = tokenData.currentTokens;
      let maxTokens = tokenData.maxTokens || mergedOptions.defaultLimit!;

      // Try to get from usage if not directly available
      if (currentTokens === undefined && tokenData.usage) {
        currentTokens = tokenData.usage.totalTokens ||
          (tokenData.usage.inputTokens || 0) + (tokenData.usage.outputTokens || 0);
      }

      if (currentTokens === undefined) {
        return; // No token data available
      }

      const ratio = calculateUsageRatio(currentTokens, maxTokens);
      const warningThreshold = mergedOptions.warningThreshold!;
      const criticalThreshold = mergedOptions.criticalThreshold!;

      // Check current reminder state
      const currentReminder = remindedSessions.get(sessionId);

      // Critical threshold
      if (ratio >= criticalThreshold && currentReminder !== "critical") {
        remindedSessions.set(sessionId, "critical");

        const message = `⚠️ CRITICAL: Context window at ${(ratio * 100).toFixed(1)}% ` +
          `(${formatTokenCount(currentTokens)}/${formatTokenCount(maxTokens)} tokens). ` +
          `Session compaction recommended.`;

        logger.warn(message);

        if (mergedOptions.debug) {
          logger.debug(`[context-window-monitor] ${message}`);
        }

        return {
          continue: true,
          context: [message],
        };
      }

      // Warning threshold
      if (ratio >= warningThreshold && currentReminder !== "warning" && currentReminder !== "critical") {
        remindedSessions.set(sessionId, "warning");

        const message = `⚡ Context window at ${(ratio * 100).toFixed(1)}% ` +
          `(${formatTokenCount(currentTokens)}/${formatTokenCount(maxTokens)} tokens). ` +
          `Consider summarizing or starting a new session.`;

        logger.info(message);

        if (mergedOptions.debug) {
          logger.debug(`[context-window-monitor] ${message}`);
        }

        return {
          continue: true,
          context: [message],
        };
      }

      return;
    },
  };
}

/**
 * Get current usage status for a session
 */
export function getUsageStatus(
  sessionId: string
): "normal" | "warning" | "critical" | undefined {
  return remindedSessions.get(sessionId) || "normal";
}

/**
 * Reset usage status for a session
 */
export function resetUsageStatus(sessionId: string): void {
  remindedSessions.delete(sessionId);
}

/**
 * Clear all usage statuses
 */
export function clearAllUsageStatus(): void {
  remindedSessions.clear();
}

export type { ContextWindowMonitorOptions };
