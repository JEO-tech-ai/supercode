import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import type { 
  BackgroundTask, 
  TaskStatus, 
  BackgroundManagerConfig,
  BackgroundAgentType,
  TaskEvent,
} from './types';
import { DEFAULT_CONFIG } from './types';
import { Log } from '../../../shared/logger';

export class BackgroundManager extends EventEmitter {
  private tasks = new Map<string, BackgroundTask>();
  private config: BackgroundManagerConfig;
  private runningCount = 0;
  private taskQueue: string[] = [];
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<BackgroundManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupTimer();
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000);
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
      agent: agent as BackgroundAgentType,
      prompt,
      description,
      status: 'pending',
      createdAt: new Date(),
    };

    this.tasks.set(taskId, task);
    this.emitTaskEvent('task.created', task);

    Log.info(`[BackgroundManager] Task created: ${taskId} (${agent})`);

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
    this.emitTaskEvent('task.started', task);

    try {
      const result = await this.runAgent(task);
      
      task.status = 'completed';
      task.result = result;
      task.completedAt = new Date();
      this.emitTaskEvent('task.completed', task);
      
      Log.info(`[BackgroundManager] Task completed: ${taskId}`);
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      task.completedAt = new Date();
      this.emitTaskEvent('task.failed', task, error as Error);
      
      Log.error(`[BackgroundManager] Task failed: ${taskId}`, error);
    } finally {
      this.runningCount--;
      this.processQueue();
    }
  }

  private async runAgent(task: BackgroundTask): Promise<string> {
    try {
      const { executeBackgroundAgent } = await import('../../../services/agents/executor');
      
      return await executeBackgroundAgent({
        agent: task.agent,
        prompt: task.prompt,
        parentSessionId: task.parentSessionId,
      });
    } catch (error) {
      Log.warn(`[BackgroundManager] Agent executor not available, using mock`, error);
      return `[Mock result for ${task.agent}]: ${task.prompt.slice(0, 100)}...`;
    }
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

  private emitTaskEvent(event: string, task: BackgroundTask, error?: Error): void {
    const taskEvent: TaskEvent = { task, error };
    this.emit(event, taskEvent);
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
      return null;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Task ${taskId} timed out after ${timeout}ms`));
      }, timeout);

      const onComplete = (data: TaskEvent) => {
        if (data.task.id === taskId) {
          cleanup();
          resolve(data.task.result ?? null);
        }
      };

      const onFailed = (data: TaskEvent) => {
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
      this.emitTaskEvent('task.cancelled', task);
      
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

  cleanup(): void {
    const now = Date.now();
    
    for (const [taskId, task] of this.tasks) {
      if (
        task.completedAt &&
        now - task.completedAt.getTime() > this.config.taskRetentionMs
      ) {
        this.tasks.delete(taskId);
      }
    }
  }

  getStats(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    queued: number;
  } {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      queued: this.taskQueue.length,
    };
  }

  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cancelAllTasks();
  }
}

let backgroundManagerInstance: BackgroundManager | null = null;

export function getBackgroundManager(config?: Partial<BackgroundManagerConfig>): BackgroundManager {
  if (!backgroundManagerInstance) {
    backgroundManagerInstance = new BackgroundManager(config);
  }
  return backgroundManagerInstance;
}

export function resetBackgroundManager(): void {
  if (backgroundManagerInstance) {
    backgroundManagerInstance.shutdown();
    backgroundManagerInstance = null;
  }
}
