/**
 * Slash Command System
 * Extensible slash command system for SuperCode
 */

// Types
export type {
  SlashCommand,
  SlashCommandHandler,
  SlashCommandContext,
  SlashCommandResult,
  SlashCommandCategory,
  SlashCommandRegistryEvents,
  ParsedSlashCommand,
  SlashCommandSuggestion,
} from "./types";

// Registry
export {
  SlashCommandRegistry,
  getSlashCommandRegistry,
  resetSlashCommandRegistry,
} from "./registry";

// Built-in commands
export {
  registerBuiltinCommands,
  BUILTIN_COMMANDS,
} from "./builtin";
