/**
 * Preemptive Compaction Hook
 * Proactively triggers compaction before hitting token limits.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "../types";
import logger from "../../../shared/logger";

/**
 * Preemptive compaction options
 */
export interface PreemptiveCompactionOptions {
  /** Token threshold ratio to trigger compaction (0-1) */
  thresholdRatio?: number;
  /** Minimum tokens before considering compaction */
  minTokensForCompaction?: number;
  /** Cooldown between compaction attempts in ms */
  cooldownMs?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: PreemptiveCompactionOptions = {
  thresholdRatio: 0.85,
  minTokensForCompaction: 100000,
  cooldownMs: 60000,
  debug: false,
};

/**
 * Session compaction state
 */
interface CompactionState {
  lastCompactionTime: number;
  tokenCountAtLastCheck: number;
  compactionTriggered: boolean;
}

/**
 * State storage
 */
const stateMap = new Map<string, CompactionState>();

/**
 * Get or create state for session
 */
function getState(sessionId: string): CompactionState {
  let state = stateMap.get(sessionId);
  if (!state) {
    state = {
      lastCompactionTime: 0,
      tokenCountAtLastCheck: 0,
      compactionTriggered: false,
    };
    stateMap.set(sessionId, state);
  }
  return state;
}

/**
 * Check if compaction should be triggered
 */
function shouldTriggerCompaction(
  state: CompactionState,
  currentTokens: number,
  maxTokens: number,
  options: Required<PreemptiveCompactionOptions>
): boolean {
  // Check minimum tokens
  if (currentTokens < options.minTokensForCompaction) {
    return false;
  }

  // Check cooldown
  const timeSinceLastCompaction = Date.now() - state.lastCompactionTime;
  if (timeSinceLastCompaction < options.cooldownMs) {
    return false;
  }

  // Check threshold
  const ratio = currentTokens / maxTokens;
  if (ratio < options.thresholdRatio) {
    return false;
  }

  // Already triggered for this token count range
  if (
    state.compactionTriggered &&
    Math.abs(currentTokens - state.tokenCountAtLastCheck) < 10000
  ) {
    return false;
  }

  return true;
}

/**
 * Create preemptive compaction hook
 */
export function createPreemptiveCompactionHook(
  options: PreemptiveCompactionOptions = {},
  callbacks?: {
    onCompact?: (sessionId: string) => Promise<void>;
  }
): Hook {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options } as Required<PreemptiveCompactionOptions>;

  return {
    name: "preemptive-compaction",
    description: "Proactively triggers compaction before hitting token limits",
    events: ["message.after", "tool.after", "session.deleted"],
    priority: 60,

    async handler(context: HookContext): Promise<HookResult | void> {
      const { sessionId, event, data } = context;

      // Clean up on session delete
      if (event === "session.deleted") {
        stateMap.delete(sessionId);
        return;
      }

      if (!data) return;

      const tokenData = data as {
        currentTokens?: number;
        maxTokens?: number;
        usage?: {
          inputTokens?: number;
          outputTokens?: number;
          totalTokens?: number;
        };
      };

      // Extract token counts
      let currentTokens = tokenData.currentTokens;
      let maxTokens = tokenData.maxTokens || 200000;

      if (currentTokens === undefined && tokenData.usage) {
        currentTokens = tokenData.usage.totalTokens ||
          (tokenData.usage.inputTokens || 0) + (tokenData.usage.outputTokens || 0);
      }

      if (currentTokens === undefined) {
        return;
      }

      const state = getState(sessionId);

      // Check if compaction should be triggered
      if (!shouldTriggerCompaction(state, currentTokens, maxTokens, mergedOptions)) {
        return;
      }

      if (mergedOptions.debug) {
        const ratio = ((currentTokens / maxTokens) * 100).toFixed(1);
        logger.debug(
          `[preemptive-compaction] Triggering compaction for session ${sessionId} ` +
          `(${ratio}% usage, ${currentTokens}/${maxTokens} tokens)`
        );
      }

      // Update state
      state.lastCompactionTime = Date.now();
      state.tokenCountAtLastCheck = currentTokens;
      state.compactionTriggered = true;

      // Trigger compaction callback
      if (callbacks?.onCompact) {
        try {
          await callbacks.onCompact(sessionId);
          logger.info(
            `[preemptive-compaction] Compaction triggered for session ${sessionId}`
          );
        } catch (error) {
          logger.error(
            `[preemptive-compaction] Compaction failed for session ${sessionId}:`,
            error
          );
        }
      }

      const ratio = ((currentTokens / maxTokens) * 100).toFixed(1);
      return {
        continue: true,
        context: [
          `📦 Context at ${ratio}% capacity. Compacting to preserve recent context...`,
        ],
      };
    },
  };
}

/**
 * Get compaction state for session
 */
export function getCompactionState(sessionId: string): CompactionState | undefined {
  return stateMap.get(sessionId);
}

/**
 * Reset compaction state
 */
export function resetCompactionState(sessionId?: string): void {
  if (sessionId) {
    stateMap.delete(sessionId);
  } else {
    stateMap.clear();
  }
}

export type { PreemptiveCompactionOptions };
