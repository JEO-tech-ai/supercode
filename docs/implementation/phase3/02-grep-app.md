# Phase 3.2: Grep App Tool (GitHub Code Search)

> Priority: P2 (Medium)
> Effort: 1-2 days
> Dependencies: None (external API)

## Overview

The Grep App tool searches real-world code examples from over a million public GitHub repositories. It helps find implementation patterns, library usage examples, and best practices from production code.

## Current State in SuperCode

### What Exists
- None

### What's Missing
- grep.app API integration
- Search tool implementation
- Result formatting

## Implementation Plan

### File: `src/core/tools/grep-app.ts`

```typescript
import type { ToolDefinition, ToolContext, ToolResult } from './types';
import { Log } from '../../shared/logger';

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

const GREP_APP_API = 'https://grep.app/api/search';

export interface GrepAppConfig {
  maxResults: number;
  timeout: number;
}

const DEFAULT_CONFIG: GrepAppConfig = {
  maxResults: 10,
  timeout: 30000,
};

export const grepAppTool: ToolDefinition = {
  name: 'grep_app_search',
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

  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The literal code pattern to search for (e.g., "useState(", "export function")',
      },
      language: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by programming language (e.g., ["TypeScript", "TSX"])',
      },
      repo: {
        type: 'string',
        description: 'Filter by repository (e.g., "facebook/react", "vercel/")',
      },
      path: {
        type: 'string',
        description: 'Filter by file path (e.g., "src/components/", "README.md")',
      },
      useRegexp: {
        type: 'boolean',
        description: 'Interpret query as regular expression',
        default: false,
      },
      matchCase: {
        type: 'boolean',
        description: 'Case-sensitive search',
        default: false,
      },
      matchWholeWords: {
        type: 'boolean',
        description: 'Match whole words only',
        default: false,
      },
    },
    required: ['query'],
  },

  execute: async (
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> => {
    const config = DEFAULT_CONFIG;
    
    const query = args.query as string;
    const language = args.language as string[] | undefined;
    const repo = args.repo as string | undefined;
    const path = args.path as string | undefined;
    const useRegexp = args.useRegexp as boolean ?? false;
    const matchCase = args.matchCase as boolean ?? false;
    const matchWholeWords = args.matchWholeWords as boolean ?? false;

    try {
      // Build search URL
      const params = new URLSearchParams();
      params.set('q', query);
      if (useRegexp) params.set('regexp', 'true');
      if (matchCase) params.set('case', 'true');
      if (matchWholeWords) params.set('words', 'true');
      if (language) {
        for (const lang of language) {
          params.append('f.lang', lang);
        }
      }
      if (repo) params.set('f.repo', repo);
      if (path) params.set('f.path', path);

      const url = `${GREP_APP_API}?${params.toString()}`;
      
      Log.info('[grep-app] Searching:', { query, language, repo });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SuperCode/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`grep.app API error: ${response.status}`);
      }

      const data = await response.json() as GrepAppResponse;
      
      if (!data.results || data.results.length === 0) {
        return {
          success: true,
          data: `No results found for pattern: "${query}"`,
        };
      }

      // Format results
      const results = data.results.slice(0, config.maxResults);
      const formatted = formatResults(results, query);

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

      Log.error('[grep-app] Search failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
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
    lines.push('```');
    lines.push(truncateContent(result.content, 500));
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '\n... [truncated]';
}

export default grepAppTool;
```

## Usage Examples

```typescript
// Find React useState patterns
await grepAppTool.execute({
  query: 'useState(',
  language: ['TypeScript', 'TSX'],
}, context);

// Find authentication patterns in Next.js
await grepAppTool.execute({
  query: 'getServerSession',
  repo: 'vercel/',
}, context);

// Find error handling with regex
await grepAppTool.execute({
  query: '(?s)try {.*catch.*Error',
  useRegexp: true,
  language: ['TypeScript'],
}, context);
```

## Integration

Register in tool registry:

```typescript
// src/core/tools/index.ts
import { grepAppTool } from './grep-app';
getToolRegistry().register(grepAppTool);
```

## Testing

```typescript
describe('grepAppTool', () => {
  it('should search for code patterns');
  it('should filter by language');
  it('should filter by repository');
  it('should support regex');
  it('should handle no results');
  it('should handle timeouts');
});
```

## Success Criteria

- [ ] Searches grep.app API
- [ ] Returns formatted code results
- [ ] Supports language filtering
- [ ] Supports repo filtering
- [ ] Supports regex patterns
- [ ] Handles errors gracefully
