/**
 * Pruning Strategy: Supersede Writes
 * Removes old write/edit operations when the file was subsequently read.
 * The assumption is that if a file was read after being written,
 * the write content is superseded by the read content.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import type { SessionMessage } from "../../session/types";
import type {
  PruningState,
  FileOperation,
  SupersedeWritesConfig,
} from "./pruning-types";
import { estimateTokens } from "./pruning-types";
import logger from "../../../shared/logger";

/**
 * File operation tools that we track
 */
const FILE_WRITE_TOOLS = new Set(["write", "edit", "notebookedit"]);
const FILE_READ_TOOLS = new Set(["read", "glob"]);

/**
 * Extract file path from tool arguments
 */
function extractFilePath(toolName: string, args: Record<string, unknown>): string | null {
  const normalizedTool = toolName.toLowerCase();

  // Common patterns for file path arguments
  if (args.file_path && typeof args.file_path === "string") {
    return args.file_path;
  }
  if (args.filePath && typeof args.filePath === "string") {
    return args.filePath;
  }
  if (args.path && typeof args.path === "string") {
    return args.path;
  }

  // Notebook-specific
  if (normalizedTool === "notebookedit" && args.notebook_path) {
    return args.notebook_path as string;
  }

  return null;
}

/**
 * Execute supersede writes pruning strategy
 * @param messages - Session messages to analyze
 * @param state - Pruning state to update
 * @param config - Strategy configuration
 * @param protectedTools - Set of protected tool names
 * @returns Number of tool calls pruned
 */
export function executeSupersedeWrites(
  messages: SessionMessage[],
  state: PruningState,
  config: SupersedeWritesConfig,
  protectedTools: Set<string>
): number {
  if (!config.enabled) return 0;

  const writesByFile = new Map<string, FileOperation[]>();
  const readsByFile = new Map<string, number[]>(); // File path -> turn numbers
  let currentTurn = 0;

  // First pass: collect all file operations
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

      const filePath = extractFilePath(toolCall.name, toolCall.arguments);
      if (!filePath) {
        continue;
      }

      // Track writes
      if (FILE_WRITE_TOOLS.has(normalizedTool)) {
        const operation: FileOperation = {
          messageId: message.id,
          toolCallIndex: i,
          tool: toolCall.name,
          filePath,
          turn: currentTurn,
        };

        if (!writesByFile.has(filePath)) {
          writesByFile.set(filePath, []);
        }
        writesByFile.get(filePath)!.push(operation);

        // Update state for other strategies
        if (!state.fileOperations.has(filePath)) {
          state.fileOperations.set(filePath, []);
        }
        state.fileOperations.get(filePath)!.push(operation);
      }

      // Track reads
      if (FILE_READ_TOOLS.has(normalizedTool)) {
        if (!readsByFile.has(filePath)) {
          readsByFile.set(filePath, []);
        }
        readsByFile.get(filePath)!.push(currentTurn);
      }
    }
  }

  let prunedCount = 0;
  let tokensSaved = 0;

  // Second pass: prune writes that were superseded by reads
  for (const [filePath, writes] of writesByFile) {
    const reads = readsByFile.get(filePath) || [];

    if (config.aggressive) {
      // Aggressive mode: remove any write followed by a read
      for (const write of writes) {
        const superseded = reads.some((readTurn) => readTurn > write.turn);
        if (superseded) {
          const pruneKey = `${write.messageId}:${write.toolCallIndex}`;
          if (!state.toolCallsToPrune.has(pruneKey)) {
            state.toolCallsToPrune.add(pruneKey);
            prunedCount++;

            // Estimate tokens saved
            const message = messages.find((m) => m.id === write.messageId);
            const toolCall = message?.metadata?.toolCalls?.[write.toolCallIndex];
            if (toolCall?.arguments) {
              tokensSaved += estimateTokens(JSON.stringify(toolCall.arguments));
            }

            logger.debug(
              `[pruning-supersede] Pruned superseded write (aggressive): ${write.tool} -> ${filePath} (turn ${write.turn})`
            );
          }
        }
      }
    } else {
      // Conservative mode: only remove if multiple writes and superseded
      if (writes.length > 1) {
        // Keep the last write, check if earlier ones are superseded
        for (const write of writes.slice(0, -1)) {
          const superseded = reads.some((readTurn) => readTurn > write.turn);
          if (superseded) {
            const pruneKey = `${write.messageId}:${write.toolCallIndex}`;
            if (!state.toolCallsToPrune.has(pruneKey)) {
              state.toolCallsToPrune.add(pruneKey);
              prunedCount++;

              // Estimate tokens saved
              const message = messages.find((m) => m.id === write.messageId);
              const toolCall = message?.metadata?.toolCalls?.[write.toolCallIndex];
              if (toolCall?.arguments) {
                tokensSaved += estimateTokens(JSON.stringify(toolCall.arguments));
              }

              logger.debug(
                `[pruning-supersede] Pruned superseded write (conservative): ${write.tool} -> ${filePath} (turn ${write.turn})`
              );
            }
          }
        }
      }
    }
  }

  if (prunedCount > 0) {
    logger.info(
      `[pruning-supersede] Pruned ${prunedCount} superseded writes, estimated ${tokensSaved} tokens saved (mode: ${config.aggressive ? "aggressive" : "conservative"})`
    );
  }

  return prunedCount;
}
