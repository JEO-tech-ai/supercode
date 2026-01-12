/**
 * Session Recovery Constants
 * Storage paths and type definitions for session recovery.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * SuperCode storage directory
 */
export const SUPERCODE_STORAGE = join(homedir(), ".supercode");

/**
 * Message storage directory
 */
export const MESSAGE_STORAGE = join(SUPERCODE_STORAGE, "sessions", "messages");

/**
 * Part storage directory
 */
export const PART_STORAGE = join(SUPERCODE_STORAGE, "sessions", "parts");

/**
 * Thinking part types that should appear first in messages
 */
export const THINKING_TYPES = new Set([
  "thinking",
  "redacted_thinking",
  "reasoning",
]);

/**
 * Meta part types (step markers, etc.)
 */
export const META_TYPES = new Set(["step-start", "step-finish"]);

/**
 * Content part types
 */
export const CONTENT_TYPES = new Set([
  "text",
  "tool",
  "tool_use",
  "tool_result",
]);

/**
 * Recovery resume text placeholder
 */
export const RECOVERY_RESUME_TEXT = "[session recovered - continuing previous task]";

/**
 * Placeholder text for user interrupted
 */
export const PLACEHOLDER_TEXT = "[user interrupted]";

/**
 * Max recovery attempts per session
 */
export const MAX_RECOVERY_ATTEMPTS = 3;

/**
 * Recovery cooldown in milliseconds
 */
export const RECOVERY_COOLDOWN_MS = 1000;

/**
 * Resume delay in milliseconds
 */
export const RESUME_DELAY_MS = 500;
