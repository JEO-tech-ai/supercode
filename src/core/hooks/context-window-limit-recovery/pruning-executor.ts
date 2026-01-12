/**
 * Pruning Executor
 * Orchestrates all pruning strategies to reduce context window usage.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import type { SessionMessage } from "../../session/types";
import type {
  PruningResult,
  PruningState,
  DynamicContextPruningConfig,
} from "./pruning-types";
import { DEFAULT_PROTECTED_TOOLS, createPruningState, estimateTokens } from "./pruning-types";
import { executeDeduplication } from "./pruning-deduplication";
import { executeSupersedeWrites } from "./pruning-supersede";
import { executePurgeErrors } from "./pruning-purge-errors";
import { executeTruncateOutputs, applyTruncation } from "./pruning-truncate";
import logger from "../../../shared/logger";

/**
 * Default pruning configuration
 */
export const DEFAULT_PRUNING_CONFIG: DynamicContextPruningConfig = {
  notification: "simple",
  turnProtection: 3,
  protectedTools: [],
  strategies: {
    deduplication: { enabled: true },
    supersede_writes: { enabled: true, aggressive: false },
    purge_errors: { enabled: true, turns: 5 },
    truncate_outputs: {
      enabled: true,
      maxOutputSize: 10000,
      targetSize: 2000,
    },
  },
};

/**
 * Execute dynamic context pruning
 * @param messages - Session messages to prune
 * @param config - Pruning configuration
 * @returns Pruning result with statistics
 */
export async function executeDynamicContextPruning(
  messages: SessionMessage[],
  config: DynamicContextPruningConfig = DEFAULT_PRUNING_CONFIG
): Promise<PruningResult> {
  const state = createPruningState();

  // Build protected tools set
  const protectedTools = new Set([
    ...DEFAULT_PROTECTED_TOOLS,
    ...(config.protectedTools || []),
  ]);

  logger.info("[pruning-executor] Starting dynamic context pruning", {
    notification: config.notification,
    turnProtection: config.turnProtection,
    messageCount: messages.length,
  });

  let dedupCount = 0;
  let supersedeCount = 0;
  let purgeCount = 0;
  let truncateCount = 0;

  // Apply turn protection - exclude recent messages
  const protectedMessages = messages.slice(-config.turnProtection);
  const prunableMessages = messages.slice(0, -config.turnProtection);

  if (prunableMessages.length === 0) {
    logger.info(
      "[pruning-executor] No messages available for pruning (all protected by turn protection)"
    );
    return {
      itemsPruned: 0,
      totalTokensSaved: 0,
      strategies: {
        deduplication: 0,
        supersedeWrites: 0,
        purgeErrors: 0,
        truncateOutputs: 0,
      },
    };
  }

  // Execute deduplication strategy
  if (config.strategies?.deduplication?.enabled !== false) {
    dedupCount = executeDeduplication(
      prunableMessages,
      state,
      { enabled: true, ...config.strategies?.deduplication },
      protectedTools
    );
  }

  // Execute supersede writes strategy
  if (config.strategies?.supersede_writes?.enabled !== false) {
    supersedeCount = executeSupersedeWrites(
      prunableMessages,
      state,
      {
        enabled: true,
        aggressive: config.strategies?.supersede_writes?.aggressive || false,
      },
      protectedTools
    );
  }

  // Execute purge errors strategy
  if (config.strategies?.purge_errors?.enabled !== false) {
    purgeCount = executePurgeErrors(
      prunableMessages,
      state,
      {
        enabled: true,
        turns: config.strategies?.purge_errors?.turns || 5,
      },
      protectedTools
    );
  }

  // Execute truncate outputs strategy
  if (config.strategies?.truncate_outputs?.enabled !== false) {
    truncateCount = executeTruncateOutputs(
      prunableMessages,
      state,
      {
        enabled: true,
        maxOutputSize: config.strategies?.truncate_outputs?.maxOutputSize || 10000,
        targetSize: config.strategies?.truncate_outputs?.targetSize || 2000,
      },
      protectedTools
    );
  }

  // Calculate total tokens saved
  const totalPruned = state.toolCallsToPrune.size;
  const tokensSaved = calculateTokensSaved(prunableMessages, state);

  // Apply truncation to messages
  const truncationApplied = applyTruncation(prunableMessages, state);

  logger.info("[pruning-executor] Dynamic context pruning complete", {
    totalPruned,
    tokensSaved,
    deduplication: dedupCount,
    supersede: supersedeCount,
    purge: purgeCount,
    truncate: truncateCount,
    truncationApplied,
  });

  return {
    itemsPruned: totalPruned,
    totalTokensSaved: tokensSaved,
    strategies: {
      deduplication: dedupCount,
      supersedeWrites: supersedeCount,
      purgeErrors: purgeCount,
      truncateOutputs: truncateCount,
    },
  };
}

/**
 * Calculate total tokens saved from pruning
 */
function calculateTokensSaved(
  messages: SessionMessage[],
  state: PruningState
): number {
  let total = 0;

  for (const key of state.toolCallsToPrune) {
    const [messageId, indexStr] = key.split(":");
    const toolCallIndex = parseInt(indexStr, 10);

    const message = messages.find((m) => m.id === messageId);
    const toolCall = message?.metadata?.toolCalls?.[toolCallIndex];

    if (toolCall) {
      // Add tokens from arguments
      if (toolCall.arguments) {
        total += estimateTokens(JSON.stringify(toolCall.arguments));
      }
      // Add tokens from result
      if (toolCall.result) {
        const resultStr =
          typeof toolCall.result === "string"
            ? toolCall.result
            : JSON.stringify(toolCall.result);
        total += estimateTokens(resultStr);
      }
    }
  }

  return total;
}

/**
 * Apply pruning to session messages
 * Removes tool calls marked for pruning from the messages
 * @param messages - Messages to modify
 * @param state - Pruning state with tool calls to prune
 * @returns Number of tool calls removed
 */
export function applyPruning(
  messages: SessionMessage[],
  state: PruningState
): number {
  let removedCount = 0;

  for (const message of messages) {
    if (!message.metadata?.toolCalls) {
      continue;
    }

    // Find tool calls to remove for this message
    const toRemove: number[] = [];
    for (let i = 0; i < message.metadata.toolCalls.length; i++) {
      const key = `${message.id}:${i}`;
      if (state.toolCallsToPrune.has(key)) {
        toRemove.push(i);
      }
    }

    // Remove in reverse order to maintain indices
    for (let i = toRemove.length - 1; i >= 0; i--) {
      message.metadata.toolCalls.splice(toRemove[i], 1);
      removedCount++;
    }
  }

  return removedCount;
}

/**
 * Get pruning statistics without applying
 */
export function getPruningStats(
  messages: SessionMessage[],
  config: DynamicContextPruningConfig = DEFAULT_PRUNING_CONFIG
): {
  totalToolCalls: number;
  prunableToolCalls: number;
  estimatedTokens: number;
} {
  let totalToolCalls = 0;
  let prunableToolCalls = 0;
  let estimatedTokens = 0;

  const protectedTools = new Set([
    ...DEFAULT_PROTECTED_TOOLS,
    ...(config.protectedTools || []),
  ]);

  const prunableMessages = messages.slice(0, -config.turnProtection);

  for (const message of prunableMessages) {
    if (!message.metadata?.toolCalls) {
      continue;
    }

    for (const toolCall of message.metadata.toolCalls) {
      totalToolCalls++;

      if (!protectedTools.has(toolCall.name.toLowerCase())) {
        prunableToolCalls++;

        if (toolCall.result) {
          const resultStr =
            typeof toolCall.result === "string"
              ? toolCall.result
              : JSON.stringify(toolCall.result);
          estimatedTokens += estimateTokens(resultStr);
        }
      }
    }
  }

  return {
    totalToolCalls,
    prunableToolCalls,
    estimatedTokens,
  };
}
