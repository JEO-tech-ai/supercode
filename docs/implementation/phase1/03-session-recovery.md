# Phase 1.3: Session Recovery Hook

> Priority: P0 (Critical - Prevents data corruption)
> Effort: 4-5 days
> Dependencies: Direct storage access

## Overview

When sessions are interrupted (user abort, network error, tool crash), the message history can become corrupted in ways that prevent the session from continuing. This hook detects specific corruption patterns and repairs them automatically.

## Current State in SuperCode

### Existing Files
```
src/core/hooks/types.ts           # RecoverableErrorType enum defined
src/core/session/manager.ts       # Session CRUD operations
```

### What Exists
- Error type definitions in hook types
- Session manager with message operations
- Basic session state management

### What's Missing
- Error type detection from messages
- Tool result injection for interrupted tool calls
- Thinking block manipulation
- Empty content placeholder injection
- Direct storage file manipulation

## Reference Implementation (Oh-My-OpenCode)

The reference handles these error patterns:

| Error Type | Cause | Recovery Action |
|------------|-------|-----------------|
| `tool_result_missing` | User abort during tool execution | Inject cancelled tool_result |
| `thinking_block_order` | Thinking block not first | Prepend thinking part |
| `thinking_disabled_violation` | Thinking blocks when disabled | Strip thinking parts |
| `empty_content` | Empty assistant message | Inject placeholder text |

```typescript
// Error detection patterns
function detectErrorType(error: unknown): RecoveryErrorType {
  const message = getErrorMessage(error).toLowerCase();

  if (message.includes('tool_use') && message.includes('tool_result')) {
    return 'tool_result_missing';
  }

  if (message.includes('thinking') && 
      (message.includes('first block') || message.includes('must start with'))) {
    return 'thinking_block_order';
  }

  if (message.includes('thinking is disabled')) {
    return 'thinking_disabled_violation';
  }

  return null;
}
```

## Implementation Plan

### File Structure
```
src/core/hooks/session-recovery/
├── index.ts          # Main hook factory
├── detector.ts       # Error type detection
├── storage.ts        # Direct file manipulation
├── recovery/
│   ├── tool-result.ts      # Tool result recovery
│   ├── thinking-block.ts   # Thinking block recovery
│   └── empty-content.ts    # Empty content recovery
└── types.ts          # Type definitions
```

### 1. Types Definition (`types.ts`)

```typescript
export type RecoveryErrorType =
  | 'tool_result_missing'
  | 'thinking_block_order'
  | 'thinking_disabled_violation'
  | 'empty_content'
  | null;

export interface MessageInfo {
  id?: string;
  sessionID?: string;
  role?: 'user' | 'assistant' | 'system';
  parentID?: string;
  error?: unknown;
  agent?: string;
  model?: {
    providerID?: string;
    modelID?: string;
  };
}

export interface MessagePart {
  type: string;
  id?: string;
  text?: string;
  thinking?: string;
  callID?: string;
  tool?: string;
  state?: {
    input?: Record<string, unknown>;
  };
}

export interface MessageData {
  info?: MessageInfo;
  parts?: MessagePart[];
}

export interface ResumeConfig {
  sessionID: string;
  agent?: string;
  model?: {
    providerID?: string;
    modelID?: string;
  };
}

export interface SessionRecoveryConfig {
  enabled: boolean;
  autoResume: boolean;
  placeholderText: string;
  cancelledToolResultText: string;
}

export const DEFAULT_CONFIG: SessionRecoveryConfig = {
  enabled: true,
  autoResume: true,
  placeholderText: '[user interrupted]',
  cancelledToolResultText: 'Operation cancelled by user (ESC pressed)',
};

export interface SessionRecoveryHook {
  handleSessionRecovery: (info: MessageInfo) => Promise<boolean>;
  isRecoverableError: (error: unknown) => boolean;
  setOnAbortCallback: (callback: (sessionID: string) => void) => void;
  setOnRecoveryCompleteCallback: (callback: (sessionID: string) => void) => void;
}
```

### 2. Error Detector (`detector.ts`)

```typescript
import type { RecoveryErrorType } from './types';

export function detectErrorType(error: unknown): RecoveryErrorType {
  const message = getErrorMessage(error);
  if (!message) return null;

  const lowerMessage = message.toLowerCase();

  // Tool result missing pattern
  // "every tool_use block must have a corresponding tool_result"
  if (
    lowerMessage.includes('tool_use') && 
    lowerMessage.includes('tool_result')
  ) {
    return 'tool_result_missing';
  }

  // Thinking block order patterns
  // "thinking must be the first block", "expected thinking, found text"
  if (
    lowerMessage.includes('thinking') &&
    (lowerMessage.includes('first block') ||
     lowerMessage.includes('must start with') ||
     lowerMessage.includes('preceeding') ||
     lowerMessage.includes('final block') ||
     lowerMessage.includes('cannot be thinking') ||
     (lowerMessage.includes('expected') && lowerMessage.includes('found')))
  ) {
    return 'thinking_block_order';
  }

  // Thinking disabled violation
  // "thinking is disabled and response cannot contain thinking blocks"
  if (
    lowerMessage.includes('thinking is disabled') && 
    lowerMessage.includes('cannot contain')
  ) {
    return 'thinking_disabled_violation';
  }

  // Empty content check
  if (
    lowerMessage.includes('empty content') ||
    lowerMessage.includes('content is required')
  ) {
    return 'empty_content';
  }

  return null;
}

export function getErrorMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;

  const errorObj = error as Record<string, unknown>;
  
  const paths = [
    errorObj.message,
    errorObj.data,
    errorObj.error,
    (errorObj.data as Record<string, unknown>)?.message,
    (errorObj.data as Record<string, unknown>)?.error,
    ((errorObj.data as Record<string, unknown>)?.error as Record<string, unknown>)?.message,
  ];

  for (const obj of paths) {
    if (typeof obj === 'string' && obj.length > 0) {
      return obj;
    }
    if (obj && typeof obj === 'object') {
      const msg = (obj as Record<string, unknown>).message;
      if (typeof msg === 'string' && msg.length > 0) {
        return msg;
      }
    }
  }

  try {
    return JSON.stringify(error);
  } catch {
    return '';
  }
}

export function extractMessageIndex(error: unknown): number | null {
  const message = getErrorMessage(error);
  const match = message.match(/messages\.(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export function isRecoverableError(error: unknown): boolean {
  return detectErrorType(error) !== null;
}
```

### 3. Storage Operations (`storage.ts`)

```typescript
import * as fs from 'fs';
import * as path from 'path';
import type { MessagePart } from './types';
import { Log } from '../../../shared/logger';

// Base storage path for sessions
const STORAGE_BASE = path.join(process.cwd(), '.supercoin', 'sessions');

export function getMessageStoragePath(sessionId: string): string {
  return path.join(STORAGE_BASE, sessionId, 'messages');
}

export function getPartStoragePath(messageId: string): string {
  return path.join(STORAGE_BASE, 'parts', messageId);
}

/**
 * Read message parts from storage
 */
export function readParts(messageId: string): MessagePart[] {
  const partDir = getPartStoragePath(messageId);
  
  if (!fs.existsSync(partDir)) {
    return [];
  }

  try {
    const files = fs.readdirSync(partDir);
    const parts: MessagePart[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const content = fs.readFileSync(path.join(partDir, file), 'utf-8');
      parts.push(JSON.parse(content));
    }

    return parts;
  } catch (error) {
    Log.warn(`[session-recovery] Failed to read parts for ${messageId}:`, error);
    return [];
  }
}

/**
 * Write a part to storage
 */
export function writePart(messageId: string, part: MessagePart): boolean {
  const partDir = getPartStoragePath(messageId);

  try {
    fs.mkdirSync(partDir, { recursive: true });
    
    const partId = part.id || `part_${Date.now()}`;
    const filePath = path.join(partDir, `${partId}.json`);
    
    fs.writeFileSync(filePath, JSON.stringify(part, null, 2));
    return true;
  } catch (error) {
    Log.error(`[session-recovery] Failed to write part:`, error);
    return false;
  }
}

/**
 * Find messages with empty content
 */
export function findEmptyMessages(sessionId: string): string[] {
  const messageDir = getMessageStoragePath(sessionId);
  const emptyMessageIds: string[] = [];

  if (!fs.existsSync(messageDir)) {
    return emptyMessageIds;
  }

  try {
    const files = fs.readdirSync(messageDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const content = fs.readFileSync(path.join(messageDir, file), 'utf-8');
      const message = JSON.parse(content);
      
      if (message.role === 'assistant') {
        const parts = readParts(message.id);
        const hasContent = parts.some(p => 
          (p.type === 'text' && p.text && p.text.length > 0) ||
          (p.type === 'tool' && p.tool)
        );
        
        if (!hasContent) {
          emptyMessageIds.push(message.id);
        }
      }
    }
  } catch (error) {
    Log.warn(`[session-recovery] Error scanning messages:`, error);
  }

  return emptyMessageIds;
}

/**
 * Find messages with only thinking blocks (no text)
 */
export function findMessagesWithThinkingOnly(sessionId: string): string[] {
  const messageDir = getMessageStoragePath(sessionId);
  const messageIds: string[] = [];

  if (!fs.existsSync(messageDir)) {
    return messageIds;
  }

  try {
    const files = fs.readdirSync(messageDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const content = fs.readFileSync(path.join(messageDir, file), 'utf-8');
      const message = JSON.parse(content);
      
      if (message.role === 'assistant') {
        const parts = readParts(message.id);
        const hasThinking = parts.some(p => p.type === 'thinking');
        const hasText = parts.some(p => p.type === 'text' && p.text);
        
        if (hasThinking && !hasText) {
          messageIds.push(message.id);
        }
      }
    }
  } catch (error) {
    Log.warn(`[session-recovery] Error scanning messages:`, error);
  }

  return messageIds;
}

/**
 * Find messages with thinking blocks
 */
export function findMessagesWithThinkingBlocks(sessionId: string): string[] {
  const messageDir = getMessageStoragePath(sessionId);
  const messageIds: string[] = [];

  if (!fs.existsSync(messageDir)) {
    return messageIds;
  }

  try {
    const files = fs.readdirSync(messageDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const content = fs.readFileSync(path.join(messageDir, file), 'utf-8');
      const message = JSON.parse(content);
      
      const parts = readParts(message.id);
      if (parts.some(p => p.type === 'thinking')) {
        messageIds.push(message.id);
      }
    }
  } catch (error) {
    Log.warn(`[session-recovery] Error scanning messages:`, error);
  }

  return messageIds;
}

/**
 * Inject text part into message
 */
export function injectTextPart(
  sessionId: string, 
  messageId: string, 
  text: string
): boolean {
  const textPart: MessagePart = {
    type: 'text',
    id: `part_${Date.now()}`,
    text,
  };

  return writePart(messageId, textPart);
}

/**
 * Strip thinking parts from message
 */
export function stripThinkingParts(messageId: string): boolean {
  const partDir = getPartStoragePath(messageId);
  
  if (!fs.existsSync(partDir)) {
    return false;
  }

  try {
    const files = fs.readdirSync(partDir);
    let anyRemoved = false;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(partDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const part = JSON.parse(content);
      
      if (part.type === 'thinking') {
        fs.unlinkSync(filePath);
        anyRemoved = true;
      }
    }

    return anyRemoved;
  } catch (error) {
    Log.error(`[session-recovery] Failed to strip thinking parts:`, error);
    return false;
  }
}

/**
 * Prepend thinking part to message
 */
export function prependThinkingPart(
  sessionId: string,
  messageId: string
): boolean {
  const thinkingPart: MessagePart = {
    type: 'thinking',
    id: `part_thinking_${Date.now()}`,
    thinking: '[thinking recovered]',
  };

  // Write with a timestamp that puts it first
  const partDir = getPartStoragePath(messageId);
  
  try {
    fs.mkdirSync(partDir, { recursive: true });
    
    const filePath = path.join(partDir, `00000_thinking.json`);
    fs.writeFileSync(filePath, JSON.stringify(thinkingPart, null, 2));
    return true;
  } catch (error) {
    Log.error(`[session-recovery] Failed to prepend thinking:`, error);
    return false;
  }
}

/**
 * Replace empty text parts
 */
export function replaceEmptyTextParts(
  messageId: string, 
  placeholder: string
): boolean {
  const partDir = getPartStoragePath(messageId);
  
  if (!fs.existsSync(partDir)) {
    return false;
  }

  try {
    const files = fs.readdirSync(partDir);
    let anyReplaced = false;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(partDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const part = JSON.parse(content);
      
      if (part.type === 'text' && (!part.text || part.text.length === 0)) {
        part.text = placeholder;
        fs.writeFileSync(filePath, JSON.stringify(part, null, 2));
        anyReplaced = true;
      }
    }

    return anyReplaced;
  } catch (error) {
    Log.error(`[session-recovery] Failed to replace empty text:`, error);
    return false;
  }
}
```

### 4. Recovery Functions

#### Tool Result Recovery (`recovery/tool-result.ts`)

```typescript
import type { MessageData, MessagePart, SessionRecoveryConfig } from '../types';
import { readParts } from '../storage';
import { Log } from '../../../../shared/logger';

interface ToolUsePart {
  type: 'tool_use' | 'tool';
  id?: string;
  callID?: string;
  tool?: string;
  name?: string;
}

export function extractToolUseIds(parts: MessagePart[]): string[] {
  return parts
    .filter((p): p is ToolUsePart => 
      (p.type === 'tool_use' || p.type === 'tool') && 
      !!(p.id || p.callID)
    )
    .map(p => p.id || p.callID!);
}

export async function recoverToolResultMissing(
  sessionId: string,
  failedAssistantMsg: MessageData,
  config: SessionRecoveryConfig,
  injectToolResults: (sessionId: string, parts: unknown[]) => Promise<void>
): Promise<boolean> {
  // Get parts from message or storage
  let parts = failedAssistantMsg.parts || [];
  
  if (parts.length === 0 && failedAssistantMsg.info?.id) {
    const storedParts = readParts(failedAssistantMsg.info.id);
    parts = storedParts.map(p => ({
      type: p.type === 'tool' ? 'tool_use' : p.type,
      id: p.callID || p.id,
      name: p.tool,
      input: p.state?.input,
    }));
  }

  const toolUseIds = extractToolUseIds(parts);
  
  if (toolUseIds.length === 0) {
    Log.warn('[session-recovery] No tool_use IDs found');
    return false;
  }

  // Create tool_result parts for each tool_use
  const toolResultParts = toolUseIds.map(id => ({
    type: 'tool_result',
    tool_use_id: id,
    content: config.cancelledToolResultText,
  }));

  try {
    await injectToolResults(sessionId, toolResultParts);
    Log.info(`[session-recovery] Injected ${toolResultParts.length} tool results`);
    return true;
  } catch (error) {
    Log.error('[session-recovery] Failed to inject tool results:', error);
    return false;
  }
}
```

#### Thinking Block Recovery (`recovery/thinking-block.ts`)

```typescript
import type { MessageData } from '../types';
import { 
  findMessagesWithThinkingBlocks,
  findMessagesWithThinkingOnly,
  stripThinkingParts,
  prependThinkingPart,
  injectTextPart,
} from '../storage';
import { extractMessageIndex } from '../detector';
import { Log } from '../../../../shared/logger';

export async function recoverThinkingBlockOrder(
  sessionId: string,
  failedMsg: MessageData,
  error: unknown
): Promise<boolean> {
  // Try to find specific message from error
  const targetIndex = extractMessageIndex(error);
  
  if (targetIndex !== null) {
    // Find message at that index and prepend thinking
    const messageId = findMessageByIndex(sessionId, targetIndex);
    if (messageId) {
      const success = prependThinkingPart(sessionId, messageId);
      if (success) {
        Log.info(`[session-recovery] Prepended thinking to message at index ${targetIndex}`);
        return true;
      }
    }
  }

  // Fallback: find all messages with orphan thinking
  const orphanMessages = findMessagesWithOrphanThinking(sessionId);
  
  if (orphanMessages.length === 0) {
    return false;
  }

  let anySuccess = false;
  for (const messageId of orphanMessages) {
    if (prependThinkingPart(sessionId, messageId)) {
      anySuccess = true;
    }
  }

  return anySuccess;
}

export async function recoverThinkingDisabledViolation(
  sessionId: string,
  failedMsg: MessageData
): Promise<boolean> {
  const messagesWithThinking = findMessagesWithThinkingBlocks(sessionId);
  
  if (messagesWithThinking.length === 0) {
    return false;
  }

  let anySuccess = false;
  for (const messageId of messagesWithThinking) {
    if (stripThinkingParts(messageId)) {
      anySuccess = true;
      Log.info(`[session-recovery] Stripped thinking from ${messageId}`);
    }
  }

  return anySuccess;
}

function findMessageByIndex(sessionId: string, index: number): string | null {
  // TODO: Implement based on session storage structure
  return null;
}

function findMessagesWithOrphanThinking(sessionId: string): string[] {
  // Messages where thinking exists but is not first
  // TODO: Implement based on storage structure
  return [];
}
```

#### Empty Content Recovery (`recovery/empty-content.ts`)

```typescript
import type { MessageData, SessionRecoveryConfig } from '../types';
import {
  findEmptyMessages,
  findMessagesWithThinkingOnly,
  replaceEmptyTextParts,
  injectTextPart,
} from '../storage';
import { extractMessageIndex } from '../detector';
import { Log } from '../../../../shared/logger';

export async function recoverEmptyContent(
  sessionId: string,
  failedMsg: MessageData,
  config: SessionRecoveryConfig,
  error: unknown
): Promise<boolean> {
  const targetIndex = extractMessageIndex(error);
  const failedId = failedMsg.info?.id;
  let anySuccess = false;

  // First, handle messages with empty text parts
  const emptyMessages = findEmptyMessages(sessionId);
  for (const messageId of emptyMessages) {
    if (replaceEmptyTextParts(messageId, config.placeholderText)) {
      anySuccess = true;
    }
  }

  // Handle thinking-only messages
  const thinkingOnlyIds = findMessagesWithThinkingOnly(sessionId);
  for (const messageId of thinkingOnlyIds) {
    if (injectTextPart(sessionId, messageId, config.placeholderText)) {
      anySuccess = true;
      Log.info(`[session-recovery] Injected placeholder into ${messageId}`);
    }
  }

  // Try specific message from error
  if (targetIndex !== null) {
    const targetMessageId = findMessageByIndex(sessionId, targetIndex);
    if (targetMessageId) {
      if (replaceEmptyTextParts(targetMessageId, config.placeholderText)) {
        return true;
      }
      if (injectTextPart(sessionId, targetMessageId, config.placeholderText)) {
        return true;
      }
    }
  }

  // Try failed message
  if (failedId) {
    if (replaceEmptyTextParts(failedId, config.placeholderText)) {
      return true;
    }
    if (injectTextPart(sessionId, failedId, config.placeholderText)) {
      return true;
    }
  }

  return anySuccess;
}

function findMessageByIndex(sessionId: string, index: number): string | null {
  // TODO: Implement
  return null;
}
```

### 5. Main Hook (`index.ts`)

```typescript
import type { Hook, HookContext, HookResult } from '../../types';
import type { 
  MessageInfo, 
  MessageData, 
  SessionRecoveryConfig,
  SessionRecoveryHook 
} from './types';
import { DEFAULT_CONFIG } from './types';
import { detectErrorType, isRecoverableError } from './detector';
import { recoverToolResultMissing } from './recovery/tool-result';
import { 
  recoverThinkingBlockOrder, 
  recoverThinkingDisabledViolation 
} from './recovery/thinking-block';
import { recoverEmptyContent } from './recovery/empty-content';
import { Log } from '../../../shared/logger';

export interface SessionRecoveryOptions {
  config?: Partial<SessionRecoveryConfig>;
  getMessages?: (sessionId: string) => Promise<MessageData[]>;
  abortSession?: (sessionId: string) => Promise<void>;
  resumeSession?: (sessionId: string, prompt?: string, agent?: string) => Promise<void>;
  injectToolResults?: (sessionId: string, parts: unknown[]) => Promise<void>;
  showToast?: (message: { title: string; message: string; variant: string }) => void;
}

export function createSessionRecoveryHook(
  options: SessionRecoveryOptions = {}
): Hook & SessionRecoveryHook {
  const config: SessionRecoveryConfig = {
    ...DEFAULT_CONFIG,
    ...options.config,
  };

  const processingErrors = new Set<string>();
  let onAbortCallback: ((sessionID: string) => void) | null = null;
  let onRecoveryCompleteCallback: ((sessionID: string) => void) | null = null;

  const getMessages = options.getMessages ?? (async () => []);
  const abortSession = options.abortSession ?? (async () => {});
  const resumeSession = options.resumeSession ?? (async () => {});
  const injectToolResults = options.injectToolResults ?? (async () => {});
  const showToast = options.showToast ?? (() => {});

  const TOAST_MESSAGES: Record<string, { title: string; message: string }> = {
    tool_result_missing: {
      title: 'Tool Crash Recovery',
      message: 'Injecting cancelled tool results...',
    },
    thinking_block_order: {
      title: 'Thinking Block Recovery',
      message: 'Fixing message structure...',
    },
    thinking_disabled_violation: {
      title: 'Thinking Strip Recovery',
      message: 'Stripping thinking blocks...',
    },
    empty_content: {
      title: 'Empty Content Recovery',
      message: 'Injecting placeholder content...',
    },
  };

  const handleSessionRecovery = async (info: MessageInfo): Promise<boolean> => {
    if (!info || info.role !== 'assistant' || !info.error) {
      return false;
    }

    const errorType = detectErrorType(info.error);
    if (!errorType) return false;

    const sessionID = info.sessionID;
    const assistantMsgID = info.id;

    if (!sessionID || !assistantMsgID) return false;
    if (processingErrors.has(assistantMsgID)) return false;
    
    processingErrors.add(assistantMsgID);

    try {
      // Notify about abort
      if (onAbortCallback) {
        onAbortCallback(sessionID);
      }

      // Abort current session operation
      await abortSession(sessionID);

      // Get messages
      const msgs = await getMessages(sessionID);
      const failedMsg = msgs.find(m => m.info?.id === assistantMsgID);
      
      if (!failedMsg) {
        return false;
      }

      // Show toast
      const toastInfo = TOAST_MESSAGES[errorType];
      if (toastInfo) {
        showToast({ ...toastInfo, variant: 'warning' });
      }

      let success = false;

      switch (errorType) {
        case 'tool_result_missing':
          success = await recoverToolResultMissing(
            sessionID, 
            failedMsg, 
            config,
            injectToolResults
          );
          break;

        case 'thinking_block_order':
          success = await recoverThinkingBlockOrder(
            sessionID,
            failedMsg,
            info.error
          );
          if (success && config.autoResume) {
            const lastUser = findLastUserMessage(msgs);
            await resumeSession(
              sessionID,
              '[session recovered - continuing previous task]',
              lastUser?.info?.agent
            );
          }
          break;

        case 'thinking_disabled_violation':
          success = await recoverThinkingDisabledViolation(
            sessionID,
            failedMsg
          );
          if (success && config.autoResume) {
            const lastUser = findLastUserMessage(msgs);
            await resumeSession(
              sessionID,
              '[session recovered - continuing previous task]',
              lastUser?.info?.agent
            );
          }
          break;

        case 'empty_content':
          success = await recoverEmptyContent(
            sessionID,
            failedMsg,
            config,
            info.error
          );
          break;
      }

      return success;

    } catch (err) {
      Log.error('[session-recovery] Recovery failed:', err);
      return false;
    } finally {
      processingErrors.delete(assistantMsgID);
      
      if (sessionID && onRecoveryCompleteCallback) {
        onRecoveryCompleteCallback(sessionID);
      }
    }
  };

  return {
    name: 'session-recovery',
    description: 'Recovers from session corruption errors',
    priority: 90,
    events: ['message.error', 'session.error'],

    handler: async (context: HookContext): Promise<HookResult | void> => {
      const { event, data } = context;
      
      if (event === 'message.error' || event === 'session.error') {
        const info = (data as { info?: MessageInfo })?.info;
        if (info) {
          await handleSessionRecovery(info);
        }
      }
    },

    handleSessionRecovery,
    isRecoverableError,
    setOnAbortCallback: (callback) => { onAbortCallback = callback; },
    setOnRecoveryCompleteCallback: (callback) => { onRecoveryCompleteCallback = callback; },
  };
}

function findLastUserMessage(messages: MessageData[]): MessageData | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].info?.role === 'user') {
      return messages[i];
    }
  }
  return undefined;
}

export * from './types';
export { detectErrorType, isRecoverableError } from './detector';
```

## Integration Points

### 1. Register Hook

```typescript
// src/core/hooks/index.ts
import { createSessionRecoveryHook } from './session-recovery';

const hook = createSessionRecoveryHook({
  getMessages: async (sessionId) => {
    return sessionManager.getSession(sessionId)?.messages ?? [];
  },
  abortSession: async (sessionId) => {
    // Abort current operation
  },
  resumeSession: async (sessionId, prompt, agent) => {
    // Resume with prompt
  },
  injectToolResults: async (sessionId, parts) => {
    // Inject tool results via session manager
  },
  showToast: (msg) => {
    // Show TUI toast
  },
});

getHookRegistry().register(hook);
```

### 2. Link with Todo Continuation

```typescript
// The todo-continuation-enforcer needs to know when recovery is happening
const recoveryHook = createSessionRecoveryHook(options);
const todoHook = createTodoContinuationEnforcer(options);

recoveryHook.setOnAbortCallback(todoHook.markRecovering);
recoveryHook.setOnRecoveryCompleteCallback(todoHook.markRecoveryComplete);
```

## Testing Plan

### Unit Tests
```typescript
describe('detectErrorType', () => {
  it('should detect tool_result_missing');
  it('should detect thinking_block_order');
  it('should detect thinking_disabled_violation');
  it('should return null for unknown errors');
});

describe('recoverToolResultMissing', () => {
  it('should extract tool_use IDs from parts');
  it('should inject cancelled tool results');
});

describe('SessionRecoveryHook', () => {
  it('should handle message.error events');
  it('should call recovery functions based on error type');
  it('should resume session after thinking recovery');
});
```

## Success Criteria

- [ ] Detects all 4 error types correctly
- [ ] Tool result injection succeeds
- [ ] Thinking blocks stripped when disabled
- [ ] Empty content gets placeholder
- [ ] Session resumes after recovery
- [ ] No duplicate recovery attempts
- [ ] Callback system works for coordination
