/**
 * Tool Output Truncator Hook
 * Truncates large tool outputs to prevent context overflow.
 * Uses token-based truncation with tool-specific limits.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "./types";
import logger from "../../shared/logger";

/**
 * Token estimation constants
 */
const CHARS_PER_TOKEN_ESTIMATE = 4;
const DEFAULT_MAX_TOKENS = 50_000; // ~200k chars
const WEBFETCH_MAX_TOKENS = 10_000; // ~40k chars - web pages need aggressive truncation
const LSP_MAX_TOKENS = 30_000; // ~120k chars - LSP outputs can be large

/**
 * Tools that should be truncated by default
 */
export const TRUNCATABLE_TOOLS = [
  // Search tools
  "grep",
  "Grep",
  "safe_grep",
  "glob",
  "Glob",
  "safe_glob",
  // LSP tools
  "lsp_find_references",
  "lsp_document_symbols",
  "lsp_workspace_symbols",
  "lsp_diagnostics",
  "lsp_hover",
  "lsp_goto_definition",
  // AST tools
  "ast_grep_search",
  "AstGrepSearch",
  // Bash/Interactive
  "interactive_bash",
  "Interactive_bash",
  "Bash",
  "bash",
  // Web/MCP tools
  "webfetch",
  "WebFetch",
  "skill_mcp",
  // File read tools (for large files)
  "Read",
  "read",
] as const;

/**
 * Tool-specific max tokens
 * Tools not listed use DEFAULT_MAX_TOKENS
 */
export const TOOL_SPECIFIC_MAX_TOKENS: Record<string, number> = {
  // Web tools - need aggressive truncation
  webfetch: WEBFETCH_MAX_TOKENS,
  WebFetch: WEBFETCH_MAX_TOKENS,
  // LSP tools - moderate truncation
  lsp_find_references: LSP_MAX_TOKENS,
  lsp_document_symbols: LSP_MAX_TOKENS,
  lsp_workspace_symbols: LSP_MAX_TOKENS,
  lsp_diagnostics: LSP_MAX_TOKENS,
};

/**
 * Truncator options
 */
export interface ToolOutputTruncatorOptions {
  /** Maximum output tokens (default: 50000) */
  maxTokens?: number;
  /** Number of header lines to preserve (default: 3) */
  preserveHeaderLines?: number;
  /** Truncate all tool outputs, not just TRUNCATABLE_TOOLS */
  truncateAll?: boolean;
  /** Custom tool-specific max tokens */
  toolMaxTokens?: Record<string, number>;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<ToolOutputTruncatorOptions> = {
  maxTokens: DEFAULT_MAX_TOKENS,
  preserveHeaderLines: 3,
  truncateAll: false,
  toolMaxTokens: {},
  debug: false,
};

/**
 * Truncation result
 */
export interface TruncationResult {
  /** Truncated output */
  result: string;
  /** Whether truncation occurred */
  truncated: boolean;
  /** Number of lines/chars removed */
  removedCount?: number;
  /** Original token count */
  originalTokens?: number;
  /** Final token count */
  finalTokens?: number;
}

/**
 * Statistics tracking
 */
let truncationStats = {
  totalTruncations: 0,
  totalTokensRemoved: 0,
  byTool: {} as Record<string, { count: number; tokensRemoved: number }>,
};

/**
 * Estimate tokens from text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

/**
 * Truncate output to token limit with line preservation
 */
export function truncateToTokenLimit(
  output: string,
  maxTokens: number,
  preserveHeaderLines: number = 3
): TruncationResult {
  const currentTokens = estimateTokens(output);

  if (currentTokens <= maxTokens) {
    return { result: output, truncated: false };
  }

  const lines = output.split("\n");

  // If fewer lines than header preservation, truncate by characters
  if (lines.length <= preserveHeaderLines) {
    const maxChars = maxTokens * CHARS_PER_TOKEN_ESTIMATE;
    return {
      result:
        output.slice(0, maxChars) +
        "\n\n[Output truncated due to size limit]",
      truncated: true,
      originalTokens: currentTokens,
      finalTokens: estimateTokens(output.slice(0, maxChars)),
    };
  }

  // Preserve header lines
  const headerLines = lines.slice(0, preserveHeaderLines);
  const contentLines = lines.slice(preserveHeaderLines);

  const headerText = headerLines.join("\n");
  const headerTokens = estimateTokens(headerText);
  const truncationMessageTokens = 50; // Reserve tokens for truncation message
  const availableTokens = maxTokens - headerTokens - truncationMessageTokens;

  // If no room for content, just return header with message
  if (availableTokens <= 0) {
    return {
      result:
        headerText + "\n\n[Content truncated due to size limit]",
      truncated: true,
      removedCount: contentLines.length,
      originalTokens: currentTokens,
      finalTokens: headerTokens + truncationMessageTokens,
    };
  }

  // Add lines until we hit the token limit
  const resultLines: string[] = [];
  let currentTokenCount = 0;

  for (const line of contentLines) {
    const lineTokens = estimateTokens(line + "\n");
    if (currentTokenCount + lineTokens > availableTokens) {
      break;
    }
    resultLines.push(line);
    currentTokenCount += lineTokens;
  }

  const truncatedContent = [...headerLines, ...resultLines].join("\n");
  const removedCount = contentLines.length - resultLines.length;
  const finalTokens = estimateTokens(truncatedContent) + truncationMessageTokens;

  return {
    result:
      truncatedContent +
      `\n\n[${removedCount} more lines truncated due to size limit]`,
    truncated: true,
    removedCount,
    originalTokens: currentTokens,
    finalTokens,
  };
}

/**
 * Get max tokens for a specific tool
 */
function getMaxTokensForTool(
  toolName: string,
  options: Required<ToolOutputTruncatorOptions>
): number {
  // Check custom tool-specific limits first
  if (options.toolMaxTokens[toolName]) {
    return options.toolMaxTokens[toolName];
  }

  // Check built-in tool-specific limits
  if (TOOL_SPECIFIC_MAX_TOKENS[toolName]) {
    return TOOL_SPECIFIC_MAX_TOKENS[toolName];
  }

  // Use default
  return options.maxTokens;
}

/**
 * Check if tool should be truncated
 */
function shouldTruncateTool(
  toolName: string,
  options: Required<ToolOutputTruncatorOptions>
): boolean {
  if (options.truncateAll) {
    return true;
  }

  return TRUNCATABLE_TOOLS.includes(toolName as typeof TRUNCATABLE_TOOLS[number]);
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
      const { data } = context;

      if (!data) return;

      const toolData = data as {
        toolName?: string;
        result?: unknown;
        output?: string;
      };

      const toolName = toolData.toolName || "";

      // Check if this tool should be truncated
      if (!shouldTruncateTool(toolName, mergedOptions)) {
        return;
      }

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

      // Skip empty output
      if (!output || output.length === 0) {
        return;
      }

      // Get max tokens for this tool
      const maxTokens = getMaxTokensForTool(toolName, mergedOptions);

      // Check if truncation is needed
      const currentTokens = estimateTokens(output);
      if (currentTokens <= maxTokens) {
        return;
      }

      // Perform truncation
      const result = truncateToTokenLimit(
        output,
        maxTokens,
        mergedOptions.preserveHeaderLines
      );

      if (result.truncated) {
        // Update stats
        const tokensRemoved = (result.originalTokens || 0) - (result.finalTokens || 0);
        truncationStats.totalTruncations++;
        truncationStats.totalTokensRemoved += tokensRemoved;

        if (!truncationStats.byTool[toolName]) {
          truncationStats.byTool[toolName] = { count: 0, tokensRemoved: 0 };
        }
        truncationStats.byTool[toolName].count++;
        truncationStats.byTool[toolName].tokensRemoved += tokensRemoved;

        if (mergedOptions.debug) {
          logger.debug(
            `[tool-output-truncator] Truncated ${toolName} output: ` +
            `${result.originalTokens} -> ${result.finalTokens} tokens ` +
            `(${result.removedCount || 0} lines removed)`
          );
        }

        return {
          continue: true,
          modified: {
            ...toolData,
            output: result.result,
            result: result.result,
            _truncated: true,
            _originalTokens: result.originalTokens,
            _finalTokens: result.finalTokens,
            _removedCount: result.removedCount,
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
    totalTokensRemoved: 0,
    byTool: {},
  };
}

/**
 * Manually truncate output (utility function)
 */
export function truncateOutput(
  output: string,
  maxTokens: number = DEFAULT_MAX_TOKENS,
  preserveHeaderLines: number = 3
): string {
  const result = truncateToTokenLimit(output, maxTokens, preserveHeaderLines);
  return result.result;
}

