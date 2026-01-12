/**
 * Session Notification Hook
 * Provides OS-level notifications when agent is idle or tasks complete.
 */

import type { Hook, HookContext, HookResult } from "./types";

export interface SessionNotificationOptions {
  /** Enable OS notifications */
  enabled?: boolean;
  /** Notification timeout in ms */
  timeout?: number;
  /** Debug mode */
  debug?: boolean;
}

interface NotificationState {
  lastNotificationTime: number;
  pendingNotifications: string[];
}

const notificationStates = new Map<string, NotificationState>();

/**
 * Get or create notification state for a session
 */
function getState(sessionId: string): NotificationState {
  let state = notificationStates.get(sessionId);
  if (!state) {
    state = {
      lastNotificationTime: 0,
      pendingNotifications: [],
    };
    notificationStates.set(sessionId, state);
  }
  return state;
}

/**
 * Send a notification (platform-specific)
 */
async function sendNotification(title: string, body: string): Promise<void> {
  // Use node-notifier or similar if available
  // For now, just log to console
  console.log(`[Notification] ${title}: ${body}`);

  // Try to use terminal-notifier on macOS
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
 * Create session notification hook
 */
export function createSessionNotificationHook(
  options: SessionNotificationOptions = {}
): Hook {
  const { enabled = true, timeout = 5000, debug = false } = options;

  return {
    name: "session-notification",
    description: "Provides OS-level notifications for session events",
    events: ["session.idle", "session.end", "session.error"],

    async handler(context: HookContext): Promise<HookResult> {
      if (!enabled) {
        return { action: "continue" };
      }

      const { event, sessionId } = context;
      const state = getState(sessionId);
      const now = Date.now();

      // Throttle notifications
      if (now - state.lastNotificationTime < timeout) {
        return { action: "continue" };
      }

      switch (event) {
        case "session.idle":
          await sendNotification(
            "SuperCode",
            "Agent is waiting for input"
          );
          state.lastNotificationTime = now;
          break;

        case "session.end":
          await sendNotification(
            "SuperCode",
            "Session completed successfully"
          );
          state.lastNotificationTime = now;
          break;

        case "session.error":
          await sendNotification(
            "SuperCode Error",
            context.error?.message || "An error occurred"
          );
          state.lastNotificationTime = now;
          break;
      }

      if (debug) {
        console.log(`[session-notification] Event: ${event}, Session: ${sessionId}`);
      }

      return { action: "continue" };
    },
  };
}

/**
 * Clear notification state for a session
 */
export function clearNotificationState(sessionId: string): void {
  notificationStates.delete(sessionId);
}

/**
 * Get all notification states
 */
export function getAllNotificationStates(): Map<string, NotificationState> {
  return new Map(notificationStates);
}
