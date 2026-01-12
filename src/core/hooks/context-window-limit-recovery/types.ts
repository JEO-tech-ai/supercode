/**
 * Context Window Limit Recovery Types
 * Types for token limit detection, recovery, and auto-compaction.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

/**
 * Parsed token limit error information
 */
export interface ParsedTokenLimitError {
  /** Current token count */
  currentTokens: number;
  /** Maximum allowed tokens */
  maxTokens: number;
  /** Request ID if available */
  requestId?: string;
  /** Error type identifier */
  errorType: string;
  /** Provider ID */
  providerId?: string;
  /** Model ID */
  modelId?: string;
  /** Message index where error occurred */
  messageIndex?: number;
}

/**
 * Retry state per session
 */
export interface RetryState {
  /** Number of retry attempts */
  attempt: number;
  /** Last retry timestamp */
  lastAttemptTime: number;
}

/**
 * Truncation state per session
 */
export interface TruncateState {
  /** Number of truncation attempts */
  truncateAttempt: number;
  /** Last truncated part ID */
  lastTruncatedPartId?: string;
}

/**
 * Data Connection Protocol state
 */
export interface DcpState {
  /** Whether DCP is active */
  active: boolean;
  /** DCP session ID */
  dcpSessionId?: string;
}

/**
 * Auto-compact state storage
 */
export interface AutoCompactState {
  /** Sessions pending compaction */
  pendingCompact: Set<string>;
  /** Error data by session */
  errorDataBySession: Map<string, ParsedTokenLimitError>;
  /** Retry state by session */
  retryStateBySession: Map<string, RetryState>;
  /** Truncate state by session */
  truncateStateBySession: Map<string, TruncateState>;
  /** DCP state by session */
  dcpStateBySession: Map<string, DcpState>;
  /** Empty content attempt count by session */
  emptyContentAttemptBySession: Map<string, number>;
  /** Sessions currently compacting */
  compactionInProgress: Set<string>;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Initial delay in ms */
  initialDelayMs: number;
  /** Backoff multiplier */
  backoffFactor: number;
  /** Maximum delay in ms */
  maxDelayMs: number;
}

/**
 * Truncation configuration
 */
export interface TruncateConfig {
  /** Maximum truncation attempts */
  maxTruncateAttempts: number;
  /** Minimum output size to truncate */
  minOutputSizeToTruncate: number;
  /** Target token reduction ratio */
  targetTokenRatio: number;
  /** Estimated characters per token */
  charsPerToken: number;
}

/**
 * Context window limit recovery options
 */
export interface ContextWindowLimitRecoveryOptions {
  /** Enable experimental features */
  experimental?: boolean;
  /** Use DCP for compaction */
  dcpForCompaction?: boolean;
  /** Retry configuration */
  retryConfig?: Partial<RetryConfig>;
  /** Truncate configuration */
  truncateConfig?: Partial<TruncateConfig>;
  /** Compaction cooldown in ms */
  compactionCooldownMs?: number;
  /** Resume delay after compaction in ms */
  resumeDelayMs?: number;
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
  /** Reduction percentage */
  reductionPercent?: number;
  /** Action taken */
  action: "summarize" | "truncate" | "prune" | "skip" | "error";
  /** Error message if failed */
  error?: string;
}

/**
 * Pruning strategy
 */
export type PruningStrategy =
  | "deduplication"
  | "supersede"
  | "purge-errors"
  | "truncate-outputs";

/**
 * Pruning options
 */
export interface PruningOptions {
  /** Strategies to apply */
  strategies: PruningStrategy[];
  /** Target token reduction */
  targetReduction?: number;
  /** Preserve recent messages count */
  preserveRecentMessages?: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,
  initialDelayMs: 2000,
  backoffFactor: 2,
  maxDelayMs: 30000,
};

/**
 * Default truncate configuration
 */
export const DEFAULT_TRUNCATE_CONFIG: TruncateConfig = {
  maxTruncateAttempts: 20,
  minOutputSizeToTruncate: 500,
  targetTokenRatio: 0.5,
  charsPerToken: 4,
};
