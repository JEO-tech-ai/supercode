/**
 * AST-Grep Tools
 * AST-aware code search and replace tools.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import type { ToolDefinition, ToolResult, ToolContext } from "../../types";
import { runSg, formatSearchResult, formatReplaceResult, ensureCliAvailable, checkEnvironment, formatEnvironmentCheck } from "./cli";
import type { CliLanguage } from "./types";

/**
 * Supported languages
 */
const CLI_LANGUAGES: CliLanguage[] = [
  "bash", "c", "cpp", "csharp", "css", "elixir", "go", "haskell", "html",
  "java", "javascript", "json", "kotlin", "lua", "nix", "php", "python",
  "ruby", "rust", "scala", "solidity", "swift", "typescript", "tsx", "yaml",
];

/**
 * Validate language
 */
function isValidLanguage(lang: string): lang is CliLanguage {
  return CLI_LANGUAGES.includes(lang as CliLanguage);
}

/**
 * Tool 1: ast_grep_search
 * Search code patterns using AST-aware matching
 */
export const astGrepSearchTool: ToolDefinition = {
  name: "ast_grep_search",
  description:
    "Search for code patterns using AST-aware matching. Unlike text search, this understands " +
    "code structure. Use meta-variables ($VAR for single node, $$$ for multiple nodes) to match patterns. " +
    "Supports 25 languages. The pattern must be a complete AST node.",
  parameters: [
    {
      name: "pattern",
      type: "string",
      description:
        "AST pattern to search for. Use $VAR for single node wildcards, $$$ for multiple nodes. " +
        'Example: "console.log($ARG)" matches all console.log calls.',
      required: true,
    },
    {
      name: "lang",
      type: "string",
      description: `Target language. Options: ${CLI_LANGUAGES.join(", ")}`,
      required: true,
    },
    {
      name: "paths",
      type: "array",
      description: 'Paths to search (default: ["."])',
      required: false,
    },
    {
      name: "globs",
      type: "array",
      description: 'Glob patterns to include/exclude files (prefix with ! to exclude)',
      required: false,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const pattern = args.pattern as string;
    const lang = args.lang as string;
    const paths = (args.paths as string[]) || ["."];
    const globs = args.globs as string[] | undefined;

    // Validate language
    if (!isValidLanguage(lang)) {
      return {
        success: false,
        error: `Invalid language: ${lang}. Supported: ${CLI_LANGUAGES.join(", ")}`,
      };
    }

    // Check CLI availability
    if (!(await ensureCliAvailable())) {
      const env = await checkEnvironment();
      return {
        success: false,
        error: formatEnvironmentCheck(env),
      };
    }

    try {
      const result = await runSg({
        pattern,
        lang,
        paths,
        globs,
      });

      if (result.error) {
        // Provide hints for common pattern mistakes
        let hint = "";
        if (result.error.includes("parse") || result.error.includes("AST")) {
          hint =
            "\n\nHint: The pattern must be a complete AST node. " +
            "For example, use 'console.log($ARG)' not 'console.log'. " +
            "Use $VAR for single node wildcards, $$$ for multiple nodes.";
        }

        return {
          success: false,
          error: result.error + hint,
        };
      }

      return {
        success: true,
        output: formatSearchResult(result),
        data: { matches: result.matches, totalMatches: result.totalMatches },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Tool 2: ast_grep_replace
 * Replace code patterns using AST-aware rewriting
 */
export const astGrepReplaceTool: ToolDefinition = {
  name: "ast_grep_replace",
  description:
    "Replace code patterns using AST-aware rewriting. Use the same meta-variables in the " +
    "rewrite pattern that you used in the search pattern. By default, runs in dry-run mode " +
    "to preview changes. Set dryRun=false to apply changes.",
  parameters: [
    {
      name: "pattern",
      type: "string",
      description:
        "AST pattern to match. Use $VAR for single node wildcards, $$$ for multiple nodes. " +
        'Example: "console.log($ARG)"',
      required: true,
    },
    {
      name: "rewrite",
      type: "string",
      description:
        "Replacement pattern. Can use $VAR from the search pattern. " +
        'Example: "logger.debug($ARG)"',
      required: true,
    },
    {
      name: "lang",
      type: "string",
      description: `Target language. Options: ${CLI_LANGUAGES.join(", ")}`,
      required: true,
    },
    {
      name: "paths",
      type: "array",
      description: 'Paths to search (default: ["."])',
      required: false,
    },
    {
      name: "globs",
      type: "array",
      description: 'Glob patterns to include/exclude files (prefix with ! to exclude)',
      required: false,
    },
    {
      name: "dryRun",
      type: "boolean",
      description: "Preview changes without applying (default: true)",
      required: false,
      default: true,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const pattern = args.pattern as string;
    const rewrite = args.rewrite as string;
    const lang = args.lang as string;
    const paths = (args.paths as string[]) || ["."];
    const globs = args.globs as string[] | undefined;
    const dryRun = args.dryRun !== false;

    // Validate language
    if (!isValidLanguage(lang)) {
      return {
        success: false,
        error: `Invalid language: ${lang}. Supported: ${CLI_LANGUAGES.join(", ")}`,
      };
    }

    // Check CLI availability
    if (!(await ensureCliAvailable())) {
      const env = await checkEnvironment();
      return {
        success: false,
        error: formatEnvironmentCheck(env),
      };
    }

    try {
      if (dryRun) {
        // For dry run, just search and show what would be replaced
        const result = await runSg({
          pattern,
          lang,
          paths,
          globs,
        });

        if (result.error) {
          return {
            success: false,
            error: result.error,
          };
        }

        return {
          success: true,
          output: formatReplaceResult(result, true) + `\n\nRun with dryRun=false to apply these changes.`,
          data: { matches: result.matches, wouldReplace: result.totalMatches },
        };
      }

      // Apply changes
      const result = await runSg({
        pattern,
        lang,
        paths,
        globs,
        rewrite,
      });

      if (result.error) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        output: formatReplaceResult(result, false),
        data: { matches: result.matches, replaced: result.totalMatches },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Tool 3: ast_grep_check
 * Check AST-Grep environment
 */
export const astGrepCheckTool: ToolDefinition = {
  name: "ast_grep_check",
  description: "Check if AST-Grep CLI is available and show installation instructions if not.",
  parameters: [],

  async execute(_args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
    const env = await checkEnvironment();

    return {
      success: env.cli.available,
      output: formatEnvironmentCheck(env),
    };
  },
};

/**
 * All AST-Grep tools
 */
export const astGrepTools: ToolDefinition[] = [
  astGrepSearchTool,
  astGrepReplaceTool,
  astGrepCheckTool,
];
