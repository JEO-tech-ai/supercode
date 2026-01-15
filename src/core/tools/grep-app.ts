import type { ToolDefinition, ToolContext, ToolResult } from "./types";
import logger from "../../shared/logger";

interface GrepAppResult {
  repo: string;
  path: string;
  content: string;
  url: string;
  language?: string;
}

interface GrepAppResponse {
  results: GrepAppResult[];
  total: number;
}

const GREP_APP_API = "https://grep.app/api/search";

interface GrepAppConfig {
  maxResults: number;
  timeout: number;
}

const DEFAULT_CONFIG: GrepAppConfig = {
  maxResults: 10,
  timeout: 30000,
};

export const grepAppTool: ToolDefinition = {
  name: "grep_app_search",
  description: `Find real-world code examples from over a million public GitHub repositories.

**IMPORTANT: This tool searches for literal code patterns (like grep), not keywords.**

Good examples:
- 'useState(' - Find React hooks usage
- 'import React from' - Find import patterns  
- 'async function' - Find async patterns
- '(?s)try {.*await' - Regex for try-catch with await

Bad examples (will fail):
- 'react tutorial' - This is a keyword, not code
- 'best practices' - Not a code pattern
- 'how to use' - Natural language, not code

Use regex with useRegexp=true for flexible patterns.`,

  parameters: [
    {
      name: "query",
      type: "string",
      description:
        'The literal code pattern to search for (e.g., "useState(", "export function")',
      required: true,
    },
    {
      name: "language",
      type: "array",
      description:
        'Filter by programming language (e.g., ["TypeScript", "TSX"])',
      required: false,
    },
    {
      name: "repo",
      type: "string",
      description:
        'Filter by repository (e.g., "facebook/react", "vercel/")',
      required: false,
    },
    {
      name: "path",
      type: "string",
      description:
        'Filter by file path (e.g., "src/components/", "README.md")',
      required: false,
    },
    {
      name: "useRegexp",
      type: "boolean",
      description: "Interpret query as regular expression",
      required: false,
      default: false,
    },
    {
      name: "matchCase",
      type: "boolean",
      description: "Case-sensitive search",
      required: false,
      default: false,
    },
    {
      name: "matchWholeWords",
      type: "boolean",
      description: "Match whole words only",
      required: false,
      default: false,
    },
  ],

  execute: async (
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> => {
    const config = DEFAULT_CONFIG;

    const query = args.query as string;
    const language = args.language as string[] | undefined;
    const repo = args.repo as string | undefined;
    const path = args.path as string | undefined;
    const useRegexp = (args.useRegexp as boolean) ?? false;
    const matchCase = (args.matchCase as boolean) ?? false;
    const matchWholeWords = (args.matchWholeWords as boolean) ?? false;

    try {
      const params = new URLSearchParams();
      params.set("q", query);
      if (useRegexp) params.set("regexp", "true");
      if (matchCase) params.set("case", "true");
      if (matchWholeWords) params.set("words", "true");
      if (language) {
        for (const lang of language) {
          params.append("f.lang", lang);
        }
      }
      if (repo) params.set("f.repo", repo);
      if (path) params.set("f.path", path);

      const url = `${GREP_APP_API}?${params.toString()}`;

      logger.info("[grep-app] Searching", { query, language, repo });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "SuperCode/1.0",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`grep.app API error: ${response.status}`);
      }

      const data = (await response.json()) as GrepAppResponse;

      if (!data.results || data.results.length === 0) {
        return {
          success: true,
          output: `No results found for pattern: "${query}"`,
        };
      }

      const results = data.results.slice(0, config.maxResults);
      const formatted = formatResults(results, query);

      return {
        success: true,
        output: formatted,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          success: false,
          error: "Search timed out",
        };
      }

      logger.error("[grep-app] Search failed", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Search failed",
      };
    }
  },
};

function formatResults(results: GrepAppResult[], query: string): string {
  const lines: string[] = [
    `Found ${results.length} result(s) for pattern: "${query}"\n`,
  ];

  for (const result of results) {
    lines.push(`## ${result.repo}`);
    lines.push(`**File**: \`${result.path}\``);
    if (result.language) {
      lines.push(`**Language**: ${result.language}`);
    }
    lines.push(`**URL**: ${result.url}`);
    lines.push("```");
    lines.push(truncateContent(result.content, 500));
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + "\n... [truncated]";
}

export default grepAppTool;
