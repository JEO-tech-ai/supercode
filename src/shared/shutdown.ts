/**
 * ShutdownManager - Centralized graceful shutdown orchestration
 * 
 * Inspired by opencode's stability patterns:
 * - Instance.disposeAll() for resource cleanup
 * - Shell.killTree() for process escalation
 * - Worker shutdown() for coordinated cleanup
 */
import { spawn, type ChildProcess } from "child_process";
import logger from "./logger";

const SIGKILL_TIMEOUT_MS = 200;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5000;
const HARD_EXIT_TIMEOUT_MS = 15000;

export interface ShutdownConfig {
  /** Timeout for graceful shutdown of each subsystem (ms) */
  shutdownTimeout: number;
  /** Timeout between SIGTERM and SIGKILL for processes (ms) */
  killEscalationTimeout: number;
  /** Maximum total shutdown time before hard exit (ms) */
  hardExitTimeout: number;
}

export interface Disposable {
  dispose(): Promise<void>;
}

type ShutdownPhase = "idle" | "shutting_down" | "completed";

/**
 * Kill a process tree with SIGTERM → SIGKILL escalation
 * Platform-aware: uses taskkill on Windows
 */
export async function killTree(
  proc: ChildProcess,
  opts?: { 
    exited?: () => boolean;
    timeoutMs?: number;
  }
): Promise<void> {
  const pid = proc.pid;
  if (!pid || opts?.exited?.()) return;

  const timeout = opts?.timeoutMs ?? SIGKILL_TIMEOUT_MS;

  if (process.platform === "win32") {
    // Windows: use taskkill to kill process tree
    await new Promise<void>((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(pid), "/f", "/t"], { 
        stdio: "ignore" 
      });
      killer.once("exit", () => resolve());
      killer.once("error", () => resolve());
    });
    return;
  }

  // Unix: send signals to process group
  try {
    // Try to kill process group first (negative PID)
    process.kill(-pid, "SIGTERM");
    await sleep(timeout);
    if (!opts?.exited?.()) {
      process.kill(-pid, "SIGKILL");
    }
  } catch (_e) {
    // Fallback to direct process kill if group kill fails
    try {
      proc.kill("SIGTERM");
      await sleep(timeout);
      if (!opts?.exited?.()) {
        proc.kill("SIGKILL");
      }
    } catch {
      // Process already dead, ignore
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a promise that resolves after timeout or rejects with AbortSignal
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = "Operation timed out"
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Create a promise that resolves after timeout with a default value
 */
export async function withTimeoutDefault<T>(
  promise: Promise<T>,
  timeoutMs: number,
  defaultValue: T
): Promise<T> {
  try {
    return await withTimeout(promise, timeoutMs);
  } catch {
    return defaultValue;
  }
}

class ShutdownManager {
  private phase: ShutdownPhase = "idle";
  private disposables: Map<string, Disposable> = new Map();
  private config: ShutdownConfig;
  private exitCode: number = 0;

  constructor(config?: Partial<ShutdownConfig>) {
    this.config = {
      shutdownTimeout: config?.shutdownTimeout ?? DEFAULT_SHUTDOWN_TIMEOUT_MS,
      killEscalationTimeout: config?.killEscalationTimeout ?? SIGKILL_TIMEOUT_MS,
      hardExitTimeout: config?.hardExitTimeout ?? HARD_EXIT_TIMEOUT_MS,
    };
  }

  /**
   * Register a disposable resource for cleanup on shutdown
   */
  register(name: string, disposable: Disposable): void {
    if (this.phase !== "idle") {
      logger.warn(`Cannot register disposable '${name}' during shutdown`);
      return;
    }
    this.disposables.set(name, disposable);
    logger.debug(`Registered disposable: ${name}`);
  }

  /**
   * Unregister a disposable (e.g., when manually disposed)
   */
  unregister(name: string): void {
    this.disposables.delete(name);
    logger.debug(`Unregistered disposable: ${name}`);
  }

  /**
   * Check if shutdown is in progress
   */
  isShuttingDown(): boolean {
    return this.phase !== "idle";
  }

  /**
   * Initiate graceful shutdown
   * Idempotent - safe to call multiple times
   */
  async shutdown(code: number = 0): Promise<void> {
    // Idempotent guard
    if (this.phase !== "idle") {
      logger.debug("Shutdown already in progress, ignoring duplicate call");
      return;
    }

    this.phase = "shutting_down";
    this.exitCode = code;
    logger.info("Initiating graceful shutdown...", { code });

    // Set hard exit deadline
    const hardExitTimer = setTimeout(() => {
      logger.error("Hard exit timeout reached, forcing exit");
      process.exit(this.exitCode);
    }, this.config.hardExitTimeout);

    try {
      // Dispose all registered resources with timeout
      const disposePromises = Array.from(this.disposables.entries()).map(
        async ([name, disposable]) => {
          try {
            await withTimeout(
              disposable.dispose(),
              this.config.shutdownTimeout,
              `Timeout disposing ${name}`
            );
            logger.debug(`Disposed: ${name}`);
          } catch (error) {
            logger.error(`Error disposing ${name}`, error as Error);
          }
        }
      );

      await Promise.all(disposePromises);
      this.disposables.clear();

      this.phase = "completed";
      logger.info("Graceful shutdown completed");
    } finally {
      clearTimeout(hardExitTimer);
      // Allow pending I/O to flush before exit
      setTimeout(() => process.exit(this.exitCode), 100);
    }
  }

  /**
   * Get current shutdown configuration
   */
  getConfig(): ShutdownConfig {
    return { ...this.config };
  }

  /**
   * Update shutdown configuration
   */
  updateConfig(config: Partial<ShutdownConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get shutdown status
   */
  getStatus(): { phase: ShutdownPhase; disposables: string[] } {
    return {
      phase: this.phase,
      disposables: Array.from(this.disposables.keys()),
    };
  }
}

// Singleton instance
let shutdownManagerInstance: ShutdownManager | null = null;

export function getShutdownManager(config?: Partial<ShutdownConfig>): ShutdownManager {
  if (!shutdownManagerInstance) {
    shutdownManagerInstance = new ShutdownManager(config);
  }
  return shutdownManagerInstance;
}

export function resetShutdownManager(): void {
  shutdownManagerInstance = null;
}

export { ShutdownManager };
