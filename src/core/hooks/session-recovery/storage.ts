/**
 * Session Recovery Storage
 * Filesystem-based message and part manipulation for session recovery.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  MESSAGE_STORAGE,
  PART_STORAGE,
  THINKING_TYPES,
  META_TYPES,
} from "./constants";
import type { StoredMessageMeta, MessagePart } from "./types";

/**
 * Stored text part
 */
export interface StoredTextPart {
  id: string;
  sessionId: string;
  messageId: string;
  type: "text";
  text: string;
  synthetic?: boolean;
  ignored?: boolean;
}

/**
 * Stored tool part
 */
export interface StoredToolPart {
  id: string;
  sessionId: string;
  messageId: string;
  type: "tool";
  callId: string;
  tool: string;
  state: {
    status: "pending" | "running" | "completed" | "error";
    input: Record<string, unknown>;
    output?: string;
    error?: string;
  };
}

/**
 * Stored reasoning part
 */
export interface StoredReasoningPart {
  id: string;
  sessionId: string;
  messageId: string;
  type: "reasoning";
  text: string;
}

/**
 * Stored thinking part
 */
export interface StoredThinkingPart {
  id: string;
  sessionId: string;
  messageId: string;
  type: "thinking" | "redacted_thinking";
  thinking: string;
  synthetic?: boolean;
}

/**
 * Stored step part
 */
export interface StoredStepPart {
  id: string;
  sessionId: string;
  messageId: string;
  type: "step-start" | "step-finish";
}

/**
 * Union of all stored part types
 */
export type StoredPart =
  | StoredTextPart
  | StoredToolPart
  | StoredReasoningPart
  | StoredThinkingPart
  | StoredStepPart
  | {
      id: string;
      sessionId: string;
      messageId: string;
      type: string;
      [key: string]: unknown;
    };

/**
 * Generate a unique part ID
 */
export function generatePartId(): string {
  const timestamp = Date.now().toString(16);
  const random = Math.random().toString(36).substring(2, 10);
  return `prt_${timestamp}${random}`;
}

/**
 * Get message directory for a session
 */
export function getMessageDir(sessionId: string): string {
  if (!existsSync(MESSAGE_STORAGE)) return "";

  const directPath = join(MESSAGE_STORAGE, sessionId);
  if (existsSync(directPath)) {
    return directPath;
  }

  // Search in subdirectories
  try {
    for (const dir of readdirSync(MESSAGE_STORAGE)) {
      const sessionPath = join(MESSAGE_STORAGE, dir, sessionId);
      if (existsSync(sessionPath)) {
        return sessionPath;
      }
    }
  } catch {
    // Ignore read errors
  }

  return "";
}

/**
 * Read all messages for a session
 */
export function readMessages(sessionId: string): StoredMessageMeta[] {
  const messageDir = getMessageDir(sessionId);
  if (!messageDir || !existsSync(messageDir)) return [];

  const messages: StoredMessageMeta[] = [];
  try {
    for (const file of readdirSync(messageDir)) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = readFileSync(join(messageDir, file), "utf-8");
        messages.push(JSON.parse(content));
      } catch {
        continue;
      }
    }
  } catch {
    return [];
  }

  // Sort by creation time
  return messages.sort((a, b) => {
    const aTime = a.time?.created ?? 0;
    const bTime = b.time?.created ?? 0;
    if (aTime !== bTime) return aTime - bTime;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Read parts for a message
 */
export function readParts(messageId: string): StoredPart[] {
  const partDir = join(PART_STORAGE, messageId);
  if (!existsSync(partDir)) return [];

  const parts: StoredPart[] = [];
  try {
    for (const file of readdirSync(partDir)) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = readFileSync(join(partDir, file), "utf-8");
        parts.push(JSON.parse(content));
      } catch {
        continue;
      }
    }
  } catch {
    return [];
  }

  return parts;
}

/**
 * Check if a part has meaningful content
 */
export function hasContent(part: StoredPart): boolean {
  if (THINKING_TYPES.has(part.type)) return false;
  if (META_TYPES.has(part.type)) return false;

  if (part.type === "text") {
    const textPart = part as StoredTextPart;
    return !!(textPart.text?.trim());
  }

  if (part.type === "tool" || part.type === "tool_use") {
    return true;
  }

  if (part.type === "tool_result") {
    return true;
  }

  return false;
}

/**
 * Check if a message has any content parts
 */
export function messageHasContent(messageId: string): boolean {
  const parts = readParts(messageId);
  return parts.some(hasContent);
}

/**
 * Inject a text part into a message
 */
export function injectTextPart(
  sessionId: string,
  messageId: string,
  text: string
): boolean {
  const partDir = join(PART_STORAGE, messageId);

  if (!existsSync(partDir)) {
    try {
      mkdirSync(partDir, { recursive: true });
    } catch {
      return false;
    }
  }

  const partId = generatePartId();
  const part: StoredTextPart = {
    id: partId,
    sessionId,
    messageId,
    type: "text",
    text,
    synthetic: true,
  };

  try {
    writeFileSync(join(partDir, `${partId}.json`), JSON.stringify(part, null, 2));
    return true;
  } catch {
    return false;
  }
}

/**
 * Find empty messages in a session
 */
export function findEmptyMessages(sessionId: string): string[] {
  const messages = readMessages(sessionId);
  const emptyIds: string[] = [];

  for (const msg of messages) {
    if (!messageHasContent(msg.id)) {
      emptyIds.push(msg.id);
    }
  }

  return emptyIds;
}

/**
 * Find empty message by API index
 */
export function findEmptyMessageByIndex(
  sessionId: string,
  targetIndex: number
): string | null {
  const messages = readMessages(sessionId);

  // API index may differ from storage index due to system messages
  const indicesToTry = [
    targetIndex,
    targetIndex - 1,
    targetIndex + 1,
    targetIndex - 2,
    targetIndex + 2,
    targetIndex - 3,
    targetIndex - 4,
    targetIndex - 5,
  ];

  for (const idx of indicesToTry) {
    if (idx < 0 || idx >= messages.length) continue;

    const targetMsg = messages[idx];
    if (!messageHasContent(targetMsg.id)) {
      return targetMsg.id;
    }
  }

  return null;
}

/**
 * Find first empty message
 */
export function findFirstEmptyMessage(sessionId: string): string | null {
  const emptyIds = findEmptyMessages(sessionId);
  return emptyIds.length > 0 ? emptyIds[0] : null;
}

/**
 * Find messages with thinking blocks
 */
export function findMessagesWithThinkingBlocks(sessionId: string): string[] {
  const messages = readMessages(sessionId);
  const result: string[] = [];

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;

    const parts = readParts(msg.id);
    const hasThinking = parts.some((p) => THINKING_TYPES.has(p.type));
    if (hasThinking) {
      result.push(msg.id);
    }
  }

  return result;
}

/**
 * Find messages with thinking only (no content)
 */
export function findMessagesWithThinkingOnly(sessionId: string): string[] {
  const messages = readMessages(sessionId);
  const result: string[] = [];

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;

    const parts = readParts(msg.id);
    if (parts.length === 0) continue;

    const hasThinking = parts.some((p) => THINKING_TYPES.has(p.type));
    const hasTextContent = parts.some(hasContent);

    // Has thinking but no text content = orphan thinking
    if (hasThinking && !hasTextContent) {
      result.push(msg.id);
    }
  }

  return result;
}

/**
 * Find messages with orphan thinking (thinking not first)
 */
export function findMessagesWithOrphanThinking(sessionId: string): string[] {
  const messages = readMessages(sessionId);
  const result: string[] = [];

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;

    const parts = readParts(msg.id);
    if (parts.length === 0) continue;

    const sortedParts = [...parts].sort((a, b) => a.id.localeCompare(b.id));
    const firstPart = sortedParts[0];
    const firstIsThinking = THINKING_TYPES.has(firstPart.type);

    // If first part is not thinking, it's orphan
    if (!firstIsThinking) {
      result.push(msg.id);
    }
  }

  return result;
}

/**
 * Find last thinking content from previous assistant messages
 */
export function findLastThinkingContent(
  sessionId: string,
  beforeMessageId: string
): string {
  const messages = readMessages(sessionId);

  // Find the index of the current message
  const currentIndex = messages.findIndex((m) => m.id === beforeMessageId);
  if (currentIndex === -1) return "";

  // Search backwards through previous assistant messages
  for (let i = currentIndex - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;

    // Look for thinking parts in this message
    const parts = readParts(msg.id);
    for (const part of parts) {
      if (THINKING_TYPES.has(part.type)) {
        // Found thinking content - return it
        const thinkingPart = part as StoredThinkingPart | StoredReasoningPart;
        const content =
          "thinking" in thinkingPart
            ? thinkingPart.thinking
            : "text" in thinkingPart
              ? thinkingPart.text
              : "";
        if (content && content.trim().length > 0) {
          return content;
        }
      }
    }
  }

  return "";
}

/**
 * Prepend thinking part to a message
 */
export function prependThinkingPart(
  sessionId: string,
  messageId: string
): boolean {
  const partDir = join(PART_STORAGE, messageId);

  if (!existsSync(partDir)) {
    try {
      mkdirSync(partDir, { recursive: true });
    } catch {
      return false;
    }
  }

  // Try to get thinking content from previous turns
  const previousThinking = findLastThinkingContent(sessionId, messageId);

  // Use a timestamp-based ID that sorts first
  const partId = `prt_0000000000_thinking`;
  const part: StoredThinkingPart = {
    id: partId,
    sessionId,
    messageId,
    type: "thinking",
    thinking: previousThinking || "[Continuing from previous reasoning]",
    synthetic: true,
  };

  try {
    writeFileSync(join(partDir, `${partId}.json`), JSON.stringify(part, null, 2));
    return true;
  } catch {
    return false;
  }
}

/**
 * Strip thinking parts from a message
 */
export function stripThinkingParts(messageId: string): boolean {
  const partDir = join(PART_STORAGE, messageId);
  if (!existsSync(partDir)) return false;

  let anyRemoved = false;
  try {
    for (const file of readdirSync(partDir)) {
      if (!file.endsWith(".json")) continue;
      try {
        const filePath = join(partDir, file);
        const content = readFileSync(filePath, "utf-8");
        const part = JSON.parse(content) as StoredPart;
        if (THINKING_TYPES.has(part.type)) {
          unlinkSync(filePath);
          anyRemoved = true;
        }
      } catch {
        continue;
      }
    }
  } catch {
    return false;
  }

  return anyRemoved;
}

/**
 * Replace empty text parts with placeholder
 */
export function replaceEmptyTextParts(
  messageId: string,
  replacementText: string
): boolean {
  const partDir = join(PART_STORAGE, messageId);
  if (!existsSync(partDir)) return false;

  let anyReplaced = false;
  try {
    for (const file of readdirSync(partDir)) {
      if (!file.endsWith(".json")) continue;
      try {
        const filePath = join(partDir, file);
        const content = readFileSync(filePath, "utf-8");
        const part = JSON.parse(content) as StoredPart;

        if (part.type === "text") {
          const textPart = part as StoredTextPart;
          if (!textPart.text?.trim()) {
            textPart.text = replacementText;
            textPart.synthetic = true;
            writeFileSync(filePath, JSON.stringify(textPart, null, 2));
            anyReplaced = true;
          }
        }
      } catch {
        continue;
      }
    }
  } catch {
    return false;
  }

  return anyReplaced;
}

/**
 * Find messages with empty text parts
 */
export function findMessagesWithEmptyTextParts(sessionId: string): string[] {
  const messages = readMessages(sessionId);
  const result: string[] = [];

  for (const msg of messages) {
    const parts = readParts(msg.id);
    const hasEmptyTextPart = parts.some((p) => {
      if (p.type !== "text") return false;
      const textPart = p as StoredTextPart;
      return !textPart.text?.trim();
    });

    if (hasEmptyTextPart) {
      result.push(msg.id);
    }
  }

  return result;
}

/**
 * Find message by index needing thinking
 */
export function findMessageByIndexNeedingThinking(
  sessionId: string,
  targetIndex: number
): string | null {
  const messages = readMessages(sessionId);

  if (targetIndex < 0 || targetIndex >= messages.length) return null;

  const targetMsg = messages[targetIndex];
  if (targetMsg.role !== "assistant") return null;

  const parts = readParts(targetMsg.id);
  if (parts.length === 0) return null;

  const sortedParts = [...parts].sort((a, b) => a.id.localeCompare(b.id));
  const firstPart = sortedParts[0];
  const firstIsThinking = THINKING_TYPES.has(firstPart.type);

  if (!firstIsThinking) {
    return targetMsg.id;
  }

  return null;
}
