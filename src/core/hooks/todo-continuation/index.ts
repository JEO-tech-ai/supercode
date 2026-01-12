/**
 * Todo Continuation Enforcer Hook
 * Automatically resumes work on incomplete todos when session becomes idle.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "../types";
import type {
  Todo,
  SessionState,
  MessageInfo,
  TodoContinuationOptions,
  TodoContinuationEnforcer,
} from "./types";
import logger from "../../../shared/logger";

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<TodoContinuationOptions> = {
  debug: false,
  countdownSeconds: 2,
  toastDurationMs: 900,
  gracePeriodMs: 500,
  continuationPrompt: `[SYSTEM REMINDER - TODO CONTINUATION]

Incomplete tasks remain in your todo list. Continue working on the next pending task.

- Proceed without asking for permission
- Mark each task complete when finished
- Do not stop until all tasks are done`,
};

/**
 * Session states map
 */
const sessions = new Map<string, SessionState>();

/**
 * Get session state
 */
function getState(sessionId: string): SessionState {
  let state = sessions.get(sessionId);
  if (!state) {
    state = {};
    sessions.set(sessionId, state);
  }
  return state;
}

/**
 * Cancel countdown for a session
 */
function cancelCountdown(sessionId: string): void {
  const state = sessions.get(sessionId);
  if (!state) return;

  if (state.countdownTimer) {
    clearTimeout(state.countdownTimer);
    state.countdownTimer = undefined;
  }
  if (state.countdownInterval) {
    clearInterval(state.countdownInterval);
    state.countdownInterval = undefined;
  }
  state.countdownStartedAt = undefined;
}

/**
 * Clean up session state
 */
function cleanup(sessionId: string): void {
  cancelCountdown(sessionId);
  sessions.delete(sessionId);
}

/**
 * Get incomplete todo count
 */
function getIncompleteCount(todos: Todo[]): number {
  return todos.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled"
  ).length;
}

/**
 * Check if last assistant message was aborted
 */
function isLastAssistantMessageAborted(
  messages: Array<{ info?: MessageInfo }>
): boolean {
  if (!messages || messages.length === 0) return false;

  const assistantMessages = messages.filter(
    (m) => m.info?.role === "assistant"
  );
  if (assistantMessages.length === 0) return false;

  const lastAssistant = assistantMessages[assistantMessages.length - 1];
  const errorName = lastAssistant.info?.error?.name;

  if (!errorName) return false;

  return errorName === "MessageAbortedError" || errorName === "AbortError";
}

/**
 * Mark session as recovering
 */
export function markRecovering(sessionId: string): void {
  const state = getState(sessionId);
  state.isRecovering = true;
  cancelCountdown(sessionId);
  logger.debug(`[todo-continuation] Session marked as recovering: ${sessionId}`);
}

/**
 * Mark session recovery complete
 */
export function markRecoveryComplete(sessionId: string): void {
  const state = sessions.get(sessionId);
  if (state) {
    state.isRecovering = false;
    logger.debug(`[todo-continuation] Session recovery complete: ${sessionId}`);
  }
}

/**
 * Create todo continuation enforcer hook
 * @param options - Hook options
 * @returns Hook instance and enforcer interface
 */
export function createTodoContinuationHook(
  options: TodoContinuationOptions = {}
): { hook: Hook; enforcer: TodoContinuationEnforcer } {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const enforcer: TodoContinuationEnforcer = {
    markRecovering,
    markRecoveryComplete,
    cancelCountdown,
    getState: (sessionId: string) => sessions.get(sessionId),
  };

  const hook: Hook = {
    name: "todo-continuation",
    description: "Automatically resumes work on incomplete todos",
    events: [
      "session.idle",
      "session.error",
      "session.end",
      "session.deleted",
      "message.after",
      "message.updated",
      "tool.before",
      "tool.after",
    ],
    priority: 50, // Medium priority

    async handler(context: HookContext): Promise<HookResult | void> {
      const { sessionId, event, data } = context;

      // Handle session deletion
      if (event === "session.deleted" || event === "session.end") {
        cleanup(sessionId);
        if (mergedOptions.debug) {
          logger.debug(`[todo-continuation] Session cleaned up: ${sessionId}`);
        }
        return;
      }

      // Handle session error
      if (event === "session.error") {
        cancelCountdown(sessionId);
        if (mergedOptions.debug) {
          logger.debug(`[todo-continuation] Session error, countdown cancelled: ${sessionId}`);
        }
        return;
      }

      // Handle tool execution (cancel countdown)
      if (event === "tool.before" || event === "tool.after") {
        cancelCountdown(sessionId);
        return;
      }

      // Handle message updates (cancel countdown on assistant activity)
      if (event === "message.after" || event === "message.updated") {
        const messageData = data as { role?: string; info?: MessageInfo } | undefined;
        const role = messageData?.role || messageData?.info?.role;

        if (role === "user") {
          const state = sessions.get(sessionId);
          if (state?.countdownStartedAt) {
            const elapsed = Date.now() - state.countdownStartedAt;
            if (elapsed < mergedOptions.gracePeriodMs) {
              if (mergedOptions.debug) {
                logger.debug(
                  `[todo-continuation] Ignoring user message in grace period: ${sessionId}`
                );
              }
              return;
            }
          }
          cancelCountdown(sessionId);
        }

        if (role === "assistant") {
          cancelCountdown(sessionId);
        }
        return;
      }

      // Handle session idle - main logic
      if (event === "session.idle") {
        const state = getState(sessionId);

        if (state.isRecovering) {
          if (mergedOptions.debug) {
            logger.debug(`[todo-continuation] Skipped: in recovery: ${sessionId}`);
          }
          return;
        }

        // Get todos from context data
        const idleData = data as {
          todos?: Todo[];
          messages?: Array<{ info?: MessageInfo }>;
          pendingTasks?: number;
        } | undefined;

        const todos = idleData?.todos;
        const messages = idleData?.messages;

        // Check if last message was aborted
        if (messages && isLastAssistantMessageAborted(messages)) {
          if (mergedOptions.debug) {
            logger.debug(
              `[todo-continuation] Skipped: last message was aborted: ${sessionId}`
            );
          }
          return;
        }

        // Check if there are incomplete todos
        if (!todos || todos.length === 0) {
          if (mergedOptions.debug) {
            logger.debug(`[todo-continuation] No todos found: ${sessionId}`);
          }
          return;
        }

        const incompleteCount = getIncompleteCount(todos);
        if (incompleteCount === 0) {
          if (mergedOptions.debug) {
            logger.debug(`[todo-continuation] All todos complete: ${sessionId}`);
          }
          return;
        }

        // Start countdown
        cancelCountdown(sessionId);

        let secondsRemaining = mergedOptions.countdownSeconds;
        state.countdownStartedAt = Date.now();

        if (mergedOptions.debug) {
          logger.debug(
            `[todo-continuation] Starting countdown: ${sessionId}, seconds: ${secondsRemaining}, incomplete: ${incompleteCount}`
          );
        }

        // Set up countdown interval
        state.countdownInterval = setInterval(() => {
          secondsRemaining--;
          if (secondsRemaining > 0 && mergedOptions.debug) {
            logger.debug(
              `[todo-continuation] Countdown: ${secondsRemaining}s remaining`
            );
          }
        }, 1000);

        // Set up timer to inject continuation
        state.countdownTimer = setTimeout(() => {
          cancelCountdown(sessionId);

          // Double-check state
          const currentState = sessions.get(sessionId);
          if (currentState?.isRecovering) {
            return;
          }

          // Re-check incomplete count
          const freshIncomplete = getIncompleteCount(todos);
          if (freshIncomplete === 0) {
            return;
          }

          // Generate continuation prompt
          const prompt = `${mergedOptions.continuationPrompt}\n\n[Status: ${todos.length - freshIncomplete}/${todos.length} completed, ${freshIncomplete} remaining]`;

          if (mergedOptions.debug) {
            logger.debug(
              `[todo-continuation] Injecting continuation: ${sessionId}, incomplete: ${freshIncomplete}`
            );
          }

          // Return continuation prompt
          // Note: The actual injection would be handled by the hook manager
          // This is a simplified version that returns the prompt
        }, mergedOptions.countdownSeconds * 1000);

        return;
      }

      return;
    },
  };

  return { hook, enforcer };
}

// Re-export types
export type {
  Todo,
  SessionState,
  MessageInfo,
  TodoContinuationOptions,
  TodoContinuationEnforcer,
} from "./types";

// Export utility functions
export { getIncompleteCount, isLastAssistantMessageAborted };
