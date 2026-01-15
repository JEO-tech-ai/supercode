import type { ToolDefinition, ToolContext, ToolResult } from "./types";
import logger from "../../shared/logger";

interface ExaResult {
  title: string;
  url: string;
  content?: string;
  highlights?: string[];
  publishedDate?: string;
  author?: string;
}

interface ExaResponse {
  results: ExaResult[];
}

const EXA_API_URL = "https://api.exa.ai/search";

interface WebSearchConfig {
  apiKey?: string;
  defaultNumResults: number;
  defaultContextMaxChars: number;
  timeout: number;
}

const DEFAULT_CONFIG: WebSearchConfig = {
  defaultNumResults: 8,
  defaultContextMaxChars: 10000,
  timeout: 30000,
};

export function createWebSearchTool(
  config: Partial<WebSearchConfig> = {}
): ToolDefinition {
  const fullConfig: WebSearchConfig = { ...DEFAULT_CONFIG, ...config };

  return {
    name: "web_search",
    description: `Search the web using Exa AI - performs real-time web searches and can scrape content from specific URLs.

Returns content from the most relevant websites, optimized for LLM consumption.

Use for:
- Finding documentation
- Researching best practices
- Getting current information
- Finding examples and tutorials`,

    parameters: [
      {
        name: "query",
        type: "string",
        description: "Search query",
        required: true,
      },
      {
        name: "numResults",
        type: "number",
        description: `Number of results to return (default: ${fullConfig.defaultNumResults})`,
        required: false,
      },
      {
        name: "type",
        type: "string",
        description:
          "Search type - auto: balanced, fast: quick results, deep: comprehensive",
        required: false,
        default: "auto",
      },
      {
        name: "livecrawl",
        type: "string",
        description:
          "Live crawl mode - fallback: use cache first, preferred: prioritize live",
        required: false,
        default: "fallback",
      },
      {
        name: "contextMaxCharacters",
        type: "number",
        description: `Maximum characters for context (default: ${fullConfig.defaultContextMaxChars})`,
        required: false,
      },
    ],

    execute: async (
      args: Record<string, unknown>,
      context: ToolContext
    ): Promise<ToolResult> => {
      const apiKey = fullConfig.apiKey ?? process.env.EXA_API_KEY;

      if (!apiKey) {
        return {
          success: false,
          error: "EXA_API_KEY not configured. Set it in environment or config.",
        };
      }

      const query = args.query as string;
      const numResults =
        (args.numResults as number) ?? fullConfig.defaultNumResults;
      const searchType = (args.type as string) ?? "auto";
      const livecrawl = (args.livecrawl as string) ?? "fallback";
      const contextMaxChars =
        (args.contextMaxCharacters as number) ??
        fullConfig.defaultContextMaxChars;

      try {
        logger.info("[web-search] Searching", {
          query,
          numResults,
          type: searchType,
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          fullConfig.timeout
        );

        const response = await fetch(EXA_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            query,
            numResults,
            type:
              searchType === "deep"
                ? "neural"
                : searchType === "fast"
                  ? "keyword"
                  : "auto",
            useAutoprompt: true,
            contents: {
              text: {
                maxCharacters: contextMaxChars,
              },
              highlights: true,
            },
            livecrawl,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Exa API error: ${response.status} - ${errorText}`);
        }

        const data = (await response.json()) as ExaResponse;

        if (!data.results || data.results.length === 0) {
          return {
            success: true,
            output: `No results found for: "${query}"`,
          };
        }

        const formatted = formatResults(data.results, query);

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

        logger.error("[web-search] Search failed", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Search failed",
        };
      }
    },
  };
}

function formatResults(results: ExaResult[], query: string): string {
  const lines: string[] = [
    `# Web Search Results for: "${query}"\n`,
    `Found ${results.length} result(s)\n`,
  ];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];

    lines.push(`## ${i + 1}. ${result.title}`);
    lines.push(`**URL**: ${result.url}`);

    if (result.publishedDate) {
      lines.push(`**Published**: ${result.publishedDate}`);
    }

    if (result.author) {
      lines.push(`**Author**: ${result.author}`);
    }

    if (result.highlights && result.highlights.length > 0) {
      lines.push("\n**Key Points**:");
      for (const highlight of result.highlights.slice(0, 3)) {
        lines.push(`- ${highlight}`);
      }
    }

    if (result.content) {
      lines.push("\n**Content**:");
      lines.push(truncateContent(result.content, 2000));
    }

    lines.push("\n---\n");
  }

  return lines.join("\n");
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;

  const truncated = content.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(".");

  if (lastPeriod > maxLength * 0.8) {
    return truncated.slice(0, lastPeriod + 1);
  }

  return truncated + "...";
}

export const webSearchTool = createWebSearchTool();
