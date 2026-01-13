# Session Tools Implementation Plan

> **목표**: AI 에이전트가 과거 세션을 참조할 수 있는 session_list, session_read, session_search 도구 구현

## Overview

Session Tools는 AI 에이전트에게 "장기 기억" 능력을 제공합니다. 이를 통해 에이전트는 이전 대화, 결정, 작업 내역을 참조하여 더 일관된 지원을 제공할 수 있습니다.

## Target Tools

### 1. session_list

세션 목록 조회 및 필터링

```typescript
// src/core/tools/session/list.ts
import { z } from 'zod';
import { sessionManager } from '../../session/manager';

export const sessionListSchema = z.object({
  limit: z.number().optional().describe('Maximum number of sessions to return'),
  from_date: z.string().optional().describe('Filter sessions from this date (ISO 8601)'),
  to_date: z.string().optional().describe('Filter sessions until this date (ISO 8601)'),
  project_path: z.string().optional().describe('Filter by project path'),
});

export type SessionListParams = z.infer<typeof sessionListSchema>;

export async function sessionList(params: SessionListParams): Promise<string> {
  const { limit = 20, from_date, to_date, project_path } = params;
  
  const sessions = sessionManager.listSessions({
    limit,
    fromDate: from_date ? new Date(from_date) : undefined,
    toDate: to_date ? new Date(to_date) : undefined,
    projectPath: project_path,
  });
  
  if (sessions.length === 0) {
    return 'No sessions found matching the criteria.';
  }
  
  const header = '| Session ID | Messages | First | Last | Agents |';
  const divider = '|------------|----------|-------|------|--------|';
  
  const rows = sessions.map(s => {
    const firstDate = s.createdAt.toISOString().split('T')[0];
    const lastDate = s.updatedAt.toISOString().split('T')[0];
    const agents = [...new Set(s.agents || [])].join(', ') || '-';
    
    return `| ${s.sessionId.slice(0, 12)} | ${s.messages.length} | ${firstDate} | ${lastDate} | ${agents} |`;
  });
  
  return [header, divider, ...rows].join('\n');
}

export const sessionListTool = {
  name: 'session_list',
  description: `List all OpenCode sessions with optional filtering.

Returns a list of available session IDs with metadata including message count, date range, and agents used.

Arguments:
- limit (optional): Maximum number of sessions to return
- from_date (optional): Filter sessions from this date (ISO 8601 format)
- to_date (optional): Filter sessions until this date (ISO 8601 format)

Example output:
| Session ID | Messages | First | Last | Agents |
|------------|----------|-------|------|--------|
| ses_abc123 | 45 | 2025-12-20 | 2025-12-24 | build, oracle |
| ses_def456 | 12 | 2025-12-19 | 2025-12-19 | build |`,
  parameters: sessionListSchema,
  execute: sessionList,
};
```

### 2. session_read

세션 메시지 및 히스토리 조회

```typescript
// src/core/tools/session/read.ts
import { z } from 'zod';
import { sessionManager } from '../../session/manager';

export const sessionReadSchema = z.object({
  session_id: z.string().describe('Session ID to read'),
  include_todos: z.boolean().optional().describe('Include todo list if available'),
  include_transcript: z.boolean().optional().describe('Include transcript log if available'),
  limit: z.number().optional().describe('Maximum number of messages to return'),
});

export type SessionReadParams = z.infer<typeof sessionReadSchema>;

export async function sessionRead(params: SessionReadParams): Promise<string> {
  const { session_id, include_todos = false, include_transcript = false, limit } = params;
  
  const session = await sessionManager.getSession(session_id);
  
  if (!session) {
    return `Session not found: ${session_id}`;
  }
  
  const lines: string[] = [];
  
  // Header
  lines.push(`Session: ${session.sessionId}`);
  lines.push(`Messages: ${session.messages.length}`);
  lines.push(`Date Range: ${session.createdAt.toISOString()} to ${session.updatedAt.toISOString()}`);
  lines.push('');
  
  // Messages
  const messages = limit ? session.messages.slice(-limit) : session.messages;
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const timestamp = msg.timestamp?.toISOString().split('T')[1]?.slice(0, 8) || '';
    
    lines.push(`[Message ${i + 1}] ${msg.role} (${timestamp})`);
    lines.push(truncateContent(msg.content, 500));
    lines.push('');
  }
  
  // Todos
  if (include_todos && session.todos) {
    lines.push('---');
    lines.push('Todos:');
    for (const todo of session.todos) {
      const status = todo.status === 'completed' ? '✅' : 
                     todo.status === 'in_progress' ? '🔄' : '⬜';
      lines.push(`${status} ${todo.content}`);
    }
    lines.push('');
  }
  
  // Transcript
  if (include_transcript && session.transcript) {
    lines.push('---');
    lines.push('Transcript:');
    lines.push(session.transcript.slice(0, 2000));
    if (session.transcript.length > 2000) {
      lines.push('... (truncated)');
    }
  }
  
  return lines.join('\n');
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '...';
}

export const sessionReadTool = {
  name: 'session_read',
  description: `Read messages and history from an OpenCode session.

Returns a formatted view of session messages with role, timestamp, and content. Optionally includes todos and transcript data.

Arguments:
- session_id (required): Session ID to read
- include_todos (optional): Include todo list if available (default: false)
- include_transcript (optional): Include transcript log if available (default: false)
- limit (optional): Maximum number of messages to return (default: all)

Example output:
Session: ses_abc123
Messages: 45
Date Range: 2025-12-20 to 2025-12-24

[Message 1] user (10:30:00)
Hello, can you help me with...

[Message 2] assistant (10:30:15)
Of course! Let me help you with...`,
  parameters: sessionReadSchema,
  execute: sessionRead,
};
```

### 3. session_search

세션 내용 검색

```typescript
// src/core/tools/session/search.ts
import { z } from 'zod';
import { sessionManager } from '../../session/manager';

export const sessionSearchSchema = z.object({
  query: z.string().describe('Search query string'),
  session_id: z.string().optional().describe('Search within specific session only'),
  case_sensitive: z.boolean().optional().describe('Case-sensitive search (default: false)'),
  limit: z.number().optional().describe('Maximum number of results to return (default: 20)'),
});

export type SessionSearchParams = z.infer<typeof sessionSearchSchema>;

export interface SearchMatch {
  sessionId: string;
  messageId: string;
  role: string;
  excerpt: string;
  matchIndex: number;
}

export async function sessionSearch(params: SessionSearchParams): Promise<string> {
  const { query, session_id, case_sensitive = false, limit = 20 } = params;
  
  const sessions = session_id 
    ? [await sessionManager.getSession(session_id)].filter(Boolean)
    : sessionManager.listSessions({});
  
  const matches: SearchMatch[] = [];
  const searchQuery = case_sensitive ? query : query.toLowerCase();
  
  for (const session of sessions) {
    if (!session) continue;
    
    for (const message of session.messages) {
      const content = case_sensitive ? message.content : message.content.toLowerCase();
      const index = content.indexOf(searchQuery);
      
      if (index !== -1) {
        // Extract context around match
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + query.length + 50);
        let excerpt = message.content.slice(start, end);
        
        // Highlight match
        const matchStart = index - start;
        excerpt = excerpt.slice(0, matchStart) + 
                  '**' + excerpt.slice(matchStart, matchStart + query.length) + '**' +
                  excerpt.slice(matchStart + query.length);
        
        if (start > 0) excerpt = '...' + excerpt;
        if (end < content.length) excerpt = excerpt + '...';
        
        matches.push({
          sessionId: session.sessionId,
          messageId: message.id || 'unknown',
          role: message.role,
          excerpt,
          matchIndex: index,
        });
        
        if (matches.length >= limit) break;
      }
    }
    
    if (matches.length >= limit) break;
  }
  
  if (matches.length === 0) {
    return `No matches found for: "${query}"`;
  }
  
  const uniqueSessions = new Set(matches.map(m => m.sessionId)).size;
  const lines: string[] = [
    `Found ${matches.length} matches across ${uniqueSessions} session(s):`,
    '',
  ];
  
  for (const match of matches) {
    lines.push(`[${match.sessionId.slice(0, 12)}] Message (${match.role})`);
    lines.push(match.excerpt);
    lines.push('');
  }
  
  return lines.join('\n');
}

export const sessionSearchTool = {
  name: 'session_search',
  description: `Search for content within OpenCode session messages.

Performs full-text search across session messages and returns matching excerpts with context.

Arguments:
- query (required): Search query string
- session_id (optional): Search within specific session only (default: all sessions)
- case_sensitive (optional): Case-sensitive search (default: false)
- limit (optional): Maximum number of results to return (default: 20)

Example output:
Found 3 matches across 2 sessions:

[ses_abc123] Message (user)
...implement the **session manager** tool...

[ses_abc123] Message (assistant)
...I'll create a **session manager** with full search...

[ses_def456] Message (user)
...use the **session manager** to find...`,
  parameters: sessionSearchSchema,
  execute: sessionSearch,
};
```

### 4. session_info

세션 메타데이터 및 통계

```typescript
// src/core/tools/session/info.ts
import { z } from 'zod';
import { sessionManager } from '../../session/manager';

export const sessionInfoSchema = z.object({
  session_id: z.string().describe('Session ID to inspect'),
});

export type SessionInfoParams = z.infer<typeof sessionInfoSchema>;

export async function sessionInfo(params: SessionInfoParams): Promise<string> {
  const { session_id } = params;
  
  const session = await sessionManager.getSession(session_id);
  
  if (!session) {
    return `Session not found: ${session_id}`;
  }
  
  const duration = session.updatedAt.getTime() - session.createdAt.getTime();
  const durationStr = formatDuration(duration);
  
  const agents = [...new Set(session.agents || [])];
  
  const todoStats = session.todos ? {
    total: session.todos.length,
    completed: session.todos.filter(t => t.status === 'completed').length,
  } : null;
  
  const lines: string[] = [
    `Session ID: ${session.sessionId}`,
    `Messages: ${session.messages.length}`,
    `Date Range: ${session.createdAt.toISOString()} to ${session.updatedAt.toISOString()}`,
    `Duration: ${durationStr}`,
    `Agents Used: ${agents.length > 0 ? agents.join(', ') : 'None'}`,
  ];
  
  if (todoStats) {
    lines.push(`Has Todos: Yes (${todoStats.completed}/${todoStats.total} completed)`);
  } else {
    lines.push('Has Todos: No');
  }
  
  lines.push(`Has Transcript: ${session.transcript ? 'Yes' : 'No'}`);
  
  return lines.join('\n');
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours % 24 > 0) parts.push(`${hours % 24} hour${hours % 24 > 1 ? 's' : ''}`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60} minute${minutes % 60 > 1 ? 's' : ''}`);
  
  return parts.join(', ') || 'Less than a minute';
}

export const sessionInfoTool = {
  name: 'session_info',
  description: `Get metadata and statistics about an OpenCode session.

Returns detailed information about a session including message count, date range, agents used, and available data sources.

Arguments:
- session_id (required): Session ID to inspect

Example output:
Session ID: ses_abc123
Messages: 45
Date Range: 2025-12-20 10:30:00 to 2025-12-24 15:45:30
Duration: 4 days, 5 hours
Agents Used: build, oracle, librarian
Has Todos: Yes (12 items, 8 completed)
Has Transcript: Yes (234 entries)`,
  parameters: sessionInfoSchema,
  execute: sessionInfo,
};
```

## Session Manager Enhancement

```typescript
// src/core/session/manager.ts (enhanced)
export interface SessionQuery {
  limit?: number;
  fromDate?: Date;
  toDate?: Date;
  projectPath?: string;
  agents?: string[];
  hasUncompletedTodos?: boolean;
}

export interface Session {
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  todos?: Todo[];
  transcript?: string;
  agents?: string[];
  metadata: {
    title?: string;
    projectPath?: string;
    provider?: string;
    model?: string;
  };
  context: {
    provider: string;
    model: string;
  };
  status: 'active' | 'completed' | 'abandoned';
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private storage: SessionStorage;
  
  listSessions(query: SessionQuery): Session[] {
    let sessions = Array.from(this.sessions.values());
    
    // Apply filters
    if (query.fromDate) {
      sessions = sessions.filter(s => s.createdAt >= query.fromDate!);
    }
    if (query.toDate) {
      sessions = sessions.filter(s => s.createdAt <= query.toDate!);
    }
    if (query.projectPath) {
      sessions = sessions.filter(s => 
        s.metadata.projectPath?.includes(query.projectPath!)
      );
    }
    if (query.agents) {
      sessions = sessions.filter(s => 
        query.agents!.some(a => s.agents?.includes(a))
      );
    }
    if (query.hasUncompletedTodos) {
      sessions = sessions.filter(s =>
        s.todos?.some(t => t.status !== 'completed')
      );
    }
    
    // Sort by most recent
    sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    // Apply limit
    if (query.limit) {
      sessions = sessions.slice(0, query.limit);
    }
    
    return sessions;
  }
  
  async getSession(sessionId: string): Promise<Session | null> {
    // Try in-memory first
    let session = this.sessions.get(sessionId);
    
    // Try storage if not in memory
    if (!session) {
      session = await this.storage.load(sessionId);
      if (session) {
        this.sessions.set(sessionId, session);
      }
    }
    
    return session || null;
  }
  
  async searchSessions(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const sessions = this.listSessions({});
    
    for (const session of sessions) {
      for (const message of session.messages) {
        if (message.content.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            sessionId: session.sessionId,
            messageId: message.id,
            role: message.role,
            content: message.content,
            timestamp: message.timestamp,
          });
        }
      }
    }
    
    return results.slice(0, options.limit || 20);
  }
}
```

## File Structure

```
src/core/tools/session/
├── index.ts              # Export all session tools
├── list.ts               # session_list tool
├── list.test.ts
├── read.ts               # session_read tool
├── read.test.ts
├── search.ts             # session_search tool
├── search.test.ts
├── info.ts               # session_info tool
├── info.test.ts
└── types.ts              # Shared types

src/core/session/
├── index.ts
├── manager.ts            # Enhanced SessionManager
├── manager.test.ts
├── storage.ts            # Persistent storage
├── storage.test.ts
├── types.ts
└── cache.ts              # In-memory cache
```

## Tool Registration

```typescript
// src/core/tools/index.ts
import { sessionListTool } from './session/list';
import { sessionReadTool } from './session/read';
import { sessionSearchTool } from './session/search';
import { sessionInfoTool } from './session/info';

export const sessionTools = {
  session_list: sessionListTool,
  session_read: sessionReadTool,
  session_search: sessionSearchTool,
  session_info: sessionInfoTool,
};

export const allTools = {
  ...existingTools,
  ...sessionTools,
};
```

## Implementation Checklist

### Phase 1: Session Manager Enhancement (Day 1-2)
- [ ] Enhance SessionManager with query support
- [ ] Add search functionality
- [ ] Implement persistent storage
- [ ] Add agent tracking per session
- [ ] Write tests

### Phase 2: Core Tools (Day 3-4)
- [ ] Implement session_list
- [ ] Implement session_read
- [ ] Implement session_search
- [ ] Implement session_info
- [ ] Write tests

### Phase 3: Integration (Day 5)
- [ ] Register tools with tool registry
- [ ] Update agent prompts to use session tools
- [ ] Add documentation
- [ ] Integration testing

## Success Criteria

| Metric | Target |
|--------|--------|
| Query Performance | < 100ms for list/info |
| Search Performance | < 500ms for full search |
| Test Coverage | 80%+ |
| Session Persistence | 100% reliability |

---

**Last Updated**: 2026-01-13
**Status**: 📋 Planning Complete
