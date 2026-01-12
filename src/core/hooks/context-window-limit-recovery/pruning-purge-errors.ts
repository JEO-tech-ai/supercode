/**
 * Pruning Strategy: Purge Errors
 * Removes tool calls that resulted in errors after a certain number of turns.
 * Errors that are old enough are less relevant and can be safely removed.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import type { SessionMessage } from "../../session/types";
import type {
  PruningState,
  ErroredToolCall,
  PurgeErrorsConfig,
} from "./pruning-types";
import { estimateTokens } from "./pruning-types";
import logger from "../../../shared/logger";

/**
 * Error patterns to detect in tool results
 */
const ERROR_PATTERNS = [
  /error/i,
  /failed/i,
  /exception/i,
  /denied/i,
  /permission/i,
  /not found/i,
  /does not exist/i,
  /cannot/i,
  /unable to/i,
  /invalid/i,
  /timeout/i,
];

/**
 * Check if a tool result indicates an error
 */
function isErrorResult(result: unknown): boolean {
  if (!result) return false;

  const resultStr =
    typeof result === "string" ? result : JSON.stringify(result);

  // Check for error object structure
  if (typeof result === "object") {
    const obj = result as Record<string, unknown>;
    if (obj.error || obj.Error || obj.ERROR) {
      return true;
    }
    if (obj.success === false) {
      return true;
    }
    if (obj.status === "error" || obj.status === "failed") {
      return true;
    }
  }

  // Check for error patterns in string
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.test(resultStr)) {
      return true;
    }
  }

  return false;
}

/**
 * Execute purge errors pruning strategy
 * @param messages - Session messages to analyze
 * @param state - Pruning state to update
 * @param config - Strategy configuration
 * @param protectedTools - Set of protected tool names
 * @returns Number of tool calls pruned
 */
export function executePurgeErrors(
  messages: SessionMessage[],
  state: PruningState,
  config: PurgeErrorsConfig,
  protectedTools: Set<string>
): number {
  if (!config.enabled) return 0;

  const totalTurns = messages.length;
  let currentTurn = 0;
  let prunedCount = 0;
  let tokensSaved = 0;

  // Scan for errored tool calls
  for (const message of messages) {
    currentTurn++;

    if (message.role !== "assistant" || !message.metadata?.toolCalls) {
      continue;
    }

    for (let i = 0; i < message.metadata.toolCalls.length; i++) {
      const toolCall = message.metadata.toolCalls[i];
      const normalizedTool = toolCall.name.toLowerCase();

      // Skip protected tools
      if (protectedTools.has(normalizedTool)) {
        continue;
      }

      // Skip already marked for pruning
      const pruneKey = `${message.id}:${i}`;
      if (state.toolCallsToPrune.has(pruneKey)) {
        continue;
      }

      // Check if this tool call resulted in an error
      if (!isErrorResult(toolCall.result)) {
        continue;
      }

      // Calculate error age
      const errorAge = totalTurns - currentTurn;

      // Track errored tool
      const errorEntry: ErroredToolCall = {
        messageId: message.id,
        toolCallIndex: i,
        toolName: toolCall.name,
        turn: currentTurn,
        errorAge,
      };
      state.erroredTools.set(pruneKey, errorEntry);

      // Purge if old enough
      if (errorAge >= config.turns) {
        state.toolCallsToPrune.add(pruneKey);
        prunedCount++;

        // Estimate tokens saved
        if (toolCall.result) {
          const resultStr =
            typeof toolCall.result === "string"
              ? toolCall.result
              : JSON.stringify(toolCall.result);
          tokensSaved += estimateTokens(resultStr);
        }

        logger.debug(
          `[pruning-purge-errors] Purged errored tool call: ${toolCall.name} (turn ${currentTurn}, age ${errorAge})`
        );
      }
    }
  }

  if (prunedCount > 0) {
    logger.info(
      `[pruning-purge-errors] Purged ${prunedCount} old errored tool calls, estimated ${tokensSaved} tokens saved`
    );
  }

  return prunedCount;
}

/**
 * Get all errored tool calls from state
 */
export function getErroredToolCalls(
  state: PruningState
): Map<string, ErroredToolCall> {
  return state.erroredTools;
}
