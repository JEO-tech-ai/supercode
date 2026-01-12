/**
 * Interactive Bash Session Hook
 * Tracks and manages tmux/interactive shell sessions.
 */

import type { Hook, HookContext, HookResult } from "./types";

export interface InteractiveBashSessionOptions {
  /** Show reminders about active sessions */
  showReminders?: boolean;
  /** Session timeout in ms (for stale detection) */
  sessionTimeout?: number;
  /** Debug mode */
  debug?: boolean;
}

interface BashSession {
  id: string;
  type: "tmux" | "screen" | "bash";
  startTime: number;
  lastActivity: number;
  command?: string;
  pid?: number;
}

const activeSessions = new Map<string, BashSession[]>();

/**
 * Parse session info from tool result
 */
function parseSessionInfo(toolResult: unknown): BashSession | null {
  if (!toolResult || typeof toolResult !== "object") {
    return null;
  }

  const result = toolResult as Record<string, unknown>;

  // Check for tmux session creation
  if (result.output && typeof result.output === "string") {
    const output = result.output;

    // tmux new-session patterns
    if (output.includes("tmux") || output.includes("screen")) {
      const tmuxMatch = output.match(/session\s+(?:created|started):\s*(\S+)/i);
      if (tmuxMatch) {
        return {
          id: tmuxMatch[1],
          type: "tmux",
          startTime: Date.now(),
          lastActivity: Date.now(),
        };
      }
    }
  }

  return null;
}

/**
 * Create interactive bash session hook
 */
export function createInteractiveBashSessionHook(
  options: InteractiveBashSessionOptions = {}
): Hook {
  const {
    showReminders = true,
    sessionTimeout = 300000, // 5 minutes
    debug = false,
  } = options;

  return {
    name: "interactive-bash-session",
    description: "Tracks and manages interactive shell sessions",
    events: ["tool.after", "session.idle"],

    async handler(context: HookContext): Promise<HookResult> {
      const { event, sessionId, toolName, toolResult, toolArgs } = context;

      // Track new interactive sessions
      if (event === "tool.after") {
        if (toolName === "bash" || toolName === "Bash" || toolName === "interactive_bash") {
          const command = (toolArgs as Record<string, unknown>)?.command as string;

          // Check if this is starting an interactive session
          if (command?.includes("tmux") || command?.includes("screen")) {
            const sessionInfo = parseSessionInfo(toolResult);
            if (sessionInfo) {
              sessionInfo.command = command;

              let sessions = activeSessions.get(sessionId);
              if (!sessions) {
                sessions = [];
                activeSessions.set(sessionId, sessions);
              }
              sessions.push(sessionInfo);

              if (debug) {
                console.log(`[interactive-bash-session] New session: ${sessionInfo.id}`);
              }
            }
          }
        }
      }

      // Show reminders about active sessions on idle
      if (event === "session.idle" && showReminders) {
        const sessions = activeSessions.get(sessionId);
        if (sessions && sessions.length > 0) {
          const now = Date.now();
          const activeSess = sessions.filter(
            (s) => now - s.lastActivity < sessionTimeout
          );

          if (activeSess.length > 0) {
            const reminder = activeSess
              .map(
                (s) =>
                  `- ${s.type} session "${s.id}" (started ${Math.round((now - s.startTime) / 1000)}s ago)`
              )
              .join("\n");

            return {
              action: "continue",
              modified: true,
              appendMessage: `
<system-reminder>
You have ${activeSess.length} active interactive session(s):
${reminder}

Remember to manage these sessions:
- Use \`tmux attach -t <session>\` to reattach
- Use \`tmux kill-session -t <session>\` to terminate
</system-reminder>
`,
            };
          }
        }
      }

      return { action: "continue" };
    },
  };
}

/**
 * Get active sessions for a session ID
 */
export function getActiveBashSessions(sessionId: string): BashSession[] {
  return activeSessions.get(sessionId) || [];
}

/**
 * Clear sessions for a session ID
 */
export function clearBashSessions(sessionId: string): void {
  activeSessions.delete(sessionId);
}

/**
 * Get all active sessions across all session IDs
 */
export function getAllActiveBashSessions(): Map<string, BashSession[]> {
  return new Map(activeSessions);
}
