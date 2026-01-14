/**
 * Thinking Block Validator Hook
 *
 * Proactively prevents "Expected thinking/redacted_thinking but found tool_use" errors
 * by validating and fixing message structure BEFORE sending to API.
 *
 * Key features:
 * - PROACTIVE (prevents error) vs REACTIVE (fixes after error)
 * - Model-aware: only runs for extended thinking models
 * - Synthetic thinking block injection from previous turns
 *
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "./types";
import logger from "../../shared/logger";

/**
 * Models that support extended thinking
 */
export const THINKING_CAPABLE_MODELS = [
  "claude-sonnet-4",
  "claude-opus-4",
  "claude-3-opus",
  "claude-3-5-sonnet",
  "claude-3-sonnet",
] as const;

/**
 * Thinking part types
 */
export const THINKING_TYPES = ["thinking", "redacted_thinking", "reasoning"] as const;

/**
 * Content part types (non-thinking)
 */
export const CONTENT_TYPES = ["tool", "tool_use", "text", "tool_result"] as const;

/**
 * Validator options
 */
export interface ThinkingBlockValidatorOptions {
  /** Enable synthetic thinking block injection */
  injectSynthetic?: boolean;
  /** Default thinking content when none found */
  defaultThinkingContent?: string;
  /** Require thinking blocks at start */
  requireThinkingFirst?: boolean;
  /** Allow empty thinking blocks */
  allowEmptyThinking?: boolean;
  /** Auto-fix order violations */
  autoFix?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<ThinkingBlockValidatorOptions> = {
  injectSynthetic: true,
  defaultThinkingContent: "[Continuing from previous reasoning]",
  requireThinkingFirst: true,
  allowEmptyThinking: false,
  autoFix: true,
  debug: false,
};

/**
 * Message part structure
 */
export interface MessagePart {
  type: string;
  id?: string;
  text?: string;
  thinking?: string;
  messageId?: string;
  sessionId?: string;
  synthetic?: boolean;
  [key: string]: unknown;
}

/**
 * Message with parts
 */
export interface MessageWithParts {
  id: string;
  role: "user" | "assistant" | "system";
  parts?: MessagePart[];
  content?: MessagePart[];
  modelId?: string;
  [key: string]: unknown;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fixed?: boolean;
  fixedParts?: MessagePart[];
}

/**
 * Check if a model has extended thinking enabled
 */
export function isExtendedThinkingModel(modelId: string): boolean {
  if (!modelId) return false;
  const lower = modelId.toLowerCase();

  // Check for explicit thinking/high variants (always enabled)
  if (lower.includes("thinking") || lower.endsWith("-high")) {
    return true;
  }

  // Check for thinking-capable models
  return THINKING_CAPABLE_MODELS.some((model) => lower.includes(model));
}

/**
 * Check if a part is a thinking part
 */
export function isThinkingPart(part: MessagePart): boolean {
  return THINKING_TYPES.includes(part.type as typeof THINKING_TYPES[number]);
}

/**
 * Check if a part is a content part (non-thinking)
 */
export function isContentPart(part: MessagePart): boolean {
  return CONTENT_TYPES.includes(part.type as typeof CONTENT_TYPES[number]);
}

/**
 * Check if a message has any content parts
 */
export function hasContentParts(parts: MessagePart[]): boolean {
  if (!parts || parts.length === 0) return false;
  return parts.some(isContentPart);
}

/**
 * Check if a message starts with a thinking block
 */
export function startsWithThinkingBlock(parts: MessagePart[]): boolean {
  if (!parts || parts.length === 0) return false;
  return isThinkingPart(parts[0]);
}

/**
 * Find thinking content from previous messages
 */
export function findPreviousThinkingContent(
  messages: MessageWithParts[],
  currentIndex: number
): string {
  // Search backwards from current message
  for (let i = currentIndex - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;

    const parts = msg.parts || msg.content;
    if (!parts) continue;

    // Look for thinking parts
    for (const part of parts) {
      if (isThinkingPart(part)) {
        const thinking = part.thinking || part.text;
        if (thinking && typeof thinking === "string" && thinking.trim().length > 0) {
          return thinking;
        }
      }
    }
  }

  return "";
}

/**
 * Create a synthetic thinking part
 */
export function createSyntheticThinkingPart(
  thinkingContent: string,
  messageId?: string,
  sessionId?: string
): MessagePart {
  return {
    type: "thinking",
    id: `prt_synthetic_${Date.now()}`,
    thinking: thinkingContent,
    messageId,
    sessionId,
    synthetic: true,
  };
}

/**
 * Prepend thinking block to message parts
 */
export function prependThinkingBlock(
  parts: MessagePart[],
  thinkingContent: string,
  messageId?: string,
  sessionId?: string
): MessagePart[] {
  const thinkingPart = createSyntheticThinkingPart(
    thinkingContent,
    messageId,
    sessionId
  );
  return [thinkingPart, ...parts];
}

/**
 * Validate thinking block structure
 */
export function validateThinkingBlocks(
  parts: MessagePart[],
  options: Required<ThinkingBlockValidatorOptions>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let valid = true;

  if (!parts || parts.length === 0) {
    return { valid: true, errors: [], warnings: [] };
  }

  const thinkingParts = parts.filter(isThinkingPart);
  const contentParts = parts.filter(isContentPart);

  // Check if thinking block is first (when required and has content)
  if (options.requireThinkingFirst && contentParts.length > 0 && thinkingParts.length > 0) {
    if (!isThinkingPart(parts[0])) {
      errors.push("Thinking block must be at the beginning of the message");
      valid = false;
    }
  }

  // Check for content without thinking (potential API error)
  if (options.requireThinkingFirst && contentParts.length > 0 && thinkingParts.length === 0) {
    errors.push("Message has content but no thinking block - may cause API error");
    valid = false;
  }

  // Check for empty thinking blocks
  if (!options.allowEmptyThinking) {
    for (const part of thinkingParts) {
      const content = part.thinking || part.text || "";
      if (content.trim() === "") {
        warnings.push(`Empty thinking block found (type: ${part.type})`);
      }
    }
  }

  // Check for thinking blocks after content (order violation)
  let foundContent = false;
  for (const part of parts) {
    if (isContentPart(part)) {
      foundContent = true;
    } else if (isThinkingPart(part) && foundContent) {
      errors.push("Thinking blocks cannot appear after content blocks");
      valid = false;
      break;
    }
  }

  return { valid, errors, warnings };
}

/**
 * Fix thinking block order
 */
export function fixThinkingBlockOrder(parts: MessagePart[]): MessagePart[] {
  const thinkingParts = parts.filter(isThinkingPart);
  const nonThinkingParts = parts.filter((p) => !isThinkingPart(p));

  // Put thinking blocks first
  return [...thinkingParts, ...nonThinkingParts];
}

/**
 * Create thinking block validator hook
 */
export function createThinkingBlockValidatorHook(
  options: ThinkingBlockValidatorOptions = {}
): Hook {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options } as Required<ThinkingBlockValidatorOptions>;

  return {
    name: "thinking-block-validator",
    description: "Validates and fixes thinking block structure proactively",
    events: ["message.before", "message.after"],
    priority: 85,

    async handler(context: HookContext): Promise<HookResult | void> {
      const { event, data } = context;

      if (!data) return;

      const messageData = data as {
        parts?: MessagePart[];
        content?: MessagePart[];
        modelId?: string;
        messages?: MessageWithParts[];
        messageIndex?: number;
        id?: string;
        sessionId?: string;
      };

      // Get model ID to check if extended thinking is enabled
      const modelId = messageData.modelId || "";

      // Skip validation for non-thinking models
      if (modelId && !isExtendedThinkingModel(modelId)) {
        if (mergedOptions.debug) {
          logger.debug(`[thinking-block-validator] Skipping non-thinking model: ${modelId}`);
        }
        return;
      }

      // Extract parts
      let parts: MessagePart[] = [];
      if (messageData.parts && Array.isArray(messageData.parts)) {
        parts = messageData.parts;
      } else if (messageData.content && Array.isArray(messageData.content)) {
        parts = messageData.content;
      }

      if (parts.length === 0) {
        return;
      }

      // Validate
      const result = validateThinkingBlocks(parts, mergedOptions);

      // Log warnings
      for (const warning of result.warnings) {
        if (mergedOptions.debug) {
          logger.debug(`[thinking-block-validator] Warning: ${warning}`);
        }
      }

      // Handle errors
      if (!result.valid) {
        for (const error of result.errors) {
          if (mergedOptions.debug) {
            logger.warn(`[thinking-block-validator] Error: ${error}`);
          }
        }

        // Auto-fix if enabled and before message send
        if (mergedOptions.autoFix && event === "message.before") {
          let fixedParts = parts;

          // Check if we need to inject synthetic thinking block
          if (
            mergedOptions.injectSynthetic &&
            hasContentParts(parts) &&
            !startsWithThinkingBlock(parts)
          ) {
            // Try to find previous thinking content
            let thinkingContent = mergedOptions.defaultThinkingContent;

            if (messageData.messages && messageData.messageIndex !== undefined) {
              const previousThinking = findPreviousThinkingContent(
                messageData.messages,
                messageData.messageIndex
              );
              if (previousThinking) {
                thinkingContent = previousThinking;
              }
            }

            // Prepend thinking block
            fixedParts = prependThinkingBlock(
              parts,
              thinkingContent,
              messageData.id,
              messageData.sessionId
            );

            if (mergedOptions.debug) {
              logger.debug(
                `[thinking-block-validator] Injected synthetic thinking block`
              );
            }
          } else {
            // Just fix the order
            fixedParts = fixThinkingBlockOrder(parts);

            if (mergedOptions.debug) {
              logger.debug(`[thinking-block-validator] Fixed thinking block order`);
            }
          }

          return {
            continue: true,
            modified: {
              ...messageData,
              parts: fixedParts,
              content: fixedParts,
              _thinkingBlocksFixed: true,
              _syntheticInjected: mergedOptions.injectSynthetic,
            },
          };
        }

        // Return error context
        return {
          continue: true,
          context: result.errors.map((e) => `Thinking block: ${e}`),
        };
      }

      return;
    },
  };
}

/**
 * Validate parts externally
 */
export function validateParts(
  parts: MessagePart[],
  options: ThinkingBlockValidatorOptions = {}
): ValidationResult {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options } as Required<ThinkingBlockValidatorOptions>;
  return validateThinkingBlocks(parts, mergedOptions);
}

/**
 * Fix parts externally
 */
export function fixParts(parts: MessagePart[]): MessagePart[] {
  return fixThinkingBlockOrder(parts);
}

