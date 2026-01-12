/**
 * Session Recovery Hook
 * Handles automatic recovery from common session errors.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import type { Hook, HookContext, HookResult, RecoveryHookResult } from "../types";
import type {
  RecoveryErrorType,
  SessionRecoveryOptions,
  RecoveryState,
  RecoveryAction,
  MessageData,
  MessagePart,
  SessionRecoveryHook,
  ERROR_PATTERNS,
} from "./types";
import logger from "../../../shared/logger";

/**
 * Default recovery options
 */
const DEFAULT_OPTIONS: SessionRecoveryOptions = {
  maxRetries: 3,
  autoResume: true,
  resumeDelay: 500,
  showNotifications: true,
  debug: false,
};

/**
 * Recovery state storage per session
 */
const recoveryStateMap = new Map<string, RecoveryState>();

/**
 * Sessions currently being processed
 */
const processingErrors = new Set<string>();

/**
 * Callbacks
 */
let onAbortCallback: ((sessionId: string) => void) | null = null;
let onRecoveryCompleteCallback: ((sessionId: string) => void) | null = null;

/**
 * Debug logger
 */
function debugLog(options: SessionRecoveryOptions, message: string, ...args: unknown[]): void {
  if (options.debug) {
    logger.debug(`[session-recovery] ${message}`, ...args);
  }
}

/**
 * Detect error type from error object or message
 */
export function detectErrorType(error: unknown): RecoveryErrorType {
  const errorMessage = getErrorMessage(error).toLowerCase();

  // Check for tool result missing
  if (
    errorMessage.includes("tool_use") &&
    (errorMessage.includes("tool_result") || errorMessage.includes("missing"))
  ) {
    return "tool_result_missing";
  }

  // Check for thinking block order violations
  if (
    errorMessage.includes("thinking") &&
    (errorMessage.includes("first block") ||
      errorMessage.includes("must start with") ||
      errorMessage.includes("preceeding") ||
      errorMessage.includes("final block") ||
      errorMessage.includes("cannot be thinking"))
  ) {
    return "thinking_block_order";
  }

  // Check for thinking disabled violations
  if (
    errorMessage.includes("thinking is disabled") &&
    errorMessage.includes("cannot contain")
  ) {
    return "thinking_disabled_violation";
  }

  // Check for empty content
  if (
    errorMessage.includes("empty") &&
    (errorMessage.includes("content") || errorMessage.includes("non-empty"))
  ) {
    return "empty_content";
  }

  // Check for context overflow
  if (
    (errorMessage.includes("context") || errorMessage.includes("token")) &&
    (errorMessage.includes("limit") || errorMessage.includes("exceeded") || errorMessage.includes("overflow"))
  ) {
    return "context_overflow";
  }

  return "unknown";
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
    if (err.error && typeof err.error === "object") {
      const innerErr = err.error as Record<string, unknown>;
      if (typeof innerErr.message === "string") {
        return innerErr.message;
      }
    }
  }
  return String(error);
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  const errorType = detectErrorType(error);
  return errorType !== "unknown";
}

/**
 * Get recovery state for session
 */
export function getRecoveryState(sessionId: string): RecoveryState | undefined {
  return recoveryStateMap.get(sessionId);
}

/**
 * Update recovery state
 */
function updateRecoveryState(
  sessionId: string,
  errorType: RecoveryErrorType,
  inProgress: boolean
): RecoveryState {
  const existing = recoveryStateMap.get(sessionId) || {
    attempts: 0,
    inProgress: false,
  };

  const updated: RecoveryState = {
    attempts: inProgress ? existing.attempts + 1 : existing.attempts,
    lastAttempt: Date.now(),
    lastErrorType: errorType,
    inProgress,
  };

  recoveryStateMap.set(sessionId, updated);
  return updated;
}

/**
 * Reset recovery state for session
 */
export function resetRecoveryState(sessionId: string): void {
  recoveryStateMap.delete(sessionId);
  processingErrors.delete(sessionId);
}

/**
 * Recover from missing tool result error
 */
async function recoverToolResultMissing(
  sessionId: string,
  messageData?: MessageData,
  options?: SessionRecoveryOptions
): Promise<RecoveryAction> {
  debugLog(options || {}, `Recovering from tool_result_missing for session ${sessionId}`);

  // Find tool_use parts without corresponding tool_result
  const toolUseParts = messageData?.parts?.filter((p) => p.type === "tool_use") || [];

  if (toolUseParts.length === 0) {
    return {
      success: false,
      action: "none",
      message: "No tool_use parts found to recover",
    };
  }

  // Create cancelled tool results for each tool_use
  const injectedParts: MessagePart[] = toolUseParts.map((toolUse) => ({
    type: "tool_result" as const,
    id: toolUse.id,
    content: "Operation cancelled due to session recovery",
  }));

  return {
    success: true,
    action: "inject_tool_result",
    message: `Injected ${injectedParts.length} cancelled tool result(s)`,
    modifiedMessages: [
      {
        ...messageData,
        parts: [...(messageData?.parts || []), ...injectedParts],
      },
    ],
    shouldResume: true,
    resumePrompt: "Continue from where we left off.",
  };
}

/**
 * Recover from thinking block order violation
 */
async function recoverThinkingBlockOrder(
  sessionId: string,
  messageData?: MessageData,
  options?: SessionRecoveryOptions
): Promise<RecoveryAction> {
  debugLog(options || {}, `Recovering from thinking_block_order for session ${sessionId}`);

  // Prepend thinking block to fix order
  const thinkingPart: MessagePart = {
    type: "thinking",
    thinking: "Analyzing the situation and determining next steps...",
  };

  const existingParts = messageData?.parts || [];
  const hasThinking = existingParts.some(
    (p) => p.type === "thinking" || p.type === "redacted_thinking" || p.type === "reasoning"
  );

  if (hasThinking) {
    // Reorder parts - thinking first
    const thinkingParts = existingParts.filter(
      (p) => p.type === "thinking" || p.type === "redacted_thinking" || p.type === "reasoning"
    );
    const otherParts = existingParts.filter(
      (p) => p.type !== "thinking" && p.type !== "redacted_thinking" && p.type !== "reasoning"
    );

    return {
      success: true,
      action: "fix_thinking_order",
      message: "Reordered thinking blocks to beginning",
      modifiedMessages: [
        {
          ...messageData,
          parts: [...thinkingParts, ...otherParts],
        },
      ],
      shouldResume: true,
    };
  }

  // No thinking parts, add one
  return {
    success: true,
    action: "fix_thinking_order",
    message: "Added thinking block at beginning",
    modifiedMessages: [
      {
        ...messageData,
        parts: [thinkingPart, ...existingParts],
      },
    ],
    shouldResume: true,
  };
}

/**
 * Recover from thinking disabled violation
 */
async function recoverThinkingDisabled(
  sessionId: string,
  messageData?: MessageData,
  options?: SessionRecoveryOptions
): Promise<RecoveryAction> {
  debugLog(options || {}, `Recovering from thinking_disabled_violation for session ${sessionId}`);

  const existingParts = messageData?.parts || [];

  // Strip all thinking blocks
  const filteredParts = existingParts.filter(
    (p) => p.type !== "thinking" && p.type !== "redacted_thinking" && p.type !== "reasoning"
  );

  const removedCount = existingParts.length - filteredParts.length;

  if (removedCount === 0) {
    return {
      success: false,
      action: "none",
      message: "No thinking blocks found to strip",
    };
  }

  return {
    success: true,
    action: "strip_thinking",
    message: `Stripped ${removedCount} thinking block(s)`,
    modifiedMessages: [
      {
        ...messageData,
        parts: filteredParts,
      },
    ],
    shouldResume: true,
  };
}

/**
 * Recover from empty content
 */
async function recoverEmptyContent(
  sessionId: string,
  messageData?: MessageData,
  options?: SessionRecoveryOptions
): Promise<RecoveryAction> {
  debugLog(options || {}, `Recovering from empty_content for session ${sessionId}`);

  const existingParts = messageData?.parts || [];

  // Check for empty text parts and fill them
  const filledParts = existingParts.map((part) => {
    if (part.type === "text" && (!part.text || part.text.trim() === "")) {
      return {
        ...part,
        text: "[Content recovered]",
      };
    }
    return part;
  });

  // If no parts at all, add a placeholder
  if (filledParts.length === 0) {
    filledParts.push({
      type: "text",
      text: "[Session recovered]",
    });
  }

  return {
    success: true,
    action: "fill_empty",
    message: "Filled empty content with placeholder",
    modifiedMessages: [
      {
        ...messageData,
        parts: filledParts,
      },
    ],
    shouldResume: true,
    resumePrompt: "Please continue with the task.",
  };
}

/**
 * Handle session recovery
 */
export async function handleSessionRecovery(
  sessionId: string,
  error: unknown,
  messageData?: MessageData,
  options: SessionRecoveryOptions = DEFAULT_OPTIONS
): Promise<RecoveryAction> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Check if already processing
  if (processingErrors.has(sessionId)) {
    debugLog(mergedOptions, `Already processing recovery for session ${sessionId}`);
    return { success: false, action: "none", message: "Recovery already in progress" };
  }

  const errorType = detectErrorType(error);
  if (errorType === "unknown") {
    return { success: false, action: "none", message: "Unknown error type" };
  }

  // Check retry limit
  const state = getRecoveryState(sessionId);
  if (state && state.attempts >= (mergedOptions.maxRetries || 3)) {
    debugLog(mergedOptions, `Max retries reached for session ${sessionId}`);
    return { success: false, action: "none", message: "Max recovery attempts reached" };
  }

  // Mark as processing
  processingErrors.add(sessionId);
  updateRecoveryState(sessionId, errorType, true);

  try {
    let result: RecoveryAction;

    switch (errorType) {
      case "tool_result_missing":
        result = await recoverToolResultMissing(sessionId, messageData, mergedOptions);
        break;

      case "thinking_block_order":
        result = await recoverThinkingBlockOrder(sessionId, messageData, mergedOptions);
        break;

      case "thinking_disabled_violation":
        result = await recoverThinkingDisabled(sessionId, messageData, mergedOptions);
        break;

      case "empty_content":
        result = await recoverEmptyContent(sessionId, messageData, mergedOptions);
        break;

      case "context_overflow":
        // Context overflow is handled by a separate hook
        result = {
          success: false,
          action: "none",
          message: "Context overflow should be handled by context-window-limit-recovery hook",
        };
        break;

      default:
        result = { success: false, action: "none", message: `Unhandled error type: ${errorType}` };
    }

    if (result.success && onRecoveryCompleteCallback) {
      onRecoveryCompleteCallback(sessionId);
    }

    return result;
  } finally {
    processingErrors.delete(sessionId);
    updateRecoveryState(sessionId, errorType, false);
  }
}

/**
 * Create session recovery hook
 */
export function createSessionRecoveryHook(
  options: SessionRecoveryOptions = {}
): Hook {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  return {
    name: "session-recovery",
    description: "Automatically recovers from common session errors",
    events: ["session.error", "message.error"],
    priority: 100, // High priority for recovery

    async handler(context: HookContext): Promise<HookResult | void> {
      const { sessionId, data } = context;

      if (!data) return;

      const error = (data as { error?: unknown }).error;
      if (!error) return;

      // Check if recoverable
      if (!isRecoverableError(error)) {
        return;
      }

      debugLog(mergedOptions, `Handling recovery for session ${sessionId}`);

      const messageData = (data as { messageData?: MessageData }).messageData;
      const result = await handleSessionRecovery(sessionId, error, messageData, mergedOptions);

      if (result.success) {
        logger.info(`Session ${sessionId} recovered: ${result.message}`);

        return {
          continue: true,
          modified: result.modifiedMessages,
          prompt: result.resumePrompt,
        };
      }

      return { continue: true };
    },
  };
}

/**
 * Create the session recovery hook interface
 */
export function createSessionRecoveryInterface(
  options: SessionRecoveryOptions = {}
): SessionRecoveryHook {
  return {
    handleRecovery: (sessionId, error, messageData) =>
      handleSessionRecovery(sessionId, error, messageData, options),
    isRecoverable: isRecoverableError,
    detectErrorType,
    getState: getRecoveryState,
    resetState: resetRecoveryState,
    onAbort: (callback) => {
      onAbortCallback = callback;
    },
    onRecoveryComplete: (callback) => {
      onRecoveryCompleteCallback = callback;
    },
  };
}

// Export types
export type { RecoveryErrorType, SessionRecoveryOptions, RecoveryState, RecoveryAction };
