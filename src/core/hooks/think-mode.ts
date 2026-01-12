/**
 * Think Mode Hook
 * Detects "think" keywords and upgrades to higher reasoning models.
 */

import type { Hook, HookContext, HookResult } from "./types";

export interface ThinkModeOptions {
  /** Keywords that trigger think mode */
  keywords?: string[];
  /** Extended thinking budget tokens */
  thinkingBudget?: number;
  /** Model suffix for high reasoning (e.g., "-high") */
  modelSuffix?: string;
  /** Debug mode */
  debug?: boolean;
}

const DEFAULT_KEYWORDS = [
  "think",
  "reason",
  "analyze deeply",
  "consider carefully",
  "step by step",
  "think through",
  "reasoning",
  "ultrathink",
  "deep analysis",
  "thorough analysis",
];

/**
 * Check if message contains think keywords
 */
function containsThinkKeywords(message: string, keywords: string[]): boolean {
  const lowerMessage = message.toLowerCase();
  return keywords.some((keyword) => lowerMessage.includes(keyword.toLowerCase()));
}

/**
 * Create think mode hook
 */
export function createThinkModeHook(options: ThinkModeOptions = {}): Hook {
  const {
    keywords = DEFAULT_KEYWORDS,
    thinkingBudget = 10000,
    modelSuffix = "",
    debug = false,
  } = options;

  return {
    name: "think-mode",
    description: "Detects think keywords and enables extended reasoning",
    events: ["message.before"],

    async handler(context: HookContext): Promise<HookResult> {
      const { message, model } = context;

      if (!message || typeof message !== "string") {
        return { action: "continue" };
      }

      // Check for think keywords
      if (!containsThinkKeywords(message, keywords)) {
        return { action: "continue" };
      }

      if (debug) {
        console.log(`[think-mode] Think keyword detected, enabling extended reasoning`);
      }

      // Build think mode instruction
      const thinkModeInstruction = `
<thinking-mode>
Extended reasoning mode activated. Take your time to:
1. Break down the problem into components
2. Consider multiple approaches
3. Evaluate trade-offs
4. Reason step by step
5. Validate your conclusions

Use <thinking> blocks to show your reasoning process.
</thinking-mode>

`;

      return {
        action: "continue",
        modified: true,
        prependContext: thinkModeInstruction,
        modelOverride: modelSuffix ? `${model}${modelSuffix}` : undefined,
        thinkingBudget,
      };
    },
  };
}

/**
 * Get default think keywords
 */
export function getDefaultThinkKeywords(): string[] {
  return [...DEFAULT_KEYWORDS];
}
