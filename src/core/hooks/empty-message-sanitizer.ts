/**
 * Empty Message Sanitizer Hook
 * Ensures all messages have non-empty content to prevent API errors.
 */

import type { Hook, HookContext, HookResult } from "./types";

export interface EmptyMessageSanitizerOptions {
  /** Placeholder for empty messages */
  placeholder?: string;
  /** Minimum content length */
  minLength?: number;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Check if content is empty or whitespace-only
 */
function isEmpty(content: unknown): boolean {
  if (content === null || content === undefined) {
    return true;
  }

  if (typeof content === "string") {
    return content.trim().length === 0;
  }

  if (Array.isArray(content)) {
    return content.length === 0 || content.every(isEmpty);
  }

  if (typeof content === "object") {
    const obj = content as Record<string, unknown>;

    // Check for content property
    if ("content" in obj) {
      return isEmpty(obj.content);
    }

    // Check for text property
    if ("text" in obj) {
      return isEmpty(obj.text);
    }

    return Object.keys(obj).length === 0;
  }

  return false;
}

/**
 * Sanitize a message
 */
function sanitizeMessage(
  message: unknown,
  placeholder: string,
  minLength: number
): unknown {
  if (typeof message === "string") {
    const trimmed = message.trim();
    if (trimmed.length < minLength) {
      return placeholder;
    }
    return message;
  }

  if (Array.isArray(message)) {
    return message.map((m) => sanitizeMessage(m, placeholder, minLength));
  }

  if (typeof message === "object" && message !== null) {
    const obj = message as Record<string, unknown>;
    const result = { ...obj };

    if ("content" in result) {
      result.content = sanitizeMessage(result.content, placeholder, minLength);
    }

    if ("text" in result) {
      result.text = sanitizeMessage(result.text, placeholder, minLength);
    }

    return result;
  }

  return message;
}

/**
 * Create empty message sanitizer hook
 */
export function createEmptyMessageSanitizerHook(
  options: EmptyMessageSanitizerOptions = {}
): Hook {
  const {
    placeholder = "(continued)",
    minLength = 1,
    debug = false,
  } = options;

  return {
    name: "empty-message-sanitizer",
    description: "Ensures all messages have non-empty content",
    events: ["message.before"],

    async handler(context: HookContext): Promise<HookResult> {
      const { message, messages } = context;

      // Check single message
      if (message !== undefined && isEmpty(message)) {
        if (debug) {
          console.log(`[empty-message-sanitizer] Sanitizing empty message`);
        }

        return {
          action: "continue",
          modified: true,
          replaceMessage: placeholder,
        };
      }

      // Check message array
      if (messages && Array.isArray(messages)) {
        let modified = false;
        const sanitizedMessages = messages.map((msg, index) => {
          // Don't modify the last message if it's from the assistant
          if (
            index === messages.length - 1 &&
            (msg as Record<string, unknown>)?.role === "assistant"
          ) {
            return msg;
          }

          const sanitized = sanitizeMessage(msg, placeholder, minLength);
          if (sanitized !== msg) {
            modified = true;
          }
          return sanitized;
        });

        if (modified) {
          if (debug) {
            console.log(`[empty-message-sanitizer] Sanitized message array`);
          }

          return {
            action: "continue",
            modified: true,
            modifiedMessages: sanitizedMessages,
          };
        }
      }

      return { action: "continue" };
    },
  };
}

/**
 * Check if a message is empty
 */
export function isMessageEmpty(message: unknown): boolean {
  return isEmpty(message);
}

/**
 * Sanitize a message manually
 */
export function sanitize(
  message: unknown,
  placeholder: string = "(continued)"
): unknown {
  return sanitizeMessage(message, placeholder, 1);
}
