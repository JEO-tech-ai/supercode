/**
 * Tool Output Truncator Hook
 * Truncates large tool outputs to prevent context overflow.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "./types";
import logger from "../../shared/logger";

/**
 * Truncator options
 */
export interface ToolOutputTruncatorOptions {
  /** Maximum output length in characters */
  maxOutputLength?: number;
  /** Minimum length to trigger truncation */
  minTruncateLength?: number;
  /** Number of characters to keep at start */
  keepStart?: number;
  /** Number of characters to keep at end */
  keepEnd?: number;
  /** Truncation message template */
  truncationMessage?: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: ToolOutputTruncatorOptions = {
  maxOutputLength: 50000,
  minTruncateLength: 10000,
  keepStart: 3000,
  keepEnd: 2000,
  truncationMessage: "\n\n... [Output truncated: {removed} characters removed] ...\n\n",
  debug: false,
};

/**
 * Statistics tracking
 */
let truncationStats = {
  totalTruncations: 0,
  totalBytesRemoved: 0,
};

/**
 * Truncate output string
 */
function truncateOutput(
  output: string,
  options: Required<ToolOutputTruncatorOptions>
): { output: string; truncated: boolean; removedLength: number } {
  if (output.length <= options.maxOutputLength) {
    return { output, truncated: false, removedLength: 0 };
  }

  const start = output.slice(0, options.keepStart);
  const end = output.slice(-options.keepEnd);
  const removedLength = output.length - options.keepStart - options.keepEnd;

  const message = options.truncationMessage.replace("{removed}", String(removedLength));

  return {
    output: start + message + end,
    truncated: true,
    removedLength,
  };
}

/**
 * Create tool output truncator hook
 */
export function createToolOutputTruncatorHook(
  options: ToolOutputTruncatorOptions = {}
): Hook {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options } as Required<ToolOutputTruncatorOptions>;

  return {
    name: "tool-output-truncator",
    description: "Truncates large tool outputs to prevent context overflow",
    events: ["tool.after"],
    priority: 80,

    async handler(context: HookContext): Promise<HookResult | void> {
      const { sessionId, data } = context;

      if (!data) return;

      const toolData = data as {
        toolName?: string;
        result?: unknown;
        output?: string;
      };

      // Get output string
      let output: string;
      if (typeof toolData.output === "string") {
        output = toolData.output;
      } else if (typeof toolData.result === "string") {
        output = toolData.result;
      } else if (toolData.result && typeof toolData.result === "object") {
        const result = toolData.result as { output?: string; content?: string; data?: string };
        output = result.output || result.content || result.data || "";
      } else {
        return;
      }

      // Check if truncation is needed
      if (output.length < mergedOptions.minTruncateLength) {
        return;
      }

      const { output: truncatedOutput, truncated, removedLength } = truncateOutput(
        output,
        mergedOptions
      );

      if (truncated) {
        truncationStats.totalTruncations++;
        truncationStats.totalBytesRemoved += removedLength;

        if (mergedOptions.debug) {
          logger.debug(
            `[tool-output-truncator] Truncated ${toolData.toolName} output: ` +
            `${output.length} -> ${truncatedOutput.length} chars (${removedLength} removed)`
          );
        }

        return {
          continue: true,
          modified: {
            ...toolData,
            output: truncatedOutput,
            result: truncatedOutput,
            _truncated: true,
            _originalLength: output.length,
            _removedLength: removedLength,
          },
        };
      }

      return;
    },
  };
}

/**
 * Get truncation statistics
 */
export function getTruncationStats(): typeof truncationStats {
  return { ...truncationStats };
}

/**
 * Reset truncation statistics
 */
export function resetTruncationStats(): void {
  truncationStats = {
    totalTruncations: 0,
    totalBytesRemoved: 0,
  };
}

export type { ToolOutputTruncatorOptions };
