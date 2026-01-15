# Phase 1.2: Context Window Limit Recovery Hook

> Priority: P0 (Critical - Prevents session crashes)
> Effort: 3-4 days
> Dependencies: Enhanced session events

## Overview

When the context window exceeds the model's token limit, Anthropic and other providers return specific errors. This hook detects these errors, automatically truncates large tool outputs, and retries the request to recover the session.

## Current State in SuperCode

### Existing Files
```
src/core/hooks/types.ts           # Has RecoverableErrorType including 'token_limit_exceeded'
src/core/session/compaction.ts    # Basic compaction logic exists
```

### What Exists
- Hook type system with error types defined
- Basic session compaction functionality
- Session manager with compaction support

### What's Missing
- Anthropic-specific error parsing
- Auto-detection on session.error events
- Tool output truncation strategy
- DCP (Dynamic Context Pruning) integration
- Auto-retry mechanism
- Toast notifications

## Reference Implementation (Oh-My-OpenCode)

```typescript
// From oh-my-opencode/src/hooks/anthropic-context-window-limit-recovery/

interface ParsedTokenLimitError {
  type: 'token_limit';
  currentTokens?: number;
  maxTokens?: number;
  providerID?: string;
  modelID?: string;
}

interface AutoCompactState {
  pendingCompact: Set<string>;
  errorDataBySession: Map<string, ParsedTokenLimitError>;
  retryStateBySession: Map<string, RetryState>;
  truncateStateBySession: Map<string, TruncateState>;
  dcpStateBySession: Map<string, DcpState>;
  compactionInProgress: Set<string>;
}

// Error patterns to detect
const ANTHROPIC_PATTERNS = [
  /prompt is too long: (\d+) tokens > (\d+) maximum/i,
  /maximum context length.*?(\d+).*?(\d+)/i,
  /context_length_exceeded/i,
];
```

## Implementation Plan

### File Structure
```
src/core/hooks/context-window-limit-recovery/
├── index.ts          # Hook factory and main event handler
├── parser.ts         # Error message parsing
├── executor.ts       # Truncation and retry execution
├── strategies.ts     # Different recovery strategies
└── types.ts          # State and config types
```

### 1. Types Definition (`types.ts`)

```typescript
export interface ParsedTokenLimitError {
  type: 'token_limit';
  currentTokens?: number;
  maxTokens?: number;
  providerID?: string;
  modelID?: string;
  rawError?: unknown;
}

export interface RetryState {
  attempts: number;
  maxAttempts: number;
  lastAttemptAt: Date;
  strategy: RecoveryStrategy;
}

export interface TruncateState {
  truncatedMessages: string[];
  originalSizes: Map<string, number>;
  truncatedSizes: Map<string, number>;
}

export interface DcpState {
  enabled: boolean;
  targetRatio: number;
  prunedTokens: number;
}

export interface AutoCompactState {
  pendingCompact: Set<string>;
  errorDataBySession: Map<string, ParsedTokenLimitError>;
  retryStateBySession: Map<string, RetryState>;
  truncateStateBySession: Map<string, TruncateState>;
  dcpStateBySession: Map<string, DcpState>;
  emptyContentAttemptBySession: Map<string, number>;
  compactionInProgress: Set<string>;
}

export type RecoveryStrategy = 
  | 'truncate_tool_outputs'
  | 'dcp'
  | 'summarize'
  | 'remove_old_messages';

export interface ContextWindowRecoveryConfig {
  enabled: boolean;
  maxRetryAttempts: number;
  truncateThreshold: number;      // Characters before truncating tool output
  dcpEnabled: boolean;
  dcpTargetRatio: number;         // Target ratio of max tokens (e.g., 0.8)
  strategies: RecoveryStrategy[]; // Order of strategies to try
}

export const DEFAULT_CONFIG: ContextWindowRecoveryConfig = {
  enabled: true,
  maxRetryAttempts: 3,
  truncateThreshold: 50000,
  dcpEnabled: true,
  dcpTargetRatio: 0.8,
  strategies: ['truncate_tool_outputs', 'dcp', 'summarize'],
};
```

### 2. Error Parser (`parser.ts`)

```typescript
import type { ParsedTokenLimitError } from './types';

const ERROR_PATTERNS = [
  // Anthropic patterns
  /prompt is too long: (\d+) tokens > (\d+) maximum/i,
  /maximum context length.*?(\d+).*?(\d+)/i,
  /context_length_exceeded/i,
  /Request too large/i,
  
  // OpenAI patterns  
  /maximum context length is (\d+) tokens.*?(\d+)/i,
  /reduce the length of the messages/i,
  
  // Generic patterns
  /token limit exceeded/i,
  /context.*?too long/i,
];

export function parseTokenLimitError(error: unknown): ParsedTokenLimitError | null {
  const errorMessage = extractErrorMessage(error);
  if (!errorMessage) return null;

  const lowerMessage = errorMessage.toLowerCase();
  
  // Check if it matches any known pattern
  let isTokenLimitError = false;
  let currentTokens: number | undefined;
  let maxTokens: number | undefined;

  for (const pattern of ERROR_PATTERNS) {
    const match = errorMessage.match(pattern);
    if (match) {
      isTokenLimitError = true;
      
      // Try to extract token counts from match groups
      if (match[1]) currentTokens = parseInt(match[1], 10);
      if (match[2]) maxTokens = parseInt(match[2], 10);
      
      break;
    }
  }

  // Also check for known error codes
  if (!isTokenLimitError) {
    const errorCode = extractErrorCode(error);
    if (errorCode === 'context_length_exceeded' || 
        errorCode === 'token_limit_exceeded') {
      isTokenLimitError = true;
    }
  }

  if (!isTokenLimitError) return null;

  return {
    type: 'token_limit',
    currentTokens,
    maxTokens,
    providerID: extractProviderID(error),
    modelID: extractModelID(error),
    rawError: error,
  };
}

function extractErrorMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  
  const errorObj = error as Record<string, unknown>;
  
  // Try common error message paths
  const paths = [
    errorObj.message,
    (errorObj.error as Record<string, unknown>)?.message,
    (errorObj.data as Record<string, unknown>)?.message,
    ((errorObj.data as Record<string, unknown>)?.error as Record<string, unknown>)?.message,
  ];

  for (const msg of paths) {
    if (typeof msg === 'string' && msg.length > 0) {
      return msg;
    }
  }

  try {
    return JSON.stringify(error);
  } catch {
    return '';
  }
}

function extractErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  
  const errorObj = error as Record<string, unknown>;
  const code = errorObj.code ?? 
               (errorObj.error as Record<string, unknown>)?.code ??
               (errorObj.data as Record<string, unknown>)?.code;
               
  return typeof code === 'string' ? code : null;
}

function extractProviderID(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const errorObj = error as Record<string, unknown>;
  return errorObj.providerID as string | undefined;
}

function extractModelID(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const errorObj = error as Record<string, unknown>;
  return errorObj.modelID as string | undefined;
}

export function isTokenLimitError(error: unknown): boolean {
  return parseTokenLimitError(error) !== null;
}
```

### 3. Recovery Executor (`executor.ts`)

```typescript
import type { 
  AutoCompactState, 
  RecoveryStrategy, 
  ContextWindowRecoveryConfig,
  TruncateState 
} from './types';
import { Log } from '../../../shared/logger';

interface SessionMessage {
  id: string;
  role: string;
  content: string;
  metadata?: {
    toolName?: string;
    toolResult?: unknown;
    tokens?: { total?: number };
  };
}

interface ExecutorContext {
  sessionId: string;
  messages: SessionMessage[];
  providerID?: string;
  modelID?: string;
}

export async function executeRecovery(
  context: ExecutorContext,
  state: AutoCompactState,
  config: ContextWindowRecoveryConfig,
  resumeSession: (sessionId: string) => Promise<void>
): Promise<boolean> {
  const { sessionId } = context;
  
  // Check if already recovering
  if (state.compactionInProgress.has(sessionId)) {
    Log.info(`[context-recovery] Already recovering session ${sessionId}`);
    return false;
  }

  state.compactionInProgress.add(sessionId);

  try {
    // Get or create retry state
    let retryState = state.retryStateBySession.get(sessionId);
    if (!retryState) {
      retryState = {
        attempts: 0,
        maxAttempts: config.maxRetryAttempts,
        lastAttemptAt: new Date(),
        strategy: config.strategies[0],
      };
      state.retryStateBySession.set(sessionId, retryState);
    }

    // Check max attempts
    if (retryState.attempts >= retryState.maxAttempts) {
      Log.warn(`[context-recovery] Max attempts reached for ${sessionId}`);
      return false;
    }

    retryState.attempts++;
    retryState.lastAttemptAt = new Date();

    // Try strategies in order
    for (const strategy of config.strategies) {
      Log.info(`[context-recovery] Trying strategy: ${strategy}`);
      
      let success = false;
      
      switch (strategy) {
        case 'truncate_tool_outputs':
          success = await truncateToolOutputs(context, state, config);
          break;
        case 'dcp':
          success = await applyDynamicContextPruning(context, state, config);
          break;
        case 'summarize':
          success = await summarizeOldMessages(context, state);
          break;
        case 'remove_old_messages':
          success = await removeOldMessages(context, state);
          break;
      }

      if (success) {
        Log.info(`[context-recovery] Strategy ${strategy} succeeded`);
        
        // Resume session
        await resumeSession(sessionId);
        
        // Clear pending state
        state.pendingCompact.delete(sessionId);
        state.errorDataBySession.delete(sessionId);
        
        return true;
      }
    }

    Log.warn(`[context-recovery] All strategies failed for ${sessionId}`);
    return false;

  } finally {
    state.compactionInProgress.delete(sessionId);
  }
}

async function truncateToolOutputs(
  context: ExecutorContext,
  state: AutoCompactState,
  config: ContextWindowRecoveryConfig
): Promise<boolean> {
  const { sessionId, messages } = context;
  
  // Find messages with large tool outputs
  const largeToolMessages = messages.filter(msg => {
    if (msg.role !== 'assistant') return false;
    const content = msg.content || '';
    return content.length > config.truncateThreshold;
  });

  if (largeToolMessages.length === 0) {
    return false;
  }

  const truncateState: TruncateState = {
    truncatedMessages: [],
    originalSizes: new Map(),
    truncatedSizes: new Map(),
  };

  for (const msg of largeToolMessages) {
    const originalSize = msg.content.length;
    const truncatedContent = truncateContent(msg.content, config.truncateThreshold);
    
    truncateState.truncatedMessages.push(msg.id);
    truncateState.originalSizes.set(msg.id, originalSize);
    truncateState.truncatedSizes.set(msg.id, truncatedContent.length);

    // Update message in storage
    await updateMessageContent(sessionId, msg.id, truncatedContent);
  }

  state.truncateStateBySession.set(sessionId, truncateState);
  
  Log.info(`[context-recovery] Truncated ${largeToolMessages.length} messages`);
  return true;
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  
  const truncatePoint = Math.floor(maxLength * 0.8);
  const truncatedContent = content.slice(0, truncatePoint);
  
  return `${truncatedContent}\n\n[... truncated ${content.length - truncatePoint} characters due to context limit ...]`;
}

async function applyDynamicContextPruning(
  context: ExecutorContext,
  state: AutoCompactState,
  config: ContextWindowRecoveryConfig
): Promise<boolean> {
  if (!config.dcpEnabled) return false;
  
  const { sessionId, messages } = context;
  
  // Calculate current token estimate
  const totalTokens = messages.reduce((sum, msg) => {
    return sum + (msg.metadata?.tokens?.total || estimateTokens(msg.content));
  }, 0);

  // Get model max tokens (from error data if available)
  const errorData = state.errorDataBySession.get(sessionId);
  const maxTokens = errorData?.maxTokens || 100000; // Default fallback
  
  const targetTokens = Math.floor(maxTokens * config.dcpTargetRatio);
  const tokensToRemove = totalTokens - targetTokens;

  if (tokensToRemove <= 0) {
    return false;
  }

  // Remove oldest non-essential messages
  let removedTokens = 0;
  const messagesToRemove: string[] = [];

  // Skip first message (usually system) and last few messages
  const candidateMessages = messages.slice(1, -3);
  
  for (const msg of candidateMessages) {
    if (removedTokens >= tokensToRemove) break;
    
    const tokens = msg.metadata?.tokens?.total || estimateTokens(msg.content);
    messagesToRemove.push(msg.id);
    removedTokens += tokens;
  }

  // Actually remove messages
  for (const msgId of messagesToRemove) {
    await removeMessage(sessionId, msgId);
  }

  state.dcpStateBySession.set(sessionId, {
    enabled: true,
    targetRatio: config.dcpTargetRatio,
    prunedTokens: removedTokens,
  });

  Log.info(`[context-recovery] DCP removed ${removedTokens} tokens`);
  return messagesToRemove.length > 0;
}

async function summarizeOldMessages(
  context: ExecutorContext,
  state: AutoCompactState
): Promise<boolean> {
  // TODO: Implement summarization via model call
  // For now, just remove old messages
  return removeOldMessages(context, state);
}

async function removeOldMessages(
  context: ExecutorContext,
  state: AutoCompactState
): Promise<boolean> {
  const { sessionId, messages } = context;
  
  // Keep first message (system) and last 10 messages
  const messagesToKeep = [
    messages[0],
    ...messages.slice(-10),
  ];
  
  const messageIdsToKeep = new Set(messagesToKeep.map(m => m.id));
  const messagesToRemove = messages.filter(m => !messageIdsToKeep.has(m.id));

  for (const msg of messagesToRemove) {
    await removeMessage(sessionId, msg.id);
  }

  Log.info(`[context-recovery] Removed ${messagesToRemove.length} old messages`);
  return messagesToRemove.length > 0;
}

function estimateTokens(content: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(content.length / 4);
}

// Storage operations (to be implemented with actual session manager)
async function updateMessageContent(
  sessionId: string,
  messageId: string,
  content: string
): Promise<void> {
  // TODO: Integrate with session manager
  Log.debug(`[context-recovery] Would update message ${messageId} content`);
}

async function removeMessage(
  sessionId: string,
  messageId: string
): Promise<void> {
  // TODO: Integrate with session manager
  Log.debug(`[context-recovery] Would remove message ${messageId}`);
}
```

### 4. Main Hook (`index.ts`)

```typescript
import type { Hook, HookContext, HookResult } from '../../types';
import type { AutoCompactState, ContextWindowRecoveryConfig } from './types';
import { parseTokenLimitError } from './parser';
import { executeRecovery } from './executor';
import { DEFAULT_CONFIG } from './types';
import { Log } from '../../../shared/logger';

export interface ContextWindowRecoveryHookOptions {
  config?: Partial<ContextWindowRecoveryConfig>;
  showToast?: (message: { title: string; message: string; variant: string }) => void;
  resumeSession?: (sessionId: string) => Promise<void>;
  getMessages?: (sessionId: string) => Promise<unknown[]>;
}

export function createContextWindowRecoveryHook(
  options: ContextWindowRecoveryHookOptions = {}
): Hook {
  const config: ContextWindowRecoveryConfig = {
    ...DEFAULT_CONFIG,
    ...options.config,
  };

  const state: AutoCompactState = {
    pendingCompact: new Set(),
    errorDataBySession: new Map(),
    retryStateBySession: new Map(),
    truncateStateBySession: new Map(),
    dcpStateBySession: new Map(),
    emptyContentAttemptBySession: new Map(),
    compactionInProgress: new Set(),
  };

  const showToast = options.showToast ?? (() => {});
  const resumeSession = options.resumeSession ?? (async () => {});
  const getMessages = options.getMessages ?? (async () => []);

  return {
    name: 'context-window-limit-recovery',
    description: 'Automatically recovers from context window limit errors',
    priority: 100, // High priority to catch errors first
    events: ['session.error', 'message.error', 'session.idle', 'session.deleted'],
    
    handler: async (context: HookContext): Promise<HookResult | void> => {
      const { event, sessionId, data } = context;

      // Handle session deletion - cleanup state
      if (event === 'session.deleted') {
        state.pendingCompact.delete(sessionId);
        state.errorDataBySession.delete(sessionId);
        state.retryStateBySession.delete(sessionId);
        state.truncateStateBySession.delete(sessionId);
        state.dcpStateBySession.delete(sessionId);
        state.emptyContentAttemptBySession.delete(sessionId);
        state.compactionInProgress.delete(sessionId);
        return;
      }

      // Handle errors
      if (event === 'session.error' || event === 'message.error') {
        const error = (data as { error?: unknown })?.error ?? context.error;
        
        const parsed = parseTokenLimitError(error);
        if (!parsed) return;

        Log.info(`[context-recovery] Token limit error detected for ${sessionId}`);
        
        state.pendingCompact.add(sessionId);
        state.errorDataBySession.set(sessionId, parsed);

        // Skip if already recovering
        if (state.compactionInProgress.has(sessionId)) {
          return;
        }

        // Show toast
        showToast({
          title: 'Context Limit Hit',
          message: 'Truncating large outputs and recovering...',
          variant: 'warning',
        });

        // Delay slightly then execute
        setTimeout(async () => {
          const messages = await getMessages(sessionId);
          
          await executeRecovery(
            {
              sessionId,
              messages: messages as any,
              providerID: parsed.providerID,
              modelID: parsed.modelID,
            },
            state,
            config,
            resumeSession
          );
        }, 300);

        return { continue: false }; // Stop error propagation
      }

      // Handle idle - check for pending recovery
      if (event === 'session.idle') {
        if (!state.pendingCompact.has(sessionId)) return;

        const errorData = state.errorDataBySession.get(sessionId);
        if (!errorData) return;

        showToast({
          title: 'Auto Compact',
          message: 'Token limit exceeded. Attempting recovery...',
          variant: 'warning',
        });

        const messages = await getMessages(sessionId);
        
        await executeRecovery(
          {
            sessionId,
            messages: messages as any,
            providerID: errorData.providerID,
            modelID: errorData.modelID,
          },
          state,
          config,
          resumeSession
        );
      }
    },
  };
}

export * from './types';
export { parseTokenLimitError, isTokenLimitError } from './parser';
```

## Integration Points

### 1. Register Hook

```typescript
// src/core/hooks/index.ts
import { createContextWindowRecoveryHook } from './context-window-limit-recovery';
import { getHookRegistry } from './hooks';

const hook = createContextWindowRecoveryHook({
  showToast: (msg) => {
    // Integrate with TUI toast system
  },
  resumeSession: async (sessionId) => {
    // Resume session via session manager
  },
  getMessages: async (sessionId) => {
    // Get messages from session manager
  },
});

getHookRegistry().register(hook);
```

### 2. Session Manager Integration

The executor needs access to:
- `updateMessageContent()` - Modify message content for truncation
- `removeMessage()` - Remove messages for DCP
- Session resume functionality

## Testing Plan

### Unit Tests
```typescript
describe('parseTokenLimitError', () => {
  it('should parse Anthropic token limit errors');
  it('should parse OpenAI token limit errors');
  it('should return null for non-token-limit errors');
  it('should extract token counts when available');
});

describe('executeRecovery', () => {
  it('should truncate large tool outputs');
  it('should apply DCP when truncation insufficient');
  it('should respect max retry attempts');
  it('should resume session after successful recovery');
});

describe('ContextWindowRecoveryHook', () => {
  it('should detect token limit errors on session.error');
  it('should trigger recovery on session.idle');
  it('should cleanup state on session.deleted');
});
```

## Success Criteria

- [ ] Detects Anthropic token limit errors
- [ ] Detects OpenAI token limit errors  
- [ ] Truncates tool outputs > 50k chars
- [ ] DCP reduces context by target ratio
- [ ] Session resumes after recovery
- [ ] Toast notifications shown
- [ ] No infinite retry loops
- [ ] State cleaned up on session delete
