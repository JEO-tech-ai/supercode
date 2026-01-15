import type { AgentName, AgentResult, BackgroundTask, TaskStatus } from "./types";
import { getAgentRegistry } from "./registry";
import { 
  getShutdownManager, 
  withTimeoutDefault, 
  type Disposable 
} from "../../shared/shutdown";

const DEFAULT_TASK_TIMEOUT_MS = 300000;
const DEFAULT_WAIT_TIMEOUT_MS = 60000;

export interface ISpawnInput {
  sessionId: string;
  agent: AgentName;
  prompt: string;
  description: string;
  timeoutMs?: number;
}

export interface IBackgroundManager {
  spawn(input: ISpawnInput): Promise<string>;
  getStatus(taskId: string): Promise<BackgroundTask | null>;
  cancel(taskId: string): Promise<boolean>;
  cancelAll(): Promise<void>;
  getOutput(taskId: string, wait?: boolean, timeoutMs?: number): Promise<AgentResult | null>;
  listTasks(sessionId?: string): BackgroundTask[];
  cleanup(sessionId: string): void;
  dispose(): Promise<void>;
}

interface SpawnInput {
  sessionId: string;
  agent: AgentName;
  prompt: string;
  description: string;
  timeoutMs?: number;
}

interface RunningTask {
  task: BackgroundTask;
  abortController: AbortController;
}

class BackgroundManager implements IBackgroundManager, Disposable {
  private tasks: Map<string, BackgroundTask> = new Map();
  private runningTasks: Map<string, RunningTask> = new Map();
  private concurrencyLimits: Map<string, number> = new Map([
    ["default", 3],
    ["anthropic", 2],
    ["openai", 3],
    ["google", 5],
  ]);
  private runningCounts: Map<string, number> = new Map();
  private queue: Array<{ task: BackgroundTask; provider: string }> = [];
  private isDisposing = false;

  async spawn(input: SpawnInput): Promise<string> {
    if (this.isDisposing) {
      throw new Error("BackgroundManager is disposing, cannot spawn new tasks");
    }

    const taskId = crypto.randomUUID();
    const abortController = new AbortController();

    const task: BackgroundTask = {
      id: taskId,
      sessionId: input.sessionId,
      agent: input.agent,
      prompt: input.prompt,
      description: input.description,
      status: "pending",
      progress: { step: 0, total: 1, message: "Queued" },
      startedAt: new Date(),
    };

    this.tasks.set(taskId, task);
    this.runningTasks.set(taskId, { task, abortController });

    const provider = this.getProviderForAgent(input.agent);
    if (this.canRun(provider)) {
      this.runTask(task, abortController, input.timeoutMs);
    } else {
      this.queue.push({ task, provider });
    }

    return taskId;
  }

  private async runTask(
    task: BackgroundTask, 
    abortController: AbortController,
    timeoutMs: number = DEFAULT_TASK_TIMEOUT_MS
  ): Promise<void> {
    const provider = this.getProviderForAgent(task.agent);
    this.incrementRunning(provider);

    task.status = "in_progress";
    task.progress.message = "Executing...";

    try {
      const registry = getAgentRegistry();
      const agent = registry.get(task.agent);

      if (!agent) {
        throw new Error(`Agent not found: ${task.agent}`);
      }

      const executePromise = agent.execute(task.prompt);
      
      const result = await Promise.race([
        executePromise,
        this.createAbortPromise(abortController.signal),
        this.createTimeoutPromise(timeoutMs),
      ]);

      if (abortController.signal.aborted) {
        task.status = "cancelled";
        task.error = "Task was cancelled";
      } else if (result === "TIMEOUT") {
        task.status = "failed";
        task.error = `Task timed out after ${timeoutMs}ms`;
      } else {
        task.status = "completed";
        task.result = result as AgentResult;
      }
      
      task.completedAt = new Date();
      task.progress = { step: 1, total: 1, message: task.status === "completed" ? "Completed" : task.error || "Failed" };
    } catch (error) {
      task.status = "failed";
      task.error = (error as Error).message;
      task.completedAt = new Date();
    } finally {
      this.decrementRunning(provider);
      this.runningTasks.delete(task.id);
      this.processQueue();
    }
  }

  private createAbortPromise(signal: AbortSignal): Promise<never> {
    return new Promise((_, reject) => {
      if (signal.aborted) {
        reject(new Error("Aborted"));
        return;
      }
      signal.addEventListener("abort", () => {
        reject(new Error("Aborted"));
      }, { once: true });
    });
  }

  private createTimeoutPromise(timeoutMs: number): Promise<"TIMEOUT"> {
    return new Promise((resolve) => {
      setTimeout(() => resolve("TIMEOUT"), timeoutMs);
    });
  }

  async getStatus(taskId: string): Promise<BackgroundTask | null> {
    return this.tasks.get(taskId) || null;
  }

  async cancel(taskId: string): Promise<boolean> {
    const running = this.runningTasks.get(taskId);
    if (running) {
      running.abortController.abort();
    }

    const task = this.tasks.get(taskId);
    if (!task || task.status === "completed") {
      return false;
    }

    task.status = "cancelled";
    task.completedAt = new Date();
    return true;
  }

  async cancelAll(): Promise<void> {
    const taskIds = Array.from(this.runningTasks.keys());
    for (const taskId of taskIds) {
      await this.cancel(taskId);
    }

    this.queue.length = 0;
  }

  async getOutput(
    taskId: string, 
    wait: boolean = false,
    timeoutMs: number = DEFAULT_WAIT_TIMEOUT_MS
  ): Promise<AgentResult | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    if (wait && task.status === "in_progress") {
      const result = await withTimeoutDefault(
        this.waitForCompletion(taskId),
        timeoutMs,
        null
      );
      if (result === null) {
        return null;
      }
    }

    return task.result || null;
  }

  listTasks(sessionId?: string): BackgroundTask[] {
    const tasks = Array.from(this.tasks.values());
    if (sessionId) {
      return tasks.filter((t) => t.sessionId === sessionId);
    }
    return tasks;
  }

  cleanup(sessionId: string): void {
    const toDelete: string[] = [];
    
    const entries = Array.from(this.tasks.entries());
    for (const [id, task] of entries) {
      if (task.sessionId === sessionId) {
        const running = this.runningTasks.get(id);
        if (running) {
          running.abortController.abort();
        }
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.tasks.delete(id);
      this.runningTasks.delete(id);
    }
  }

  async dispose(): Promise<void> {
    if (this.isDisposing) return;
    
    this.isDisposing = true;
    await this.cancelAll();
    
    this.tasks.clear();
    this.runningTasks.clear();
    this.queue.length = 0;
    this.runningCounts.clear();
    
    this.isDisposing = false;
  }

  private getProviderForAgent(agent: AgentName): string {
    const providerMap: Record<AgentName, string> = {
      cent: "anthropic",
      coin: "anthropic",
      analyst: "google",
      executor: "openai",
      code_reviewer: "anthropic",
      doc_writer: "google",
      explorer: "anthropic",
      librarian: "google",
      frontend: "anthropic",
      multimodal: "google",
    };
    return providerMap[agent] || "default";
  }

  private canRun(provider: string): boolean {
    const limit = this.concurrencyLimits.get(provider) || this.concurrencyLimits.get("default") || 3;
    const running = this.runningCounts.get(provider) || 0;
    return running < limit;
  }

  private incrementRunning(provider: string): void {
    const current = this.runningCounts.get(provider) || 0;
    this.runningCounts.set(provider, current + 1);
  }

  private decrementRunning(provider: string): void {
    const current = this.runningCounts.get(provider) || 0;
    this.runningCounts.set(provider, Math.max(0, current - 1));
  }

  private processQueue(): void {
    if (this.isDisposing) return;

    const toRun: Array<{ task: BackgroundTask; provider: string }> = [];

    for (let i = this.queue.length - 1; i >= 0; i--) {
      const item = this.queue[i];
      if (this.canRun(item.provider)) {
        toRun.push(item);
        this.queue.splice(i, 1);
      }
    }

    for (const item of toRun) {
      const running = this.runningTasks.get(item.task.id);
      if (running) {
        this.runTask(item.task, running.abortController);
      }
    }
  }

  private async waitForCompletion(taskId: string): Promise<void> {
    while (true) {
      const task = this.tasks.get(taskId);
      if (!task || task.status === "completed" || task.status === "failed" || task.status === "cancelled") {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  getActiveTaskCount(): number {
    return this.runningTasks.size;
  }

  getQueuedTaskCount(): number {
    return this.queue.length;
  }
}

let backgroundManagerInstance: BackgroundManager | null = null;

export function getBackgroundManager(): IBackgroundManager {
  if (!backgroundManagerInstance) {
    backgroundManagerInstance = new BackgroundManager();
    getShutdownManager().register('backgroundManager', backgroundManagerInstance);
  }
  return backgroundManagerInstance;
}

export function resetBackgroundManager(): void {
  if (backgroundManagerInstance) {
    getShutdownManager().unregister('backgroundManager');
  }
  backgroundManagerInstance = null;
}
