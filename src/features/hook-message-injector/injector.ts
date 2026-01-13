import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { MESSAGE_STORAGE, PART_STORAGE } from "./constants";
import type {
  MessageMeta,
  OriginalMessageContext,
  TextPart,
  StoredMessage,
} from "./types";

export function findNearestMessageWithFields(
  messageDir: string
): StoredMessage | null {
  try {
    const files = readdirSync(messageDir)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();

    for (const file of files) {
      try {
        const content = readFileSync(join(messageDir, file), "utf-8");
        const msg = JSON.parse(content) as StoredMessage;
        if (msg.agent && msg.model?.providerId && msg.model?.modelId) {
          return msg;
        }
      } catch {
        continue;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function generateMessageId(): string {
  const timestamp = Date.now().toString(16);
  const random = Math.random().toString(36).substring(2, 14);
  return `msg_${timestamp}${random}`;
}

function generatePartId(): string {
  const timestamp = Date.now().toString(16);
  const random = Math.random().toString(36).substring(2, 10);
  return `prt_${timestamp}${random}`;
}

function getOrCreateMessageDir(sessionId: string): string {
  if (!existsSync(MESSAGE_STORAGE)) {
    mkdirSync(MESSAGE_STORAGE, { recursive: true });
  }

  const directPath = join(MESSAGE_STORAGE, sessionId);
  if (existsSync(directPath)) {
    return directPath;
  }

  for (const dir of readdirSync(MESSAGE_STORAGE)) {
    const sessionPath = join(MESSAGE_STORAGE, dir, sessionId);
    if (existsSync(sessionPath)) {
      return sessionPath;
    }
  }

  mkdirSync(directPath, { recursive: true });
  return directPath;
}

export function injectHookMessage(
  sessionId: string,
  hookContent: string,
  originalMessage: OriginalMessageContext
): boolean {
  if (!hookContent || hookContent.trim().length === 0) {
    return false;
  }

  const messageDir = getOrCreateMessageDir(sessionId);

  const needsFallback =
    !originalMessage.agent ||
    !originalMessage.model?.providerId ||
    !originalMessage.model?.modelId;

  const fallback = needsFallback
    ? findNearestMessageWithFields(messageDir)
    : null;

  const now = Date.now();
  const messageId = generateMessageId();
  const partId = generatePartId();

  const resolvedAgent = originalMessage.agent ?? fallback?.agent ?? "general";
  const resolvedModel =
    originalMessage.model?.providerId && originalMessage.model?.modelId
      ? {
          providerId: originalMessage.model.providerId,
          modelId: originalMessage.model.modelId,
        }
      : fallback?.model?.providerId && fallback?.model?.modelId
        ? {
            providerId: fallback.model.providerId,
            modelId: fallback.model.modelId,
          }
        : undefined;
  const resolvedTools = originalMessage.tools ?? fallback?.tools;

  const messageMeta: MessageMeta = {
    id: messageId,
    sessionId,
    role: "user",
    time: {
      created: now,
    },
    agent: resolvedAgent,
    model: resolvedModel,
    path: originalMessage.path?.cwd
      ? {
          cwd: originalMessage.path.cwd,
          root: originalMessage.path.root ?? "/",
        }
      : undefined,
    tools: resolvedTools,
  };

  const textPart: TextPart = {
    id: partId,
    type: "text",
    text: hookContent,
    synthetic: true,
    time: {
      start: now,
      end: now,
    },
    messageId,
    sessionId,
  };

  try {
    writeFileSync(
      join(messageDir, `${messageId}.json`),
      JSON.stringify(messageMeta, null, 2)
    );

    const partDir = join(PART_STORAGE, messageId);
    if (!existsSync(partDir)) {
      mkdirSync(partDir, { recursive: true });
    }
    writeFileSync(
      join(partDir, `${partId}.json`),
      JSON.stringify(textPart, null, 2)
    );

    return true;
  } catch {
    return false;
  }
}
