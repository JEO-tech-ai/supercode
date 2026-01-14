/**
 * Enhanced Hook Type System
 * Unified hook types with typed events, lifecycle management, and error recovery.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

// =============================================================================
// Hook Event Types
// =============================================================================

/**
 * All supported hook event types
 */
export type HookEventType =
  // Session lifecycle
  | "session.start"
  | "session.end"
  | "session.idle"
  | "session.error"
  | "session.compacting"
  | "session.deleted"

  | "request.before"
  | "request.after"

  | "response.before"
  | "response.after"

  // Message lifecycle
  | "message.before"
  | "message.after"
  | "message.updated"
  | "message.error"

  // Tool lifecycle
  | "tool.before"
  | "tool.after"
  | "tool.error"

  // Agent lifecycle
  | "agent.spawn"
  | "agent.complete"
  | "agent.error"

  // Context management
  | "context.overflow"
  | "context.compacting"

  // User interaction
  | "user.prompt"
  | "user.cancel"
  | "error";

/**
 * Event-specific data types
 */
export interface HookEventData {
  "session.start": {
    sessionId: string;
    workdir: string;
    model?: string;
    mode?: "normal" | "ultrawork";
  };
  "session.end": {
    sessionId: string;
    reason?: "completed" | "cancelled" | "error" | "timeout";
    duration?: number;
  };
  "session.idle": {
    sessionId: string;
    iterations?: number;
    pendingTasks?: number;
  };
  "session.error": {
    sessionId: string;
    error: Error | unknown;
    errorType?: string;
    recoverable?: boolean;
  };
  "session.compacting": {
    sessionId: string;
    tokenCount?: number;
    maxTokens?: number;
    ratio?: number;
  };
  "session.deleted": {
    sessionId: string;
  };

  "request.before": {
    sessionId: string;
    requestId?: string;
  };
  "request.after": {
    sessionId: string;
    requestId?: string;
    duration?: number;
  };
  "response.before": {
    sessionId: string;
    requestId?: string;
  };
  "response.after": {
    sessionId: string;
    requestId?: string;
    duration?: number;
  };

  "message.before": {
    sessionId: string;
    role: "user" | "assistant" | "system";
    content?: string;
  };
  "message.after": {
    sessionId: string;
    messageId?: string;
    role: "user" | "assistant" | "system";
    content?: string;
    tokenCount?: number;
  };
  "message.updated": {
    sessionId: string;
    messageId?: string;
    changes?: Record<string, unknown>;
  };
  "message.error": {
    sessionId: string;
    messageId?: string;
    error: Error | unknown;
  };

  "tool.before": {
    sessionId: string;
    toolName: string;
    toolId?: string;
    args?: Record<string, unknown>;
  };
  "tool.after": {
    sessionId: string;
    toolName: string;
    toolId?: string;
    result?: unknown;
    duration?: number;
    success?: boolean;
  };
  "tool.error": {
    sessionId: string;
    toolName: string;
    toolId?: string;
    error: Error | unknown;
  };

  "agent.spawn": {
    sessionId: string;
    agentName: string;
    agentId?: string;
    parentId?: string;
  };
  "agent.complete": {
    sessionId: string;
    agentName: string;
    agentId?: string;
    result?: unknown;
    duration?: number;
  };
  "agent.error": {
    sessionId: string;
    agentName: string;
    agentId?: string;
    error: Error | unknown;
  };

  "context.overflow": {
    sessionId: string;
    currentTokens: number;
    maxTokens: number;
    ratio: number;
  };
  "context.compacting": {
    sessionId: string;
    beforeTokens?: number;
    afterTokens?: number;
  };

  "user.prompt": {
    sessionId: string;
    prompt: string;
  };
  "user.cancel": {
    sessionId: string;
    reason?: string;
  };
  "error": {
    sessionId: string;
    error: Error | unknown;
    message?: string;
  };
}

// =============================================================================
// Hook Context
// =============================================================================

/**
 * Typed hook context for specific events
 */
export interface TypedHookContext<E extends HookEventType> {
  sessionId: string;
  workdir: string;
  event: E;
  data: HookEventData[E];
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Generic hook context (for backward compatibility)
 */
export interface HookContext {
  sessionId: string;
  workdir: string;
  event: HookEventType;
  data?: unknown;
  timestamp?: number;
  metadata?: Record<string, unknown>;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  message?: string;
  messages?: unknown[];
  taskId?: string;
  agent?: string;
  model?: string;
  error?: Error | string;
  description?: string;
  todos?: Array<{ content: string; status: string }>;
  toolStats?: Record<string, number>;
}

// =============================================================================
// Hook Results
// =============================================================================

export type HookAction = "continue" | "skip" | "retry" | "abort" | "inject" | "modify";

/**
 * Hook execution result
 */
export interface HookResult {
  continue?: boolean;
  prompt?: string;
  modified?: unknown;
  modifiedArgs?: Record<string, unknown>;
  context?: string[];
  prependContext?: string;
  appendMessage?: string;
  skipAction?: boolean;
  error?: Error | string;
  action?: HookAction;
  data?: unknown;
  replaceMessage?: string;
  modifiedMessages?: unknown[];
  flags?: string[];
  modelOverride?: string;
  thinkingBudget?: number;
}

/**
 * Recovery-specific hook result
 */
export interface RecoveryHookResult extends HookResult {
  /** Whether recovery was successful */
  recovered?: boolean;
  /** Recovery action taken */
  recoveryAction?: "retry" | "skip" | "abort" | "modify";
  /** Number of retry attempts made */
  retryCount?: number;
}

// =============================================================================
// Hook Handlers
// =============================================================================

/**
 * Typed hook handler for specific events
 */
export type TypedHookHandler<E extends HookEventType> = (
  context: TypedHookContext<E>
) => Promise<HookResult | void>;

/**
 * Generic hook handler
 */
export type HookHandler = (
  context: HookContext
) => Promise<HookResult | void>;

/**
 * Recovery hook handler
 */
export type RecoveryHookHandler = (
  context: HookContext
) => Promise<RecoveryHookResult | void>;

// =============================================================================
// Hook Definitions
// =============================================================================

/**
 * Base hook interface
 */
export interface BaseHook {
  /** Unique hook name */
  name: string;
  /** Hook description for documentation */
  description?: string;
  /** Execution priority (higher runs first) */
  priority?: number;
  /** Whether hook is enabled */
  enabled?: boolean;
  /** Hook version */
  version?: string;
  /** Dependencies on other hooks */
  dependencies?: string[];
}

/**
 * Standard hook definition
 */
export interface Hook extends BaseHook {
  /** Events this hook handles */
  events: HookEventType[];
  /** Hook handler function */
  handler: HookHandler;
}

/**
 * Typed hook definition for specific event
 */
export interface TypedHook<E extends HookEventType> extends BaseHook {
  /** Single event this hook handles */
  event: E;
  /** Typed handler for the event */
  handler: TypedHookHandler<E>;
}

/**
 * Recovery hook definition
 */
export interface RecoveryHook extends BaseHook {
  /** Error events this hook handles */
  events: Array<"session.error" | "message.error" | "tool.error" | "agent.error">;
  /** Error types this hook can recover from */
  errorTypes?: string[];
  /** Recovery handler */
  handler: RecoveryHookHandler;
  /** Maximum recovery attempts */
  maxRetries?: number;
}

// =============================================================================
// Hook Lifecycle
// =============================================================================

/**
 * Hook lifecycle state
 */
export type HookState = "registered" | "active" | "disabled" | "error";

/**
 * Hook execution statistics
 */
export interface HookStats {
  /** Total executions */
  executions: number;
  /** Successful executions */
  successes: number;
  /** Failed executions */
  failures: number;
  /** Average execution time in ms */
  avgDuration: number;
  /** Last execution timestamp */
  lastExecuted?: number;
  /** Last error */
  lastError?: Error;
}

/**
 * Hook with lifecycle management
 */
export interface ManagedHook extends Hook {
  /** Current state */
  state: HookState;
  /** Execution statistics */
  stats: HookStats;
  /** When hook was registered */
  registeredAt: number;
  /** Cleanup function */
  cleanup?: () => Promise<void>;
}

// =============================================================================
// Hook Configuration
// =============================================================================

/**
 * Hook configuration options
 */
export interface HookConfig {
  /** Enable/disable all hooks */
  enabled?: boolean;
  /** Global priority offset */
  priorityOffset?: number;
  /** Maximum concurrent hook executions */
  maxConcurrency?: number;
  /** Default timeout for hooks in ms */
  timeout?: number;
  /** Enable hook statistics */
  enableStats?: boolean;
  /** Log hook executions */
  logExecutions?: boolean;
}

/**
 * Individual hook configuration
 */
export interface IndividualHookConfig {
  /** Override enabled state */
  enabled?: boolean;
  /** Override priority */
  priority?: number;
  /** Custom timeout for this hook */
  timeout?: number;
}

// =============================================================================
// Error Types for Recovery
// =============================================================================

/**
 * Recoverable error types
 */
export type RecoverableErrorType =
  | "tool_result_missing"
  | "thinking_block_order"
  | "thinking_disabled_violation"
  | "context_overflow"
  | "token_limit_exceeded"
  | "edit_conflict"
  | "empty_content"
  | "rate_limit"
  | "network_error";

/**
 * Error classification result
 */
export interface ErrorClassification {
  type: RecoverableErrorType | "unknown";
  recoverable: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// Hook Factory Types
// =============================================================================

/**
 * Hook factory context (plugin input equivalent)
 */
export interface HookFactoryContext {
  /** Session client */
  client?: {
    session?: {
      summarize: (sessionId: string) => Promise<void>;
      resume: (sessionId: string, prompt?: string) => Promise<void>;
      abort: (sessionId: string) => Promise<void>;
    };
    tui?: {
      showToast: (message: string, duration?: number) => void;
    };
  };
  /** Configuration */
  config?: Record<string, unknown>;
  /** Logger */
  logger?: {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
  /** Working directory */
  directory?: string;
}

/**
 * Hook factory function type
 */
export type HookFactory<T extends Hook = Hook> = (
  ctx: HookFactoryContext,
  options?: Record<string, unknown>
) => T;

// =============================================================================
// Re-exports for backward compatibility
// =============================================================================

export type { HookEventType as HookEvent };
