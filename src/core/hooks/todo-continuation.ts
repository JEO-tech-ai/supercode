import type { Hook, HookContext, HookResult } from "../types";
import { getTodoManager } from "../../services/agents/todo-manager";

const HOOK_NAME = "todo-continuation";
const COUNTDOWN_SECONDS = 2;

interface Todo {
  content: string;
  status: string;
  priority: string;
  id: string;
}

interface SessionState {
  countdownTimer?: ReturnType<typeof setTimeout>;
  countdownInterval?: ReturnType<typeof setInterval>;
  isRecovering?: boolean;
  countdownStartedAt?: number;
  lastMessageAborted?: boolean;
}

const sessions = new Map<string, SessionState>();

const CONTINUATION_PROMPT = `[SYSTEM REMINDER - TODO CONTINUATION]

Incomplete tasks remain in your todo list. Continue working on the next pending task.

- Proceed without asking for permission
- Mark each task complete when finished
- Do not stop until all tasks are done`;

function getSessionState(sessionId: string): SessionState {
  let state = sessions.get(sessionId);
  if (!state) {
    state = {};
    sessions.set(sessionId, state);
  }
  return state;
}

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

export const todoContinuationHook: Hook = {
  name: HOOK_NAME,
  events: ["session.idle"],
  priority: 10,

  async handler(context: HookContext): Promise<HookResult | void> {
    const { event, sessionId } = context;

    if (event !== "session.idle") {
      return { continue: true };
    }

    const state = getSessionState(sessionId);

    if (state.isRecovering || state.lastMessageAborted) {
      state.lastMessageAborted = false;
      return { continue: false };
    }

    const todoManager = getTodoManager();
    if (!todoManager.hasPending()) {
      return { continue: false };
    }

    const pendingTodos = todoManager.listPending();
    const incompleteCount = pendingTodos.length;
    const allTodos = todoManager.list();
    const totalTodos = allTodos.length;

    return new Promise((resolve) => {
      cancelCountdown(sessionId);
      
      let secondsRemaining = COUNTDOWN_SECONDS;
      state.countdownStartedAt = Date.now();

      state.countdownInterval = setInterval(() => {
        secondsRemaining--;
      }, 1000);

      state.countdownTimer = setTimeout(() => {
        cancelCountdown(sessionId);
        
        const prompt = `${CONTINUATION_PROMPT}\n\n[Status: ${totalTodos - incompleteCount}/${totalTodos} completed, ${incompleteCount} remaining]\n\nPending tasks:\n${pendingTodos.map(t => `- ${t.content}`).join("\n")}`;

        resolve({
          continue: true,
          prompt,
        });
      }, COUNTDOWN_SECONDS * 1000);
    });
  },
};

export function markRecovering(sessionId: string): void {
  const state = getSessionState(sessionId);
  state.isRecovering = true;
  cancelCountdown(sessionId);
}

export function markRecoveryComplete(sessionId: string): void {
  const state = sessions.get(sessionId);
  if (state) {
    state.isRecovering = false;
  }
}

export function markMessageAborted(sessionId: string): void {
  const state = getSessionState(sessionId);
  state.lastMessageAborted = true;
}

export function cleanupSession(sessionId: string): void {
  cancelCountdown(sessionId);
  sessions.delete(sessionId);
}
