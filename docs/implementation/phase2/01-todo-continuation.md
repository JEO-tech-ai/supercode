# Phase 2.1: Todo Continuation Enforcer

> Priority: P1 (High)
> Effort: 2-3 days
> Dependencies: Ralph Loop, Background Task

## Overview

The Todo Continuation Enforcer automatically resumes work when a session goes idle with incomplete todos. It provides a countdown before resumption, allowing users to intervene if needed.

## Current State in SuperCode

### Existing Files
```
src/core/tools/todo.ts              # Todo tool implementation
src/services/agents/todo-manager.ts # Todo state management
src/core/session/types.ts           # SessionTodo type
```

### What Exists
- Todo CRUD operations in session manager
- Todo tool for agent usage
- Todo status tracking

### What's Missing
- Idle detection for incomplete todos
- Countdown mechanism before resumption
- Background task awareness
- Agent permission checking
- User abort detection

## Reference Implementation (Oh-My-OpenCode)

```typescript
interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: string;
  id: string;
}

const CONTINUATION_PROMPT = `[SYSTEM REMINDER - TODO CONTINUATION]

Incomplete tasks remain in your todo list. Continue working on the next pending task.

- Proceed without asking for permission
- Mark each task complete when finished
- Do not stop until all tasks are done`;

const COUNTDOWN_SECONDS = 2;
```

## Implementation Plan

### File Structure
```
src/core/hooks/todo-continuation/
├── index.ts          # Main hook implementation
├── types.ts          # Type definitions
└── prompts.ts        # Prompt templates
```

### 1. Types (`types.ts`)

```typescript
export interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
}

export interface SessionState {
  countdownTimer?: ReturnType<typeof setTimeout>;
  countdownInterval?: ReturnType<typeof setInterval>;
  isRecovering?: boolean;
  countdownStartedAt?: number;
}

export interface TodoContinuationConfig {
  enabled: boolean;
  countdownSeconds: number;
  toastDuration: number;
  gracePeriod: number;  // ms before accepting user messages
}

export const DEFAULT_CONFIG: TodoContinuationConfig = {
  enabled: true,
  countdownSeconds: 2,
  toastDuration: 900,
  gracePeriod: 500,
};

export interface TodoContinuationHook {
  markRecovering: (sessionId: string) => void;
  markRecoveryComplete: (sessionId: string) => void;
}
```

### 2. Prompts (`prompts.ts`)

```typescript
export const CONTINUATION_PROMPT = `[SYSTEM REMINDER - TODO CONTINUATION]

Incomplete tasks remain in your todo list. Continue working on the next pending task.

- Proceed without asking for permission
- Mark each task complete when finished
- Do not stop until all tasks are done`;

export function buildContinuationPrompt(
  completed: number,
  total: number,
  remaining: number
): string {
  return `${CONTINUATION_PROMPT}

[Status: ${completed}/${total} completed, ${remaining} remaining]`;
}
```

### 3. Main Hook (`index.ts`)

```typescript
import type { Hook, HookContext, HookResult } from '../../types';
import type { 
  Todo, 
  SessionState, 
  TodoContinuationConfig,
  TodoContinuationHook 
} from './types';
import { DEFAULT_CONFIG } from './types';
import { buildContinuationPrompt } from './prompts';
import { Log } from '../../../shared/logger';

export interface TodoContinuationOptions {
  config?: Partial<TodoContinuationConfig>;
  getTodos?: (sessionId: string) => Promise<Todo[]>;
  getMessages?: (sessionId: string) => Promise<Array<{ role?: string; error?: unknown }>>;
  injectPrompt?: (sessionId: string, prompt: string, agent?: string) => Promise<void>;
  showToast?: (message: { title: string; message: string; variant: string; duration?: number }) => void;
  getBackgroundTaskCount?: (sessionId: string) => number;
  getMainSessionId?: () => string | undefined;
  isSubagentSession?: (sessionId: string) => boolean;
  getAgentInfo?: (sessionId: string) => { agent?: string; hasWritePermission?: boolean } | null;
}

const HOOK_NAME = 'todo-continuation-enforcer';

export function createTodoContinuationHook(
  options: TodoContinuationOptions = {}
): Hook & TodoContinuationHook {
  const config: TodoContinuationConfig = {
    ...DEFAULT_CONFIG,
    ...options.config,
  };

  const sessions = new Map<string, SessionState>();

  const getTodos = options.getTodos ?? (async () => []);
  const getMessages = options.getMessages ?? (async () => []);
  const injectPrompt = options.injectPrompt ?? (async () => {});
  const showToast = options.showToast ?? (() => {});
  const getBackgroundTaskCount = options.getBackgroundTaskCount ?? (() => 0);
  const getMainSessionId = options.getMainSessionId ?? (() => undefined);
  const isSubagentSession = options.isSubagentSession ?? (() => false);
  const getAgentInfo = options.getAgentInfo ?? (() => null);

  function getState(sessionId: string): SessionState {
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

  function cleanup(sessionId: string): void {
    cancelCountdown(sessionId);
    sessions.delete(sessionId);
  }

  function getIncompleteCount(todos: Todo[]): number {
    return todos.filter(t => 
      t.status !== 'completed' && t.status !== 'cancelled'
    ).length;
  }

  function isLastAssistantAborted(
    messages: Array<{ role?: string; error?: unknown }>
  ): boolean {
    const assistantMsgs = messages.filter(m => m.role === 'assistant');
    if (assistantMsgs.length === 0) return false;

    const last = assistantMsgs[assistantMsgs.length - 1];
    const errorName = (last.error as { name?: string })?.name;

    return errorName === 'MessageAbortedError' || errorName === 'AbortError';
  }

  async function showCountdownToast(
    seconds: number, 
    incompleteCount: number
  ): Promise<void> {
    showToast({
      title: 'Todo Continuation',
      message: `Resuming in ${seconds}s... (${incompleteCount} tasks remaining)`,
      variant: 'warning',
      duration: config.toastDuration,
    });
  }

  async function injectContinuation(
    sessionId: string,
    incompleteCount: number,
    total: number
  ): Promise<void> {
    const state = sessions.get(sessionId);

    if (state?.isRecovering) {
      Log.info(`[${HOOK_NAME}] Skipped injection: in recovery`, { sessionId });
      return;
    }

    // Check for running background tasks
    const bgTaskCount = getBackgroundTaskCount(sessionId);
    if (bgTaskCount > 0) {
      Log.info(`[${HOOK_NAME}] Skipped injection: background tasks running`, { 
        sessionId, 
        bgTaskCount 
      });
      return;
    }

    // Refresh todos
    const todos = await getTodos(sessionId);
    const freshIncompleteCount = getIncompleteCount(todos);
    
    if (freshIncompleteCount === 0) {
      Log.info(`[${HOOK_NAME}] Skipped injection: no incomplete todos`, { sessionId });
      return;
    }

    // Check agent permissions
    const agentInfo = getAgentInfo(sessionId);
    
    if (!agentInfo?.hasWritePermission) {
      Log.info(`[${HOOK_NAME}] Skipped: agent lacks write permission`, { 
        sessionId, 
        agent: agentInfo?.agent 
      });
      return;
    }

    // Skip plan mode agents
    const agentName = agentInfo?.agent?.toLowerCase() ?? '';
    if (agentName === 'plan' || agentName === 'planner') {
      Log.info(`[${HOOK_NAME}] Skipped: plan mode agent`, { 
        sessionId, 
        agent: agentInfo?.agent 
      });
      return;
    }

    const completed = todos.length - freshIncompleteCount;
    const prompt = buildContinuationPrompt(completed, todos.length, freshIncompleteCount);

    try {
      Log.info(`[${HOOK_NAME}] Injecting continuation`, { 
        sessionId, 
        agent: agentInfo?.agent,
        incompleteCount: freshIncompleteCount 
      });

      await injectPrompt(sessionId, prompt, agentInfo?.agent);
      
      Log.info(`[${HOOK_NAME}] Injection successful`, { sessionId });
    } catch (err) {
      Log.error(`[${HOOK_NAME}] Injection failed`, { sessionId, error: String(err) });
    }
  }

  function startCountdown(
    sessionId: string, 
    incompleteCount: number, 
    total: number
  ): void {
    const state = getState(sessionId);
    cancelCountdown(sessionId);

    let secondsRemaining = config.countdownSeconds;
    showCountdownToast(secondsRemaining, incompleteCount);
    state.countdownStartedAt = Date.now();

    state.countdownInterval = setInterval(() => {
      secondsRemaining--;
      if (secondsRemaining > 0) {
        showCountdownToast(secondsRemaining, incompleteCount);
      }
    }, 1000);

    state.countdownTimer = setTimeout(() => {
      cancelCountdown(sessionId);
      injectContinuation(sessionId, incompleteCount, total);
    }, config.countdownSeconds * 1000);

    Log.info(`[${HOOK_NAME}] Countdown started`, { 
      sessionId, 
      seconds: config.countdownSeconds, 
      incompleteCount 
    });
  }

  // Public API
  const markRecovering = (sessionId: string): void => {
    const state = getState(sessionId);
    state.isRecovering = true;
    cancelCountdown(sessionId);
    Log.info(`[${HOOK_NAME}] Session marked as recovering`, { sessionId });
  };

  const markRecoveryComplete = (sessionId: string): void => {
    const state = sessions.get(sessionId);
    if (state) {
      state.isRecovering = false;
      Log.info(`[${HOOK_NAME}] Session recovery complete`, { sessionId });
    }
  };

  // Event handler
  const handler = async (context: HookContext): Promise<HookResult | void> => {
    const { event, sessionId, data } = context;

    // Handle session error
    if (event === 'session.error') {
      cancelCountdown(sessionId);
      Log.info(`[${HOOK_NAME}] session.error`, { sessionId });
      return;
    }

    // Handle session idle
    if (event === 'session.idle') {
      Log.info(`[${HOOK_NAME}] session.idle`, { sessionId });

      // Check if this is main or subagent session
      const mainSessionId = getMainSessionId();
      const isMain = sessionId === mainSessionId;
      const isSubagent = isSubagentSession(sessionId);

      if (mainSessionId && !isMain && !isSubagent) {
        Log.info(`[${HOOK_NAME}] Skipped: not main or subagent session`, { sessionId });
        return;
      }

      const state = getState(sessionId);

      if (state.isRecovering) {
        Log.info(`[${HOOK_NAME}] Skipped: in recovery`, { sessionId });
        return;
      }

      // Check background tasks
      const bgTaskCount = getBackgroundTaskCount(sessionId);
      if (bgTaskCount > 0) {
        Log.info(`[${HOOK_NAME}] Skipped: background tasks running`, { sessionId });
        return;
      }

      // Check for aborted message
      try {
        const messages = await getMessages(sessionId);
        if (isLastAssistantAborted(messages)) {
          Log.info(`[${HOOK_NAME}] Skipped: last message was aborted`, { sessionId });
          return;
        }
      } catch (err) {
        Log.warn(`[${HOOK_NAME}] Messages fetch failed`, { sessionId, error: String(err) });
      }

      // Get todos
      const todos = await getTodos(sessionId);
      
      if (!todos || todos.length === 0) {
        Log.info(`[${HOOK_NAME}] No todos`, { sessionId });
        return;
      }

      const incompleteCount = getIncompleteCount(todos);
      
      if (incompleteCount === 0) {
        Log.info(`[${HOOK_NAME}] All todos complete`, { sessionId, total: todos.length });
        return;
      }

      startCountdown(sessionId, incompleteCount, todos.length);
      return;
    }

    // Handle message updates - cancel countdown on activity
    if (event === 'message.updated' || event === 'message.after') {
      const info = (data as { info?: { role?: string } })?.info;
      
      if (!info) return;

      if (info.role === 'user') {
        const state = sessions.get(sessionId);
        
        // Check grace period
        if (state?.countdownStartedAt) {
          const elapsed = Date.now() - state.countdownStartedAt;
          if (elapsed < config.gracePeriod) {
            Log.info(`[${HOOK_NAME}] Ignoring user message in grace period`, { 
              sessionId, 
              elapsed 
            });
            return;
          }
        }
        
        cancelCountdown(sessionId);
      }

      if (info.role === 'assistant') {
        cancelCountdown(sessionId);
      }
      
      return;
    }

    // Handle tool execution - cancel countdown
    if (event === 'tool.before' || event === 'tool.after') {
      cancelCountdown(sessionId);
      return;
    }

    // Handle session deletion
    if (event === 'session.deleted') {
      cleanup(sessionId);
      Log.info(`[${HOOK_NAME}] Session deleted: cleaned up`, { sessionId });
      return;
    }
  };

  return {
    name: HOOK_NAME,
    description: 'Auto-resumes work when session idles with incomplete todos',
    priority: 40, // Lower than ralph loop
    events: [
      'session.idle',
      'session.error',
      'session.deleted',
      'message.updated',
      'message.after',
      'tool.before',
      'tool.after',
    ],
    handler,
    markRecovering,
    markRecoveryComplete,
  };
}

export * from './types';
```

## Integration Points

### 1. Link with Session Recovery

```typescript
const recoveryHook = createSessionRecoveryHook(options);
const todoHook = createTodoContinuationHook(options);

// Coordinate recovery states
recoveryHook.setOnAbortCallback(todoHook.markRecovering);
recoveryHook.setOnRecoveryCompleteCallback(todoHook.markRecoveryComplete);
```

### 2. Link with Background Manager

```typescript
const todoHook = createTodoContinuationHook({
  getBackgroundTaskCount: (sessionId) => {
    return backgroundManager.getTasksByParentSession(sessionId)
      .filter(t => t.status === 'running')
      .length;
  },
});
```

## Testing Plan

```typescript
describe('TodoContinuationHook', () => {
  it('should start countdown on idle with incomplete todos');
  it('should cancel countdown on user message');
  it('should cancel countdown on assistant message');
  it('should skip during recovery');
  it('should skip when background tasks running');
  it('should inject prompt after countdown');
  it('should respect grace period');
});
```

## Success Criteria

- [ ] Countdown starts on session.idle with incomplete todos
- [ ] Toast shows countdown progress
- [ ] Countdown cancels on user/assistant activity
- [ ] Respects recovery state
- [ ] Skips when background tasks running
- [ ] Injects continuation prompt correctly
