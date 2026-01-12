/**
 * Comment Checker Hook
 * Detects TODO, FIXME, and other comments in generated code.
 */

import type { Hook, HookContext, HookResult } from "./types";

export interface CommentCheckerOptions {
  /** Custom patterns to detect */
  patterns?: RegExp[];
  /** Custom prompt for review */
  customPrompt?: string;
  /** Debug mode */
  debug?: boolean;
}

interface CommentMatch {
  type: string;
  content: string;
  line: number;
  file?: string;
}

const DEFAULT_PATTERNS = [
  /\/\/\s*(TODO|FIXME|HACK|XXX|BUG|NOTE):\s*(.+)/gi,
  /\/\*\s*(TODO|FIXME|HACK|XXX|BUG|NOTE):\s*(.+)\*\//gi,
  /#\s*(TODO|FIXME|HACK|XXX|BUG|NOTE):\s*(.+)/gi,
];

/**
 * Extract comments from code
 */
function extractComments(code: string, patterns: RegExp[]): CommentMatch[] {
  const matches: CommentMatch[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of patterns) {
      // Reset regex state
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        matches.push({
          type: match[1]?.toUpperCase() || "COMMENT",
          content: match[2]?.trim() || match[0],
          line: i + 1,
        });
      }
    }
  }

  return matches;
}

/**
 * Create comment checker hook
 */
export function createCommentCheckerHook(
  options: CommentCheckerOptions = {}
): Hook {
  const {
    patterns = DEFAULT_PATTERNS,
    customPrompt,
    debug = false,
  } = options;

  return {
    name: "comment-checker",
    description: "Detects TODO, FIXME, and other comments in generated code",
    events: ["tool.after"],

    async handler(context: HookContext): Promise<HookResult> {
      const { toolName, toolResult } = context;

      // Only check after file write/edit operations
      if (!["write", "edit", "Write", "Edit"].includes(toolName || "")) {
        return { action: "continue" };
      }

      // Get the written/edited content
      const content = toolResult?.content || toolResult?.newContent || "";
      if (!content || typeof content !== "string") {
        return { action: "continue" };
      }

      // Extract comments
      const comments = extractComments(content, patterns);

      if (comments.length === 0) {
        return { action: "continue" };
      }

      if (debug) {
        console.log(`[comment-checker] Found ${comments.length} comments`);
        for (const comment of comments) {
          console.log(`  - [${comment.type}] Line ${comment.line}: ${comment.content}`);
        }
      }

      // Build warning message
      const commentList = comments
        .map((c) => `- [${c.type}] Line ${c.line}: ${c.content}`)
        .join("\n");

      const warningMessage = customPrompt
        ? customPrompt.replace("{comments}", commentList)
        : `Found ${comments.length} comment(s) that may need attention:\n${commentList}\n\nPlease review and address these comments before finalizing.`;

      return {
        action: "continue",
        modified: true,
        appendMessage: warningMessage,
      };
    },
  };
}

/**
 * Manually check code for comments
 */
export function checkCodeForComments(
  code: string,
  patterns: RegExp[] = DEFAULT_PATTERNS
): CommentMatch[] {
  return extractComments(code, patterns);
}
