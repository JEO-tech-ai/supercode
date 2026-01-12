/**
 * Ralph Loop Hook
 * Implements self-referential development loop for autonomous task completion.
 */

import type { Hook, HookContext, HookResult } from "./types";

export interface RalphLoopOptions {
  /** Maximum iterations */
  maxIterations?: number;
  /** Completion promise keyword */
  completionKeyword?: string;
  /** Enable auto-continue */
  autoContinue?: boolean;
  /** Debug mode */
  debug?: boolean;
}

interface LoopState {
  iteration: number;
  startTime: number;
  promise: string;
  completed: boolean;
  history: string[];
}

const loopStates = new Map<string, LoopState>();

/**
 * Check if completion promise is found in response
 */
function checkCompletion(response: string, keyword: string): boolean {
  const patterns = [
    new RegExp(`\\[${keyword}\\]`, "i"),
    new RegExp(`${keyword}:\\s*complete`, "i"),
    new RegExp(`task\\s+completed`, "i"),
    new RegExp(`all\\s+todos?\\s+(completed|done)`, "i"),
  ];

  return patterns.some((pattern) => pattern.test(response));
}

/**
 * Create ralph loop hook
 */
export function createRalphLoopHook(options: RalphLoopOptions = {}): Hook {
  const {
    maxIterations = 10,
    completionKeyword = "COMPLETE",
    autoContinue = true,
    debug = false,
  } = options;

  return {
    name: "ralph-loop",
    description: "Self-referential development loop for autonomous task completion",
    events: ["message.before", "message.after"],

    async handler(context: HookContext): Promise<HookResult> {
      const { event, sessionId, message, response } = context;

      // Initialize loop on specific trigger
      if (event === "message.before") {
        const triggerPatterns = [
          /^\/ralph\s+/i,
          /^\/loop\s+/i,
          /^\/autonomous\s+/i,
          /ralph\s+mode/i,
        ];

        const isRalphTrigger = triggerPatterns.some((p) =>
          p.test(message || "")
        );

        if (isRalphTrigger) {
          // Extract the promise/task from message
          const promise = (message || "")
            .replace(/^\/ralph\s+/i, "")
            .replace(/^\/loop\s+/i, "")
            .replace(/^\/autonomous\s+/i, "")
            .replace(/ralph\s+mode:?\s*/i, "")
            .trim();

          loopStates.set(sessionId, {
            iteration: 0,
            startTime: Date.now(),
            promise,
            completed: false,
            history: [],
          });

          if (debug) {
            console.log(`[ralph-loop] Started loop for: ${promise}`);
          }

          return {
            action: "continue",
            modified: true,
            prependContext: `
<ralph-loop-mode iteration="1" max="${maxIterations}">
You are in Ralph Loop mode. Your goal is to complete the following task autonomously:

**Promise**: ${promise}

Guidelines:
1. Work continuously until the task is complete
2. Use todos to track progress
3. Do not ask for confirmation on routine tasks
4. Only stop when all objectives are met
5. Mark completion with [${completionKeyword}] when done

Current iteration: 1 of ${maxIterations}
</ralph-loop-mode>
`,
          };
        }

        // Check if we're in an active loop
        const state = loopStates.get(sessionId);
        if (state && !state.completed && autoContinue) {
          state.iteration++;

          if (state.iteration > maxIterations) {
            if (debug) {
              console.log(`[ralph-loop] Max iterations reached`);
            }
            state.completed = true;
            return {
              action: "continue",
              modified: true,
              appendMessage: `\n\n[Ralph Loop] Maximum iterations (${maxIterations}) reached. Please review progress.`,
            };
          }

          return {
            action: "continue",
            modified: true,
            prependContext: `
<ralph-loop-mode iteration="${state.iteration}" max="${maxIterations}">
Continuing Ralph Loop. Promise: ${state.promise}
Current iteration: ${state.iteration} of ${maxIterations}
</ralph-loop-mode>
`,
          };
        }
      }

      // Check for completion in response
      if (event === "message.after") {
        const state = loopStates.get(sessionId);
        if (state && !state.completed) {
          if (checkCompletion(response || "", completionKeyword)) {
            state.completed = true;
            const duration = ((Date.now() - state.startTime) / 1000).toFixed(1);

            if (debug) {
              console.log(`[ralph-loop] Completed in ${state.iteration} iterations (${duration}s)`);
            }

            return {
              action: "continue",
              modified: true,
              appendMessage: `\n\n[Ralph Loop] Task completed in ${state.iteration} iterations (${duration}s)`,
            };
          }

          // Store response in history
          state.history.push(response || "");
        }
      }

      return { action: "continue" };
    },
  };
}

/**
 * Get loop state for a session
 */
export function getLoopState(sessionId: string): LoopState | undefined {
  return loopStates.get(sessionId);
}

/**
 * Stop an active loop
 */
export function stopLoop(sessionId: string): boolean {
  const state = loopStates.get(sessionId);
  if (state) {
    state.completed = true;
    return true;
  }
  return false;
}

/**
 * Clear loop state
 */
export function clearLoopState(sessionId: string): void {
  loopStates.delete(sessionId);
}
