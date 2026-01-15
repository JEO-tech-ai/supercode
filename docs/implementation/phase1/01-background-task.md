# Phase 1.1: Background Task Tool

> Priority: P0 (Critical - Blocking other features)
> Effort: 3-4 days
> Dependencies: None

## Overview

The Background Task Tool enables spawning agent tasks asynchronously, allowing the main session to continue while specialized agents (explore, librarian) work in parallel. This is foundational for the agentic workflow pattern.

## Current State in SuperCode

### Existing Files
```
src/services/background/concurrency-manager.ts  # Basic concurrency control
src/services/agents/background.ts               # Background agent stub
```

### What Exists
- Basic `ConcurrencyManager` class for limiting parallel operations
- Background agent service stub (incomplete)

### What's Missing
- Background task spawning tool
- Task state management (pending, running, completed, failed)
- Result retrieval mechanism
- Task cancellation
- Parent session tracking

## Reference Implementation (Oh-My-OpenCode)

```typescript
// From oh-my-opencode/src/features/background-agent/
interface BackgroundTask {
  id: string;
  parentSessionId: string;
  childSessionId: string;
  agent: string;
  prompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

interface BackgroundManager {
  spawnTask(parentSessionId: string, agent: string, prompt: string): Promise<string>;
  getTask(taskId: string): BackgroundTask | undefined;
  getTasksByParentSession(parentSessionId: string): BackgroundTask[];
  cancelTask(taskId: string): boolean;
  cancelAllTasks(parentSessionId?: string): number;
  getResult(taskId: string, block?: boolean, timeout?: number): Promise<string | null>;
}
```

## Implementation Plan

### File Structure
```
src/core/tools/background-task/
├── index.ts          # Tool exports and registration
├── manager.ts        # BackgroundManager class
├── types.ts          # Type definitions
├── executor.ts       # Agent spawning logic
└── tools.ts          # Tool definitions (spawn, output, cancel)
```

### 1. Types Definition (`types.ts`)

```typescript
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BackgroundTask {
  id: string;
  parentSessionId: string;
  childSessionId?: string;
  agent: 'explore' | 'librarian' | 'oracle' | 'frontend-ui-ux-engineer' | 'document-writer';
  prompt: string;
  description?: string;
  status: TaskStatus;
  result?: string;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface SpawnTaskInput {
  agent: string;
  prompt: string;
  description?: string;
  sessionId?: string;
}

export interface GetOutputInput {
  taskId: string;
  block?: boolean;
  timeout?: number;
}

export interface CancelTaskInput {
  taskId?: string;
  all?: boolean;
}

export interface BackgroundManagerConfig {
  maxConcurrentTasks?: number;
  defaultTimeout?: number;
  taskRetention?: number; // How long to keep completed tasks (ms)
}
```

### 2. Background Manager (`manager.ts`)

```typescript
import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import type { BackgroundTask, TaskStatus, BackgroundManagerConfig } from './types';
import { Log } from '../../../shared/logger';

export class BackgroundManager extends EventEmitter {
  private tasks = new Map<string, BackgroundTask>();
  private config: Required<BackgroundManagerConfig>;
  private runningCount = 0;
  private taskQueue: string[] = [];

  constructor(config: BackgroundManagerConfig = {}) {
    super();
    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks ?? 5,
      defaultTimeout: config.defaultTimeout ?? 300000, // 5 minutes
      taskRetention: config.taskRetention ?? 3600000,  // 1 hour
    };
  }

  async spawnTask(
    parentSessionId: string,
    agent: string,
    prompt: string,
    description?: string
  ): Promise<string> {
    const taskId = `task_${crypto.randomUUID().slice(0, 8)}`;
    
    const task: BackgroundTask = {
      id: taskId,
      parentSessionId,
      agent: agent as BackgroundTask['agent'],
      prompt,
      description,
      status: 'pending',
      createdAt: new Date(),
    };

    this.tasks.set(taskId, task);
    this.emit('task.created', { task });

    Log.info(`[BackgroundManager] Task created: ${taskId} (${agent})`);

    // Queue or execute immediately
    if (this.runningCount < this.config.maxConcurrentTasks) {
      this.executeTask(taskId);
    } else {
      this.taskQueue.push(taskId);
      Log.info(`[BackgroundManager] Task queued: ${taskId}`);
    }

    return taskId;
  }

  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'running';
    task.startedAt = new Date();
    this.runningCount++;
    this.emit('task.started', { task });

    try {
      // Execute via agent executor
      const result = await this.runAgent(task);
      
      task.status = 'completed';
      task.result = result;
      task.completedAt = new Date();
      this.emit('task.completed', { task });
      
      Log.info(`[BackgroundManager] Task completed: ${taskId}`);
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      task.completedAt = new Date();
      this.emit('task.failed', { task, error });
      
      Log.error(`[BackgroundManager] Task failed: ${taskId}`, error);
    } finally {
      this.runningCount--;
      this.processQueue();
    }
  }

  private async runAgent(task: BackgroundTask): Promise<string> {
    // Import agent executor dynamically to avoid circular deps
    const { executeAgent } = await import('../../../services/agents/executor');
    
    return executeAgent({
      agent: task.agent,
      prompt: task.prompt,
      parentSessionId: task.parentSessionId,
      isBackground: true,
    });
  }

  private processQueue(): void {
    while (
      this.taskQueue.length > 0 &&
      this.runningCount < this.config.maxConcurrentTasks
    ) {
      const nextTaskId = this.taskQueue.shift();
      if (nextTaskId) {
        this.executeTask(nextTaskId);
      }
    }
  }

  getTask(taskId: string): BackgroundTask | undefined {
    return this.tasks.get(taskId);
  }

  getTasksByParentSession(parentSessionId: string): BackgroundTask[] {
    return Array.from(this.tasks.values()).filter(
      t => t.parentSessionId === parentSessionId
    );
  }

  async getResult(
    taskId: string,
    block: boolean = false,
    timeout: number = this.config.defaultTimeout
  ): Promise<string | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    if (task.status === 'completed') {
      return task.result ?? null;
    }

    if (task.status === 'failed') {
      throw new Error(task.error ?? 'Task failed');
    }

    if (task.status === 'cancelled') {
      return null;
    }

    if (!block) {
      return null; // Task still running, don't wait
    }

    // Wait for completion
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Task ${taskId} timed out after ${timeout}ms`));
      }, timeout);

      const onComplete = (data: { task: BackgroundTask }) => {
        if (data.task.id === taskId) {
          cleanup();
          resolve(data.task.result ?? null);
        }
      };

      const onFailed = (data: { task: BackgroundTask }) => {
        if (data.task.id === taskId) {
          cleanup();
          reject(new Error(data.task.error ?? 'Task failed'));
        }
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        this.off('task.completed', onComplete);
        this.off('task.failed', onFailed);
      };

      this.on('task.completed', onComplete);
      this.on('task.failed', onFailed);
    });
  }

  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'running' || task.status === 'pending') {
      task.status = 'cancelled';
      task.completedAt = new Date();
      this.emit('task.cancelled', { task });
      
      // Remove from queue if pending
      const queueIndex = this.taskQueue.indexOf(taskId);
      if (queueIndex !== -1) {
        this.taskQueue.splice(queueIndex, 1);
      }

      Log.info(`[BackgroundManager] Task cancelled: ${taskId}`);
      return true;
    }

    return false;
  }

  cancelAllTasks(parentSessionId?: string): number {
    let cancelled = 0;
    
    for (const task of this.tasks.values()) {
      if (parentSessionId && task.parentSessionId !== parentSessionId) {
        continue;
      }
      
      if (this.cancelTask(task.id)) {
        cancelled++;
      }
    }

    return cancelled;
  }

  // Cleanup old completed tasks
  cleanup(): void {
    const now = Date.now();
    
    for (const [taskId, task] of this.tasks) {
      if (
        task.completedAt &&
        now - task.completedAt.getTime() > this.config.taskRetention
      ) {
        this.tasks.delete(taskId);
      }
    }
  }

  // Get stats
  getStats(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
    };
  }
}

// Singleton instance
let backgroundManagerInstance: BackgroundManager | null = null;

export function getBackgroundManager(): BackgroundManager {
  if (!backgroundManagerInstance) {
    backgroundManagerInstance = new BackgroundManager();
  }
  return backgroundManagerInstance;
}
```

### 3. Tool Definitions (`tools.ts`)

```typescript
import type { ToolDefinition, ToolContext, ToolResult } from '../../types';
import { getBackgroundManager } from './manager';
import type { SpawnTaskInput, GetOutputInput, CancelTaskInput } from './types';

export const backgroundTaskTool: ToolDefinition = {
  name: 'background_task',
  description: `Run agent task in background. Returns task_id immediately; notifies on completion.

Use \`background_output\` to get results. Prompts MUST be in English.`,
  parameters: {
    type: 'object',
    properties: {
      agent: {
        type: 'string',
        enum: ['explore', 'librarian', 'oracle', 'frontend-ui-ux-engineer', 'document-writer'],
        description: 'The agent type to spawn',
      },
      prompt: {
        type: 'string',
        description: 'The task prompt for the agent',
      },
      description: {
        type: 'string',
        description: 'Short description of the task (3-5 words)',
      },
    },
    required: ['agent', 'prompt', 'description'],
  },
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const input = args as unknown as SpawnTaskInput;
    const manager = getBackgroundManager();
    
    const taskId = await manager.spawnTask(
      context.sessionId,
      input.agent,
      input.prompt,
      input.description
    );

    return {
      success: true,
      data: {
        taskId,
        message: `Task ${taskId} spawned. Use background_output to retrieve results.`,
      },
    };
  },
};

export const backgroundOutputTool: ToolDefinition = {
  name: 'background_output',
  description: 'Get output from background task. System notifies on completion, so block=true rarely needed.',
  parameters: {
    type: 'object',
    properties: {
      task_id: {
        type: 'string',
        description: 'The task ID returned by background_task',
      },
      block: {
        type: 'boolean',
        description: 'Whether to wait for task completion (default: false)',
        default: false,
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds when blocking (default: 300000)',
      },
    },
    required: ['task_id'],
  },
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const input = args as unknown as GetOutputInput;
    const manager = getBackgroundManager();
    
    const task = manager.getTask(input.taskId);
    if (!task) {
      return {
        success: false,
        error: `Task not found: ${input.taskId}`,
      };
    }

    if (task.status === 'pending' || task.status === 'running') {
      if (!input.block) {
        return {
          success: true,
          data: {
            status: task.status,
            message: `Task ${input.taskId} is still ${task.status}. Use block=true to wait.`,
          },
        };
      }
    }

    try {
      const result = await manager.getResult(
        input.taskId,
        input.block ?? false,
        input.timeout
      );

      return {
        success: true,
        data: {
          status: task.status,
          result,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

export const backgroundCancelTool: ToolDefinition = {
  name: 'background_cancel',
  description: 'Cancel running background task(s). Use all=true to cancel ALL before final answer.',
  parameters: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'Specific task ID to cancel',
      },
      all: {
        type: 'boolean',
        description: 'Cancel all tasks for current session',
        default: false,
      },
    },
  },
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const input = args as unknown as CancelTaskInput;
    const manager = getBackgroundManager();

    if (input.all) {
      const cancelled = manager.cancelAllTasks(context.sessionId);
      return {
        success: true,
        data: {
          cancelled,
          message: `Cancelled ${cancelled} task(s)`,
        },
      };
    }

    if (input.taskId) {
      const success = manager.cancelTask(input.taskId);
      return {
        success,
        data: success
          ? { message: `Task ${input.taskId} cancelled` }
          : { message: `Task ${input.taskId} could not be cancelled` },
      };
    }

    return {
      success: false,
      error: 'Specify taskId or all=true',
    };
  },
};
```

### 4. Index Export (`index.ts`)

```typescript
export * from './types';
export * from './manager';
export { backgroundTaskTool, backgroundOutputTool, backgroundCancelTool } from './tools';

import { backgroundTaskTool, backgroundOutputTool, backgroundCancelTool } from './tools';
import type { ToolDefinition } from '../../types';

export const backgroundTools: Record<string, ToolDefinition> = {
  background_task: backgroundTaskTool,
  background_output: backgroundOutputTool,
  background_cancel: backgroundCancelTool,
};
```

## Integration Points

### 1. Register Tools in Tool Registry

```typescript
// src/core/tools/index.ts
import { backgroundTools } from './background-task';

// Add to tool registration
Object.values(backgroundTools).forEach(tool => {
  getToolRegistry().register(tool);
});
```

### 2. Hook Integration for Notifications

```typescript
// src/core/hooks/background-notification.ts
import { getBackgroundManager } from '../tools/background-task';

export function createBackgroundNotificationHook() {
  const manager = getBackgroundManager();
  
  manager.on('task.completed', ({ task }) => {
    // Show toast notification
    showToast({
      title: 'Background Task Complete',
      message: `${task.agent}: ${task.description || 'Task finished'}`,
      variant: 'success',
    });
  });

  manager.on('task.failed', ({ task }) => {
    showToast({
      title: 'Background Task Failed',
      message: `${task.agent}: ${task.error}`,
      variant: 'error',
    });
  });
}
```

### 3. Agent Executor Integration

The `executeAgent` function in `src/services/agents/executor.ts` needs to:
- Accept `isBackground` flag
- Create child session for background tasks
- Return string result for background manager

## Testing Plan

### Unit Tests
```typescript
describe('BackgroundManager', () => {
  it('should spawn task and return task_id');
  it('should execute task via agent executor');
  it('should queue tasks when at max concurrency');
  it('should return result when completed');
  it('should handle task failures');
  it('should cancel pending tasks');
  it('should cancel running tasks');
  it('should cleanup old completed tasks');
});

describe('BackgroundTools', () => {
  it('background_task should spawn and return task_id');
  it('background_output should return result when complete');
  it('background_output with block should wait');
  it('background_cancel should cancel specific task');
  it('background_cancel all should cancel all tasks');
});
```

### Integration Tests
- Spawn explore agent, verify result
- Spawn multiple tasks, verify concurrency limit
- Cancel all before session end

## Migration Notes

1. Move logic from `src/services/background/concurrency-manager.ts` to new manager
2. Update `src/services/agents/background.ts` to use new tools
3. Register tools in main tool registry

## Success Criteria

- [ ] `background_task` returns task_id within 100ms
- [ ] Tasks execute via correct agent
- [ ] Results retrievable via `background_output`
- [ ] Cancellation works for pending and running tasks
- [ ] Concurrency limit respected
- [ ] Toast notifications on completion/failure
- [ ] No memory leaks (cleanup works)
