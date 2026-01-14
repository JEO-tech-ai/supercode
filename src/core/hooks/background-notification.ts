/**
 * Background Notification Hook
 * Manages notifications for background agent tasks.
 */

import type { Hook, HookContext, HookResult } from "./types";

export interface BackgroundNotificationOptions {
  /** Enable notifications */
  enabled?: boolean;
  /** Notify on task start */
  notifyOnStart?: boolean;
  /** Notify on task complete */
  notifyOnComplete?: boolean;
  /** Notify on task error */
  notifyOnError?: boolean;
  /** Debug mode */
  debug?: boolean;
}

interface BackgroundTaskState {
  taskId: string;
  agent: string;
  startTime: number;
  status: "running" | "completed" | "error";
  description?: string;
}

const backgroundTasks = new Map<string, BackgroundTaskState>();

/**
 * Send a background task notification
 */
async function sendBackgroundNotification(
  title: string,
  body: string
): Promise<void> {
  console.log(`[Background] ${title}: ${body}`);

  // Try macOS notification
  if (process.platform === "darwin") {
    try {
      const { exec } = await import("child_process");
      exec(`osascript -e 'display notification "${body}" with title "${title}"'`);
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Create background notification hook
 */
export function createBackgroundNotificationHook(
  options: BackgroundNotificationOptions = {}
): Hook {
  const {
    enabled = true,
    notifyOnStart = false,
    notifyOnComplete = true,
    notifyOnError = true,
    debug = false,
  } = options;

  return {
    name: "background-notification",
    description: "Manages notifications for background agent tasks",
    events: ["agent.spawn", "agent.complete", "agent.error"],

    async handler(context: HookContext): Promise<HookResult> {
      if (!enabled) {
        return { action: "continue" };
      }

      const { event, taskId, agent, error } = context;

      switch (event) {
        case "agent.spawn":
          if (taskId && agent) {
            backgroundTasks.set(taskId, {
              taskId,
              agent,
              startTime: Date.now(),
              status: "running",
              description: context.description,
            });

            if (notifyOnStart) {
              await sendBackgroundNotification(
                "Background Task Started",
                `Agent ${agent} is now running`
              );
            }

            if (debug) {
              console.log(`[background-notification] Task ${taskId} started`);
            }
          }
          break;

        case "agent.complete":
          if (taskId) {
            const task = backgroundTasks.get(taskId);
            if (task) {
              task.status = "completed";
              const duration = ((Date.now() - task.startTime) / 1000).toFixed(1);

              if (notifyOnComplete) {
                await sendBackgroundNotification(
                  "Background Task Completed",
                  `Agent ${task.agent} finished in ${duration}s`
                );
              }

              if (debug) {
                console.log(`[background-notification] Task ${taskId} completed in ${duration}s`);
              }
            }
          }
          break;

        case "agent.error":
          if (taskId) {
            const task = backgroundTasks.get(taskId);
            if (task) {
              task.status = "error";

              const errorMessage = typeof error === "string"
                ? error
                : error?.message || "Unknown error";

              if (notifyOnError) {
                await sendBackgroundNotification(
                  "Background Task Error",
                  `Agent ${task.agent} encountered an error: ${errorMessage}`
                );
              }

              if (debug) {
                console.log(`[background-notification] Task ${taskId} error: ${errorMessage}`);
              }
            }
          }
          break;
      }

      return { action: "continue" };
    },
  };
}

/**
 * Get all background tasks
 */
export function getBackgroundTasks(): Map<string, BackgroundTaskState> {
  return new Map(backgroundTasks);
}

/**
 * Get running background tasks
 */
export function getRunningTasks(): BackgroundTaskState[] {
  return Array.from(backgroundTasks.values()).filter(
    (task) => task.status === "running"
  );
}

/**
 * Clear completed background tasks
 */
export function clearCompletedTasks(): number {
  let cleared = 0;
  for (const [taskId, task] of backgroundTasks) {
    if (task.status !== "running") {
      backgroundTasks.delete(taskId);
      cleared++;
    }
  }
  return cleared;
}
