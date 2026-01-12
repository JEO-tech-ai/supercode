/**
 * Session Recovery Hook
 * Handles automatic recovery from common session errors.
 * Uses filesystem-based message manipulation for robust recovery.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "../types";
import type {
  RecoveryErrorType,
  SessionRecoveryOptions,
  RecoveryState,
  RecoveryAction,
  MessageData,
  MessagePart,
  SessionRecoveryHook,
} from "./types";
import {
  MAX_RECOVERY_ATTEMPTS,
  RECOVERY_COOLDOWN_MS,
  RESUME_DELAY_MS,
  RECOVERY_RESUME_TEXT,
  PLACEHOLDER_TEXT,
} from "./constants";
import {
  readMessages,
  readParts,
  injectTextPart,
  findEmptyMessageByIndex,
  findMessagesWithOrphanThinking,
  findMessagesWithThinkingBlocks,
  findMessagesWithThinkingOnly,
  findMessagesWithEmptyTextParts,
  findEmptyMessages,
  findMessageByIndexNeedingThinking,
  prependThinkingPart,
  stripThinkingParts,
  replaceEmptyTextParts,
} from "./storage";
import logger from "../../../shared/logger";

/**
 * Default recovery options
 */
const DEFAULT_OPTIONS: Required<SessionRecoveryOptions> = {
  maxRetries: MAX_RECOVERY_ATTEMPTS,
  autoResume: true,
  resumeDelay: RESUME_DELAY_MS,
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
function debugLog(
  options: Required<SessionRecoveryOptions>,
  message: string,
  ...args: unknown[]
): void {
  if (options.debug) {
    logger.debug(`[session-recovery] ${message}`, ...args);
  }
}

/**
 * Get error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error.toLowerCase();

  const errorObj = error as Record<string, unknown>;
  const paths = [
    errorObj.data,
    errorObj.error,
    errorObj,
    (errorObj.data as Record<string, unknown>)?.error,
  ];

  for (const obj of paths) {
    if (obj && typeof obj === "object") {
      const msg = (obj as Record<string, unknown>).message;
      if (typeof msg === "string" && msg.length > 0) {
        return msg.toLowerCase();
      }
    }
  }

  try {
    return JSON.stringify(error).toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Extract message index from error message
 */
export function extractMessageIndex(error: unknown): number | null {
  const message = getErrorMessage(error);
  const match = message.match(/messages\.(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Detect error type from error object or message
 */
export function detectErrorType(error: unknown): RecoveryErrorType {
  const message = getErrorMessage(error);

  // Check for tool result missing
  if (message.includes("tool_use") && message.includes("tool_result")) {
    return "tool_result_missing";
  }

  // Check for thinking block order violations
  if (
    message.includes("thinking") &&
    (message.includes("first block") ||
      message.includes("must start with") ||
      message.includes("preceeding") ||
      message.includes("final block") ||
      message.includes("cannot be thinking") ||
      (message.includes("expected") && message.includes("found")))
  ) {
    return "thinking_block_order";
  }

  // Check for thinking disabled violations
  if (
    message.includes("thinking is disabled") &&
    message.includes("cannot contain")
  ) {
    return "thinking_disabled_violation";
  }

  // Check for empty content
  if (
    message.includes("empty") &&
    (message.includes("content") ||
      message.includes("non-empty") ||
      message.includes("required"))
  ) {
    return "empty_content";
  }

  // Check for context overflow
  if (
    (message.includes("context") || message.includes("token")) &&
    (message.includes("limit") ||
      message.includes("exceeded") ||
      message.includes("overflow"))
  ) {
    return "context_overflow";
  }

  return "unknown";
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
 * Extract tool use IDs from message parts
 */
function extractToolUseIds(parts: MessagePart[]): string[] {
  return parts
    .filter((p) => p.type === "tool_use" && p.id)
    .map((p) => p.id as string);
}

/**
 * Recover from missing tool result error
 */
async function recoverToolResultMissing(
  sessionId: string,
  messageData?: MessageData,
  options?: Required<SessionRecoveryOptions>
): Promise<RecoveryAction> {
  debugLog(
    options || DEFAULT_OPTIONS,
    `Recovering from tool_result_missing for session ${sessionId}`
  );

  // Get parts from message data or storage
  let parts = messageData?.parts || [];
  if (parts.length === 0 && messageData?.info?.id) {
    const storedParts = readParts(messageData.info.id);
    parts = storedParts.map((p) => ({
      type: p.type === "tool" ? "tool_use" : p.type,
      id: "callId" in p ? (p as { callId?: string }).callId : p.id,
      name: "tool" in p ? (p as { tool?: string }).tool : undefined,
      input:
        "state" in p
          ? (p as { state?: { input?: Record<string, unknown> } }).state?.input
          : undefined,
    })) as MessagePart[];
  }

  const toolUseIds = extractToolUseIds(parts);

  if (toolUseIds.length === 0) {
    return {
      success: false,
      action: "none",
      message: "No tool_use parts found to recover",
    };
  }

  // Create cancelled tool results for each tool_use
  const injectedParts: MessagePart[] = toolUseIds.map((id) => ({
    type: "tool_result" as const,
    id,
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
    resumePrompt: RECOVERY_RESUME_TEXT,
  };
}

/**
 * Recover from thinking block order violation
 */
async function recoverThinkingBlockOrder(
  sessionId: string,
  messageData?: MessageData,
  options?: Required<SessionRecoveryOptions>,
  error?: unknown
): Promise<RecoveryAction> {
  debugLog(
    options || DEFAULT_OPTIONS,
    `Recovering from thinking_block_order for session ${sessionId}`
  );

  // Try to find the specific message that needs fixing
  const targetIndex = extractMessageIndex(error);

  if (targetIndex !== null) {
    const targetMessageId = findMessageByIndexNeedingThinking(
      sessionId,
      targetIndex
    );
    if (targetMessageId) {
      const success = prependThinkingPart(sessionId, targetMessageId);
      if (success) {
        return {
          success: true,
          action: "fix_thinking_order",
          message: `Fixed thinking order for message at index ${targetIndex}`,
          shouldResume: true,
          resumePrompt: RECOVERY_RESUME_TEXT,
        };
      }
    }
  }

  // Fall back to finding orphan thinking messages
  const orphanMessages = findMessagesWithOrphanThinking(sessionId);

  if (orphanMessages.length === 0) {
    // Try in-memory fix if storage approach fails
    const existingParts = messageData?.parts || [];
    const hasThinking = existingParts.some(
      (p) =>
        p.type === "thinking" ||
        p.type === "redacted_thinking" ||
        p.type === "reasoning"
    );

    if (hasThinking) {
      // Reorder parts - thinking first
      const thinkingParts = existingParts.filter(
        (p) =>
          p.type === "thinking" ||
          p.type === "redacted_thinking" ||
          p.type === "reasoning"
      );
      const otherParts = existingParts.filter(
        (p) =>
          p.type !== "thinking" &&
          p.type !== "redacted_thinking" &&
          p.type !== "reasoning"
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
        resumePrompt: RECOVERY_RESUME_TEXT,
      };
    }

    // No thinking parts found, add one
    const thinkingPart: MessagePart = {
      type: "thinking",
      thinking: "[Continuing from previous reasoning]",
    };

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
      resumePrompt: RECOVERY_RESUME_TEXT,
    };
  }

  // Fix all orphan messages via storage
  let anySuccess = false;
  for (const messageId of orphanMessages) {
    if (prependThinkingPart(sessionId, messageId)) {
      anySuccess = true;
    }
  }

  return {
    success: anySuccess,
    action: anySuccess ? "fix_thinking_order" : "none",
    message: anySuccess
      ? `Fixed thinking order for ${orphanMessages.length} message(s)`
      : "Failed to fix thinking order",
    shouldResume: anySuccess,
    resumePrompt: anySuccess ? RECOVERY_RESUME_TEXT : undefined,
  };
}

/**
 * Recover from thinking disabled violation
 */
async function recoverThinkingDisabled(
  sessionId: string,
  messageData?: MessageData,
  options?: Required<SessionRecoveryOptions>
): Promise<RecoveryAction> {
  debugLog(
    options || DEFAULT_OPTIONS,
    `Recovering from thinking_disabled_violation for session ${sessionId}`
  );

  // Find and strip thinking blocks via storage
  const messagesWithThinking = findMessagesWithThinkingBlocks(sessionId);

  if (messagesWithThinking.length > 0) {
    let anySuccess = false;
    for (const messageId of messagesWithThinking) {
      if (stripThinkingParts(messageId)) {
        anySuccess = true;
      }
    }

    if (anySuccess) {
      return {
        success: true,
        action: "strip_thinking",
        message: `Stripped thinking blocks from ${messagesWithThinking.length} message(s)`,
        shouldResume: true,
        resumePrompt: RECOVERY_RESUME_TEXT,
      };
    }
  }

  // Fall back to in-memory stripping
  const existingParts = messageData?.parts || [];
  const filteredParts = existingParts.filter(
    (p) =>
      p.type !== "thinking" &&
      p.type !== "redacted_thinking" &&
      p.type !== "reasoning"
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
    resumePrompt: RECOVERY_RESUME_TEXT,
  };
}

/**
 * Recover from empty content
 */
async function recoverEmptyContent(
  sessionId: string,
  messageData?: MessageData,
  options?: Required<SessionRecoveryOptions>,
  error?: unknown
): Promise<RecoveryAction> {
  debugLog(
    options || DEFAULT_OPTIONS,
    `Recovering from empty_content for session ${sessionId}`
  );

  const targetIndex = extractMessageIndex(error);
  const failedId = messageData?.info?.id;
  let anySuccess = false;

  // Fix empty text parts
  const messagesWithEmptyText = findMessagesWithEmptyTextParts(sessionId);
  for (const messageId of messagesWithEmptyText) {
    if (replaceEmptyTextParts(messageId, PLACEHOLDER_TEXT)) {
      anySuccess = true;
    }
  }

  // Fix thinking-only messages
  const thinkingOnlyIds = findMessagesWithThinkingOnly(sessionId);
  for (const messageId of thinkingOnlyIds) {
    if (injectTextPart(sessionId, messageId, PLACEHOLDER_TEXT)) {
      anySuccess = true;
    }
  }

  // Try to fix specific message by index
  if (targetIndex !== null) {
    const targetMessageId = findEmptyMessageByIndex(sessionId, targetIndex);
    if (targetMessageId) {
      if (replaceEmptyTextParts(targetMessageId, PLACEHOLDER_TEXT)) {
        return {
          success: true,
          action: "fill_empty",
          message: `Fixed empty content at index ${targetIndex}`,
          shouldResume: true,
          resumePrompt: RECOVERY_RESUME_TEXT,
        };
      }
      if (injectTextPart(sessionId, targetMessageId, PLACEHOLDER_TEXT)) {
        return {
          success: true,
          action: "fill_empty",
          message: `Injected text at index ${targetIndex}`,
          shouldResume: true,
          resumePrompt: RECOVERY_RESUME_TEXT,
        };
      }
    }
  }

  // Try to fix by failed message ID
  if (failedId) {
    if (replaceEmptyTextParts(failedId, PLACEHOLDER_TEXT)) {
      return {
        success: true,
        action: "fill_empty",
        message: "Fixed empty content in failed message",
        shouldResume: true,
        resumePrompt: RECOVERY_RESUME_TEXT,
      };
    }
    if (injectTextPart(sessionId, failedId, PLACEHOLDER_TEXT)) {
      return {
        success: true,
        action: "fill_empty",
        message: "Injected text in failed message",
        shouldResume: true,
        resumePrompt: RECOVERY_RESUME_TEXT,
      };
    }
  }

  // Fix all empty messages
  const emptyMessageIds = findEmptyMessages(sessionId);
  for (const messageId of emptyMessageIds) {
    if (replaceEmptyTextParts(messageId, PLACEHOLDER_TEXT)) {
      anySuccess = true;
    }
    if (injectTextPart(sessionId, messageId, PLACEHOLDER_TEXT)) {
      anySuccess = true;
    }
  }

  if (anySuccess) {
    return {
      success: true,
      action: "fill_empty",
      message: "Filled empty content with placeholder",
      shouldResume: true,
      resumePrompt: RECOVERY_RESUME_TEXT,
    };
  }

  // Fall back to in-memory fix
  const existingParts = messageData?.parts || [];
  const filledParts = existingParts.map((part) => {
    if (part.type === "text" && (!part.text || part.text.trim() === "")) {
      return {
        ...part,
        text: PLACEHOLDER_TEXT,
      };
    }
    return part;
  });

  // If no parts at all, add a placeholder
  if (filledParts.length === 0) {
    filledParts.push({
      type: "text",
      text: PLACEHOLDER_TEXT,
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
    resumePrompt: RECOVERY_RESUME_TEXT,
  };
}

/**
 * Handle session recovery
 */
export async function handleSessionRecovery(
  sessionId: string,
  error: unknown,
  messageData?: MessageData,
  options: SessionRecoveryOptions = {}
): Promise<RecoveryAction> {
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  } as Required<SessionRecoveryOptions>;

  // Check if already processing
  if (processingErrors.has(sessionId)) {
    debugLog(
      mergedOptions,
      `Already processing recovery for session ${sessionId}`
    );
    return {
      success: false,
      action: "none",
      message: "Recovery already in progress",
    };
  }

  const errorType = detectErrorType(error);
  if (errorType === "unknown") {
    return { success: false, action: "none", message: "Unknown error type" };
  }

  // Check retry limit
  const state = getRecoveryState(sessionId);
  if (state && state.attempts >= mergedOptions.maxRetries) {
    debugLog(mergedOptions, `Max retries reached for session ${sessionId}`);
    return {
      success: false,
      action: "none",
      message: "Max recovery attempts reached",
    };
  }

  // Check cooldown
  if (
    state &&
    state.lastAttempt &&
    Date.now() - state.lastAttempt < RECOVERY_COOLDOWN_MS
  ) {
    debugLog(mergedOptions, `Recovery cooldown for session ${sessionId}`);
    return {
      success: false,
      action: "none",
      message: "Recovery on cooldown",
    };
  }

  // Mark as processing
  processingErrors.add(sessionId);
  updateRecoveryState(sessionId, errorType, true);

  // Call abort callback before recovery
  if (onAbortCallback) {
    onAbortCallback(sessionId);
  }

  try {
    let result: RecoveryAction;

    switch (errorType) {
      case "tool_result_missing":
        result = await recoverToolResultMissing(
          sessionId,
          messageData,
          mergedOptions
        );
        break;

      case "thinking_block_order":
        result = await recoverThinkingBlockOrder(
          sessionId,
          messageData,
          mergedOptions,
          error
        );
        break;

      case "thinking_disabled_violation":
        result = await recoverThinkingDisabled(
          sessionId,
          messageData,
          mergedOptions
        );
        break;

      case "empty_content":
        result = await recoverEmptyContent(
          sessionId,
          messageData,
          mergedOptions,
          error
        );
        break;

      case "context_overflow":
        // Context overflow is handled by a separate hook
        result = {
          success: false,
          action: "none",
          message:
            "Context overflow should be handled by context-window-limit-recovery hook",
        };
        break;

      default:
        result = {
          success: false,
          action: "none",
          message: `Unhandled error type: ${errorType}`,
        };
    }

    return result;
  } catch (err) {
    logger.error(`[session-recovery] Recovery failed:`, err);
    return {
      success: false,
      action: "none",
      message: `Recovery failed: ${err}`,
    };
  } finally {
    processingErrors.delete(sessionId);
    updateRecoveryState(sessionId, errorType, false);

    // Always notify recovery complete
    if (onRecoveryCompleteCallback) {
      onRecoveryCompleteCallback(sessionId);
    }
  }
}

/**
 * Create session recovery hook
 */
export function createSessionRecoveryHook(
  options: SessionRecoveryOptions = {}
): Hook {
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  } as Required<SessionRecoveryOptions>;

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
      const result = await handleSessionRecovery(
        sessionId,
        error,
        messageData,
        mergedOptions
      );

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

// Re-export types
export type {
  RecoveryErrorType,
  SessionRecoveryOptions,
  RecoveryState,
  RecoveryAction,
  MessageData,
  MessagePart,
  SessionRecoveryHook,
};

// Re-export storage functions
export {
  readMessages,
  readParts,
  injectTextPart,
  prependThinkingPart,
  stripThinkingParts,
  replaceEmptyTextParts,
  findEmptyMessages,
  findMessagesWithThinkingBlocks,
  findMessagesWithOrphanThinking,
} from "./storage";

// Re-export constants
export {
  MAX_RECOVERY_ATTEMPTS,
  RECOVERY_COOLDOWN_MS,
  RESUME_DELAY_MS,
  RECOVERY_RESUME_TEXT,
  PLACEHOLDER_TEXT,
} from "./constants";
