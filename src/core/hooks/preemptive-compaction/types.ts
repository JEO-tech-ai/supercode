/**
 * Preemptive Compaction Types
 * Type definitions for preemptive compaction state and configuration.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

/**
 * Token usage information from API response
 */
export interface TokenInfo {
  /** Input tokens used */
  input: number;
  /** Output tokens used */
  output: number;
  /** Reasoning tokens used (for thinking models) */
  reasoning: number;
  /** Cache token information */
  cache: {
    /** Cache read tokens */
    read: number;
    /** Cache write tokens */
    write: number;
  };
}

/**
 * Model context limits
 */
export interface ModelLimits {
  /** Context window limit */
  context: number;
  /** Output token limit */
  output: number;
}

/**
 * Preemptive compaction state per session
 */
export interface PreemptiveCompactionState {
  /** Last compaction time by session ID */
  lastCompactionTime: Map<string, number>;
  /** Sessions currently undergoing compaction */
  compactionInProgress: Set<string>;
  /** Token count at last check by session ID */
  tokenCountAtLastCheck: Map<string, number>;
  /** Whether compaction was triggered for a session */
  compactionTriggered: Map<string, boolean>;
}

/**
 * Context for summarize callback
 */
export interface SummarizeContext {
  /** Session ID */
  sessionId: string;
  /** Provider ID (e.g., "anthropic") */
  providerId: string;
  /** Model ID (e.g., "claude-sonnet-4-20250514") */
  modelId: string;
  /** Current usage ratio (0-1) */
  usageRatio: number;
  /** Current token count */
  currentTokens: number;
  /** Maximum token limit */
  maxTokens: number;
}

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
  /** Delay before resume after compaction in ms */
  resumeDelayMs?: number;
  /** Enable extended context (1M tokens) */
  extendedContext?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Compaction result
 */
export interface CompactionResult {
  /** Whether compaction was successful */
  success: boolean;
  /** Tokens before compaction */
  tokensBefore?: number;
  /** Tokens after compaction */
  tokensAfter?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Callback to get model-specific context limit
 */
export type GetModelLimitCallback = (
  providerId: string,
  modelId: string
) => number | undefined;

/**
 * Callback before summarization
 */
export type BeforeSummarizeCallback = (
  context: SummarizeContext
) => Promise<void> | void;

/**
 * Callback to trigger compaction
 */
export type OnCompactCallback = (
  sessionId: string,
  context: SummarizeContext
) => Promise<void>;

/**
 * Callback to resume after compaction
 */
export type OnResumeCallback = (
  sessionId: string,
  prompt?: string
) => Promise<void>;
