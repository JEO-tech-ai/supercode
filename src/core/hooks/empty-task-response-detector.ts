/**
 * Empty Task Response Detector Hook
 * Detects when a Task tool call returns an empty response.
 */

import type { Hook, HookContext, HookResult } from "./types";

export interface EmptyTaskResponseDetectorOptions {
  /** Minimum content length to consider non-empty */
  minContentLength?: number;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Check if a response is empty
 */
function isEmptyResponse(result: unknown): boolean {
  if (result === null || result === undefined) {
    return true;
  }

  if (typeof result === "string") {
    return result.trim().length === 0;
  }

  if (typeof result === "object") {
    const obj = result as Record<string, unknown>;

    // Check for common empty patterns
    if (obj.content !== undefined) {
      return isEmptyResponse(obj.content);
    }

    if (obj.output !== undefined) {
      return isEmptyResponse(obj.output);
    }

    if (obj.result !== undefined) {
      return isEmptyResponse(obj.result);
    }

    // Empty object
    return Object.keys(obj).length === 0;
  }

  return false;
}

/**
 * Create empty task response detector hook
 */
export function createEmptyTaskResponseDetectorHook(
  options: EmptyTaskResponseDetectorOptions = {}
): Hook {
  const { minContentLength = 10, debug = false } = options;

  return {
    name: "empty-task-response-detector",
    description: "Detects when a Task tool call returns an empty response",
    events: ["tool.after"],

    async handler(context: HookContext): Promise<HookResult> {
      const { toolName, toolResult } = context;

      // Only check Task tool calls
      if (toolName !== "Task" && toolName !== "task") {
        return { action: "continue" };
      }

      // Check if response is empty
      if (!isEmptyResponse(toolResult)) {
        // Check minimum content length
        const content = typeof toolResult === "string"
          ? toolResult
          : JSON.stringify(toolResult);

        if (content.length >= minContentLength) {
          return { action: "continue" };
        }
      }

      if (debug) {
        console.log(`[empty-task-response-detector] Empty response detected for Task tool`);
      }

      // Inject warning message
      const warningMessage = `
<system-reminder>
The Task agent returned an empty or minimal response. This may indicate:
1. The agent could not find the requested information
2. The task was too vague or ambiguous
3. There was an error during execution

Consider:
- Providing more specific instructions
- Breaking the task into smaller steps
- Using a different approach or tool
</system-reminder>
`;

      return {
        action: "continue",
        modified: true,
        appendMessage: warningMessage,
      };
    },
  };
}
