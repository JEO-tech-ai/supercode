/**
 * Pruning Strategy: Truncate Outputs
 * Truncates large tool outputs to reduce token usage.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import type { SessionMessage } from "../../session/types";
import type { PruningState, TruncateOutputsConfig } from "./pruning-types";
import { estimateTokens } from "./pruning-types";
import logger from "../../../shared/logger";

/**
 * Tools whose outputs should never be truncated
 */
const TRUNCATE_EXEMPT_TOOLS = new Set([
  "askuserquestion",
  "todowrite",
  "todoread",
  "skill",
  "task",
]);

/**
 * Execute truncate outputs pruning strategy
 * @param messages - Session messages to analyze
 * @param state - Pruning state to update
 * @param config - Strategy configuration
 * @param protectedTools - Set of protected tool names
 * @returns Number of outputs marked for truncation
 */
export function executeTruncateOutputs(
  messages: SessionMessage[],
  state: PruningState,
  config: TruncateOutputsConfig,
  protectedTools: Set<string>
): number {
  if (!config.enabled) return 0;

  let truncateCount = 0;
  let tokensSaved = 0;

  for (const message of messages) {
    if (message.role !== "assistant" || !message.metadata?.toolCalls) {
      continue;
    }

    for (let i = 0; i < message.metadata.toolCalls.length; i++) {
      const toolCall = message.metadata.toolCalls[i];
      const normalizedTool = toolCall.name.toLowerCase();

      // Skip protected and exempt tools
      if (
        protectedTools.has(normalizedTool) ||
        TRUNCATE_EXEMPT_TOOLS.has(normalizedTool)
      ) {
        continue;
      }

      // Skip already marked for pruning
      const pruneKey = `${message.id}:${i}`;
      if (state.toolCallsToPrune.has(pruneKey)) {
        continue;
      }

      // Check output size
      if (!toolCall.result) {
        continue;
      }

      const output =
        typeof toolCall.result === "string"
          ? toolCall.result
          : JSON.stringify(toolCall.result);
      const outputSize = output.length;

      if (outputSize <= config.maxOutputSize) {
        continue;
      }

      // Mark for truncation
      state.outputsToTruncate.set(pruneKey, config.targetSize);
      truncateCount++;

      // Estimate tokens saved
      const tokensBefore = estimateTokens(output);
      const tokensAfter = estimateTokens(output.slice(0, config.targetSize));
      tokensSaved += tokensBefore - tokensAfter;

      logger.debug(
        `[pruning-truncate] Marked for truncation: ${toolCall.name} (${outputSize} -> ${config.targetSize} chars)`
      );
    }
  }

  if (truncateCount > 0) {
    logger.info(
      `[pruning-truncate] Marked ${truncateCount} outputs for truncation, estimated ${tokensSaved} tokens saved`
    );
  }

  return truncateCount;
}

/**
 * Truncate a string to target size with ellipsis
 */
export function truncateOutput(output: string, targetSize: number): string {
  if (output.length <= targetSize) {
    return output;
  }

  const ellipsis = "\n\n... [truncated due to size] ...\n\n";
  const halfSize = Math.floor((targetSize - ellipsis.length) / 2);

  const start = output.slice(0, halfSize);
  const end = output.slice(-halfSize);

  return start + ellipsis + end;
}

/**
 * Apply truncation to messages in place
 */
export function applyTruncation(
  messages: SessionMessage[],
  state: PruningState
): number {
  let appliedCount = 0;

  for (const [key, targetSize] of state.outputsToTruncate) {
    const [messageId, indexStr] = key.split(":");
    const toolCallIndex = parseInt(indexStr, 10);

    const message = messages.find((m) => m.id === messageId);
    const toolCall = message?.metadata?.toolCalls?.[toolCallIndex];

    if (!toolCall?.result) {
      continue;
    }

    const output =
      typeof toolCall.result === "string"
        ? toolCall.result
        : JSON.stringify(toolCall.result);

    const truncated = truncateOutput(output, targetSize);

    // Update in place
    if (typeof toolCall.result === "string") {
      toolCall.result = truncated;
    } else {
      toolCall.result = truncated;
    }

    appliedCount++;
  }

  return appliedCount;
}
