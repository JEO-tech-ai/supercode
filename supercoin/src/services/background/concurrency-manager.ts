/**
 * Concurrency Manager
 * Rate limiting for background tasks per provider/model
 * Inspired by oh-my-opencode's ConcurrencyManager
 */
import type { ProviderName } from "../models/types";
import logger from "../../shared/logger";

interface ConcurrencyConfig {
  defaultConcurrency: number;
  providerConcurrency: Partial<Record<ProviderName, number>>;
  modelConcurrency: Record<string, number>;
}

class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    const next = this.waiting.shift();
    if (next) {
      this.permits--;
      next();
    }
  }

  getAvailable(): number {
    return this.permits;
  }

  getWaiting(): number {
    return this.waiting.length;
  }
}

export class ConcurrencyManager {
  private config: ConcurrencyConfig;
  private providerSemaphores: Map<ProviderName, Semaphore> = new Map();
  private modelSemaphores: Map<string, Semaphore> = new Map();
  private activeTasks: Map<string, { provider: ProviderName; model: string }> = new Map();

  constructor(config?: Partial<ConcurrencyConfig>) {
    this.config = {
      defaultConcurrency: config?.defaultConcurrency ?? 5,
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
    // Initialize provider semaphores
    for (const [provider, limit] of Object.entries(this.config.providerConcurrency)) {
      this.providerSemaphores.set(
        provider as ProviderName,
        new Semaphore(limit ?? this.config.defaultConcurrency)
      );
    }

    // Initialize model semaphores
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

  /**
   * Acquire a slot for the given model
   * Blocks until a slot is available
   */
  async acquire(taskId: string, model: string): Promise<void> {
    const provider = this.getProviderFromModel(model);

    // Get or create semaphores
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

    // Acquire both provider and model level permits
    await Promise.all([
      providerSemaphore.acquire(),
      modelSemaphore.acquire(),
    ]);

    this.activeTasks.set(taskId, { provider, model });

    logger.debug(`Acquired concurrency slot for ${model}`, { taskId });
  }

  /**
   * Release a slot for the given task
   */
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

  /**
   * Get available slots for a provider
   */
  getAvailableSlots(provider: ProviderName): number {
    const semaphore = this.providerSemaphores.get(provider);
    return semaphore?.getAvailable() ?? 0;
  }

  /**
   * Get available slots for a specific model
   */
  getModelAvailableSlots(model: string): number {
    const semaphore = this.modelSemaphores.get(model);
    return semaphore?.getAvailable() ?? this.config.defaultConcurrency;
  }

  /**
   * Get current active task count
   */
  getActiveTaskCount(): number {
    return this.activeTasks.size;
  }

  /**
   * Get waiting task count for a provider
   */
  getWaitingCount(provider: ProviderName): number {
    const semaphore = this.providerSemaphores.get(provider);
    return semaphore?.getWaiting() ?? 0;
  }

  /**
   * Get status summary
   */
  getStatus(): {
    activeTasks: number;
    providers: Record<string, { available: number; waiting: number }>;
  } {
    const providers: Record<string, { available: number; waiting: number }> = {};

    for (const [name, semaphore] of this.providerSemaphores) {
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

  /**
   * Update configuration dynamically
   */
  updateConfig(config: Partial<ConcurrencyConfig>): void {
    if (config.defaultConcurrency !== undefined) {
      this.config.defaultConcurrency = config.defaultConcurrency;
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

    // Note: Existing semaphores are not updated
    // New limits only apply to newly created semaphores
    logger.debug("Concurrency config updated", { config: this.config });
  }
}

// Singleton instance
let concurrencyManagerInstance: ConcurrencyManager | null = null;

export function getConcurrencyManager(config?: Partial<ConcurrencyConfig>): ConcurrencyManager {
  if (!concurrencyManagerInstance) {
    concurrencyManagerInstance = new ConcurrencyManager(config);
  }
  return concurrencyManagerInstance;
}

export function resetConcurrencyManager(): void {
  concurrencyManagerInstance = null;
}
