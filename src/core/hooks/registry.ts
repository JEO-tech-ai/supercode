/**
 * Enhanced Hook Registry
 * Advanced hook management with lifecycle, statistics, and error recovery.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import type {
  Hook,
  HookEventType,
  HookContext,
  HookResult,
  HookConfig,
  HookStats,
  HookState,
  ManagedHook,
  RecoveryHook,
  RecoveryHookResult,
  TypedHookContext,
  HookEventData,
} from "./types";
import logger from "../../shared/logger";

/**
 * Enhanced Hook Registry Interface
 */
export interface IHookRegistry {
  // Registration
  register(hook: Hook): void;
  registerRecovery(hook: RecoveryHook): void;
  unregister(name: string): boolean;

  // Query
  get(name: string): ManagedHook | undefined;
  getForEvent(event: HookEventType): ManagedHook[];
  getRecoveryHooks(): RecoveryHook[];
  list(): ManagedHook[];

  // Lifecycle
  enable(name: string): boolean;
  disable(name: string): boolean;
  isEnabled(name: string): boolean;

  // Execution
  trigger(event: HookEventType, context: HookContext): Promise<HookResult | void>;
  triggerTyped<E extends HookEventType>(
    event: E,
    context: TypedHookContext<E>
  ): Promise<HookResult | void>;
  triggerRecovery(context: HookContext): Promise<RecoveryHookResult | void>;

  // Statistics
  getStats(name: string): HookStats | undefined;
  getAllStats(): Map<string, HookStats>;
  resetStats(name?: string): void;

  // Configuration
  configure(config: HookConfig): void;
  getConfig(): HookConfig;

  // Cleanup
  cleanup(): Promise<void>;
}

/**
 * Default hook configuration
 */
const DEFAULT_CONFIG: HookConfig = {
  enabled: true,
  priorityOffset: 0,
  maxConcurrency: 10,
  timeout: 30000,
  enableStats: true,
  logExecutions: false,
};

/**
 * Create initial hook statistics
 */
function createStats(): HookStats {
  return {
    executions: 0,
    successes: 0,
    failures: 0,
    avgDuration: 0,
  };
}

/**
 * Enhanced Hook Registry Implementation
 */
class HookRegistry implements IHookRegistry {
  private hooks: Map<string, ManagedHook> = new Map();
  private recoveryHooks: Map<string, RecoveryHook> = new Map();
  private config: HookConfig = { ...DEFAULT_CONFIG };

  // =========================================================================
  // Registration
  // =========================================================================

  register(hook: Hook): void {
    if (this.hooks.has(hook.name)) {
      logger.warn(`Hook "${hook.name}" is already registered, replacing...`);
    }

    const managedHook: ManagedHook = {
      ...hook,
      priority: (hook.priority ?? 0) + (this.config.priorityOffset ?? 0),
      enabled: hook.enabled ?? true,
      state: "registered",
      stats: createStats(),
      registeredAt: Date.now(),
    };

    this.hooks.set(hook.name, managedHook);
    managedHook.state = "active";

    if (this.config.logExecutions) {
      logger.debug(`Hook registered: ${hook.name} (events: ${hook.events.join(", ")})`);
    }
  }

  registerRecovery(hook: RecoveryHook): void {
    if (this.recoveryHooks.has(hook.name)) {
      logger.warn(`Recovery hook "${hook.name}" is already registered, replacing...`);
    }

    this.recoveryHooks.set(hook.name, {
      ...hook,
      enabled: hook.enabled ?? true,
    });

    if (this.config.logExecutions) {
      logger.debug(`Recovery hook registered: ${hook.name}`);
    }
  }

  unregister(name: string): boolean {
    const hook = this.hooks.get(name);
    if (hook?.cleanup) {
      hook.cleanup().catch((err) => {
        logger.error(`Cleanup failed for hook ${name}:`, err);
      });
    }

    const deleted = this.hooks.delete(name);
    if (!deleted) {
      return this.recoveryHooks.delete(name);
    }
    return deleted;
  }

  // =========================================================================
  // Query
  // =========================================================================

  get(name: string): ManagedHook | undefined {
    return this.hooks.get(name);
  }

  getForEvent(event: HookEventType): ManagedHook[] {
    return Array.from(this.hooks.values())
      .filter((hook) => hook.enabled && hook.events.includes(event))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  getRecoveryHooks(): RecoveryHook[] {
    return Array.from(this.recoveryHooks.values()).filter((hook) => hook.enabled);
  }

  list(): ManagedHook[] {
    return Array.from(this.hooks.values());
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  enable(name: string): boolean {
    const hook = this.hooks.get(name);
    if (hook) {
      hook.enabled = true;
      hook.state = "active";
      return true;
    }

    const recoveryHook = this.recoveryHooks.get(name);
    if (recoveryHook) {
      recoveryHook.enabled = true;
      return true;
    }

    return false;
  }

  disable(name: string): boolean {
    const hook = this.hooks.get(name);
    if (hook) {
      hook.enabled = false;
      hook.state = "disabled";
      return true;
    }

    const recoveryHook = this.recoveryHooks.get(name);
    if (recoveryHook) {
      recoveryHook.enabled = false;
      return true;
    }

    return false;
  }

  isEnabled(name: string): boolean {
    const hook = this.hooks.get(name);
    if (hook) return hook.enabled ?? false;

    const recoveryHook = this.recoveryHooks.get(name);
    if (recoveryHook) return recoveryHook.enabled ?? false;

    return false;
  }

  // =========================================================================
  // Execution
  // =========================================================================

  async trigger(
    event: HookEventType,
    context: HookContext
  ): Promise<HookResult | void> {
    if (!this.config.enabled) return;

    const hooks = this.getForEvent(event);
    if (hooks.length === 0) return;

    const contextWithTimestamp: HookContext = {
      ...context,
      timestamp: context.timestamp ?? Date.now(),
    };

    let aggregatedResult: HookResult = {};

    for (const hook of hooks) {
      try {
        const startTime = Date.now();

        if (this.config.logExecutions) {
          logger.debug(`Executing hook: ${hook.name} for event: ${event}`);
        }

        // Execute with timeout
        const result = await this.executeWithTimeout(
          hook.handler(contextWithTimestamp),
          hook.name
        );

        // Update statistics
        if (this.config.enableStats) {
          this.updateStats(hook, Date.now() - startTime, true);
        }

        // Handle result
        if (result) {
          // Merge results
          if (result.context) {
            aggregatedResult.context = [
              ...(aggregatedResult.context ?? []),
              ...result.context,
            ];
          }
          if (result.modified !== undefined) {
            aggregatedResult.modified = result.modified;
          }
          if (result.prompt) {
            aggregatedResult.prompt = result.prompt;
          }
          if (result.skipAction) {
            aggregatedResult.skipAction = true;
          }

          // Early exit if continue is false
          if (result.continue === false) {
            return { ...aggregatedResult, continue: false };
          }
        }
      } catch (error) {
        // Update statistics
        if (this.config.enableStats) {
          this.updateStats(hook, 0, false, error as Error);
        }

        hook.state = "error";
        logger.error(`Hook "${hook.name}" failed:`, error);

        // Continue with other hooks unless critical
        if ((error as Error).message?.includes("CRITICAL")) {
          throw error;
        }
      }
    }

    return Object.keys(aggregatedResult).length > 0 ? aggregatedResult : undefined;
  }

  async triggerTyped<E extends HookEventType>(
    event: E,
    context: TypedHookContext<E>
  ): Promise<HookResult | void> {
    // Convert to generic context for compatibility
    const genericContext: HookContext = {
      sessionId: context.sessionId,
      workdir: context.workdir,
      event: context.event,
      data: context.data,
      timestamp: context.timestamp,
      metadata: context.metadata,
    };

    return this.trigger(event, genericContext);
  }

  async triggerRecovery(context: HookContext): Promise<RecoveryHookResult | void> {
    const recoveryHooks = this.getRecoveryHooks();

    for (const hook of recoveryHooks) {
      // Check if hook handles this error type
      if (hook.errorTypes && context.data) {
        const errorType = (context.data as { errorType?: string }).errorType;
        if (errorType && !hook.errorTypes.includes(errorType)) {
          continue;
        }
      }

      try {
        if (this.config.logExecutions) {
          logger.debug(`Executing recovery hook: ${hook.name}`);
        }

        const result = await hook.handler(context);

        if (result?.recovered) {
          logger.info(`Recovery successful via hook: ${hook.name}`);
          return result;
        }
      } catch (error) {
        logger.error(`Recovery hook "${hook.name}" failed:`, error);
      }
    }

    return undefined;
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    hookName: string
  ): Promise<T> {
    const timeout = this.config.timeout ?? DEFAULT_CONFIG.timeout!;

    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Hook "${hookName}" timed out after ${timeout}ms`)),
          timeout
        )
      ),
    ]);
  }

  // =========================================================================
  // Statistics
  // =========================================================================

  private updateStats(
    hook: ManagedHook,
    duration: number,
    success: boolean,
    error?: Error
  ): void {
    const stats = hook.stats;

    stats.executions++;
    if (success) {
      stats.successes++;
    } else {
      stats.failures++;
      stats.lastError = error;
    }

    // Update average duration (rolling average)
    stats.avgDuration =
      (stats.avgDuration * (stats.executions - 1) + duration) / stats.executions;

    stats.lastExecuted = Date.now();
  }

  getStats(name: string): HookStats | undefined {
    return this.hooks.get(name)?.stats;
  }

  getAllStats(): Map<string, HookStats> {
    const stats = new Map<string, HookStats>();
    for (const [name, hook] of this.hooks) {
      stats.set(name, { ...hook.stats });
    }
    return stats;
  }

  resetStats(name?: string): void {
    if (name) {
      const hook = this.hooks.get(name);
      if (hook) {
        hook.stats = createStats();
      }
    } else {
      for (const hook of this.hooks.values()) {
        hook.stats = createStats();
      }
    }
  }

  // =========================================================================
  // Configuration
  // =========================================================================

  configure(config: Partial<HookConfig>): void {
    this.config = { ...this.config, ...config };

    // Update hook priorities if offset changed
    if (config.priorityOffset !== undefined) {
      for (const hook of this.hooks.values()) {
        const originalPriority =
          (hook.priority ?? 0) - (this.config.priorityOffset ?? 0);
        hook.priority = originalPriority + config.priorityOffset;
      }
    }
  }

  getConfig(): HookConfig {
    return { ...this.config };
  }

  // =========================================================================
  // Cleanup
  // =========================================================================

  async cleanup(): Promise<void> {
    const cleanupPromises: Promise<void>[] = [];

    for (const hook of this.hooks.values()) {
      if (hook.cleanup) {
        cleanupPromises.push(
          hook.cleanup().catch((err) => {
            logger.error(`Cleanup failed for hook ${hook.name}:`, err);
          })
        );
      }
    }

    await Promise.all(cleanupPromises);
    this.hooks.clear();
    this.recoveryHooks.clear();
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let hookRegistryInstance: HookRegistry | null = null;

/**
 * Get the global hook registry instance
 */
export function getHookRegistry(): IHookRegistry {
  if (!hookRegistryInstance) {
    hookRegistryInstance = new HookRegistry();
  }
  return hookRegistryInstance;
}

/**
 * Reset the hook registry (for testing)
 */
export function resetHookRegistry(): void {
  if (hookRegistryInstance) {
    hookRegistryInstance.cleanup().catch(console.error);
    hookRegistryInstance = null;
  }
}

/**
 * Create a new isolated hook registry (for testing or scoped usage)
 */
export function createHookRegistry(): IHookRegistry {
  return new HookRegistry();
}
