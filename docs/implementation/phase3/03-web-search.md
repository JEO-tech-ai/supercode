# Phase 3.3: Web Search Tool (Exa AI)

> Priority: P2 (Medium)
> Effort: 1-2 days
> Dependencies: API key configuration

## Overview

The Web Search tool uses Exa AI for real-time web searches. It can search for documentation, articles, and other web content, returning results optimized for LLM consumption.

## Current State in SuperCode

### Existing Files
```
src/core/tools/webfetch.ts   # Basic URL fetching (different purpose)
```

### What Exists
- URL fetching tool

### What's Missing
- Exa AI integration
- Search functionality
- LLM-optimized content extraction

## Implementation Plan

### File: `src/core/tools/web-search.ts`

```typescript
import type { ToolDefinition, ToolContext, ToolResult } from './types';
import { Log } from '../../shared/logger';

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

const EXA_API_URL = 'https://api.exa.ai/search';

export interface WebSearchConfig {
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

export function createWebSearchTool(config: Partial<WebSearchConfig> = {}): ToolDefinition {
  const fullConfig: WebSearchConfig = { ...DEFAULT_CONFIG, ...config };

  return {
    name: 'web_search',
    description: `Search the web using Exa AI - performs real-time web searches and can scrape content from specific URLs.

Returns content from the most relevant websites, optimized for LLM consumption.

Use for:
- Finding documentation
- Researching best practices
- Getting current information
- Finding examples and tutorials`,

    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        numResults: {
          type: 'number',
          description: `Number of results to return (default: ${fullConfig.defaultNumResults})`,
        },
        type: {
          type: 'string',
          enum: ['auto', 'fast', 'deep'],
          description: 'Search type - auto: balanced, fast: quick results, deep: comprehensive',
          default: 'auto',
        },
        livecrawl: {
          type: 'string',
          enum: ['fallback', 'preferred'],
          description: 'Live crawl mode - fallback: use cache first, preferred: prioritize live',
          default: 'fallback',
        },
        contextMaxCharacters: {
          type: 'number',
          description: `Maximum characters for context (default: ${fullConfig.defaultContextMaxChars})`,
        },
      },
      required: ['query'],
    },

    execute: async (
      args: Record<string, unknown>,
      context: ToolContext
    ): Promise<ToolResult> => {
      const apiKey = fullConfig.apiKey ?? process.env.EXA_API_KEY;
      
      if (!apiKey) {
        return {
          success: false,
          error: 'EXA_API_KEY not configured. Set it in environment or config.',
        };
      }

      const query = args.query as string;
      const numResults = (args.numResults as number) ?? fullConfig.defaultNumResults;
      const searchType = (args.type as string) ?? 'auto';
      const livecrawl = (args.livecrawl as string) ?? 'fallback';
      const contextMaxChars = (args.contextMaxCharacters as number) ?? fullConfig.defaultContextMaxChars;

      try {
        Log.info('[web-search] Searching:', { query, numResults, type: searchType });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), fullConfig.timeout);

        const response = await fetch(EXA_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            query,
            numResults,
            type: searchType === 'deep' ? 'neural' : searchType === 'fast' ? 'keyword' : 'auto',
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

        const data = await response.json() as ExaResponse;

        if (!data.results || data.results.length === 0) {
          return {
            success: true,
            data: `No results found for: "${query}"`,
          };
        }

        const formatted = formatResults(data.results, query);

        return {
          success: true,
          data: formatted,
        };

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            success: false,
            error: 'Search timed out',
          };
        }

        Log.error('[web-search] Search failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Search failed',
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
      lines.push('\n**Key Points**:');
      for (const highlight of result.highlights.slice(0, 3)) {
        lines.push(`- ${highlight}`);
      }
    }

    if (result.content) {
      lines.push('\n**Content**:');
      lines.push(truncateContent(result.content, 2000));
    }

    lines.push('\n---\n');
  }

  return lines.join('\n');
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  
  // Try to truncate at sentence boundary
  const truncated = content.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  
  if (lastPeriod > maxLength * 0.8) {
    return truncated.slice(0, lastPeriod + 1);
  }
  
  return truncated + '...';
}

// Default instance
export const webSearchTool = createWebSearchTool();
```

## Configuration

Add to environment or config:

```bash
export EXA_API_KEY="your-exa-api-key"
```

Or in config:

```typescript
const webSearch = createWebSearchTool({
  apiKey: 'your-api-key',
  defaultNumResults: 10,
});
```

## Usage Examples

```typescript
// Basic search
await webSearchTool.execute({
  query: 'Next.js server components best practices',
}, context);

// Deep search for comprehensive results
await webSearchTool.execute({
  query: 'Rust async programming patterns',
  type: 'deep',
  numResults: 15,
}, context);

// Fast search for quick answers
await webSearchTool.execute({
  query: 'JavaScript array methods',
  type: 'fast',
}, context);
```

## Testing

```typescript
describe('webSearchTool', () => {
  it('should search with Exa API');
  it('should return formatted results');
  it('should handle no results');
  it('should respect numResults limit');
  it('should handle API errors');
  it('should handle missing API key');
});
```

## Success Criteria

- [ ] Integrates with Exa AI API
- [ ] Returns formatted search results
- [ ] Supports search type options
- [ ] Extracts content highlights
- [ ] Handles errors gracefully
- [ ] API key configuration works
