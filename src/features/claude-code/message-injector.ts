import * as fs from "fs";
import * as path from "path";
import type { MessageFields } from "./types";

const MESSAGE_STORAGE = path.join(process.cwd(), ".supercoin", "sessions");

export { MESSAGE_STORAGE };

interface StoredMessage {
  id: string;
  role: string;
  agent?: string;
  model?: {
    providerID?: string;
    modelID?: string;
  };
  tools?: Record<string, boolean>;
}

export function getMessageStoragePath(sessionId: string): string {
  return path.join(MESSAGE_STORAGE, sessionId, "messages");
}

export function findNearestMessageWithFields(
  messageDir: string
): MessageFields | null {
  if (!fs.existsSync(messageDir)) {
    return null;
  }

  try {
    const files = fs
      .readdirSync(messageDir)
      .filter((file) => file.endsWith(".json"))
      .sort()
      .reverse();

    for (const file of files) {
      const content = fs.readFileSync(path.join(messageDir, file), "utf-8");
      const message = JSON.parse(content) as StoredMessage;

      if (message.role === "assistant" && (message.agent || message.model)) {
        return {
          agent: message.agent,
          tools: message.tools,
          model: message.model,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function findRecentAgentMessage(
  sessionId: string,
  agentName?: string
): StoredMessage | null {
  const messageDir = getMessageStoragePath(sessionId);

  if (!fs.existsSync(messageDir)) {
    return null;
  }

  try {
    const files = fs
      .readdirSync(messageDir)
      .filter((file) => file.endsWith(".json"))
      .sort()
      .reverse();

    for (const file of files) {
      const content = fs.readFileSync(path.join(messageDir, file), "utf-8");
      const message = JSON.parse(content) as StoredMessage;

      if (message.role === "assistant") {
        if (!agentName || message.agent === agentName) {
          return message;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}
