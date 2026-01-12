/**
 * Completion Checking System
 * Recursive completion checking for multi-agent workflows.
 */

import type { RunContext, EventState, SessionStatus } from "./types";

/**
 * Check if all todos in a session are complete
 */
export function areAllTodosComplete(session: SessionStatus): boolean {
  if (session.todos.length === 0) {
    return true;
  }

  return session.todos.every((todo) => todo.status === "completed");
}

/**
 * Check if a session is idle (not actively processing)
 */
export function isSessionIdle(session: SessionStatus): boolean {
  return session.status === "idle" || session.status === "completed";
}

/**
 * Recursively check if all child sessions are idle
 */
export function areAllChildrenIdle(
  sessionId: string,
  sessions: Map<string, SessionStatus>
): boolean {
  const session = sessions.get(sessionId);
  if (!session) {
    return true;
  }

  // Check this session first
  if (!isSessionIdle(session)) {
    return false;
  }

  // Recursively check all children
  for (const childId of session.childIds) {
    if (!areAllChildrenIdle(childId, sessions)) {
      return false;
    }
  }

  return true;
}

/**
 * Check all completion conditions for a multi-agent workflow
 */
export function checkCompletionConditions(
  ctx: RunContext,
  state: EventState
): { complete: boolean; reason?: string } {
  const mainSession = state.sessions.get(ctx.mainSessionId);

  // If main session doesn't exist yet, not complete
  if (!mainSession) {
    return { complete: false, reason: "Main session not found" };
  }

  // Check for errors
  if (state.mainSessionError) {
    return { complete: true, reason: "Main session error" };
  }

  // Check if main session is still active
  if (mainSession.status === "active") {
    return { complete: false, reason: "Main session active" };
  }

  // Check if all todos are complete
  if (!areAllTodosComplete(mainSession)) {
    return { complete: false, reason: "Todos incomplete" };
  }

  // Check if all child sessions are idle
  if (!areAllChildrenIdle(ctx.mainSessionId, state.sessions)) {
    return { complete: false, reason: "Child sessions active" };
  }

  // Check if all background tasks are complete
  for (const [taskId, task] of state.backgroundTasks) {
    if (task.status === "running") {
      return { complete: false, reason: `Background task ${taskId} running` };
    }
  }

  return { complete: true };
}

/**
 * Get summary of workflow status
 */
export function getWorkflowSummary(
  ctx: RunContext,
  state: EventState
): {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  errorSessions: number;
  totalTodos: number;
  completedTodos: number;
  backgroundTasks: number;
  runningBackgroundTasks: number;
} {
  let totalSessions = 0;
  let activeSessions = 0;
  let completedSessions = 0;
  let errorSessions = 0;
  let totalTodos = 0;
  let completedTodos = 0;

  for (const session of state.sessions.values()) {
    totalSessions++;

    switch (session.status) {
      case "active":
        activeSessions++;
        break;
      case "completed":
      case "idle":
        completedSessions++;
        break;
      case "error":
        errorSessions++;
        break;
    }

    totalTodos += session.todos.length;
    completedTodos += session.todos.filter((t) => t.status === "completed").length;
  }

  let backgroundTasks = 0;
  let runningBackgroundTasks = 0;

  for (const task of state.backgroundTasks.values()) {
    backgroundTasks++;
    if (task.status === "running") {
      runningBackgroundTasks++;
    }
  }

  return {
    totalSessions,
    activeSessions,
    completedSessions,
    errorSessions,
    totalTodos,
    completedTodos,
    backgroundTasks,
    runningBackgroundTasks,
  };
}

/**
 * Format workflow summary for display
 */
export function formatWorkflowSummary(
  ctx: RunContext,
  state: EventState
): string {
  const summary = getWorkflowSummary(ctx, state);
  const parts: string[] = [];

  // Sessions
  if (summary.totalSessions > 1) {
    parts.push(
      `Sessions: ${summary.completedSessions}/${summary.totalSessions}` +
        (summary.errorSessions > 0 ? ` (${summary.errorSessions} errors)` : "")
    );
  }

  // Todos
  if (summary.totalTodos > 0) {
    parts.push(`Todos: ${summary.completedTodos}/${summary.totalTodos}`);
  }

  // Background tasks
  if (summary.backgroundTasks > 0) {
    const completed = summary.backgroundTasks - summary.runningBackgroundTasks;
    parts.push(`Background: ${completed}/${summary.backgroundTasks}`);
  }

  return parts.length > 0 ? parts.join(" | ") : "No activity";
}

/**
 * Wait for completion with polling
 */
export async function waitForCompletion(
  ctx: RunContext,
  state: EventState,
  options: {
    pollInterval?: number;
    timeout?: number;
    onPoll?: (summary: ReturnType<typeof getWorkflowSummary>) => void;
  } = {}
): Promise<{ complete: boolean; reason: string; timedOut: boolean }> {
  const { pollInterval = 500, timeout = 300000, onPoll } = options;
  const startTime = Date.now();

  while (true) {
    const result = checkCompletionConditions(ctx, state);

    if (result.complete) {
      return { complete: true, reason: result.reason || "Complete", timedOut: false };
    }

    // Check timeout
    if (Date.now() - startTime > timeout) {
      return { complete: false, reason: result.reason || "Unknown", timedOut: true };
    }

    // Callback for progress updates
    if (onPoll) {
      onPoll(getWorkflowSummary(ctx, state));
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}
