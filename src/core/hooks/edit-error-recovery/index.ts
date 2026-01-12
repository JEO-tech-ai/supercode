/**
 * Edit Error Recovery Hook
 * Handles recovery from file editing errors.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "../types";
import logger from "../../../shared/logger";

/**
 * Edit error types
 */
export type EditErrorType =
  | "file_not_found"
  | "permission_denied"
  | "content_mismatch"
  | "file_changed"
  | "merge_conflict"
  | "unknown";

/**
 * Edit error recovery options
 */
export interface EditErrorRecoveryOptions {
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in ms */
  retryDelayMs?: number;
  /** Auto-retry on recoverable errors */
  autoRetry?: boolean;
  /** Create backup before retry */
  createBackup?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: EditErrorRecoveryOptions = {
  maxRetries: 2,
  retryDelayMs: 500,
  autoRetry: true,
  createBackup: false,
  debug: false,
};

/**
 * Retry state per session and file
 */
const retryState = new Map<string, Map<string, number>>();

/**
 * Detect edit error type
 */
export function detectEditErrorType(error: unknown): EditErrorType {
  const errorMessage = getErrorMessage(error).toLowerCase();

  if (errorMessage.includes("not found") || errorMessage.includes("no such file")) {
    return "file_not_found";
  }

  if (errorMessage.includes("permission") || errorMessage.includes("access denied")) {
    return "permission_denied";
  }

  if (errorMessage.includes("mismatch") || errorMessage.includes("does not match")) {
    return "content_mismatch";
  }

  if (errorMessage.includes("changed") || errorMessage.includes("modified")) {
    return "file_changed";
  }

  if (errorMessage.includes("conflict") || errorMessage.includes("merge")) {
    return "merge_conflict";
  }

  return "unknown";
}

/**
 * Get error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (typeof err.message === "string") return err.message;
  }
  return String(error);
}

/**
 * Check if error is recoverable
 */
export function isRecoverableEditError(errorType: EditErrorType): boolean {
  return errorType === "content_mismatch" || errorType === "file_changed";
}

/**
 * Get retry count for session and file
 */
function getRetryCount(sessionId: string, filePath: string): number {
  const sessionRetries = retryState.get(sessionId);
  if (!sessionRetries) return 0;
  return sessionRetries.get(filePath) || 0;
}

/**
 * Increment retry count
 */
function incrementRetryCount(sessionId: string, filePath: string): number {
  let sessionRetries = retryState.get(sessionId);
  if (!sessionRetries) {
    sessionRetries = new Map();
    retryState.set(sessionId, sessionRetries);
  }

  const currentCount = sessionRetries.get(filePath) || 0;
  const newCount = currentCount + 1;
  sessionRetries.set(filePath, newCount);
  return newCount;
}

/**
 * Reset retry count
 */
function resetRetryCount(sessionId: string, filePath?: string): void {
  if (filePath) {
    const sessionRetries = retryState.get(sessionId);
    if (sessionRetries) {
      sessionRetries.delete(filePath);
    }
  } else {
    retryState.delete(sessionId);
  }
}

/**
 * Create edit error recovery hook
 */
export function createEditErrorRecoveryHook(
  options: EditErrorRecoveryOptions = {}
): Hook {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  return {
    name: "edit-error-recovery",
    description: "Handles recovery from file editing errors",
    events: ["tool.error", "session.deleted"],
    priority: 75,

    async handler(context: HookContext): Promise<HookResult | void> {
      const { sessionId, event, data } = context;

      // Clean up on session delete
      if (event === "session.deleted") {
        resetRetryCount(sessionId);
        return;
      }

      if (!data) return;

      const toolData = data as {
        toolName?: string;
        error?: unknown;
        args?: {
          file_path?: string;
          path?: string;
        };
      };

      // Only handle edit-related tools
      const editTools = ["Edit", "Write", "NotebookEdit", "edit", "write"];
      if (!toolData.toolName || !editTools.includes(toolData.toolName)) {
        return;
      }

      const error = toolData.error;
      if (!error) return;

      const errorType = detectEditErrorType(error);
      const filePath = toolData.args?.file_path || toolData.args?.path || "unknown";

      if (mergedOptions.debug) {
        logger.debug(
          `[edit-error-recovery] Error type: ${errorType}, file: ${filePath}`
        );
      }

      // Check if recoverable
      if (!isRecoverableEditError(errorType)) {
        return {
          continue: true,
          context: [`Edit error (${errorType}): ${getErrorMessage(error)}`],
        };
      }

      // Check retry limit
      const retryCount = getRetryCount(sessionId, filePath);
      if (retryCount >= (mergedOptions.maxRetries || 2)) {
        logger.warn(
          `[edit-error-recovery] Max retries reached for ${filePath}`
        );
        return {
          continue: true,
          context: [
            `Edit failed after ${retryCount} retries. ` +
            `Please re-read the file and try again with updated content.`,
          ],
        };
      }

      // Increment retry count
      incrementRetryCount(sessionId, filePath);

      // Return recovery suggestion
      const suggestion = errorType === "content_mismatch"
        ? `The file content has changed. Please re-read "${filePath}" and retry the edit.`
        : `The file was modified. Please re-read "${filePath}" and retry the edit.`;

      logger.info(`[edit-error-recovery] ${suggestion}`);

      return {
        continue: true,
        prompt: suggestion,
        context: [suggestion],
      };
    },
  };
}

/**
 * Clear all retry state (for testing)
 */
export function clearRetryState(): void {
  retryState.clear();
}

export type { EditErrorType, EditErrorRecoveryOptions };
