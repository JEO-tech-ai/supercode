import type { Hook, HookContext, HookResult } from "../../core/hooks/types";
import {
  setMainSessionId,
  clearMainSessionId,
  addSubagentSession,
  removeSubagentSession,
  setLastActiveSessionId,
  getMainSessionId,
} from "./session-state";
import { appendToTranscript } from "./transcript";

export function createClaudeCodeStateHook(): Hook {
  return {
    name: "claude-code-state",
    description: "Maintains Claude Code-compatible session state",
    priority: 100,
    events: [
      "session.start",
      "session.end",
      "session.deleted",
      "agent.spawn",
      "agent.complete",
      "message.after",
    ],
    handler: async (context: HookContext): Promise<HookResult | void> => {
      const { event, sessionId, data } = context;

      switch (event) {
        case "session.start": {
          const isSubagent = (data as { isSubagent?: boolean })?.isSubagent;
          if (isSubagent) {
            addSubagentSession(sessionId);
          } else {
            setMainSessionId(sessionId);
          }
          break;
        }

        case "session.end":
        case "session.deleted": {
          removeSubagentSession(sessionId);
          if (getMainSessionId() === sessionId) {
            clearMainSessionId();
          }
          break;
        }

        case "agent.spawn": {
          const childSessionId = (data as { childSessionId?: string })
            ?.childSessionId;
          if (childSessionId) {
            addSubagentSession(childSessionId);
          }
          break;
        }

        case "agent.complete": {
          const childSessionId = (data as { childSessionId?: string })
            ?.childSessionId;
          if (childSessionId) {
            removeSubagentSession(childSessionId);
          }
          break;
        }

        case "message.after": {
          setLastActiveSessionId(sessionId);

          const message = data as { role?: string; content?: string };
          if (message.role && message.content) {
            appendToTranscript(sessionId, {
              role: message.role as "user" | "assistant" | "system",
              content: message.content,
            });
          }
          break;
        }
      }
    },
  };
}
