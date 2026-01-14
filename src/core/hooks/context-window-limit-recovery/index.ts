/**
 * Context Window Limit Recovery Hook
 * Handles automatic recovery from token limit errors via compaction.
 * Includes dynamic context pruning strategies.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "../types";
import type { SessionMessage } from "../../session/types";
import type {
  ParsedTokenLimitError,
  AutoCompactState,
  RetryState,
  TruncateState,
  ContextWindowLimitRecoveryOptions,
  CompactionResult,
  RetryConfig,
  TruncateConfig,
} from "./types";
import { DEFAULT_RETRY_CONFIG, DEFAULT_TRUNCATE_CONFIG } from "./types";
import type { DynamicContextPruningConfig, PruningResult } from "./pruning-types";
import {
  executeDynamicContextPruning,
  applyPruning,
  getPruningStats,
  DEFAULT_PRUNING_CONFIG,
} from "./pruning-executor";
import logger from "../../../shared/logger";

/**
 * Default options
 */
const DEFAULT_OPTIONS: ContextWindowLimitRecoveryOptions = {
  experimental: false,
  dcpForCompaction: false,
  compactionCooldownMs: 1000,
  resumeDelayMs: 500,
  debug: false,
};

/**
 * Create initial auto-compact state
 */
function createAutoCompactState(): AutoCompactState {
  return {
    pendingCompact: new Set(),
    errorDataBySession: new Map(),
    retryStateBySession: new Map(),
    truncateStateBySession: new Map(),
    dcpStateBySession: new Map(),
    emptyContentAttemptBySession: new Map(),
    compactionInProgress: new Set(),
  };
}

/**
 * Global state
 */
const state = createAutoCompactState();

/**
 * Debug logger
 */
function debugLog(options: ContextWindowLimitRecoveryOptions, message: string, ...args: unknown[]): void {
  if (options.debug) {
    logger.debug(`[context-window-limit-recovery] ${message}`, ...args);
  }
}

/**
 * Parse token limit error from various error formats
 */
export function parseTokenLimitError(error: unknown): ParsedTokenLimitError | null {
  const errorMessage = getErrorMessage(error).toLowerCase();

  // Check for token limit keywords
  const isTokenLimitError =
    (errorMessage.includes("token") || errorMessage.includes("context")) &&
    (errorMessage.includes("limit") || errorMessage.includes("exceeded") || errorMessage.includes("overflow"));

  if (!isTokenLimitError) {
    return null;
  }

  // Try to extract token counts from error message
  let currentTokens = 0;
  let maxTokens = 200000; // Default

  // Common patterns: "X tokens" or "X/Y tokens" or "current: X, max: Y"
  const tokenCountMatch = errorMessage.match(/(\d+(?:,\d+)*)\s*(?:\/\s*(\d+(?:,\d+)*))?\s*tokens?/i);
  if (tokenCountMatch) {
    currentTokens = parseInt(tokenCountMatch[1].replace(/,/g, ""), 10);
    if (tokenCountMatch[2]) {
      maxTokens = parseInt(tokenCountMatch[2].replace(/,/g, ""), 10);
    }
  }

  // Try to extract from "exceeds X" pattern
  const exceedsMatch = errorMessage.match(/exceeds?\s*(\d+(?:,\d+)*)/i);
  if (exceedsMatch && !tokenCountMatch) {
    maxTokens = parseInt(exceedsMatch[1].replace(/,/g, ""), 10);
    currentTokens = maxTokens + 1000; // Assume slightly over
  }

  return {
    currentTokens,
    maxTokens,
    errorType: "token_limit_exceeded",
  };
}

/**
 * Get error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (typeof err.message === "string") {
      return err.message;
    }
    if (typeof err.error === "string") {
      return err.error;
    }
  }
  return String(error);
}

/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(retryState: RetryState, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffFactor, retryState.attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Check if session can be compacted
 */
function canCompact(sessionId: string, options: ContextWindowLimitRecoveryOptions): boolean {
  // Already compacting
  if (state.compactionInProgress.has(sessionId)) {
    return false;
  }

  // Check cooldown
  const retryState = state.retryStateBySession.get(sessionId);
  if (retryState) {
    const timeSinceLastAttempt = Date.now() - retryState.lastAttemptTime;
    const cooldown = options.compactionCooldownMs || DEFAULT_OPTIONS.compactionCooldownMs!;
    if (timeSinceLastAttempt < cooldown) {
      return false;
    }
  }

  return true;
}

/**
 * Execute compaction for a session
 */
async function executeCompaction(
  sessionId: string,
  errorData: ParsedTokenLimitError,
  options: ContextWindowLimitRecoveryOptions,
  onSummarize?: (sessionId: string) => Promise<void>
): Promise<CompactionResult> {
  const retryConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...options.retryConfig,
  };

  // Mark as in progress
  state.compactionInProgress.add(sessionId);

  try {
    // Get or create retry state
    let retryState = state.retryStateBySession.get(sessionId);
    if (!retryState) {
      retryState = { attempt: 0, lastAttemptTime: 0 };
      state.retryStateBySession.set(sessionId, retryState);
    }

    // Check max attempts
    if (retryState.attempt >= retryConfig.maxAttempts) {
      debugLog(options, `Max retry attempts reached for session ${sessionId}`);
      return {
        success: false,
        action: "skip",
        error: "Max compaction attempts reached",
      };
    }

    // Increment attempt counter
    retryState.attempt++;
    retryState.lastAttemptTime = Date.now();

    debugLog(options, `Executing compaction for session ${sessionId} (attempt ${retryState.attempt})`);

    // Execute summarization
    if (onSummarize) {
      await onSummarize(sessionId);
    }

    // Success
    debugLog(options, `Compaction successful for session ${sessionId}`);

    return {
      success: true,
      tokensBefore: errorData.currentTokens,
      action: "summarize",
    };
  } catch (error) {
    debugLog(options, `Compaction failed for session ${sessionId}:`, error);

    return {
      success: false,
      action: "error",
      error: getErrorMessage(error),
    };
  } finally {
    state.compactionInProgress.delete(sessionId);
  }
}

/**
 * Clean up session state
 */
function cleanupSession(sessionId: string): void {
  state.pendingCompact.delete(sessionId);
  state.errorDataBySession.delete(sessionId);
  state.retryStateBySession.delete(sessionId);
  state.truncateStateBySession.delete(sessionId);
  state.dcpStateBySession.delete(sessionId);
  state.emptyContentAttemptBySession.delete(sessionId);
  state.compactionInProgress.delete(sessionId);
}

/**
 * Create context window limit recovery hook
 */
export function createContextWindowLimitRecoveryHook(
  options: ContextWindowLimitRecoveryOptions = {},
  callbacks?: {
    onSummarize?: (sessionId: string) => Promise<void>;
    onResume?: (sessionId: string, prompt?: string) => Promise<void>;
  }
): Hook {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  return {
    name: "context-window-limit-recovery",
    description: "Automatically recovers from token limit errors via compaction",
    events: ["session.error", "message.error", "session.idle", "session.deleted"],
    priority: 90, // High priority, but below session-recovery

    async handler(context: HookContext): Promise<HookResult | void> {
      const { sessionId, event, data } = context;

      // Clean up on session delete
      if (event === "session.deleted") {
        cleanupSession(sessionId);
        return;
      }

      // Handle errors
      if (event === "session.error" || event === "message.error") {
        const error = (data as { error?: unknown }).error;
        if (!error) return;

        const parsedError = parseTokenLimitError(error);
        if (!parsedError) return;

        debugLog(mergedOptions, `Token limit error detected for session ${sessionId}`);

        // Store error data
        state.errorDataBySession.set(sessionId, parsedError);
        state.pendingCompact.add(sessionId);

        return { continue: true };
      }

      // Handle idle - trigger pending compactions
      if (event === "session.idle") {
        if (!state.pendingCompact.has(sessionId)) {
          return;
        }

        if (!canCompact(sessionId, mergedOptions)) {
          debugLog(mergedOptions, `Cannot compact session ${sessionId} yet`);
          return;
        }

        const errorData = state.errorDataBySession.get(sessionId);
        if (!errorData) {
          state.pendingCompact.delete(sessionId);
          return;
        }

        debugLog(mergedOptions, `Triggering compaction for session ${sessionId}`);

        const result = await executeCompaction(
          sessionId,
          errorData,
          mergedOptions,
          callbacks?.onSummarize
        );

        if (result.success) {
          // Clear pending state
          state.pendingCompact.delete(sessionId);
          state.errorDataBySession.delete(sessionId);

          // Resume session after delay
          if (callbacks?.onResume) {
            const resumeDelay = mergedOptions.resumeDelayMs || DEFAULT_OPTIONS.resumeDelayMs!;
            setTimeout(() => {
              callbacks.onResume!(sessionId, "Continue from where we left off.");
            }, resumeDelay);
          }

          logger.info(`Session ${sessionId} compacted successfully`);

          return {
            continue: true,
            context: [`Session compacted due to token limit. Resuming...`],
          };
        } else {
          logger.warn(`Session ${sessionId} compaction failed: ${result.error}`);
        }
      }

      return;
    },
  };
}

/**
 * Get pending compaction sessions
 */
export function getPendingCompactions(): string[] {
  return Array.from(state.pendingCompact);
}

/**
 * Get compaction state for session
 */
export function getCompactionState(sessionId: string): {
  pending: boolean;
  errorData?: ParsedTokenLimitError;
  retryState?: RetryState;
  inProgress: boolean;
} {
  return {
    pending: state.pendingCompact.has(sessionId),
    errorData: state.errorDataBySession.get(sessionId),
    retryState: state.retryStateBySession.get(sessionId),
    inProgress: state.compactionInProgress.has(sessionId),
  };
}

/**
 * Reset compaction state (for testing)
 */
export function resetCompactionState(): void {
  state.pendingCompact.clear();
  state.errorDataBySession.clear();
  state.retryStateBySession.clear();
  state.truncateStateBySession.clear();
  state.dcpStateBySession.clear();
  state.emptyContentAttemptBySession.clear();
  state.compactionInProgress.clear();
}

export type { ParsedTokenLimitError, ContextWindowLimitRecoveryOptions, CompactionResult };

// Re-export pruning modules
export {
  executeDynamicContextPruning,
  applyPruning,
  getPruningStats,
  DEFAULT_PRUNING_CONFIG,
} from "./pruning-executor";

export type {
  PruningResult,
  PruningState,
  DynamicContextPruningConfig,
  DeduplicationConfig,
  SupersedeWritesConfig,
  PurgeErrorsConfig,
  TruncateOutputsConfig,
  ToolCallSignature,
  FileOperation,
  ErroredToolCall,
} from "./pruning-types";

export { createToolSignature, executeDeduplication } from "./pruning-deduplication";
export { executeSupersedeWrites } from "./pruning-supersede";
export { executePurgeErrors } from "./pruning-purge-errors";
export { executeTruncateOutputs, truncateOutput, applyTruncation } from "./pruning-truncate";
