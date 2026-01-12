/**
 * Preemptive Compaction Hook
 * Proactively triggers compaction before hitting token limits.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "../types";
import type {
  PreemptiveCompactionState,
  PreemptiveCompactionOptions,
  TokenInfo,
  SummarizeContext,
  GetModelLimitCallback,
  BeforeSummarizeCallback,
  OnCompactCallback,
  OnResumeCallback,
} from "./types";
import {
  DEFAULT_THRESHOLD,
  MIN_TOKENS_FOR_COMPACTION,
  COMPACTION_COOLDOWN_MS,
  RESUME_DELAY_MS,
  CLAUDE_DEFAULT_CONTEXT_LIMIT,
  CLAUDE_EXTENDED_CONTEXT_LIMIT,
  CLAUDE_MODEL_PATTERN,
} from "./constants";
import logger from "../../../shared/logger";

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<PreemptiveCompactionOptions> = {
  thresholdRatio: DEFAULT_THRESHOLD,
  minTokensForCompaction: MIN_TOKENS_FOR_COMPACTION,
  cooldownMs: COMPACTION_COOLDOWN_MS,
  resumeDelayMs: RESUME_DELAY_MS,
  extendedContext: false,
  debug: false,
};

/**
 * Create initial state
 */
function createState(): PreemptiveCompactionState {
  return {
    lastCompactionTime: new Map(),
    compactionInProgress: new Set(),
    tokenCountAtLastCheck: new Map(),
    compactionTriggered: new Map(),
  };
}

/**
 * Global state
 */
const state = createState();

/**
 * Check if model is supported for preemptive compaction
 */
export function isSupportedModel(modelId: string): boolean {
  return CLAUDE_MODEL_PATTERN.test(modelId);
}

/**
 * Get context limit for a model
 */
export function getContextLimit(
  providerId: string,
  modelId: string,
  options: Required<PreemptiveCompactionOptions>,
  getModelLimit?: GetModelLimitCallback
): number {
  // Check callback first
  const customLimit = getModelLimit?.(providerId, modelId);
  if (customLimit !== undefined) {
    return customLimit;
  }

  // Check for extended context via env vars (backward compatibility)
  const extendedContextEnabled =
    options.extendedContext ||
    process.env.ANTHROPIC_1M_CONTEXT === "true" ||
    process.env.VERTEX_ANTHROPIC_1M_CONTEXT === "true";

  if (extendedContextEnabled) {
    return CLAUDE_EXTENDED_CONTEXT_LIMIT;
  }

  return CLAUDE_DEFAULT_CONTEXT_LIMIT;
}

/**
 * Extract token info from various data formats
 */
export function extractTokenInfo(data: unknown): {
  currentTokens: number;
  tokenInfo?: Partial<TokenInfo>;
} | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const d = data as Record<string, unknown>;

  // Direct token count
  if (typeof d.currentTokens === "number") {
    return { currentTokens: d.currentTokens };
  }

  // Usage object
  if (d.usage && typeof d.usage === "object") {
    const usage = d.usage as Record<string, unknown>;
    const input = (usage.inputTokens as number) || (usage.input as number) || 0;
    const output = (usage.outputTokens as number) || (usage.output as number) || 0;
    const reasoning = (usage.reasoningTokens as number) || (usage.reasoning as number) || 0;
    const cacheRead = (usage.cacheReadTokens as number) || 0;
    const cacheWrite = (usage.cacheWriteTokens as number) || 0;

    // Calculate total including cache
    const currentTokens = input + output + cacheRead;

    return {
      currentTokens,
      tokenInfo: {
        input,
        output,
        reasoning,
        cache: { read: cacheRead, write: cacheWrite },
      },
    };
  }

  // Tokens object (similar to oh-my-opencode format)
  if (d.tokens && typeof d.tokens === "object") {
    const tokens = d.tokens as Record<string, unknown>;
    const input = (tokens.input as number) || 0;
    const output = (tokens.output as number) || 0;
    const reasoning = (tokens.reasoning as number) || 0;

    let cacheRead = 0;
    let cacheWrite = 0;
    if (tokens.cache && typeof tokens.cache === "object") {
      const cache = tokens.cache as Record<string, unknown>;
      cacheRead = (cache.read as number) || 0;
      cacheWrite = (cache.write as number) || 0;
    }

    const currentTokens = input + output + cacheRead;

    return {
      currentTokens,
      tokenInfo: {
        input,
        output,
        reasoning,
        cache: { read: cacheRead, write: cacheWrite },
      },
    };
  }

  return null;
}

/**
 * Check if compaction should be triggered
 */
function shouldTriggerCompaction(
  sessionId: string,
  currentTokens: number,
  maxTokens: number,
  options: Required<PreemptiveCompactionOptions>
): boolean {
  // Check minimum tokens
  if (currentTokens < options.minTokensForCompaction) {
    return false;
  }

  // Check if already in progress
  if (state.compactionInProgress.has(sessionId)) {
    return false;
  }

  // Check cooldown
  const lastCompaction = state.lastCompactionTime.get(sessionId) ?? 0;
  if (Date.now() - lastCompaction < options.cooldownMs) {
    return false;
  }

  // Check threshold
  const ratio = currentTokens / maxTokens;
  if (ratio < options.thresholdRatio) {
    return false;
  }

  // Already triggered for this token count range (within 10k)
  const lastTokenCount = state.tokenCountAtLastCheck.get(sessionId) ?? 0;
  const wasTriggered = state.compactionTriggered.get(sessionId) ?? false;
  if (wasTriggered && Math.abs(currentTokens - lastTokenCount) < 10000) {
    return false;
  }

  return true;
}

/**
 * Compaction callbacks
 */
export interface PreemptiveCompactionCallbacks {
  /** Called before summarization */
  onBeforeSummarize?: BeforeSummarizeCallback;
  /** Called to get model-specific limit */
  getModelLimit?: GetModelLimitCallback;
  /** Called to execute compaction */
  onCompact?: OnCompactCallback;
  /** Called to resume after compaction */
  onResume?: OnResumeCallback;
}

/**
 * Create preemptive compaction hook
 */
export function createPreemptiveCompactionHook(
  options: PreemptiveCompactionOptions = {},
  callbacks?: PreemptiveCompactionCallbacks
): Hook {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options } as Required<PreemptiveCompactionOptions>;

  return {
    name: "preemptive-compaction",
    description: "Proactively triggers compaction before hitting token limits",
    events: ["message.after", "tool.after", "session.idle", "session.deleted"],
    priority: 60,

    async handler(context: HookContext): Promise<HookResult | void> {
      const { sessionId, event, data } = context;

      // Clean up on session delete
      if (event === "session.deleted") {
        state.lastCompactionTime.delete(sessionId);
        state.compactionInProgress.delete(sessionId);
        state.tokenCountAtLastCheck.delete(sessionId);
        state.compactionTriggered.delete(sessionId);
        return;
      }

      if (!data) return;

      // Extract token info
      const tokenResult = extractTokenInfo(data);
      if (!tokenResult) {
        return;
      }

      const { currentTokens, tokenInfo } = tokenResult;

      // Extract model info
      const modelData = data as {
        providerId?: string;
        modelId?: string;
        model?: { providerId?: string; modelId?: string };
      };
      const providerId = modelData.providerId || modelData.model?.providerId || "anthropic";
      const modelId = modelData.modelId || modelData.model?.modelId || "";

      // Skip unsupported models
      if (modelId && !isSupportedModel(modelId)) {
        if (mergedOptions.debug) {
          logger.debug(`[preemptive-compaction] Skipping unsupported model: ${modelId}`);
        }
        return;
      }

      // Get context limit
      const maxTokens = getContextLimit(
        providerId,
        modelId,
        mergedOptions,
        callbacks?.getModelLimit
      );

      // Check if compaction should be triggered
      if (!shouldTriggerCompaction(sessionId, currentTokens, maxTokens, mergedOptions)) {
        return;
      }

      // Update state
      state.compactionInProgress.add(sessionId);
      state.lastCompactionTime.set(sessionId, Date.now());
      state.tokenCountAtLastCheck.set(sessionId, currentTokens);
      state.compactionTriggered.set(sessionId, true);

      const usageRatio = currentTokens / maxTokens;
      const usagePercent = (usageRatio * 100).toFixed(1);

      if (mergedOptions.debug) {
        logger.debug(
          `[preemptive-compaction] Triggering compaction for session ${sessionId} ` +
          `(${usagePercent}% usage, ${currentTokens}/${maxTokens} tokens)`
        );
      }

      // Build summarize context
      const summarizeContext: SummarizeContext = {
        sessionId,
        providerId,
        modelId,
        usageRatio,
        currentTokens,
        maxTokens,
      };

      // Call before summarize callback
      if (callbacks?.onBeforeSummarize) {
        try {
          await callbacks.onBeforeSummarize(summarizeContext);
        } catch (error) {
          logger.error(
            `[preemptive-compaction] onBeforeSummarize failed:`,
            error
          );
        }
      }

      // Execute compaction
      if (callbacks?.onCompact) {
        try {
          await callbacks.onCompact(sessionId, summarizeContext);
          logger.info(
            `[preemptive-compaction] Compaction triggered for session ${sessionId}`
          );

          // Auto-resume after compaction
          if (callbacks?.onResume) {
            setTimeout(async () => {
              try {
                await callbacks.onResume!(sessionId, "Continue");
              } catch (error) {
                logger.error(
                  `[preemptive-compaction] Auto-resume failed:`,
                  error
                );
              }
            }, mergedOptions.resumeDelayMs);
          }
        } catch (error) {
          logger.error(
            `[preemptive-compaction] Compaction failed for session ${sessionId}:`,
            error
          );
        } finally {
          state.compactionInProgress.delete(sessionId);
        }
      } else {
        state.compactionInProgress.delete(sessionId);
      }

      return {
        continue: true,
        context: [
          `Context at ${usagePercent}% capacity. Compacting to preserve recent context...`,
        ],
      };
    },
  };
}

/**
 * Get compaction state for session
 */
export function getCompactionState(sessionId: string): {
  lastCompactionTime: number;
  inProgress: boolean;
  tokenCountAtLastCheck: number;
  wasTriggered: boolean;
} {
  return {
    lastCompactionTime: state.lastCompactionTime.get(sessionId) ?? 0,
    inProgress: state.compactionInProgress.has(sessionId),
    tokenCountAtLastCheck: state.tokenCountAtLastCheck.get(sessionId) ?? 0,
    wasTriggered: state.compactionTriggered.get(sessionId) ?? false,
  };
}

/**
 * Reset compaction state
 */
export function resetCompactionState(sessionId?: string): void {
  if (sessionId) {
    state.lastCompactionTime.delete(sessionId);
    state.compactionInProgress.delete(sessionId);
    state.tokenCountAtLastCheck.delete(sessionId);
    state.compactionTriggered.delete(sessionId);
  } else {
    state.lastCompactionTime.clear();
    state.compactionInProgress.clear();
    state.tokenCountAtLastCheck.clear();
    state.compactionTriggered.clear();
  }
}

// Re-export types
export type {
  PreemptiveCompactionState,
  PreemptiveCompactionOptions,
  TokenInfo,
  ModelLimits,
  SummarizeContext,
  CompactionResult,
  GetModelLimitCallback,
  BeforeSummarizeCallback,
  OnCompactCallback,
  OnResumeCallback,
} from "./types";

// Re-export constants
export {
  DEFAULT_THRESHOLD,
  MIN_TOKENS_FOR_COMPACTION,
  COMPACTION_COOLDOWN_MS,
  RESUME_DELAY_MS,
  CLAUDE_DEFAULT_CONTEXT_LIMIT,
  CLAUDE_EXTENDED_CONTEXT_LIMIT,
  CLAUDE_MODEL_PATTERN,
} from "./constants";
