/**
 * Ralph Loop Hook
 * Self-referential development loop for autonomous task completion.
 * Enhanced from Oh-My-OpenCode patterns with persistent state,
 * dual completion detection, and toast notifications.
 */

import { existsSync, readFileSync } from "node:fs";
import type { Hook, HookContext, HookResult } from "../types";
import type {
  RalphLoopState,
  RalphLoopOptions,
  RalphLoopHook,
  SessionState,
  StartLoopOptions,
} from "./types";
import {
  HOOK_NAME,
  DEFAULT_MAX_ITERATIONS,
  DEFAULT_COMPLETION_PROMISE,
  DEFAULT_API_TIMEOUT,
  RECOVERY_DELAY_MS,
  TRIGGER_PATTERNS,
  CONTINUATION_PROMPT,
  INITIAL_LOOP_CONTEXT,
  TOAST_MESSAGES,
  COMPLETION_TAG_PATTERN,
} from "./constants";
import {
  readState,
  writeState,
  clearState,
  incrementIteration,
} from "./storage";

// Re-export types and utilities
export * from "./types";
export * from "./constants";
export { readState, writeState, clearState, incrementIteration } from "./storage";

// Session state tracking for recovery
const sessions = new Map<string, SessionState>();

// Global working directory (set when hook is created)
let globalWorkdir: string = process.cwd();
let globalStateDir: string | undefined;

/**
 * Get session state for recovery tracking
 */
function getSessionState(sessionId: string): SessionState {
  let state = sessions.get(sessionId);
  if (!state) {
    state = {};
    sessions.set(sessionId, state);
  }
  return state;
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Detect completion promise in transcript file
 */
function detectCompletionInTranscript(
  transcriptPath: string | undefined,
  promise: string
): boolean {
  if (!transcriptPath) return false;

  try {
    if (!existsSync(transcriptPath)) return false;

    const content = readFileSync(transcriptPath, "utf-8");
    const pattern = new RegExp(
      `<promise>\\s*${escapeRegex(promise)}\\s*</promise>`,
      "is"
    );
    return pattern.test(content);
  } catch {
    return false;
  }
}

/**
 * Detect completion promise in response content
 */
function detectCompletionInResponse(
  response: string | undefined,
  promise: string
): boolean {
  if (!response) return false;

  const pattern = new RegExp(
    `<promise>\\s*${escapeRegex(promise)}\\s*</promise>`,
    "is"
  );
  return pattern.test(response);
}

/**
 * Check for legacy completion patterns (backward compatibility)
 */
function checkLegacyCompletion(response: string, keyword: string): boolean {
  const patterns = [
    new RegExp(`\\[${escapeRegex(keyword)}\\]`, "i"),
    new RegExp(`${escapeRegex(keyword)}:\\s*complete`, "i"),
    new RegExp(`task\\s+completed`, "i"),
    new RegExp(`all\\s+todos?\\s+(completed|done)`, "i"),
  ];

  return patterns.some((pattern) => pattern.test(response));
}

/**
 * Check if message is a Ralph Loop trigger
 */
function isRalphTrigger(message: string): boolean {
  return TRIGGER_PATTERNS.some((p) => p.test(message));
}

/**
 * Extract task/promise from trigger message
 */
function extractPromise(message: string): string {
  let prompt = message;
  for (const pattern of TRIGGER_PATTERNS) {
    prompt = prompt.replace(pattern, "").trim();
  }
  return prompt;
}

/**
 * Replace template placeholders
 */
function replaceTemplateVars(
  template: string,
  vars: {
    iteration: number;
    max: number;
    promise: string;
    prompt: string;
  }
): string {
  return template
    .replace(/\{\{ITERATION\}\}/g, String(vars.iteration))
    .replace(/\{\{MAX\}\}/g, String(vars.max))
    .replace(/\{\{PROMISE\}\}/g, vars.promise)
    .replace(/\{\{PROMPT\}\}/g, vars.prompt);
}

/**
 * Create Ralph Loop Hook with enhanced features
 */
export function createRalphLoopHook(options: RalphLoopOptions = {}): Hook {
  const {
    maxIterations = DEFAULT_MAX_ITERATIONS,
    completionPromise = DEFAULT_COMPLETION_PROMISE,
    autoContinue = true,
    stateDir,
    apiTimeout = DEFAULT_API_TIMEOUT,
    debug = false,
  } = options;

  globalStateDir = stateDir;

  const log = (message: string, data?: Record<string, unknown>) => {
    if (debug) {
      console.log(`[${HOOK_NAME}] ${message}`, data ? JSON.stringify(data) : "");
    }
  };

  return {
    name: HOOK_NAME,
    description: "Self-referential development loop for autonomous task completion",
    events: [
      "message.before",
      "message.after",
      "session.idle",
      "session.error",
      "session.deleted",
    ],

    async handler(context: HookContext): Promise<HookResult> {
      const { event, sessionId, workdir = process.cwd() } = context;
      const data = context.data as Record<string, unknown> | undefined;

      globalWorkdir = workdir;

      // Handle message.before event - check for triggers
      if (event === "message.before") {
        const message = (data?.message as string) || (data?.content as string) || "";

        // Check if this is a Ralph Loop trigger
        if (isRalphTrigger(message)) {
          const prompt = extractPromise(message);

          const state: RalphLoopState = {
            active: true,
            iteration: 1,
            maxIterations,
            completionPromise,
            startedAt: new Date().toISOString(),
            prompt,
            sessionId,
          };

          const success = writeState(workdir, state, stateDir);
          if (success) {
            log("Loop started", { sessionId, prompt, maxIterations });

            const initialContext = replaceTemplateVars(INITIAL_LOOP_CONTEXT, {
              iteration: 1,
              max: maxIterations,
              promise: completionPromise,
              prompt,
            });

            return {
              continue: true,
              prependContext: initialContext,
            };
          }
        }

        // Check if we're in an active loop
        const state = readState(workdir, stateDir);
        if (state && state.active && autoContinue) {
          // Verify session ownership
          if (state.sessionId && state.sessionId !== sessionId) {
            return { continue: true };
          }

          // Check max iterations
          if (state.iteration >= state.maxIterations) {
            log("Max iterations reached", { sessionId, iteration: state.iteration });
            clearState(workdir, stateDir);
            return {
              continue: true,
              appendMessage: `\n\n[Ralph Loop] ${TOAST_MESSAGES.MAX_ITERATIONS} (${state.maxIterations})`,
            };
          }

          // Inject continuation context
          const continuationContext = replaceTemplateVars(INITIAL_LOOP_CONTEXT, {
            iteration: state.iteration,
            max: state.maxIterations,
            promise: state.completionPromise,
            prompt: state.prompt,
          });

          return {
            continue: true,
            prependContext: continuationContext,
          };
        }
      }

      // Handle message.after event - check for completion
      if (event === "message.after") {
        const state = readState(workdir, stateDir);
        if (!state || !state.active) {
          return { continue: true };
        }

        // Verify session ownership
        if (state.sessionId && state.sessionId !== sessionId) {
          return { continue: true };
        }

        const response = (data?.content as string) || (data?.response as string) || "";

        // Check for completion using <promise> tag
        const completedViaTag = detectCompletionInResponse(
          response,
          state.completionPromise
        );

        // Check legacy completion patterns
        const completedViaLegacy = checkLegacyCompletion(
          response,
          state.completionPromise
        );

        if (completedViaTag || completedViaLegacy) {
          const duration = (
            (Date.now() - new Date(state.startedAt).getTime()) /
            1000
          ).toFixed(1);

          log("Loop completed", {
            sessionId,
            iteration: state.iteration,
            duration,
            detectedVia: completedViaTag ? "promise_tag" : "legacy_pattern",
          });

          clearState(workdir, stateDir);

          return {
            continue: true,
            appendMessage: `\n\n[Ralph Loop] ${TOAST_MESSAGES.LOOP_COMPLETE} Task completed in ${state.iteration} iteration(s) (${duration}s)`,
          };
        }
      }

      // Handle session.idle event - continue loop if active
      if (event === "session.idle") {
        const sessionState = getSessionState(sessionId);
        if (sessionState.isRecovering) {
          log("Skipped: in recovery", { sessionId });
          return { continue: true };
        }

        const state = readState(workdir, stateDir);
        if (!state || !state.active) {
          return { continue: true };
        }

        // Verify session ownership
        if (state.sessionId && state.sessionId !== sessionId) {
          return { continue: true };
        }

        // Check max iterations
        if (state.iteration >= state.maxIterations) {
          log("Max iterations reached on idle", { sessionId, iteration: state.iteration });
          clearState(workdir, stateDir);
          return {
            continue: true,
            appendMessage: `\n\n[Ralph Loop] ${TOAST_MESSAGES.MAX_ITERATIONS} (${state.maxIterations})`,
          };
        }

        // Increment iteration
        const newState = incrementIteration(workdir, stateDir);
        if (!newState) {
          log("Failed to increment iteration", { sessionId });
          return { continue: true };
        }

        log("Continuing loop on idle", {
          sessionId,
          iteration: newState.iteration,
          max: newState.maxIterations,
        });

        // Create continuation prompt
        const continuationPrompt = replaceTemplateVars(CONTINUATION_PROMPT, {
          iteration: newState.iteration,
          max: newState.maxIterations,
          promise: newState.completionPromise,
          prompt: newState.prompt,
        });

        return {
          continue: true,
          prompt: continuationPrompt,
        };
      }

      // Handle session.error event
      if (event === "session.error") {
        const error = data?.error as { name?: string } | undefined;

        // User abort clears the loop
        if (error?.name === "MessageAbortedError") {
          const state = readState(workdir, stateDir);
          if (state?.sessionId === sessionId) {
            log("User aborted, loop cleared", { sessionId });
            clearState(workdir, stateDir);
          }
          sessions.delete(sessionId);
          return { continue: true };
        }

        // Mark session as recovering
        const sessionState = getSessionState(sessionId);
        sessionState.isRecovering = true;
        if (sessionState.recoveryTimeout) {
          clearTimeout(sessionState.recoveryTimeout);
        }
        sessionState.recoveryTimeout = setTimeout(() => {
          sessionState.isRecovering = false;
        }, RECOVERY_DELAY_MS);
      }

      // Handle session.deleted event
      if (event === "session.deleted") {
        const sessionInfo = data?.info as { id?: string } | undefined;
        const deletedSessionId = sessionInfo?.id || sessionId;

        const state = readState(workdir, stateDir);
        if (state?.sessionId === deletedSessionId) {
          log("Session deleted, loop cleared", { sessionId: deletedSessionId });
          clearState(workdir, stateDir);
        }
        sessions.delete(deletedSessionId);
      }

      return { continue: true };
    },
  };
}

/**
 * Start a new Ralph Loop programmatically
 */
export function startLoop(
  sessionId: string,
  prompt: string,
  options?: StartLoopOptions
): boolean {
  const state: RalphLoopState = {
    active: true,
    iteration: 1,
    maxIterations: options?.maxIterations ?? DEFAULT_MAX_ITERATIONS,
    completionPromise: options?.completionPromise ?? DEFAULT_COMPLETION_PROMISE,
    startedAt: new Date().toISOString(),
    prompt,
    sessionId,
  };

  return writeState(globalWorkdir, state, globalStateDir);
}

/**
 * Cancel an active Ralph Loop
 */
export function cancelLoop(sessionId: string): boolean {
  const state = readState(globalWorkdir, globalStateDir);
  if (!state || state.sessionId !== sessionId) {
    return false;
  }

  return clearState(globalWorkdir, globalStateDir);
}

/**
 * Get current loop state
 */
export function getLoopState(sessionId?: string): RalphLoopState | null {
  const state = readState(globalWorkdir, globalStateDir);
  if (sessionId && state?.sessionId !== sessionId) {
    return null;
  }
  return state;
}

/**
 * Stop an active loop (alias for backward compatibility)
 */
export function stopLoop(sessionId: string): boolean {
  return cancelLoop(sessionId);
}

/**
 * Clear loop state (alias for backward compatibility)
 */
export function clearLoopState(sessionId?: string): void {
  if (sessionId) {
    const state = readState(globalWorkdir, globalStateDir);
    if (state?.sessionId === sessionId) {
      clearState(globalWorkdir, globalStateDir);
    }
  } else {
    clearState(globalWorkdir, globalStateDir);
  }
}

/**
 * Check if loop is currently active
 */
export function isLoopActive(sessionId?: string): boolean {
  const state = readState(globalWorkdir, globalStateDir);
  if (!state) return false;
  if (sessionId && state.sessionId !== sessionId) return false;
  return state.active;
}
