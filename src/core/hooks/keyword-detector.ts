/**
 * Keyword Detector Hook
 * Detects specific keywords to activate special modes or inject guidance.
 */

import type { Hook, HookContext, HookResult } from "./types";

export interface KeywordConfig {
  /** Keywords to detect */
  keywords: string[];
  /** Action to take when detected */
  action: "inject" | "transform" | "flag";
  /** Content to inject or use for transformation */
  content?: string;
  /** Flag name if action is "flag" */
  flagName?: string;
  /** Case sensitive matching */
  caseSensitive?: boolean;
}

export interface KeywordDetectorOptions {
  /** Keyword configurations */
  configs?: KeywordConfig[];
  /** Debug mode */
  debug?: boolean;
}

const DEFAULT_CONFIGS: KeywordConfig[] = [
  {
    keywords: ["ultrawork", "deep work", "focus mode"],
    action: "inject",
    content: `
<ultrawork-mode>
Entering focused work mode. Guidelines:
1. Work autonomously without unnecessary confirmations
2. Complete the entire task before reporting
3. Use background agents for parallel exploration
4. Only ask questions for critical blockers
5. Verify results before marking complete
</ultrawork-mode>
`,
    caseSensitive: false,
  },
  {
    keywords: ["search", "find", "look for", "locate"],
    action: "inject",
    content: `
<search-guidance>
For search operations:
1. Use grep for content search
2. Use glob for file patterns
3. Use LSP tools for symbol search
4. Consider using explorer agent for complex searches
</search-guidance>
`,
    caseSensitive: false,
  },
  {
    keywords: ["analyze", "review", "examine"],
    action: "inject",
    content: `
<analysis-guidance>
For analysis tasks:
1. Start with high-level overview
2. Identify patterns and relationships
3. Note potential issues or improvements
4. Summarize findings clearly
</analysis-guidance>
`,
    caseSensitive: false,
  },
];

/**
 * Check if message contains any keywords
 */
function matchesKeywords(
  message: string,
  keywords: string[],
  caseSensitive: boolean
): boolean {
  const searchMessage = caseSensitive ? message : message.toLowerCase();
  return keywords.some((keyword) => {
    const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
    return searchMessage.includes(searchKeyword);
  });
}

/**
 * Create keyword detector hook
 */
export function createKeywordDetectorHook(
  options: KeywordDetectorOptions = {}
): Hook {
  const { configs = DEFAULT_CONFIGS, debug = false } = options;

  return {
    name: "keyword-detector",
    description: "Detects keywords to activate special modes or inject guidance",
    events: ["message.before"],

    async handler(context: HookContext): Promise<HookResult> {
      const { message } = context;

      if (!message || typeof message !== "string") {
        return { action: "continue" };
      }

      const injections: string[] = [];
      const flags: string[] = [];

      for (const config of configs) {
        if (matchesKeywords(message, config.keywords, config.caseSensitive ?? false)) {
          if (debug) {
            console.log(`[keyword-detector] Matched keywords: ${config.keywords.join(", ")}`);
          }

          switch (config.action) {
            case "inject":
              if (config.content) {
                injections.push(config.content);
              }
              break;
            case "flag":
              if (config.flagName) {
                flags.push(config.flagName);
              }
              break;
            case "transform":
              // Transform handled separately
              break;
          }
        }
      }

      if (injections.length === 0 && flags.length === 0) {
        return { action: "continue" };
      }

      return {
        action: "continue",
        modified: true,
        prependContext: injections.join("\n"),
        flags,
      };
    },
  };
}

/**
 * Add a keyword configuration
 */
export function createKeywordConfig(
  keywords: string[],
  action: KeywordConfig["action"],
  content?: string,
  flagName?: string
): KeywordConfig {
  return { keywords, action, content, flagName };
}
