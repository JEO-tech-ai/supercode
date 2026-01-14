import { Log } from "../../shared/logger";
import { estimateTokens, estimateMessagesTokens, isContextOverflowing, getModelLimits } from "../../shared/token";
import type { SessionState, SessionMessage } from "./types";

export interface CompactionConfig {
  enabled: boolean;
  autoPrune: boolean;
  pruneMinimumTokens: number;
  pruneProtectTokens: number;
  summaryMaxTokens: number;
}

export const DEFAULT_COMPACTION_CONFIG: CompactionConfig = {
  enabled: true,
  autoPrune: true,
  pruneMinimumTokens: 20000,
  pruneProtectTokens: 40000,
  summaryMaxTokens: 2000,
};

export interface CompactionResult {
  pruned: boolean;
  prunedTokens: number;
  prunedMessages: number;
  needsSummary: boolean;
  summary?: string;
}

export interface CompactionContext {
  sessionId: string;
  model: string;
  messages: SessionMessage[];
  config?: Partial<CompactionConfig>;
}

const COMPACTION_PROMPT = `Provide a detailed summary of our conversation above. Focus on information that would be helpful for continuing the conversation, including:
- What was done
- What is currently being worked on  
- Which files are being modified
- What needs to be done next
- Key user requests, constraints, or preferences that should persist
- Important technical decisions and why they were made

Your summary should be comprehensive enough to provide context but concise enough to be quickly understood. Format as a continuation prompt.`;

export function checkNeedsCompaction(ctx: CompactionContext): boolean {
  const config = { ...DEFAULT_COMPACTION_CONFIG, ...ctx.config };
  
  if (!config.enabled) return false;
  
  const totalTokens = estimateMessagesTokens(ctx.messages);
  return isContextOverflowing(totalTokens, ctx.model);
}

export function pruneOldToolOutputs(ctx: CompactionContext): CompactionResult {
  const config = { ...DEFAULT_COMPACTION_CONFIG, ...ctx.config };
  const result: CompactionResult = {
    pruned: false,
    prunedTokens: 0,
    prunedMessages: 0,
    needsSummary: false,
  };
  
  if (!config.autoPrune) return result;
  
  const messages = ctx.messages;
  let totalTokens = 0;
  let prunableTokens = 0;
  const toPrune: number[] = [];
  let userTurns = 0;
  
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    
    if (msg.role === "user") userTurns++;
    if (userTurns < 2) continue;
    
    if (msg.metadata?.compacted) continue;
    
    const msgTokens = estimateTokens(msg.content);
    totalTokens += msgTokens;
    
    if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
      for (const toolCall of msg.toolCalls) {
        if (toolCall.result && typeof toolCall.result === "string") {
          const toolTokens = estimateTokens(toolCall.result);
          totalTokens += toolTokens;
          
          if (totalTokens > config.pruneProtectTokens) {
            prunableTokens += toolTokens;
            toPrune.push(i);
          }
        }
      }
    }
  }
  
  if (prunableTokens > config.pruneMinimumTokens && toPrune.length > 0) {
    Log.info(`Pruning ${toPrune.length} messages to save ~${prunableTokens} tokens`);
    
    for (const idx of toPrune) {
      const msg = messages[idx];
      if (msg.toolCalls) {
        for (const toolCall of msg.toolCalls) {
          if (toolCall.result && typeof toolCall.result === "string") {
            toolCall.result = "[Output pruned to save context space]";
          }
        }
      }
      msg.metadata = { ...msg.metadata, compacted: true, compactedAt: Date.now() };
    }
    
    result.pruned = true;
    result.prunedTokens = prunableTokens;
    result.prunedMessages = toPrune.length;
  }
  
  const remainingTokens = estimateMessagesTokens(messages);
  result.needsSummary = isContextOverflowing(remainingTokens, ctx.model);
  
  return result;
}

export function generateCompactionSummaryPrompt(messages: SessionMessage[]): string {
  const recentMessages = messages.slice(-20);
  
  const conversationSummary = recentMessages
    .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 500)}${m.content.length > 500 ? "..." : ""}`)
    .join("\n\n");
  
  return `${conversationSummary}\n\n---\n\n${COMPACTION_PROMPT}`;
}

export interface CompactionStats {
  totalTokens: number;
  contextLimit: number;
  outputLimit: number;
  usableContext: number;
  overflowAmount: number;
  utilizationPercent: number;
}

export function getCompactionStats(ctx: CompactionContext): CompactionStats {
  const limits = getModelLimits(ctx.model);
  const totalTokens = estimateMessagesTokens(ctx.messages);
  const usableContext = limits.contextWindow - limits.maxOutput;
  const overflowAmount = Math.max(0, totalTokens - usableContext);
  const utilizationPercent = Math.round((totalTokens / usableContext) * 100);
  
  return {
    totalTokens,
    contextLimit: limits.contextWindow,
    outputLimit: limits.maxOutput,
    usableContext,
    overflowAmount,
    utilizationPercent,
  };
}

export async function compactSession(
  session: SessionState,
  config?: Partial<CompactionConfig>
): Promise<CompactionResult> {
  const ctx: CompactionContext = {
    sessionId: session.sessionId,
    model: session.context.model,
    messages: session.messages,
    config,
  };
  
  if (!checkNeedsCompaction(ctx)) {
    return {
      pruned: false,
      prunedTokens: 0,
      prunedMessages: 0,
      needsSummary: false,
    };
  }
  
  Log.info(`Session ${session.sessionId} needs compaction`);
  
  const result = pruneOldToolOutputs(ctx);
  
  if (result.needsSummary) {
    result.summary = generateCompactionSummaryPrompt(session.messages);
  }
  
  return result;
}
