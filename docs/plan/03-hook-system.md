# Plan: Hook System Enhancement

> **Priority**: 🔴 Critical | **Phase**: 1-2 | **Duration**: 2 weeks

---

## Objective

Port oh-my-opencode's 30+ hooks to SuperCode, enabling:
- Resilient error recovery
- Preemptive context management
- Autonomous development loops
- Background task coordination

---

## Current State (SuperCode)

```typescript
// Basic hook system
export class HookRegistry {
  private hooks = new Map<string, Hook[]>()
  
  register(event: string, hook: Hook): void {}
  async trigger(event: string, data: any): Promise<any> {}
}
```

**Limitations**:
- Limited hook points
- No error recovery
- No context management
- No autonomous loops

---

## Target State (oh-my-opencode Pattern)

```typescript
// Advanced hook system with lifecycle management
export interface HookRegistry {
  // Core hooks
  'chat.message': (message: Message) => Message | void
  'chat.params': (params: ChatParams) => ChatParams | void
  
  // Tool hooks
  'tool.execute.before': (tool: ToolCall) => ToolCall | void
  'tool.execute.after': (result: ToolResult) => ToolResult | void
  
  // Session hooks
  'session.create': (session: Session) => void
  'session.error': (error: Error) => RecoveryAction | void
  'session.compact': (context: Context) => Context
  
  // Background hooks
  'background.complete': (taskId: string, result: any) => void
  'background.error': (taskId: string, error: Error) => void
}
```

---

## Critical Hooks to Implement

### 1. Ralph Loop (Autonomous Development)

```typescript
// src/hooks/ralph-loop/index.ts
export const ralphLoopHook: Hook = {
  name: 'ralph-loop',
  event: 'chat.message',
  
  handler: async (message, context) => {
    const state = getRalphState(context.sessionId)
    
    if (!state.active) return message
    
    // Check for completion promise
    if (message.content.includes('<promise>DONE</promise>')) {
      state.active = false
      return message
    }
    
    // Inject continuation prompt
    if (state.iterations < state.maxIterations) {
      state.iterations++
      return {
        ...message,
        continuation: {
          role: 'user',
          content: `[Ralph Loop: Iteration ${state.iterations}/${state.maxIterations}] Continue working...`
        }
      }
    }
    
    return message
  }
}
```

### 2. Context Window Monitor

```typescript
// src/hooks/context-window-monitor.ts
export const contextWindowMonitorHook: Hook = {
  name: 'context-window-monitor',
  event: 'chat.params',
  
  handler: async (params, context) => {
    const usage = calculateTokenUsage(params.messages)
    const limit = getModelContextLimit(params.model)
    const ratio = usage / limit
    
    if (ratio >= 0.85) {
      // Trigger preemptive compaction
      const compactedMessages = await compactMessages(params.messages, {
        targetRatio: 0.6,
        preserveRecent: 10,
      })
      
      return { ...params, messages: compactedMessages }
    }
    
    return params
  }
}
```

### 3. Error Recovery

```typescript
// src/hooks/anthropic-context-window-limit-recovery/index.ts
export const errorRecoveryHook: Hook = {
  name: 'anthropic-context-window-limit-recovery',
  event: 'session.error',
  
  handler: async (error, context) => {
    if (isContextWindowError(error)) {
      // Apply aggressive pruning
      const pruned = await pruneMessages(context.messages, {
        strategy: 'remove-tool-outputs',
        targetReduction: 0.5,
      })
      
      return { action: 'retry', messages: pruned }
    }
    
    if (isRateLimitError(error)) {
      // Wait and retry
      await delay(error.retryAfter || 60000)
      return { action: 'retry' }
    }
    
    return { action: 'fail' }
  }
}
```

### 4. Session Notification

```typescript
// src/hooks/session-notification.ts
export const sessionNotificationHook: Hook = {
  name: 'session-notification',
  event: 'background.complete',
  
  handler: async (taskId, result) => {
    const task = getBackgroundTask(taskId)
    
    // Inject notification into active session
    await injectSystemMessage(task.sessionId, {
      type: 'background_notification',
      content: `[BACKGROUND TASK COMPLETED] Task "${task.description}" finished. Use background_output with task_id="${taskId}" to get results.`
    })
  }
}
```

### 5. Todo Continuation Enforcer

```typescript
// src/hooks/todo-continuation-enforcer.ts
export const todoContinuationHook: Hook = {
  name: 'todo-continuation-enforcer',
  event: 'chat.message',
  
  handler: async (message, context) => {
    const todos = getTodoList(context.sessionId)
    const incomplete = todos.filter(t => t.status !== 'completed')
    
    if (incomplete.length > 0 && isTaskEnd(message)) {
      return {
        ...message,
        systemReminder: `[SYSTEM REMINDER - TODO CONTINUATION]
You have ${incomplete.length} incomplete todos:
${incomplete.map(t => `- [${t.status}] ${t.content}`).join('\n')}

Continue working on pending items.`
      }
    }
    
    return message
  }
}
```

---

## Hook Categories

### Session Lifecycle
| Hook | Purpose | Status |
|------|---------|--------|
| `session-create` | Initialize session state | 🔴 TODO |
| `session-error` | Handle errors | 🔴 TODO |
| `session-compact` | Context compaction | 🔴 TODO |
| `session-notification` | Background notifications | 🔴 TODO |

### Tool Execution
| Hook | Purpose | Status |
|------|---------|--------|
| `tool-output-truncator` | Limit large outputs | 🔴 TODO |
| `edit-error-recovery` | Handle edit failures | 🔴 TODO |
| `tool-input-cache` | Cache tool inputs | 🔴 TODO |

### Context Management
| Hook | Purpose | Status |
|------|---------|--------|
| `context-window-monitor` | Track usage | 🔴 TODO |
| `preemptive-compaction` | Auto-compact | 🔴 TODO |
| `compaction-context-injector` | Preserve context | 🔴 TODO |

### Autonomous
| Hook | Purpose | Status |
|------|---------|--------|
| `ralph-loop` | Dev loop | 🔴 TODO |
| `todo-continuation-enforcer` | Task tracking | 🔴 TODO |
| `agent-usage-reminder` | Agent suggestions | 🔴 TODO |

### Directory Injection
| Hook | Purpose | Status |
|------|---------|--------|
| `directory-agents-injector` | Load project agents | 🔴 TODO |
| `directory-readme-injector` | Inject README | 🔴 TODO |
| `auto-update-checker` | Version check | 🔴 TODO |

---

## File Structure

```
src/hooks/
├── index.ts                              # Hook registry
├── types.ts                              # Type definitions
├── ralph-loop/
│   ├── index.ts
│   ├── types.ts
│   ├── storage.ts
│   └── constants.ts
├── context-window-monitor.ts
├── anthropic-context-window-limit-recovery/
│   ├── index.ts
│   ├── parser.ts
│   ├── executor.ts
│   ├── pruning-*.ts
│   └── storage.ts
├── session-notification.ts
├── todo-continuation-enforcer.ts
├── tool-output-truncator.ts
├── edit-error-recovery/
│   └── index.ts
├── directory-agents-injector/
│   └── index.ts
├── directory-readme-injector/
│   └── index.ts
└── auto-update-checker/
    └── index.ts
```

---

## Implementation Order

1. **Week 1**: Core hooks
   - [ ] Context window monitor
   - [ ] Error recovery
   - [ ] Session notification
   
2. **Week 2**: Autonomous hooks
   - [ ] Ralph loop
   - [ ] Todo continuation
   - [ ] Directory injectors

---

## Success Criteria

- [ ] 85% context threshold triggers compaction
- [ ] Error recovery handles rate limits
- [ ] Ralph loop completes autonomous tasks
- [ ] Background notifications work
- [ ] All tests pass

---

**Owner**: TBD
**Start Date**: TBD
