/**
 * Ralph Loop Constants
 * Configuration constants for self-referential development loop.
 */

/** Hook name identifier */
export const HOOK_NAME = "ralph-loop";

/** Default state file path relative to project directory */
export const DEFAULT_STATE_FILE = ".supercode/ralph-loop.local.md";

/** Pattern to detect completion promise in response */
export const COMPLETION_TAG_PATTERN = /<promise>(.*?)<\/promise>/is;

/** Default maximum iterations before auto-stop */
export const DEFAULT_MAX_ITERATIONS = 100;

/** Default completion promise keyword */
export const DEFAULT_COMPLETION_PROMISE = "DONE";

/** Default API timeout in milliseconds */
export const DEFAULT_API_TIMEOUT = 3000;

/** Recovery delay after error in milliseconds */
export const RECOVERY_DELAY_MS = 5000;

/**
 * Trigger patterns that activate Ralph Loop mode
 */
export const TRIGGER_PATTERNS = [
  /^\/ralph\s+/i,
  /^\/loop\s+/i,
  /^\/autonomous\s+/i,
  /ralph\s+mode/i,
  /ralph\s+loop/i,
];

/**
 * Continuation prompt template
 * Placeholders: {{ITERATION}}, {{MAX}}, {{PROMISE}}, {{PROMPT}}
 */
export const CONTINUATION_PROMPT = `[RALPH LOOP - ITERATION {{ITERATION}}/{{MAX}}]

Your previous attempt did not output the completion promise. Continue working on the task.

IMPORTANT:
- Review your progress so far
- Continue from where you left off
- When FULLY complete, output: <promise>{{PROMISE}}</promise>
- Do not stop until the task is truly done

Original task:
{{PROMPT}}`;

/**
 * Initial loop context template
 * Placeholders: {{ITERATION}}, {{MAX}}, {{PROMISE}}, {{PROMPT}}
 */
export const INITIAL_LOOP_CONTEXT = `<ralph-loop-mode iteration="{{ITERATION}}" max="{{MAX}}">
You are in Ralph Loop mode. Your goal is to complete the following task autonomously:

**Promise**: {{PROMPT}}

Guidelines:
1. Work continuously until the task is complete
2. Use todos to track progress
3. Do not ask for confirmation on routine tasks
4. Only stop when all objectives are met
5. Mark completion with <promise>{{PROMISE}}</promise> when done

Current iteration: {{ITERATION}} of {{MAX}}
</ralph-loop-mode>`;

/**
 * Toast notification messages
 */
export const TOAST_MESSAGES = {
  LOOP_STARTED: "Ralph Loop started",
  LOOP_COMPLETE: "Ralph Loop Complete!",
  LOOP_STOPPED: "Ralph Loop Stopped",
  LOOP_CANCELLED: "Ralph Loop Cancelled",
  MAX_ITERATIONS: "Max iterations reached without completion",
  ITERATION_PROGRESS: "Iteration {{ITERATION}}/{{MAX}}",
} as const;
