/**
 * Thinking Block Validator Hook
 * Validates thinking block structure and order in messages.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "./types";
import logger from "../../shared/logger";

/**
 * Validator options
 */
export interface ThinkingBlockValidatorOptions {
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
const DEFAULT_OPTIONS: ThinkingBlockValidatorOptions = {
  requireThinkingFirst: true,
  allowEmptyThinking: false,
  autoFix: true,
  debug: false,
};

/**
 * Thinking part types
 */
const THINKING_TYPES = ["thinking", "redacted_thinking", "reasoning"];

/**
 * Message part structure
 */
interface MessagePart {
  type: string;
  text?: string;
  thinking?: string;
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
 * Validate thinking block structure
 */
function validateThinkingBlocks(
  parts: MessagePart[],
  options: Required<ThinkingBlockValidatorOptions>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let valid = true;

  if (parts.length === 0) {
    return { valid: true, errors: [], warnings: [] };
  }

  const thinkingParts = parts.filter((p) => THINKING_TYPES.includes(p.type));
  const nonThinkingParts = parts.filter((p) => !THINKING_TYPES.includes(p.type));

  // Check if thinking block is first (when required)
  if (options.requireThinkingFirst && thinkingParts.length > 0) {
    const firstPart = parts[0];
    if (!THINKING_TYPES.includes(firstPart.type)) {
      errors.push("Thinking block must be at the beginning of the message");
      valid = false;
    }
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
  let foundNonThinking = false;
  for (const part of parts) {
    if (!THINKING_TYPES.includes(part.type)) {
      foundNonThinking = true;
    } else if (foundNonThinking) {
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
function fixThinkingBlockOrder(parts: MessagePart[]): MessagePart[] {
  const thinkingParts = parts.filter((p) => THINKING_TYPES.includes(p.type));
  const nonThinkingParts = parts.filter((p) => !THINKING_TYPES.includes(p.type));

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
    description: "Validates thinking block structure and order",
    events: ["message.before", "message.after"],
    priority: 85,

    async handler(context: HookContext): Promise<HookResult | void> {
      const { sessionId, event, data } = context;

      if (!data) return;

      const messageData = data as {
        parts?: MessagePart[];
        content?: unknown;
      };

      // Extract parts
      let parts: MessagePart[] = [];
      if (messageData.parts && Array.isArray(messageData.parts)) {
        parts = messageData.parts;
      } else if (messageData.content && Array.isArray(messageData.content)) {
        parts = messageData.content as MessagePart[];
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
          logger.warn(`[thinking-block-validator] Error: ${error}`);
        }

        // Auto-fix if enabled and before message send
        if (mergedOptions.autoFix && event === "message.before") {
          const fixedParts = fixThinkingBlockOrder(parts);

          if (mergedOptions.debug) {
            logger.debug(`[thinking-block-validator] Auto-fixed thinking block order`);
          }

          return {
            continue: true,
            modified: {
              ...messageData,
              parts: fixedParts,
              _thinkingBlocksFixed: true,
            },
          };
        }

        // Return error context
        return {
          continue: true,
          context: result.errors.map((e) => `⚠️ Thinking block: ${e}`),
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

export type { ThinkingBlockValidatorOptions, ValidationResult };
