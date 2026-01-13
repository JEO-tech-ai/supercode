# Hooks System Improvement Plan

> **목표**: oh-my-opencode의 22+ hooks를 supercode에 포팅하여 산업용 수준의 에이전트 훅 시스템 구축

## Current State Analysis

### supercode (현재)

```typescript
// src/core/hooks.ts - 기본 HookRegistry
class HookRegistry implements IHookRegistry {
  private hooks: Map<string, Hook> = new Map();
  register(hook: Hook): void;
  unregister(name: string): boolean;
  getForEvent(event: HookEvent): Hook[];
  trigger(event: HookEvent, context: HookContext): Promise<HookResult | void>;
}
```

**문제점**:
- 단순한 이벤트 기반 시스템
- Hook 타입 안전성 부족
- 비동기 처리 미흡
- 에러 처리 기본적

### oh-my-opencode (목표)

```typescript
// 22+ 전문화된 hooks with factory pattern
export {
  createTodoContinuationEnforcer,
  createContextWindowMonitorHook,
  createSessionNotification,
  createSessionRecoveryHook,
  createCommentCheckerHooks,
  createToolOutputTruncatorHook,
  createDirectoryAgentsInjectorHook,
  createDirectoryReadmeInjectorHook,
  createEmptyTaskResponseDetectorHook,
  createAnthropicContextWindowLimitRecoveryHook,
  createPreemptiveCompactionHook,
  createCompactionContextInjector,
  createThinkModeHook,
  createClaudeCodeHooksHook,
  createRulesInjectorHook,
  createBackgroundNotificationHook,
  createAutoUpdateCheckerHook,
  createKeywordDetectorHook,
  createAgentUsageReminderHook,
  createNonInteractiveEnvHook,
  createInteractiveBashSessionHook,
  createEmptyMessageSanitizerHook,
  createThinkingBlockValidatorHook,
  createRalphLoopHook,
  createAutoSlashCommandHook,
  createEditErrorRecoveryHook,
};
```

## Implementation Plan

### Step 1: Hook Infrastructure Upgrade

#### 1.1 New Hook Types

```typescript
// src/core/hooks/types.ts
export interface HookContext {
  sessionID?: string;
  directory: string;
  client: OpencodeClient;
  event?: SessionEvent;
}

export interface ToolExecuteBeforeInput {
  tool: string;
  sessionID?: string;
}

export interface ToolExecuteBeforeOutput {
  args: Record<string, unknown>;
  skip?: boolean;
  result?: string;
}

export interface ToolExecuteAfterInput {
  tool: string;
  sessionID?: string;
  args: Record<string, unknown>;
}

export interface ToolExecuteAfterOutput {
  result: string;
}

export interface ChatMessageInput {
  sessionID: string;
}

export interface ChatMessageOutput {
  parts?: Array<{ type: string; text?: string }>;
}

export type HookHandler<I, O> = (input: I, output: O) => Promise<void>;
```

#### 1.2 Enhanced Hook Registry

```typescript
// src/core/hooks/registry.ts
export interface IHookRegistry {
  // Lifecycle hooks
  'tool.execute.before': HookHandler<ToolExecuteBeforeInput, ToolExecuteBeforeOutput>[];
  'tool.execute.after': HookHandler<ToolExecuteAfterInput, ToolExecuteAfterOutput>[];
  'chat.message': HookHandler<ChatMessageInput, ChatMessageOutput>[];
  'experimental.chat.messages.transform': HookHandler<unknown, unknown>[];
  
  // Event handler
  event: (input: { event: SessionEvent }) => Promise<void>;
  
  // Config handler
  config: (providerID: string, modelID: string) => Promise<ModelConfig>;
}
```

### Step 2: Core Hooks Implementation

#### 2.1 Todo Continuation Enforcer

```typescript
// src/core/hooks/todo-continuation-enforcer/index.ts
export interface TodoContinuationEnforcer {
  handler: (input: { event: SessionEvent }) => Promise<void>;
  markRecovering: () => void;
  markRecoveryComplete: () => void;
}

export function createTodoContinuationEnforcer(
  ctx: HookContext,
  options: { backgroundManager: BackgroundManager }
): TodoContinuationEnforcer {
  let isRecovering = false;
  
  const handler = async (input: { event: SessionEvent }) => {
    const { event } = input;
    
    if (event.type === 'session.idle' && !isRecovering) {
      // Check for incomplete todos
      const pendingTodos = await getPendingTodos(input.sessionID);
      if (pendingTodos.length > 0) {
        // Inject reminder to continue work
        await injectTodoReminder(ctx, pendingTodos);
      }
    }
  };
  
  return {
    handler,
    markRecovering: () => { isRecovering = true; },
    markRecoveryComplete: () => { isRecovering = false; },
  };
}
```

#### 2.2 Context Window Monitor

```typescript
// src/core/hooks/context-window-monitor/index.ts
export function createContextWindowMonitorHook(ctx: HookContext) {
  const tokenUsage = { current: 0, limit: 200000 };
  
  return {
    'tool.execute.after': async (
      input: ToolExecuteAfterInput,
      output: ToolExecuteAfterOutput
    ) => {
      // Track token usage from tool outputs
      const tokens = estimateTokens(output.result);
      tokenUsage.current += tokens;
      
      if (tokenUsage.current > tokenUsage.limit * 0.8) {
        // Warn about approaching limit
        await ctx.client.toast.show({
          message: `Context window 80% full (${tokenUsage.current}/${tokenUsage.limit})`,
          type: 'warning',
        });
      }
    },
    
    event: async (input: { event: SessionEvent }) => {
      if (input.event.type === 'session.compacted') {
        tokenUsage.current = 0; // Reset after compaction
      }
    },
  };
}
```

#### 2.3 Session Recovery Hook

```typescript
// src/core/hooks/session-recovery/index.ts
export interface SessionRecoveryOptions {
  experimental?: {
    dcp_for_compaction?: boolean;
  };
}

export interface SessionRecoveryHook {
  isRecoverableError: (error: unknown) => boolean;
  handleSessionRecovery: (messageInfo: MessageInfo) => Promise<boolean>;
  setOnAbortCallback: (cb: () => void) => void;
  setOnRecoveryCompleteCallback: (cb: () => void) => void;
}

export function createSessionRecoveryHook(
  ctx: HookContext,
  options: SessionRecoveryOptions
): SessionRecoveryHook {
  let onAbort: (() => void) | null = null;
  let onRecoveryComplete: (() => void) | null = null;
  
  const isRecoverableError = (error: unknown): boolean => {
    const message = String(error);
    return (
      message.includes('context_length_exceeded') ||
      message.includes('rate_limit_exceeded') ||
      message.includes('overloaded')
    );
  };
  
  const handleSessionRecovery = async (messageInfo: MessageInfo): Promise<boolean> => {
    onAbort?.();
    
    try {
      // Attempt compaction or summarization
      await ctx.client.session.compact({
        path: { id: messageInfo.sessionID! },
      });
      
      onRecoveryComplete?.();
      return true;
    } catch {
      return false;
    }
  };
  
  return {
    isRecoverableError,
    handleSessionRecovery,
    setOnAbortCallback: (cb) => { onAbort = cb; },
    setOnRecoveryCompleteCallback: (cb) => { onRecoveryComplete = cb; },
  };
}
```

### Step 3: Specialized Hooks

#### 3.1 Tool Output Truncator

```typescript
// src/core/hooks/tool-output-truncator/index.ts
const MAX_OUTPUT_LINES = 2000;
const MAX_OUTPUT_BYTES = 51200;

export function createToolOutputTruncatorHook(
  ctx: HookContext,
  options: { experimental?: object }
) {
  return {
    'tool.execute.after': async (
      input: ToolExecuteAfterInput,
      output: ToolExecuteAfterOutput
    ) => {
      const result = output.result;
      const lines = result.split('\n');
      const bytes = Buffer.byteLength(result, 'utf8');
      
      if (lines.length > MAX_OUTPUT_LINES || bytes > MAX_OUTPUT_BYTES) {
        // Truncate and save full output to file
        const truncatedPath = await saveFullOutput(result);
        output.result = [
          `Output truncated (${lines.length} lines, ${bytes} bytes)`,
          `Full output saved to: ${truncatedPath}`,
          '',
          ...lines.slice(0, 100),
          '',
          `... (${lines.length - 200} lines omitted) ...`,
          '',
          ...lines.slice(-100),
        ].join('\n');
      }
    },
  };
}
```

#### 3.2 Keyword Detector

```typescript
// src/core/hooks/keyword-detector/index.ts
const KEYWORDS = {
  'ultrawork': { mode: 'ultrawork', description: 'Maximum effort mode' },
  'analyze': { mode: 'analyze', description: 'Deep analysis mode' },
  'search': { mode: 'search', description: 'Exhaustive search mode' },
  'plan': { mode: 'plan', description: 'Planning mode' },
};

export function createKeywordDetectorHook(ctx: HookContext) {
  return {
    'chat.message': async (
      input: ChatMessageInput,
      output: ChatMessageOutput
    ) => {
      const text = output.parts
        ?.filter(p => p.type === 'text')
        .map(p => p.text)
        .join(' ') || '';
      
      for (const [keyword, config] of Object.entries(KEYWORDS)) {
        if (text.toLowerCase().includes(`[${keyword}]`) ||
            text.toLowerCase().includes(`[${keyword}-mode]`)) {
          // Inject mode-specific instructions
          await injectModeInstructions(ctx, config);
        }
      }
    },
  };
}
```

#### 3.3 Ralph Loop Hook

```typescript
// src/core/hooks/ralph-loop/index.ts
export interface RalphLoopConfig {
  maxIterations?: number;
  completionPromise?: string;
}

export interface RalphLoopHook {
  startLoop: (sessionId: string, prompt: string, options?: RalphLoopConfig) => void;
  cancelLoop: (sessionId: string) => void;
  event: (input: { event: SessionEvent }) => Promise<void>;
}

export function createRalphLoopHook(
  ctx: HookContext,
  options: {
    config?: RalphLoopConfig;
    checkSessionExists: (sessionId: string) => Promise<boolean>;
  }
): RalphLoopHook {
  const activeLoops = new Map<string, RalphLoopState>();
  
  const startLoop = (sessionId: string, prompt: string, config?: RalphLoopConfig) => {
    activeLoops.set(sessionId, {
      prompt,
      iteration: 0,
      maxIterations: config?.maxIterations ?? 100,
      completionPromise: config?.completionPromise ?? 'DONE',
      active: true,
    });
  };
  
  const cancelLoop = (sessionId: string) => {
    const loop = activeLoops.get(sessionId);
    if (loop) {
      loop.active = false;
    }
  };
  
  const event = async (input: { event: SessionEvent }) => {
    const { event } = input;
    
    if (event.type === 'session.idle') {
      const sessionId = (event.properties as any)?.sessionID;
      const loop = activeLoops.get(sessionId);
      
      if (loop?.active) {
        // Check for completion promise in last message
        const lastMessage = await getLastMessage(ctx, sessionId);
        
        if (lastMessage?.includes(`<promise>${loop.completionPromise}</promise>`)) {
          cancelLoop(sessionId);
          return;
        }
        
        if (loop.iteration >= loop.maxIterations) {
          cancelLoop(sessionId);
          return;
        }
        
        // Continue the loop
        loop.iteration++;
        await ctx.client.session.prompt({
          path: { id: sessionId },
          body: {
            parts: [{
              type: 'text',
              text: `[SYSTEM REMINDER - RALPH LOOP ITERATION ${loop.iteration}/${loop.maxIterations}]\n\nContinue working on the task. Output <promise>${loop.completionPromise}</promise> when complete.`,
            }],
          },
        });
      }
    }
  };
  
  return { startLoop, cancelLoop, event };
}
```

### Step 4: Hook Registration System

```typescript
// src/core/hooks/index.ts
export function initializeHooks(ctx: HookContext, config: SuperCodeConfig): HookRegistry {
  const registry = new HookRegistry();
  const disabledHooks = new Set(config.disabled_hooks ?? []);
  
  const isEnabled = (name: string) => !disabledHooks.has(name);
  
  // Core hooks
  if (isEnabled('todo-continuation-enforcer')) {
    registry.register('todo-continuation-enforcer', 
      createTodoContinuationEnforcer(ctx, { backgroundManager }));
  }
  
  if (isEnabled('context-window-monitor')) {
    registry.register('context-window-monitor',
      createContextWindowMonitorHook(ctx));
  }
  
  if (isEnabled('session-recovery')) {
    registry.register('session-recovery',
      createSessionRecoveryHook(ctx, { experimental: config.experimental }));
  }
  
  if (isEnabled('comment-checker')) {
    registry.register('comment-checker',
      createCommentCheckerHooks(config.comment_checker));
  }
  
  // ... register all 22+ hooks
  
  return registry;
}
```

## File Structure

```
src/core/hooks/
├── index.ts                           # Main export and initialization
├── types.ts                           # Shared type definitions
├── registry.ts                        # Enhanced HookRegistry
├── todo-continuation-enforcer/
│   ├── index.ts
│   └── index.test.ts
├── context-window-monitor/
│   ├── index.ts
│   └── index.test.ts
├── session-recovery/
│   ├── index.ts
│   ├── storage.ts
│   └── index.test.ts
├── session-notification/
│   ├── index.ts
│   └── utils.ts
├── comment-checker/                   # See 02-AGENT-DISCIPLINE.md
├── tool-output-truncator/
│   ├── index.ts
│   └── index.test.ts
├── directory-agents-injector/
│   ├── index.ts
│   ├── constants.ts
│   ├── types.ts
│   └── storage.ts
├── directory-readme-injector/
│   └── index.ts
├── empty-task-response-detector/
│   └── index.ts
├── anthropic-context-window-limit-recovery/
│   ├── index.ts
│   ├── executor.ts
│   ├── parser.ts
│   ├── storage.ts
│   ├── pruning-deduplication.ts
│   ├── pruning-executor.ts
│   ├── pruning-storage.ts
│   ├── pruning-supersede.ts
│   ├── pruning-purge-errors.ts
│   └── types.ts
├── preemptive-compaction/
│   ├── index.ts
│   ├── constants.ts
│   └── types.ts
├── compaction-context-injector/
│   └── index.ts
├── think-mode/
│   └── index.ts
├── claude-code-hooks/
│   ├── index.ts
│   ├── config.ts
│   ├── config-loader.ts
│   ├── pre-tool-use.ts
│   ├── post-tool-use.ts
│   ├── user-prompt-submit.ts
│   ├── pre-compact.ts
│   ├── stop.ts
│   ├── transcript.ts
│   ├── tool-input-cache.ts
│   ├── todo.ts
│   ├── plugin-config.ts
│   └── types.ts
├── rules-injector/
│   ├── index.ts
│   ├── finder.ts
│   ├── matcher.ts
│   ├── parser.ts
│   ├── storage.ts
│   ├── constants.ts
│   └── types.ts
├── background-notification/
│   ├── index.ts
│   └── types.ts
├── auto-update-checker/
│   ├── index.ts
│   ├── checker.ts
│   ├── cache.ts
│   ├── constants.ts
│   └── types.ts
├── keyword-detector/
│   ├── index.ts
│   ├── detector.ts
│   ├── constants.ts
│   └── types.ts
├── agent-usage-reminder/
│   ├── index.ts
│   ├── constants.ts
│   ├── storage.ts
│   └── types.ts
├── non-interactive-env/
│   ├── index.ts
│   ├── detector.ts
│   ├── constants.ts
│   └── types.ts
├── interactive-bash-session/
│   ├── index.ts
│   ├── constants.ts
│   ├── storage.ts
│   └── types.ts
├── empty-message-sanitizer/
│   └── index.ts
├── thinking-block-validator/
│   └── index.ts
├── ralph-loop/
│   ├── index.ts
│   ├── constants.ts
│   ├── storage.ts
│   └── types.ts
├── auto-slash-command/
│   └── index.ts
└── edit-error-recovery/
    └── index.ts
```

## Implementation Checklist

### Phase 1: Infrastructure (Day 1-2)
- [ ] Create new types.ts with all interfaces
- [ ] Upgrade HookRegistry with new pattern
- [ ] Add hook factory function pattern
- [ ] Implement hook enable/disable via config

### Phase 2: Core Hooks (Day 3-5)
- [ ] todo-continuation-enforcer
- [ ] context-window-monitor
- [ ] session-recovery
- [ ] session-notification
- [ ] tool-output-truncator

### Phase 3: Specialized Hooks (Day 6-8)
- [ ] directory-agents-injector
- [ ] directory-readme-injector
- [ ] empty-task-response-detector
- [ ] anthropic-context-window-limit-recovery
- [ ] preemptive-compaction

### Phase 4: Advanced Hooks (Day 9-12)
- [ ] claude-code-hooks (full compatibility layer)
- [ ] rules-injector
- [ ] background-notification
- [ ] auto-update-checker
- [ ] keyword-detector
- [ ] agent-usage-reminder

### Phase 5: Utility Hooks (Day 13-14)
- [ ] non-interactive-env
- [ ] interactive-bash-session
- [ ] empty-message-sanitizer
- [ ] thinking-block-validator
- [ ] ralph-loop
- [ ] auto-slash-command
- [ ] edit-error-recovery

## Success Criteria

| Metric | Target |
|--------|--------|
| Hooks Implemented | 22+ |
| Test Coverage | 80%+ per hook |
| Type Safety | 100% TypeScript strict |
| Performance | < 10ms per hook execution |
| Documentation | JSDoc for all exports |

## Dependencies

```json
{
  "dependencies": {
    "picocolors": "^1.1.1",
    "picomatch": "^4.0.2"
  }
}
```

---

**Last Updated**: 2026-01-13
**Status**: 📋 Planning Complete
**Next**: Start Phase 1 Infrastructure
