/**
 * Slash Command Types
 * Type definitions for the slash command system
 */

import type { Skill } from "../skill/types";

/**
 * Slash command definition
 */
export interface SlashCommand {
  /** Command name (without /) */
  name: string;
  /** Short description */
  description: string;
  /** Argument hint for display */
  argumentHint?: string;
  /** Command category */
  category: SlashCommandCategory;
  /** Handler function */
  handler: SlashCommandHandler;
  /** Whether command is enabled */
  enabled?: boolean;
  /** Associated skill (if skill-based) */
  skill?: Skill;
  /** Aliases for this command */
  aliases?: string[];
  /** Whether to show in command palette */
  showInPalette?: boolean;
  /** Priority for sorting */
  priority?: number;
}

/**
 * Slash command handler function
 */
export type SlashCommandHandler = (
  args: string,
  context: SlashCommandContext
) => Promise<SlashCommandResult>;

/**
 * Slash command execution context
 */
export interface SlashCommandContext {
  /** Current session ID */
  sessionId: string;
  /** Current working directory */
  cwd: string;
  /** Full command input */
  input: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** User metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Slash command execution result
 */
export interface SlashCommandResult {
  /** Whether command succeeded */
  success: boolean;
  /** Output message */
  output?: string;
  /** Prompt to inject */
  prompt?: string;
  /** Error if failed */
  error?: Error;
  /** Whether to continue conversation */
  continue?: boolean;
  /** Custom data */
  data?: unknown;
}

/**
 * Slash command category
 */
export type SlashCommandCategory =
  | "skill"       // Skill-based commands
  | "workflow"    // Workflow commands
  | "navigation"  // Navigation commands
  | "session"     // Session management
  | "settings"    // Configuration
  | "help"        // Help and info
  | "custom";     // Custom commands

/**
 * Slash command registry events
 */
export interface SlashCommandRegistryEvents {
  "command:registered": { command: SlashCommand };
  "command:unregistered": { name: string };
  "command:executed": { name: string; result: SlashCommandResult };
  "command:error": { name: string; error: Error };
}

/**
 * Parsed slash command input
 */
export interface ParsedSlashCommand {
  /** Command name (without /) */
  command: string;
  /** Arguments after command */
  args: string;
  /** Full original input */
  raw: string;
}

/**
 * Slash command suggestion
 */
export interface SlashCommandSuggestion {
  /** Command name */
  name: string;
  /** Description */
  description: string;
  /** Category */
  category: SlashCommandCategory;
  /** Match score (0-1) */
  score: number;
}
