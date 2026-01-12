/**
 * Pruning Types for Context Window Limit Recovery
 * Defines types for dynamic context pruning strategies.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

/**
 * Tool call signature for deduplication
 */
export interface ToolCallSignature {
  /** Tool name */
  toolName: string;
  /** Computed signature hash */
  signature: string;
  /** Message ID containing this tool call */
  messageId: string;
  /** Tool call index within the message */
  toolCallIndex: number;
  /** Turn number (message index) */
  turn: number;
}

/**
 * File operation for supersede tracking
 */
export interface FileOperation {
  /** Message ID */
  messageId: string;
  /** Tool call index */
  toolCallIndex: number;
  /** Tool name (read, write, edit) */
  tool: string;
  /** File path */
  filePath: string;
  /** Turn number */
  turn: number;
}

/**
 * Errored tool call for purge tracking
 */
export interface ErroredToolCall {
  /** Message ID */
  messageId: string;
  /** Tool call index */
  toolCallIndex: number;
  /** Tool name */
  toolName: string;
  /** Turn number */
  turn: number;
  /** Error age in turns */
  errorAge: number;
}

/**
 * Pruning result with statistics
 */
export interface PruningResult {
  /** Total items pruned */
  itemsPruned: number;
  /** Estimated tokens saved */
  totalTokensSaved: number;
  /** Breakdown by strategy */
  strategies: {
    deduplication: number;
    supersedeWrites: number;
    purgeErrors: number;
    truncateOutputs: number;
  };
}

/**
 * Pruning state during execution
 */
export interface PruningState {
  /** Message IDs with tool calls to prune */
  toolCallsToPrune: Set<string>;
  /** Current turn number */
  currentTurn: number;
  /** File operations by path */
  fileOperations: Map<string, FileOperation[]>;
  /** Tool signatures for deduplication */
  toolSignatures: Map<string, ToolCallSignature[]>;
  /** Errored tool calls */
  erroredTools: Map<string, ErroredToolCall>;
  /** Tool outputs to truncate */
  outputsToTruncate: Map<string, number>;
}

/**
 * Deduplication strategy configuration
 */
export interface DeduplicationConfig {
  /** Enable this strategy */
  enabled: boolean;
  /** Additional protected tools (beyond defaults) */
  protectedTools?: string[];
}

/**
 * Supersede writes strategy configuration
 */
export interface SupersedeWritesConfig {
  /** Enable this strategy */
  enabled: boolean;
  /** Aggressive mode: remove even if no subsequent read */
  aggressive: boolean;
}

/**
 * Purge errors strategy configuration
 */
export interface PurgeErrorsConfig {
  /** Enable this strategy */
  enabled: boolean;
  /** Minimum turns before purging errored calls */
  turns: number;
}

/**
 * Truncate outputs strategy configuration
 */
export interface TruncateOutputsConfig {
  /** Enable this strategy */
  enabled: boolean;
  /** Maximum output size before truncation */
  maxOutputSize: number;
  /** Target size after truncation */
  targetSize: number;
}

/**
 * Dynamic context pruning configuration
 */
export interface DynamicContextPruningConfig {
  /** Notification level */
  notification: "off" | "simple" | "detailed";
  /** Turn protection (preserve recent N turns) */
  turnProtection: number;
  /** Protected tool names */
  protectedTools?: string[];
  /** Strategy configurations */
  strategies?: {
    deduplication?: Partial<DeduplicationConfig>;
    supersede_writes?: Partial<SupersedeWritesConfig>;
    purge_errors?: Partial<PurgeErrorsConfig>;
    truncate_outputs?: Partial<TruncateOutputsConfig>;
  };
}

/**
 * Characters per token estimate
 */
export const CHARS_PER_TOKEN = 4;

/**
 * Estimate token count from text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Default protected tools that should never be pruned
 */
export const DEFAULT_PROTECTED_TOOLS = new Set([
  "task",
  "todowrite",
  "todoread",
  "askuserquestion",
  "session_read",
  "session_write",
  "session_search",
  "notebookedit",
]);

/**
 * Create initial pruning state
 */
export function createPruningState(): PruningState {
  return {
    toolCallsToPrune: new Set(),
    currentTurn: 0,
    fileOperations: new Map(),
    toolSignatures: new Map(),
    erroredTools: new Map(),
    outputsToTruncate: new Map(),
  };
}
