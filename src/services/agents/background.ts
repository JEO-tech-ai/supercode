import type { AgentName, AgentResult, BackgroundTask, TaskStatus } from "./types";
import { getAgentRegistry } from "./registry";

export interface ISpawnInput {
  sessionId: string;
  agent: AgentName;
  prompt: string;
  description: string;
}

export interface IBackgroundManager {
  spawn(input: ISpawnInput): Promise<string>;
  getStatus(taskId: string): Promise<BackgroundTask | null>;
  cancel(taskId: string): Promise<boolean>;
  getOutput(taskId: string, wait?: boolean): Promise<AgentResult | null>;
  listTasks(sessionId?: string): BackgroundTask[];
  cleanup(sessionId: string): void;
}

interface SpawnInput {
  sessionId: string;
  agent: AgentName;
  prompt: string;
  description: string;
}

class BackgroundManager implements IBackgroundManager {
  private tasks: Map<string, BackgroundTask> = new Map();
  private concurrencyLimits: Map<string, number> = new Map([
    ["default", 3],
    ["anthropic", 2],
    ["openai", 3],
    ["google", 5],
  ]);
  private runningCounts: Map<string, number> = new Map();
  private queue: Array<{ task: BackgroundTask; provider: string }> = [];

  async spawn(input: SpawnInput): Promise<string> {
    const taskId = crypto.randomUUID();

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

    const provider = this.getProviderForAgent(input.agent);
    if (this.canRun(provider)) {
      this.runTask(task);
    } else {
      this.queue.push({ task, provider });
    }

    return taskId;
  }

  private async runTask(task: BackgroundTask): Promise<void> {
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

      const result = await agent.execute(task.prompt);

      task.status = "completed";
      task.result = result;
      task.completedAt = new Date();
      task.progress = { step: 1, total: 1, message: "Completed" };
    } catch (error) {
      task.status = "failed";
      task.error = (error as Error).message;
      task.completedAt = new Date();
    } finally {
      this.decrementRunning(provider);
      this.processQueue();
    }
  }

  async getStatus(taskId: string): Promise<BackgroundTask | null> {
    return this.tasks.get(taskId) || null;
  }

  async cancel(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task || task.status === "completed") {
      return false;
    }

    task.status = "cancelled";
    task.completedAt = new Date();
    return true;
  }

  async getOutput(taskId: string, wait: boolean = false): Promise<AgentResult | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    if (wait && task.status === "in_progress") {
      await this.waitForCompletion(taskId);
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
    for (const [id, task] of this.tasks) {
      if (task.sessionId === sessionId) {
        if (task.status === "in_progress") {
          task.status = "cancelled";
        }
        this.tasks.delete(id);
      }
    }
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
    const toRun: Array<{ task: BackgroundTask; provider: string }> = [];

    for (let i = this.queue.length - 1; i >= 0; i--) {
      const item = this.queue[i];
      if (this.canRun(item.provider)) {
        toRun.push(item);
        this.queue.splice(i, 1);
      }
    }

    for (const item of toRun) {
      this.runTask(item.task);
    }
  }

  private async waitForCompletion(taskId: string, timeoutMs: number = 60000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const task = this.tasks.get(taskId);
      if (!task || task.status === "completed" || task.status === "failed" || task.status === "cancelled") {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Timeout waiting for task ${taskId}`);
  }
}

let backgroundManagerInstance: BackgroundManager | null = null;

export function getBackgroundManager(): IBackgroundManager {
  if (!backgroundManagerInstance) {
    backgroundManagerInstance = new BackgroundManager();
  }
  return backgroundManagerInstance;
}
