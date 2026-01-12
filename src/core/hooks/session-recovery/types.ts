/**
 * Session Recovery Hook Type Definitions
 * Types for error detection, recovery, and state management.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

/**
 * Recovery error types that can be detected and recovered
 */
export type RecoveryErrorType =
  | "tool_result_missing"
  | "thinking_block_order"
  | "thinking_disabled_violation"
  | "empty_content"
  | "context_overflow"
  | "unknown";

/**
 * Message content part types
 */
export type ContentPartType = "text" | "tool_use" | "tool_result" | "image";

/**
 * Thinking part types
 */
export type ThinkingPartType = "thinking" | "redacted_thinking" | "reasoning";

/**
 * All part types combined
 */
export type PartType = ContentPartType | ThinkingPartType;

/**
 * Message part structure
 */
export interface MessagePart {
  type: PartType;
  id?: string;
  text?: string;
  thinking?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string | Array<{ type: string; text?: string }>;
}

/**
 * Stored message metadata
 */
export interface StoredMessageMeta {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  parentId?: string;
  time?: {
    created: number;
    completed?: number;
  };
  error?: unknown;
}

/**
 * Message data for recovery
 */
export interface MessageData {
  info?: {
    id?: string;
    role?: string;
    sessionId?: string;
    parentId?: string;
    error?: unknown;
    agent?: string;
    model?: {
      providerId: string;
      modelId: string;
    };
  };
  parts?: MessagePart[];
}

/**
 * Recovery options configuration
 */
export interface SessionRecoveryOptions {
  /** Maximum recovery attempts per session */
  maxRetries?: number;
  /** Enable auto-resume after recovery */
  autoResume?: boolean;
  /** Delay before auto-resume in ms */
  resumeDelay?: number;
  /** Show toast notifications */
  showNotifications?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Recovery state per session
 */
export interface RecoveryState {
  /** Number of recovery attempts */
  attempts: number;
  /** Last recovery timestamp */
  lastAttempt?: number;
  /** Last error type */
  lastErrorType?: RecoveryErrorType;
  /** Whether recovery is in progress */
  inProgress: boolean;
}

/**
 * Recovery action result
 */
export interface RecoveryAction {
  /** Whether recovery was successful */
  success: boolean;
  /** Type of recovery action taken */
  action: "inject_tool_result" | "fix_thinking_order" | "strip_thinking" | "fill_empty" | "none";
  /** Modified messages */
  modifiedMessages?: MessageData[];
  /** Message to display */
  message?: string;
  /** Whether to resume session */
  shouldResume?: boolean;
  /** Resume prompt if any */
  resumePrompt?: string;
}

/**
 * Session recovery hook interface
 */
export interface SessionRecoveryHook {
  /** Handle session recovery for a message error */
  handleRecovery: (
    sessionId: string,
    error: unknown,
    messageData?: MessageData
  ) => Promise<RecoveryAction>;

  /** Check if error is recoverable */
  isRecoverable: (error: unknown) => boolean;

  /** Detect error type */
  detectErrorType: (error: unknown) => RecoveryErrorType;

  /** Get recovery state for session */
  getState: (sessionId: string) => RecoveryState | undefined;

  /** Reset recovery state for session */
  resetState: (sessionId: string) => void;

  /** Set abort callback */
  onAbort?: (callback: (sessionId: string) => void) => void;

  /** Set recovery complete callback */
  onRecoveryComplete?: (callback: (sessionId: string) => void) => void;
}

/**
 * Tool result injection data
 */
export interface ToolResultInjection {
  toolUseId: string;
  content: string;
  isError?: boolean;
}

/**
 * Thinking block fix data
 */
export interface ThinkingBlockFix {
  messageId: string;
  prependThinking?: string;
  stripThinking?: boolean;
}

/**
 * Error pattern matchers for detection
 */
export const ERROR_PATTERNS = {
  toolResultMissing: [
    "tool_use",
    "tool_result",
    "missing",
    "expected",
  ],
  thinkingBlockOrder: [
    "thinking",
    "first block",
    "must start with",
    "preceeding",
    "final block",
    "cannot be thinking",
  ],
  thinkingDisabled: [
    "thinking is disabled",
    "cannot contain",
    "thinking block",
  ],
  emptyContent: [
    "empty",
    "content",
    "required",
    "non-empty",
  ],
  contextOverflow: [
    "context",
    "overflow",
    "token",
    "limit",
    "exceeded",
  ],
} as const;
