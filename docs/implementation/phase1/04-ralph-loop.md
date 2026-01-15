# Phase 1.4: Ralph Loop (Agentic Iteration Loop)

> Priority: P0 (Critical - Core autonomous operation)
> Effort: 3-4 days
> Dependencies: Session events, persistent storage

## Overview

Ralph Loop is the core mechanism for autonomous task completion. When activated, it automatically continues prompting the agent until a completion promise is detected in the output, enabling truly agentic workflows without manual intervention.

## Current State in SuperCode

### Existing Files
```
src/core/session/types.ts      # Has loop field in SessionState
src/core/session/manager.ts    # Session lifecycle management
```

### What Exists
- SessionState type includes `loop` field with `iterations` and `maxIterations`
- Basic session event emission

### What's Missing
- Ralph Loop hook implementation
- Persistent loop state storage
- Completion promise detection
- Continuation prompt injection
- Max iteration enforcement
- User abort handling

## Reference Implementation (Oh-My-OpenCode)

```typescript
// From oh-my-opencode/src/hooks/ralph-loop/

interface RalphLoopState {
  active: boolean;
  iteration: number;
  max_iterations: number;
  completion_promise: string;
  started_at: string;
  prompt: string;
  session_id: string;
}

const CONTINUATION_PROMPT = `[RALPH LOOP - ITERATION {{ITERATION}}/{{MAX}}]

Your previous attempt did not output the completion promise. Continue working on the task.

IMPORTANT:
- Review your progress so far
- Continue from where you left off  
- When FULLY complete, output: <promise>{{PROMISE}}</promise>
- Do not stop until the task is truly done

Original task:
{{PROMPT}}`
```

## Implementation Plan

### File Structure
```
src/core/hooks/ralph-loop/
├── index.ts          # Main hook and loop controller
├── storage.ts        # Persistent state management
├── detector.ts       # Completion promise detection
├── constants.ts      # Default values
└── types.ts          # Type definitions
```

### 1. Types Definition (`types.ts`)

```typescript
export interface RalphLoopState {
  active: boolean;
  iteration: number;
  maxIterations: number;
  completionPromise: string;
  startedAt: string;
  prompt: string;
  sessionId: string;
  lastIterationAt?: string;
  description?: string;
}

export interface RalphLoopConfig {
  enabled: boolean;
  defaultMaxIterations: number;
  defaultCompletionPromise: string;
  continuationDelay: number;  // ms before injecting continuation
  stateDir?: string;          // Directory for persistent state
}

export interface StartLoopOptions {
  maxIterations?: number;
  completionPromise?: string;
  description?: string;
}

export interface RalphLoopHook {
  startLoop: (sessionId: string, prompt: string, options?: StartLoopOptions) => boolean;
  cancelLoop: (sessionId: string) => boolean;
  getState: (sessionId?: string) => RalphLoopState | null;
  isLoopActive: (sessionId: string) => boolean;
}
```

### 2. Constants (`constants.ts`)

```typescript
import type { RalphLoopConfig } from './types';

export const HOOK_NAME = 'ralph-loop';

export const DEFAULT_MAX_ITERATIONS = 100;
export const DEFAULT_COMPLETION_PROMISE = 'DONE';
export const DEFAULT_CONTINUATION_DELAY = 500; // ms

export const DEFAULT_CONFIG: RalphLoopConfig = {
  enabled: true,
  defaultMaxIterations: DEFAULT_MAX_ITERATIONS,
  defaultCompletionPromise: DEFAULT_COMPLETION_PROMISE,
  continuationDelay: DEFAULT_CONTINUATION_DELAY,
};

export const CONTINUATION_PROMPT_TEMPLATE = `[RALPH LOOP - ITERATION {{ITERATION}}/{{MAX}}]

Your previous attempt did not output the completion promise. Continue working on the task.

IMPORTANT:
- Review your progress so far
- Continue from where you left off  
- When FULLY complete, output: <promise>{{PROMISE}}</promise>
- Do not stop until the task is truly done

Original task:
{{PROMPT}}`;
```

### 3. Persistent Storage (`storage.ts`)

```typescript
import * as fs from 'fs';
import * as path from 'path';
import type { RalphLoopState } from './types';
import { Log } from '../../../shared/logger';

const STATE_FILENAME = 'ralph-loop-state.json';

function getStateFilePath(workdir: string, stateDir?: string): string {
  const baseDir = stateDir || path.join(workdir, '.supercoin');
  return path.join(baseDir, STATE_FILENAME);
}

export function readState(workdir: string, stateDir?: string): RalphLoopState | null {
  const filePath = getStateFilePath(workdir, stateDir);
  
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as RalphLoopState;
  } catch (error) {
    Log.warn(`[ralph-loop] Failed to read state: ${error}`);
    return null;
  }
}

export function writeState(
  workdir: string, 
  state: RalphLoopState, 
  stateDir?: string
): boolean {
  const filePath = getStateFilePath(workdir, stateDir);
  
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
    return true;
  } catch (error) {
    Log.error(`[ralph-loop] Failed to write state: ${error}`);
    return false;
  }
}

export function clearState(workdir: string, stateDir?: string): boolean {
  const filePath = getStateFilePath(workdir, stateDir);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch (error) {
    Log.error(`[ralph-loop] Failed to clear state: ${error}`);
    return false;
  }
}

export function incrementIteration(
  workdir: string, 
  stateDir?: string
): RalphLoopState | null {
  const state = readState(workdir, stateDir);
  if (!state) return null;
  
  state.iteration++;
  state.lastIterationAt = new Date().toISOString();
  
  if (writeState(workdir, state, stateDir)) {
    return state;
  }
  
  return null;
}
```

### 4. Completion Detection (`detector.ts`)

```typescript
import * as fs from 'fs';
import type { RalphLoopState } from './types';
import { Log } from '../../../shared/logger';

/**
 * Detect completion promise in text
 */
export function detectCompletionPromise(
  text: string,
  promise: string
): boolean {
  const pattern = new RegExp(
    `<promise>\\s*${escapeRegex(promise)}\\s*</promise>`,
    'is'
  );
  return pattern.test(text);
}

/**
 * Detect completion in transcript file
 */
export function detectInTranscript(
  transcriptPath: string | undefined,
  promise: string
): boolean {
  if (!transcriptPath) return false;

  try {
    if (!fs.existsSync(transcriptPath)) return false;

    const content = fs.readFileSync(transcriptPath, 'utf-8');
    return detectCompletionPromise(content, promise);
  } catch {
    return false;
  }
}

/**
 * Detect completion in session messages
 */
export async function detectInMessages(
  messages: Array<{ role?: string; content?: string }>,
  promise: string
): Promise<boolean> {
  // Check assistant messages from most recent
  const assistantMessages = messages
    .filter(m => m.role === 'assistant')
    .reverse();

  for (const msg of assistantMessages) {
    if (msg.content && detectCompletionPromise(msg.content, promise)) {
      return true;
    }
  }

  return false;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build continuation prompt from template
 */
export function buildContinuationPrompt(
  template: string,
  state: RalphLoopState
): string {
  return template
    .replace('{{ITERATION}}', String(state.iteration))
    .replace('{{MAX}}', String(state.maxIterations))
    .replace('{{PROMISE}}', state.completionPromise)
    .replace('{{PROMPT}}', state.prompt);
}
```

### 5. Main Hook (`index.ts`)

```typescript
import type { Hook, HookContext, HookResult } from '../../types';
import type { 
  RalphLoopState, 
  RalphLoopConfig, 
  StartLoopOptions,
  RalphLoopHook 
} from './types';
import { 
  DEFAULT_CONFIG, 
  HOOK_NAME, 
  CONTINUATION_PROMPT_TEMPLATE 
} from './constants';
import { 
  readState, 
  writeState, 
  clearState, 
  incrementIteration 
} from './storage';
import { 
  detectCompletionPromise, 
  detectInMessages,
  buildContinuationPrompt 
} from './detector';
import { Log } from '../../../shared/logger';

export interface RalphLoopOptions {
  config?: Partial<RalphLoopConfig>;
  workdir?: string;
  getMessages?: (sessionId: string) => Promise<Array<{ role?: string; content?: string }>>;
  injectPrompt?: (sessionId: string, prompt: string) => Promise<void>;
  showToast?: (message: { title: string; message: string; variant: string; duration?: number }) => void;
  checkSessionExists?: (sessionId: string) => Promise<boolean>;
}

interface SessionRecoveryState {
  isRecovering?: boolean;
}

export function createRalphLoopHook(
  options: RalphLoopOptions = {}
): Hook & RalphLoopHook {
  const config: RalphLoopConfig = {
    ...DEFAULT_CONFIG,
    ...options.config,
  };

  const workdir = options.workdir || process.cwd();
  const sessions = new Map<string, SessionRecoveryState>();

  const getMessages = options.getMessages ?? (async () => []);
  const injectPrompt = options.injectPrompt ?? (async () => {});
  const showToast = options.showToast ?? (() => {});
  const checkSessionExists = options.checkSessionExists;

  function getSessionState(sessionId: string): SessionRecoveryState {
    let state = sessions.get(sessionId);
    if (!state) {
      state = {};
      sessions.set(sessionId, state);
    }
    return state;
  }

  // Public API
  const startLoop = (
    sessionId: string,
    prompt: string,
    loopOptions?: StartLoopOptions
  ): boolean => {
    const state: RalphLoopState = {
      active: true,
      iteration: 1,
      maxIterations: loopOptions?.maxIterations ?? config.defaultMaxIterations,
      completionPromise: loopOptions?.completionPromise ?? config.defaultCompletionPromise,
      startedAt: new Date().toISOString(),
      prompt,
      sessionId,
      description: loopOptions?.description,
    };

    const success = writeState(workdir, state, config.stateDir);
    
    if (success) {
      Log.info(`[${HOOK_NAME}] Loop started`, {
        sessionId,
        maxIterations: state.maxIterations,
        completionPromise: state.completionPromise,
      });

      showToast({
        title: 'Ralph Loop Started',
        message: `Max ${state.maxIterations} iterations. Complete with <promise>${state.completionPromise}</promise>`,
        variant: 'info',
        duration: 3000,
      });
    }

    return success;
  };

  const cancelLoop = (sessionId: string): boolean => {
    const state = readState(workdir, config.stateDir);
    
    if (!state || state.sessionId !== sessionId) {
      return false;
    }

    const success = clearState(workdir, config.stateDir);
    
    if (success) {
      Log.info(`[${HOOK_NAME}] Loop cancelled`, { 
        sessionId, 
        iteration: state.iteration 
      });

      showToast({
        title: 'Ralph Loop Cancelled',
        message: `Stopped at iteration ${state.iteration}`,
        variant: 'info',
        duration: 2000,
      });
    }

    return success;
  };

  const getState = (sessionId?: string): RalphLoopState | null => {
    const state = readState(workdir, config.stateDir);
    
    if (sessionId && state?.sessionId !== sessionId) {
      return null;
    }
    
    return state;
  };

  const isLoopActive = (sessionId: string): boolean => {
    const state = readState(workdir, config.stateDir);
    return state?.active === true && state?.sessionId === sessionId;
  };

  // Event handler
  const handler = async (context: HookContext): Promise<HookResult | void> => {
    const { event, sessionId, data } = context;

    // Handle session deletion
    if (event === 'session.deleted') {
      const deletedId = (data as { sessionId?: string })?.sessionId ?? sessionId;
      const state = readState(workdir, config.stateDir);
      
      if (state?.sessionId === deletedId) {
        clearState(workdir, config.stateDir);
        Log.info(`[${HOOK_NAME}] Session deleted, loop cleared`, { sessionId: deletedId });
      }
      
      sessions.delete(deletedId);
      return;
    }

    // Handle errors - might indicate abort
    if (event === 'session.error') {
      const error = (data as { error?: { name?: string } })?.error;
      
      if (error?.name === 'MessageAbortedError' || error?.name === 'AbortError') {
        const state = readState(workdir, config.stateDir);
        
        if (state?.sessionId === sessionId) {
          clearState(workdir, config.stateDir);
          Log.info(`[${HOOK_NAME}] User aborted, loop cleared`, { sessionId });
        }
        
        sessions.delete(sessionId);
        return;
      }

      // Mark as recovering for other errors
      const sessionState = getSessionState(sessionId);
      sessionState.isRecovering = true;
      
      setTimeout(() => {
        sessionState.isRecovering = false;
      }, 5000);
      
      return;
    }

    // Handle session idle - main loop logic
    if (event === 'session.idle') {
      const sessionState = getSessionState(sessionId);
      
      // Skip if recovering
      if (sessionState.isRecovering) {
        Log.info(`[${HOOK_NAME}] Skipped: in recovery`, { sessionId });
        return;
      }

      const state = readState(workdir, config.stateDir);
      
      if (!state || !state.active) {
        return;
      }

      // Verify session matches
      if (state.sessionId !== sessionId) {
        // Check if original session still exists
        if (checkSessionExists) {
          try {
            const exists = await checkSessionExists(state.sessionId);
            if (!exists) {
              clearState(workdir, config.stateDir);
              Log.info(`[${HOOK_NAME}] Cleared orphaned state`, {
                orphanedSessionId: state.sessionId,
                currentSessionId: sessionId,
              });
            }
          } catch {
            // Ignore check failures
          }
        }
        return;
      }

      // Check for completion
      const messages = await getMessages(sessionId);
      const completed = await detectInMessages(messages, state.completionPromise);

      if (completed) {
        Log.info(`[${HOOK_NAME}] Completion detected!`, {
          sessionId,
          iteration: state.iteration,
          promise: state.completionPromise,
        });

        clearState(workdir, config.stateDir);

        showToast({
          title: 'Ralph Loop Complete!',
          message: `Task completed after ${state.iteration} iteration(s)`,
          variant: 'success',
          duration: 5000,
        });

        return;
      }

      // Check max iterations
      if (state.iteration >= state.maxIterations) {
        Log.info(`[${HOOK_NAME}] Max iterations reached`, {
          sessionId,
          iteration: state.iteration,
          max: state.maxIterations,
        });

        clearState(workdir, config.stateDir);

        showToast({
          title: 'Ralph Loop Stopped',
          message: `Max iterations (${state.maxIterations}) reached without completion`,
          variant: 'warning',
          duration: 5000,
        });

        return;
      }

      // Increment and continue
      const newState = incrementIteration(workdir, config.stateDir);
      
      if (!newState) {
        Log.error(`[${HOOK_NAME}] Failed to increment iteration`, { sessionId });
        return;
      }

      Log.info(`[${HOOK_NAME}] Continuing loop`, {
        sessionId,
        iteration: newState.iteration,
        max: newState.maxIterations,
      });

      // Show progress toast
      showToast({
        title: 'Ralph Loop',
        message: `Iteration ${newState.iteration}/${newState.maxIterations}`,
        variant: 'info',
        duration: 2000,
      });

      // Build and inject continuation prompt
      const continuationPrompt = buildContinuationPrompt(
        CONTINUATION_PROMPT_TEMPLATE,
        newState
      );

      // Delay then inject
      setTimeout(async () => {
        try {
          await injectPrompt(sessionId, continuationPrompt);
        } catch (err) {
          Log.error(`[${HOOK_NAME}] Failed to inject continuation`, {
            sessionId,
            error: String(err),
          });
        }
      }, config.continuationDelay);
    }
  };

  return {
    name: HOOK_NAME,
    description: 'Agentic iteration loop for autonomous task completion',
    priority: 50, // Lower than recovery hooks
    events: ['session.idle', 'session.error', 'session.deleted'],
    handler,
    
    // Public API
    startLoop,
    cancelLoop,
    getState,
    isLoopActive,
  };
}

export * from './types';
export * from './constants';
export { readState, writeState, clearState } from './storage';
export { detectCompletionPromise, detectInMessages } from './detector';
```

## Integration Points

### 1. Command to Start Loop

```typescript
// src/command/ralph.ts
import { createRalphLoopHook } from '../core/hooks/ralph-loop';

const ralphHook = createRalphLoopHook(options);

// /ralph command handler
async function handleRalphCommand(args: string): Promise<void> {
  const parsed = parseRalphArgs(args);
  
  const started = ralphHook.startLoop(
    currentSessionId,
    parsed.prompt,
    {
      maxIterations: parsed.maxIterations,
      completionPromise: parsed.completionPromise,
    }
  );

  if (started) {
    // Inject initial prompt to start the loop
    await injectPrompt(currentSessionId, parsed.prompt);
  }
}

function parseRalphArgs(args: string): {
  prompt: string;
  maxIterations: number;
  completionPromise: string;
} {
  // Parse: "task description" [--max-iterations=N] [--completion-promise=TEXT]
  // ...
}
```

### 2. Cancel Command

```typescript
// /cancel-ralph command handler
async function handleCancelRalphCommand(): Promise<void> {
  const cancelled = ralphHook.cancelLoop(currentSessionId);
  
  if (!cancelled) {
    showToast({
      title: 'No Active Loop',
      message: 'No Ralph Loop is currently running',
      variant: 'info',
    });
  }
}
```

### 3. Register Hook

```typescript
// src/core/hooks/index.ts
import { createRalphLoopHook } from './ralph-loop';

const ralphHook = createRalphLoopHook({
  workdir: process.cwd(),
  getMessages: async (sessionId) => {
    const session = await sessionManager.getSession(sessionId);
    return session?.messages ?? [];
  },
  injectPrompt: async (sessionId, prompt) => {
    await sessionManager.addMessage(sessionId, {
      role: 'user',
      content: prompt,
    });
    // Trigger LLM response
  },
  showToast: (msg) => {
    // TUI toast
  },
  checkSessionExists: async (sessionId) => {
    return sessionManager.getSession(sessionId) !== undefined;
  },
});

getHookRegistry().register(ralphHook);
```

## Usage Examples

### Basic Usage
```bash
# Start a Ralph Loop
/ralph "Implement the user authentication feature. Create login, register, and logout endpoints with proper validation."

# The loop will continue until the agent outputs:
# <promise>DONE</promise>
```

### With Custom Options
```bash
# Custom completion promise and max iterations
/ralph "Fix all TypeScript errors in src/" --max-iterations=25 --completion-promise=ALL_FIXED
```

### Programmatic Usage
```typescript
// Start loop
ralphHook.startLoop(sessionId, "Refactor the database layer", {
  maxIterations: 50,
  completionPromise: "REFACTOR_COMPLETE",
});

// Check status
const state = ralphHook.getState(sessionId);
console.log(`Iteration ${state.iteration}/${state.maxIterations}`);

// Cancel
ralphHook.cancelLoop(sessionId);
```

## Testing Plan

### Unit Tests
```typescript
describe('RalphLoopStorage', () => {
  it('should write and read state');
  it('should increment iteration');
  it('should clear state');
});

describe('detectCompletionPromise', () => {
  it('should detect <promise>DONE</promise>');
  it('should handle whitespace variations');
  it('should be case insensitive');
  it('should handle custom promises');
});

describe('RalphLoopHook', () => {
  it('should start loop and save state');
  it('should detect completion and clear state');
  it('should increment on session.idle without completion');
  it('should stop at max iterations');
  it('should cancel on user abort');
  it('should skip during recovery');
});
```

### Integration Tests
```typescript
describe('Ralph Loop Integration', () => {
  it('should complete after agent outputs promise');
  it('should continue for multiple iterations');
  it('should persist state across restarts');
});
```

## Success Criteria

- [ ] State persists across session restarts
- [ ] Completion detected in agent output
- [ ] Continuation prompt injected on idle
- [ ] Max iterations enforced
- [ ] User abort cancels loop
- [ ] Toast notifications shown
- [ ] Works with recovery hooks
- [ ] /ralph command functional
- [ ] /cancel-ralph command functional
