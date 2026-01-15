# Phase 4.2: Claude Code Compatibility Layer

> Priority: P3 (Lower)
> Effort: 3-4 days
> Dependencies: Plugin system

## Overview

The Claude Code Compatibility Layer provides full compatibility with Claude Code's plugin ecosystem, enabling Oh-My-OpenCode plugins to work with SuperCode without modification.

## Current State in SuperCode

### What Exists
- Basic hook and tool infrastructure

### What's Missing
- Claude Code session state tracking
- Transcript file access
- Hook message injector
- Claude Code-specific types

## Reference Implementation (Oh-My-OpenCode)

```typescript
// oh-my-opencode/src/features/claude-code-hooks/
interface ClaudeCodeState {
  mainSessionId: string | undefined;
  subagentSessions: Set<string>;
}

// Transcript access
function getTranscriptPath(sessionId: string): string;

// Message injector for direct file manipulation
interface HookMessageInjector {
  findNearestMessageWithFields(messageDir: string): MessageData | null;
}
```

## Implementation Plan

### File Structure
```
src/features/claude-code/
├── index.ts              # Main exports
├── session-state.ts      # Session tracking
├── transcript.ts         # Transcript file access
├── message-injector.ts   # Direct message manipulation
├── hooks.ts              # Hook adapters
└── types.ts              # Type definitions
```

### 1. Types (`types.ts`)

```typescript
export interface ClaudeCodeSessionState {
  mainSessionId: string | undefined;
  subagentSessions: Set<string>;
  lastActiveSessionId: string | undefined;
}

export interface MessageFields {
  agent?: string;
  tools?: {
    write?: boolean;
    edit?: boolean;
    [key: string]: boolean | undefined;
  };
  model?: {
    providerID?: string;
    modelID?: string;
  };
}

export interface TranscriptEntry {
  timestamp: Date;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: unknown[];
}
```

### 2. Session State (`session-state.ts`)

```typescript
import type { ClaudeCodeSessionState } from './types';

const state: ClaudeCodeSessionState = {
  mainSessionId: undefined,
  subagentSessions: new Set(),
  lastActiveSessionId: undefined,
};

export function setMainSessionId(sessionId: string): void {
  state.mainSessionId = sessionId;
  state.lastActiveSessionId = sessionId;
}

export function getMainSessionId(): string | undefined {
  return state.mainSessionId;
}

export function clearMainSessionId(): void {
  state.mainSessionId = undefined;
}

export function addSubagentSession(sessionId: string): void {
  state.subagentSessions.add(sessionId);
  state.lastActiveSessionId = sessionId;
}

export function removeSubagentSession(sessionId: string): void {
  state.subagentSessions.delete(sessionId);
}

export function isSubagentSession(sessionId: string): boolean {
  return state.subagentSessions.has(sessionId);
}

export function getSubagentSessions(): string[] {
  return Array.from(state.subagentSessions);
}

export function getLastActiveSessionId(): string | undefined {
  return state.lastActiveSessionId;
}

export function setLastActiveSessionId(sessionId: string): void {
  state.lastActiveSessionId = sessionId;
}

// Export set for direct access (compatibility)
export const subagentSessions = state.subagentSessions;
```

### 3. Transcript Access (`transcript.ts`)

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { TranscriptEntry } from './types';

const TRANSCRIPT_BASE = path.join(os.homedir(), '.supercode', 'transcripts');

export function getTranscriptPath(sessionId: string): string {
  return path.join(TRANSCRIPT_BASE, `${sessionId}.jsonl`);
}

export function getTranscriptDir(): string {
  return TRANSCRIPT_BASE;
}

export function readTranscript(sessionId: string): TranscriptEntry[] {
  const transcriptPath = getTranscriptPath(sessionId);
  
  if (!fs.existsSync(transcriptPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    
    return lines.map(line => {
      const entry = JSON.parse(line);
      return {
        ...entry,
        timestamp: new Date(entry.timestamp),
      };
    });
  } catch {
    return [];
  }
}

export function appendToTranscript(
  sessionId: string, 
  entry: Omit<TranscriptEntry, 'timestamp'>
): void {
  const transcriptPath = getTranscriptPath(sessionId);
  const dir = path.dirname(transcriptPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const line = JSON.stringify({
    ...entry,
    timestamp: new Date().toISOString(),
  }) + '\n';

  fs.appendFileSync(transcriptPath, line);
}

export function searchTranscript(
  sessionId: string,
  pattern: string | RegExp
): TranscriptEntry[] {
  const entries = readTranscript(sessionId);
  const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
  
  return entries.filter(e => regex.test(e.content));
}
```

### 4. Message Injector (`message-injector.ts`)

```typescript
import * as fs from 'fs';
import * as path from 'path';
import type { MessageFields } from './types';

const MESSAGE_STORAGE = path.join(process.cwd(), '.supercoin', 'sessions');

export { MESSAGE_STORAGE };

interface StoredMessage {
  id: string;
  role: string;
  agent?: string;
  model?: {
    providerID?: string;
    modelID?: string;
  };
  tools?: Record<string, boolean>;
}

export function getMessageStoragePath(sessionId: string): string {
  return path.join(MESSAGE_STORAGE, sessionId, 'messages');
}

export function findNearestMessageWithFields(
  messageDir: string
): MessageFields | null {
  if (!fs.existsSync(messageDir)) {
    return null;
  }

  try {
    const files = fs.readdirSync(messageDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first

    for (const file of files) {
      const content = fs.readFileSync(path.join(messageDir, file), 'utf-8');
      const message: StoredMessage = JSON.parse(content);

      if (message.role === 'assistant' && (message.agent || message.model)) {
        return {
          agent: message.agent,
          tools: message.tools,
          model: message.model,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function findRecentAgentMessage(
  sessionId: string,
  agentName?: string
): StoredMessage | null {
  const messageDir = getMessageStoragePath(sessionId);
  
  if (!fs.existsSync(messageDir)) {
    return null;
  }

  try {
    const files = fs.readdirSync(messageDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    for (const file of files) {
      const content = fs.readFileSync(path.join(messageDir, file), 'utf-8');
      const message: StoredMessage = JSON.parse(content);

      if (message.role === 'assistant') {
        if (!agentName || message.agent === agentName) {
          return message;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}
```

### 5. Hook Adapters (`hooks.ts`)

```typescript
import type { Hook, HookContext, HookResult } from '../../core/types';
import { 
  setMainSessionId, 
  clearMainSessionId, 
  addSubagentSession,
  removeSubagentSession,
  setLastActiveSessionId,
} from './session-state';
import { appendToTranscript } from './transcript';

/**
 * Adapter hook that maintains Claude Code-compatible session state
 */
export function createClaudeCodeStateHook(): Hook {
  return {
    name: 'claude-code-state',
    description: 'Maintains Claude Code-compatible session state',
    priority: 100,
    events: [
      'session.start',
      'session.end',
      'session.deleted',
      'agent.spawn',
      'agent.complete',
      'message.after',
    ],

    handler: async (context: HookContext): Promise<HookResult | void> => {
      const { event, sessionId, data } = context;

      switch (event) {
        case 'session.start': {
          const isSubagent = (data as { isSubagent?: boolean })?.isSubagent;
          if (isSubagent) {
            addSubagentSession(sessionId);
          } else {
            setMainSessionId(sessionId);
          }
          break;
        }

        case 'session.end':
        case 'session.deleted': {
          removeSubagentSession(sessionId);
          break;
        }

        case 'agent.spawn': {
          const childSessionId = (data as { childSessionId?: string })?.childSessionId;
          if (childSessionId) {
            addSubagentSession(childSessionId);
          }
          break;
        }

        case 'agent.complete': {
          const childSessionId = (data as { childSessionId?: string })?.childSessionId;
          if (childSessionId) {
            removeSubagentSession(childSessionId);
          }
          break;
        }

        case 'message.after': {
          setLastActiveSessionId(sessionId);
          
          // Append to transcript
          const message = data as { role?: string; content?: string };
          if (message.role && message.content) {
            appendToTranscript(sessionId, {
              role: message.role as 'user' | 'assistant' | 'system',
              content: message.content,
            });
          }
          break;
        }
      }
    },
  };
}
```

### 6. Main Export (`index.ts`)

```typescript
export * from './types';
export * from './session-state';
export * from './transcript';
export * from './message-injector';
export { createClaudeCodeStateHook } from './hooks';

// Re-export for Claude Code compatibility
export { subagentSessions } from './session-state';
export { MESSAGE_STORAGE } from './message-injector';
```

## Usage

```typescript
// Initialize Claude Code compatibility
import { createClaudeCodeStateHook } from './features/claude-code';
import { getHookRegistry } from './core/hooks';

const hook = createClaudeCodeStateHook();
getHookRegistry().register(hook);

// Access session state
import { getMainSessionId, isSubagentSession } from './features/claude-code';

const mainSession = getMainSessionId();
const isSubagent = isSubagentSession(someSessionId);

// Access transcript
import { readTranscript, searchTranscript } from './features/claude-code';

const transcript = readTranscript(sessionId);
const matches = searchTranscript(sessionId, /error/i);
```

## Testing

```typescript
describe('ClaudeCodeCompat', () => {
  describe('SessionState', () => {
    it('should track main session');
    it('should track subagent sessions');
    it('should clean up on session end');
  });

  describe('Transcript', () => {
    it('should read transcript entries');
    it('should append entries');
    it('should search transcript');
  });

  describe('MessageInjector', () => {
    it('should find messages with fields');
    it('should handle missing directories');
  });
});
```

## Success Criteria

- [ ] Session state tracking works
- [ ] Transcript file access works
- [ ] Message injector finds fields
- [ ] Hook adapter maintains state
- [ ] Compatible with Oh-My-OpenCode hooks
