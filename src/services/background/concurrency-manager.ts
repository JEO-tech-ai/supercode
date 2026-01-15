import type { ProviderName } from "../models/types";
import logger from "../../shared/logger";
import { 
  getShutdownManager, 
  type Disposable 
} from "../../shared/shutdown";

const DEFAULT_ACQUIRE_TIMEOUT_MS = 30000;

interface ConcurrencyConfig {
  defaultConcurrency: number;
  providerConcurrency: Partial<Record<ProviderName, number>>;
  modelConcurrency: Record<string, number>;
  acquireTimeoutMs: number;
}

interface WaitingTask {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

class Semaphore {
  private permits: number;
  private waiting: WaitingTask[] = [];
  private isDisposed = false;

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(timeoutMs?: number): Promise<void> {
    if (this.isDisposed) {
      throw new Error("Semaphore is disposed");
    }

    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const task: WaitingTask = {
        resolve: () => {
          clearTimeout(task.timer);
          resolve();
        },
        reject,
        timer: setTimeout(() => {
          const index = this.waiting.indexOf(task);
          if (index !== -1) {
            this.waiting.splice(index, 1);
          }
          reject(new Error(`Semaphore acquire timed out after ${timeoutMs}ms`));
        }, timeoutMs ?? DEFAULT_ACQUIRE_TIMEOUT_MS),
      };

      this.waiting.push(task);
    });
  }

  release(): void {
    if (this.isDisposed) return;

    this.permits++;
    const next = this.waiting.shift();
    if (next) {
      this.permits--;
      clearTimeout(next.timer);
      next.resolve();
    }
  }

  dispose(): void {
    this.isDisposed = true;
    for (const task of this.waiting) {
      clearTimeout(task.timer);
      task.reject(new Error("Semaphore disposed"));
    }
    this.waiting = [];
  }

  getAvailable(): number {
    return this.permits;
  }

  getWaiting(): number {
    return this.waiting.length;
  }
}

export class ConcurrencyManager implements Disposable {
  private config: ConcurrencyConfig;
  private providerSemaphores: Map<ProviderName, Semaphore> = new Map();
  private modelSemaphores: Map<string, Semaphore> = new Map();
  private activeTasks: Map<string, { provider: ProviderName; model: string }> = new Map();
  private isDisposed = false;

  constructor(config?: Partial<ConcurrencyConfig>) {
    this.config = {
      defaultConcurrency: config?.defaultConcurrency ?? 5,
      acquireTimeoutMs: config?.acquireTimeoutMs ?? DEFAULT_ACQUIRE_TIMEOUT_MS,
      providerConcurrency: {
        anthropic: 3,
        openai: 5,
        google: 10,
        ...config?.providerConcurrency,
      },
      modelConcurrency: {
        "anthropic/claude-opus-4-5": 2,
        "anthropic/claude-sonnet-4-5": 3,
        "google/gemini-3-flash": 10,
        "google/gemini-3-pro": 5,
        ...config?.modelConcurrency,
      },
    };

    this.initializeSemaphores();
  }

  private initializeSemaphores(): void {
    for (const [provider, limit] of Object.entries(this.config.providerConcurrency)) {
      this.providerSemaphores.set(
        provider as ProviderName,
        new Semaphore(limit ?? this.config.defaultConcurrency)
      );
    }

    for (const [model, limit] of Object.entries(this.config.modelConcurrency)) {
      this.modelSemaphores.set(model, new Semaphore(limit));
    }
  }

  private getProviderFromModel(model: string): ProviderName {
    const [provider] = model.split("/");
    return provider as ProviderName;
  }

  private getOrCreateSemaphore(
    map: Map<string, Semaphore>,
    key: string,
    defaultLimit: number
  ): Semaphore {
    let semaphore = map.get(key);
    if (!semaphore) {
      semaphore = new Semaphore(defaultLimit);
      map.set(key, semaphore);
    }
    return semaphore;
  }

  async acquire(taskId: string, model: string, timeoutMs?: number): Promise<void> {
    if (this.isDisposed) {
      throw new Error("ConcurrencyManager is disposed");
    }

    const provider = this.getProviderFromModel(model);
    const timeout = timeoutMs ?? this.config.acquireTimeoutMs;

    const providerSemaphore = this.getOrCreateSemaphore(
      this.providerSemaphores as unknown as Map<string, Semaphore>,
      provider,
      this.config.providerConcurrency[provider] ?? this.config.defaultConcurrency
    );

    const modelLimit = this.config.modelConcurrency[model] ?? this.config.defaultConcurrency;
    const modelSemaphore = this.getOrCreateSemaphore(
      this.modelSemaphores,
      model,
      modelLimit
    );

    logger.debug(`Acquiring concurrency slot for ${model}`, {
      taskId,
      providerAvailable: providerSemaphore.getAvailable(),
      modelAvailable: modelSemaphore.getAvailable(),
    });

    await Promise.all([
      providerSemaphore.acquire(timeout),
      modelSemaphore.acquire(timeout),
    ]);

    this.activeTasks.set(taskId, { provider, model });

    logger.debug(`Acquired concurrency slot for ${model}`, { taskId });
  }

  release(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      logger.warn(`Attempted to release unknown task: ${taskId}`);
      return;
    }

    const { provider, model } = task;

    const providerSemaphore = this.providerSemaphores.get(provider);
    const modelSemaphore = this.modelSemaphores.get(model);

    providerSemaphore?.release();
    modelSemaphore?.release();

    this.activeTasks.delete(taskId);

    logger.debug(`Released concurrency slot for ${model}`, { taskId });
  }

  releaseAll(): void {
    const taskIds = Array.from(this.activeTasks.keys());
    for (const taskId of taskIds) {
      this.release(taskId);
    }
  }

  async dispose(): Promise<void> {
    if (this.isDisposed) return;

    this.isDisposed = true;
    logger.info("Disposing ConcurrencyManager");

    this.releaseAll();

    const providerSemaphores = Array.from(this.providerSemaphores.values());
    for (const semaphore of providerSemaphores) {
      semaphore.dispose();
    }
    this.providerSemaphores.clear();

    const modelSemaphores = Array.from(this.modelSemaphores.values());
    for (const semaphore of modelSemaphores) {
      semaphore.dispose();
    }
    this.modelSemaphores.clear();

    this.activeTasks.clear();
  }

  getAvailableSlots(provider: ProviderName): number {
    const semaphore = this.providerSemaphores.get(provider);
    return semaphore?.getAvailable() ?? 0;
  }

  getModelAvailableSlots(model: string): number {
    const semaphore = this.modelSemaphores.get(model);
    return semaphore?.getAvailable() ?? this.config.defaultConcurrency;
  }

  getActiveTaskCount(): number {
    return this.activeTasks.size;
  }

  getWaitingCount(provider: ProviderName): number {
    const semaphore = this.providerSemaphores.get(provider);
    return semaphore?.getWaiting() ?? 0;
  }

  getStatus(): {
    activeTasks: number;
    providers: Record<string, { available: number; waiting: number }>;
  } {
    const providers: Record<string, { available: number; waiting: number }> = {};

    const entries = Array.from(this.providerSemaphores.entries());
    for (const [name, semaphore] of entries) {
      providers[name] = {
        available: semaphore.getAvailable(),
        waiting: semaphore.getWaiting(),
      };
    }

    return {
      activeTasks: this.activeTasks.size,
      providers,
    };
  }

  updateConfig(config: Partial<ConcurrencyConfig>): void {
    if (config.defaultConcurrency !== undefined) {
      this.config.defaultConcurrency = config.defaultConcurrency;
    }

    if (config.acquireTimeoutMs !== undefined) {
      this.config.acquireTimeoutMs = config.acquireTimeoutMs;
    }

    if (config.providerConcurrency) {
      this.config.providerConcurrency = {
        ...this.config.providerConcurrency,
        ...config.providerConcurrency,
      };
    }

    if (config.modelConcurrency) {
      this.config.modelConcurrency = {
        ...this.config.modelConcurrency,
        ...config.modelConcurrency,
      };
    }

    logger.debug("Concurrency config updated", { config: this.config });
  }
}

let concurrencyManagerInstance: ConcurrencyManager | null = null;

export function getConcurrencyManager(config?: Partial<ConcurrencyConfig>): ConcurrencyManager {
  if (!concurrencyManagerInstance) {
    concurrencyManagerInstance = new ConcurrencyManager(config);
    getShutdownManager().register('concurrencyManager', concurrencyManagerInstance);
  }
  return concurrencyManagerInstance;
}

export function resetConcurrencyManager(): void {
  if (concurrencyManagerInstance) {
    getShutdownManager().unregister('concurrencyManager');
  }
  concurrencyManagerInstance = null;
}
