# Background Agent System Plan

> **목표**: 병렬 에이전트 실행을 위한 BackgroundManager 및 관련 도구 구현

## Overview

Background Agent System은 여러 에이전트를 병렬로 실행하고 결과를 수집할 수 있게 합니다. 이를 통해 복잡한 작업을 여러 전문 에이전트에게 동시에 위임할 수 있습니다.

## Core Components

### 1. BackgroundManager

```typescript
// src/services/background/manager.ts
import { EventEmitter } from 'events';
import { ConcurrencyManager } from './concurrency-manager';

export interface BackgroundTask {
  id: string;
  agent: string;
  prompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  sessionId: string;
  result?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
}

export interface BackgroundManagerOptions {
  maxConcurrency?: number;
  taskTimeout?: number;
}

export class BackgroundManager extends EventEmitter {
  private tasks: Map<string, BackgroundTask> = new Map();
  private concurrencyManager: ConcurrencyManager;
  private ctx: HookContext;
  
  constructor(ctx: HookContext, options: BackgroundManagerOptions = {}) {
    super();
    this.ctx = ctx;
    this.concurrencyManager = new ConcurrencyManager({
      maxConcurrency: options.maxConcurrency ?? 10,
      taskTimeout: options.taskTimeout ?? 300000, // 5 minutes
    });
  }
  
  async launchTask(
    agent: string,
    prompt: string,
    options: { description?: string } = {}
  ): Promise<string> {
    const taskId = generateTaskId();
    const sessionId = await this.createAgentSession(agent);
    
    const task: BackgroundTask = {
      id: taskId,
      agent,
      prompt,
      status: 'pending',
      sessionId,
    };
    
    this.tasks.set(taskId, task);
    
    // Queue for execution
    this.concurrencyManager.enqueue(async () => {
      await this.executeTask(task);
    });
    
    return taskId;
  }
  
  private async executeTask(task: BackgroundTask): Promise<void> {
    task.status = 'running';
    task.startedAt = new Date();
    this.emit('task.started', task);
    
    try {
      // Send prompt to agent session
      await this.ctx.client.session.prompt({
        path: { id: task.sessionId },
        body: {
          parts: [{
            type: 'text',
            text: task.prompt,
          }],
        },
        query: { directory: this.ctx.directory },
      });
      
      // Wait for completion
      const result = await this.waitForCompletion(task.sessionId);
      
      task.status = 'completed';
      task.result = result;
      task.completedAt = new Date();
      task.duration = task.completedAt.getTime() - task.startedAt.getTime();
      
      this.emit('task.completed', task);
      
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      task.completedAt = new Date();
      
      this.emit('task.failed', task);
    }
  }
  
  private async waitForCompletion(sessionId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Task timed out'));
      }, this.concurrencyManager.taskTimeout);
      
      const checkCompletion = async () => {
        const session = await this.ctx.client.session.get({
          path: { id: sessionId },
        });
        
        if (session.status === 'idle') {
          clearTimeout(timeout);
          const lastMessage = session.messages[session.messages.length - 1];
          resolve(lastMessage?.content || '');
        } else {
          setTimeout(checkCompletion, 1000);
        }
      };
      
      checkCompletion();
    });
  }
  
  async getOutput(
    taskId: string,
    options: { block?: boolean; timeout?: number } = {}
  ): Promise<TaskOutput> {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return { status: 'not_found', error: `Task ${taskId} not found` };
    }
    
    if (task.status === 'completed' || task.status === 'failed') {
      return {
        status: task.status,
        result: task.result,
        error: task.error,
        duration: task.duration,
      };
    }
    
    if (!options.block) {
      return {
        status: task.status,
        message: 'Task still running',
        sessionId: task.sessionId,
      };
    }
    
    // Block and wait
    return new Promise((resolve) => {
      const timeout = options.timeout ?? 60000;
      const timer = setTimeout(() => {
        resolve({
          status: 'timeout',
          message: `Timeout exceeded (${timeout}ms). Task still running.`,
        });
      }, timeout);
      
      const onComplete = (completedTask: BackgroundTask) => {
        if (completedTask.id === taskId) {
          clearTimeout(timer);
          this.off('task.completed', onComplete);
          this.off('task.failed', onComplete);
          resolve({
            status: completedTask.status,
            result: completedTask.result,
            error: completedTask.error,
            duration: completedTask.duration,
          });
        }
      };
      
      this.on('task.completed', onComplete);
      this.on('task.failed', onComplete);
    });
  }
  
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    
    if (!task || task.status === 'completed' || task.status === 'failed') {
      return false;
    }
    
    task.status = 'cancelled';
    
    // Cancel the session
    try {
      await this.ctx.client.session.cancel({
        path: { id: task.sessionId },
      });
    } catch {
      // Session may already be cancelled
    }
    
    this.emit('task.cancelled', task);
    return true;
  }
  
  async cancelAll(): Promise<number> {
    let cancelled = 0;
    
    for (const [taskId, task] of this.tasks) {
      if (task.status === 'pending' || task.status === 'running') {
        if (await this.cancelTask(taskId)) {
          cancelled++;
        }
      }
    }
    
    return cancelled;
  }
  
  getTask(taskId: string): BackgroundTask | undefined {
    return this.tasks.get(taskId);
  }
  
  listTasks(filter?: { status?: BackgroundTask['status'] }): BackgroundTask[] {
    let tasks = Array.from(this.tasks.values());
    
    if (filter?.status) {
      tasks = tasks.filter(t => t.status === filter.status);
    }
    
    return tasks.sort((a, b) => 
      (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0)
    );
  }
  
  private async createAgentSession(agent: string): Promise<string> {
    const result = await this.ctx.client.session.create({
      body: {
        agent,
        parentID: this.ctx.sessionID,
      },
      query: { directory: this.ctx.directory },
    });
    
    return result.id;
  }
}

function generateTaskId(): string {
  return `bg_${Math.random().toString(36).slice(2, 10)}`;
}
```

### 2. ConcurrencyManager

```typescript
// src/services/background/concurrency-manager.ts
export interface ConcurrencyManagerOptions {
  maxConcurrency: number;
  taskTimeout: number;
  retryLimit?: number;
  retryDelay?: number;
}

export class ConcurrencyManager {
  private queue: Array<() => Promise<void>> = [];
  private running = 0;
  private options: Required<ConcurrencyManagerOptions>;
  
  constructor(options: ConcurrencyManagerOptions) {
    this.options = {
      maxConcurrency: options.maxConcurrency,
      taskTimeout: options.taskTimeout,
      retryLimit: options.retryLimit ?? 3,
      retryDelay: options.retryDelay ?? 1000,
    };
  }
  
  get taskTimeout(): number {
    return this.options.taskTimeout;
  }
  
  enqueue(task: () => Promise<void>): void {
    this.queue.push(task);
    this.processQueue();
  }
  
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.running < this.options.maxConcurrency) {
      const task = this.queue.shift();
      if (!task) continue;
      
      this.running++;
      
      try {
        await this.runWithRetry(task);
      } finally {
        this.running--;
        this.processQueue();
      }
    }
  }
  
  private async runWithRetry(task: () => Promise<void>): Promise<void> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < this.options.retryLimit; attempt++) {
      try {
        await task();
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (!this.isRetryableError(lastError)) {
          throw lastError;
        }
        
        if (attempt < this.options.retryLimit - 1) {
          await this.delay(this.options.retryDelay * (attempt + 1));
        }
      }
    }
    
    throw lastError;
  }
  
  private isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      'rate_limit',
      'overloaded',
      'timeout',
      'ECONNRESET',
      'ETIMEDOUT',
    ];
    
    return retryablePatterns.some(p => 
      error.message.toLowerCase().includes(p)
    );
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 3. Background Tools

```typescript
// src/core/tools/background/task.ts
import { z } from 'zod';

export const backgroundTaskSchema = z.object({
  description: z.string().describe('Short description of the task (3-5 words)'),
  prompt: z.string().describe('The task for the agent to perform'),
  agent: z.enum(['explore', 'librarian', 'oracle', 'frontend-ui-ux-engineer', 'document-writer'])
    .describe('Agent type to use'),
});

export function createBackgroundTaskTool(manager: BackgroundManager) {
  return {
    name: 'background_task',
    description: `Run agent task in background. Returns task_id immediately; notifies on completion.

Use \`background_output\` to get results. Prompts MUST be in English.`,
    parameters: backgroundTaskSchema,
    execute: async (params: z.infer<typeof backgroundTaskSchema>) => {
      const taskId = await manager.launchTask(params.agent, params.prompt, {
        description: params.description,
      });
      
      return `Background task launched successfully.

Task ID: ${taskId}
Description: ${params.description}
Agent: ${params.agent}
Status: running

The system will notify you when the task completes.
Use \`background_output\` tool with task_id="${taskId}" to check progress.`;
    },
  };
}

// src/core/tools/background/output.ts
export const backgroundOutputSchema = z.object({
  task_id: z.string().describe('Task ID to get output from'),
  block: z.boolean().optional().describe('Wait for completion (rarely needed)'),
  timeout: z.number().optional().describe('Timeout in milliseconds'),
});

export function createBackgroundOutputTool(manager: BackgroundManager) {
  return {
    name: 'background_output',
    description: `Get output from background task. System notifies on completion, so block=true rarely needed.`,
    parameters: backgroundOutputSchema,
    execute: async (params: z.infer<typeof backgroundOutputSchema>) => {
      const output = await manager.getOutput(params.task_id, {
        block: params.block,
        timeout: params.timeout,
      });
      
      if (output.status === 'not_found') {
        return `Task not found: ${params.task_id}`;
      }
      
      if (output.status === 'completed') {
        return `Task Result

Task ID: ${params.task_id}
Duration: ${formatDuration(output.duration)}

---

${output.result}`;
      }
      
      if (output.status === 'failed') {
        return `Task Failed

Task ID: ${params.task_id}
Error: ${output.error}`;
      }
      
      const task = manager.getTask(params.task_id);
      return `Task still running.

# Task Status

| Field | Value |
|-------|-------|
| Task ID | \`${params.task_id}\` |
| Status | **${output.status}** |
| Session ID | \`${task?.sessionId}\` |

> **Note**: No need to wait explicitly - the system will notify you when this task completes.`;
    },
  };
}

// src/core/tools/background/cancel.ts
export const backgroundCancelSchema = z.object({
  taskId: z.string().optional().describe('Specific task ID to cancel'),
  all: z.boolean().optional().describe('Cancel ALL running tasks'),
});

export function createBackgroundCancelTool(manager: BackgroundManager) {
  return {
    name: 'background_cancel',
    description: `Cancel running background task(s). Use all=true to cancel ALL before final answer.`,
    parameters: backgroundCancelSchema,
    execute: async (params: z.infer<typeof backgroundCancelSchema>) => {
      if (params.all) {
        const count = await manager.cancelAll();
        return `Cancelled ${count} background task(s).`;
      }
      
      if (params.taskId) {
        const success = await manager.cancelTask(params.taskId);
        return success 
          ? `Task ${params.taskId} cancelled.`
          : `Could not cancel task ${params.taskId} (not found or already completed).`;
      }
      
      return 'Please specify taskId or use all=true to cancel all tasks.';
    },
  };
}
```

### 4. call_omo_agent Tool

```typescript
// src/core/tools/background/call-omo-agent.ts
import { z } from 'zod';

export const callOmoAgentSchema = z.object({
  description: z.string().describe('Short description of the task'),
  prompt: z.string().describe('The task for the agent'),
  subagent_type: z.enum(['explore', 'librarian']).describe('Agent type'),
  run_in_background: z.boolean().describe('true=async with task_id, false=sync'),
  session_id: z.string().optional().describe('Existing session to continue'),
});

export function createCallOmoAgent(ctx: HookContext, manager: BackgroundManager) {
  return {
    name: 'call_omo_agent',
    description: `Spawn explore/librarian agent. run_in_background REQUIRED (true=async with task_id, false=sync).

Available:
- explore: Specialized agent for explore tasks
- librarian: Specialized agent for librarian tasks

Prompts MUST be in English. Use \`background_output\` for async results.`,
    parameters: callOmoAgentSchema,
    execute: async (params: z.infer<typeof callOmoAgentSchema>) => {
      if (params.run_in_background) {
        const taskId = await manager.launchTask(params.subagent_type, params.prompt, {
          description: params.description,
        });
        
        return `Background task launched.

Task ID: ${taskId}
Agent: ${params.subagent_type}

Use \`background_output\` with task_id="${taskId}" to get results.`;
      }
      
      // Synchronous execution
      const taskId = await manager.launchTask(params.subagent_type, params.prompt, {
        description: params.description,
      });
      
      const output = await manager.getOutput(taskId, {
        block: true,
        timeout: 300000, // 5 minutes
      });
      
      if (output.status === 'completed') {
        return output.result || 'Task completed with no output.';
      }
      
      return `Task failed: ${output.error || 'Unknown error'}`;
    },
  };
}
```

### 5. Background Notification Hook

```typescript
// src/core/hooks/background-notification/index.ts
export function createBackgroundNotificationHook(manager: BackgroundManager) {
  return {
    event: async (input: { event: SessionEvent }) => {
      // Already handled by manager's event emitter
    },
  };
}

// Integration with main session
export function setupBackgroundNotifications(
  manager: BackgroundManager,
  mainSessionId: string,
  client: OpencodeClient
) {
  manager.on('task.completed', async (task: BackgroundTask) => {
    // Notify main session
    await client.session.prompt({
      path: { id: mainSessionId },
      body: {
        parts: [{
          type: 'text',
          text: `[BACKGROUND TASK COMPLETED] Task "${task.id}" finished in ${formatDuration(task.duration)}. Use background_output with task_id="${task.id}" to get results.`,
        }],
      },
    });
  });
  
  manager.on('task.failed', async (task: BackgroundTask) => {
    await client.session.prompt({
      path: { id: mainSessionId },
      body: {
        parts: [{
          type: 'text',
          text: `[BACKGROUND TASK FAILED] Task "${task.id}" failed: ${task.error}`,
        }],
      },
    });
  });
}
```

## File Structure

```
src/services/background/
├── index.ts                    # Main exports
├── manager.ts                  # BackgroundManager
├── manager.test.ts
├── concurrency-manager.ts      # Rate limiting
├── concurrency-manager.test.ts
└── types.ts                    # Shared types

src/core/tools/background/
├── index.ts                    # Export all tools
├── task.ts                     # background_task tool
├── task.test.ts
├── output.ts                   # background_output tool
├── output.test.ts
├── cancel.ts                   # background_cancel tool
├── cancel.test.ts
├── call-omo-agent.ts          # call_omo_agent tool
└── call-omo-agent.test.ts

src/core/hooks/background-notification/
├── index.ts
└── types.ts
```

## Implementation Checklist

### Phase 1: Core Infrastructure (Day 1-2)
- [ ] Implement BackgroundManager
- [ ] Implement ConcurrencyManager
- [ ] Add event emission
- [ ] Write tests

### Phase 2: Tools (Day 3-4)
- [ ] Implement background_task
- [ ] Implement background_output
- [ ] Implement background_cancel
- [ ] Implement call_omo_agent
- [ ] Write tests

### Phase 3: Integration (Day 5)
- [ ] Add background notification hook
- [ ] Integrate with main session
- [ ] Update agent prompts
- [ ] End-to-end testing

## Success Criteria

| Metric | Target |
|--------|--------|
| Max Concurrent Tasks | 10+ |
| Task Launch Latency | < 100ms |
| Result Retrieval | < 50ms |
| Test Coverage | 80%+ |

---

**Last Updated**: 2026-01-13
**Status**: 📋 Planning Complete
