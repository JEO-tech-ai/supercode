/**
 * Pruning Strategy: Deduplication
 * Removes duplicate tool calls with identical inputs, keeping only the most recent.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import type { SessionMessage, ToolCall } from "../../session/types";
import type {
  PruningState,
  ToolCallSignature,
  DeduplicationConfig,
} from "./pruning-types";
import { estimateTokens } from "./pruning-types";
import logger from "../../../shared/logger";

/**
 * Create a deterministic signature for a tool call
 */
export function createToolSignature(toolName: string, input: unknown): string {
  const sortedInput = sortObject(input);
  return `${toolName}::${JSON.stringify(sortedInput)}`;
}

/**
 * Sort object keys recursively for deterministic comparison
 */
function sortObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortObject);

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  for (const key of keys) {
    sorted[key] = sortObject((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Execute deduplication pruning strategy
 * @param messages - Session messages to analyze
 * @param state - Pruning state to update
 * @param config - Strategy configuration
 * @param protectedTools - Set of protected tool names
 * @returns Number of tool calls pruned
 */
export function executeDeduplication(
  messages: SessionMessage[],
  state: PruningState,
  config: DeduplicationConfig,
  protectedTools: Set<string>
): number {
  if (!config.enabled) return 0;

  const signatures = new Map<string, ToolCallSignature[]>();
  let currentTurn = 0;

  // Build signature map from all messages
  for (const message of messages) {
    currentTurn++;

    if (message.role !== "assistant" || !message.metadata?.toolCalls) {
      continue;
    }

    for (let i = 0; i < message.metadata.toolCalls.length; i++) {
      const toolCall = message.metadata.toolCalls[i];

      // Skip protected tools
      if (protectedTools.has(toolCall.name.toLowerCase())) {
        continue;
      }

      if (config.protectedTools?.includes(toolCall.name)) {
        continue;
      }

      // Skip already marked for pruning
      const pruneKey = `${message.id}:${i}`;
      if (state.toolCallsToPrune.has(pruneKey)) {
        continue;
      }

      const signature = createToolSignature(toolCall.name, toolCall.arguments);

      const signatureEntry: ToolCallSignature = {
        toolName: toolCall.name,
        signature,
        messageId: message.id,
        toolCallIndex: i,
        turn: currentTurn,
      };

      if (!signatures.has(signature)) {
        signatures.set(signature, []);
      }
      signatures.get(signature)!.push(signatureEntry);

      // Also update state for other strategies
      if (!state.toolSignatures.has(signature)) {
        state.toolSignatures.set(signature, []);
      }
      state.toolSignatures.get(signature)!.push(signatureEntry);
    }
  }

  let prunedCount = 0;
  let tokensSaved = 0;

  // Find duplicates and mark older ones for pruning
  for (const [signature, calls] of signatures) {
    if (calls.length <= 1) continue;

    // Keep the last one, prune earlier duplicates
    const toPrune = calls.slice(0, -1);

    for (const call of toPrune) {
      const pruneKey = `${call.messageId}:${call.toolCallIndex}`;
      state.toolCallsToPrune.add(pruneKey);
      prunedCount++;

      // Estimate tokens saved from the tool result
      const message = messages.find((m) => m.id === call.messageId);
      const toolCall = message?.metadata?.toolCalls?.[call.toolCallIndex];
      if (toolCall?.result) {
        const resultStr =
          typeof toolCall.result === "string"
            ? toolCall.result
            : JSON.stringify(toolCall.result);
        tokensSaved += estimateTokens(resultStr);
      }

      logger.debug(
        `[pruning-deduplication] Pruned duplicate tool call: ${call.toolName} (turn ${call.turn})`
      );
    }
  }

  if (prunedCount > 0) {
    logger.info(
      `[pruning-deduplication] Pruned ${prunedCount} duplicate tool calls, estimated ${tokensSaved} tokens saved`
    );
  }

  return prunedCount;
}

/**
 * Find tool output for a specific message and call index
 */
export function findToolOutput(
  messages: SessionMessage[],
  messageId: string,
  toolCallIndex: number
): string | null {
  const message = messages.find((m) => m.id === messageId);
  const toolCall = message?.metadata?.toolCalls?.[toolCallIndex];

  if (!toolCall?.result) {
    return null;
  }

  return typeof toolCall.result === "string"
    ? toolCall.result
    : JSON.stringify(toolCall.result);
}
