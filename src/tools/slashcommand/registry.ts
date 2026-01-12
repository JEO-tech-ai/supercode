/**
 * Slash Command Registry
 * Central registry for all slash commands
 */

import { EventEmitter } from "events";
import type {
  SlashCommand,
  SlashCommandCategory,
  SlashCommandContext,
  SlashCommandResult,
  SlashCommandRegistryEvents,
  ParsedSlashCommand,
  SlashCommandSuggestion,
} from "./types";
import { getSkillLoader, type Skill } from "../skill";
import { koreanFuzzyMatch } from "../../tui/hooks/useComposition";

/**
 * Slash Command Registry
 */
export class SlashCommandRegistry extends EventEmitter {
  private commands = new Map<string, SlashCommand>();
  private aliases = new Map<string, string>(); // alias -> command name
  private skillCommandsLoaded = false;

  /**
   * Register a slash command
   */
  register(command: SlashCommand): () => void {
    // Validate
    if (this.commands.has(command.name)) {
      console.warn(`Command /${command.name} already registered, overwriting`);
    }

    // Register command
    this.commands.set(command.name, {
      ...command,
      enabled: command.enabled ?? true,
    });

    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias, command.name);
      }
    }

    this.emit("command:registered", { command });

    // Return unregister function
    return () => this.unregister(command.name);
  }

  /**
   * Unregister a slash command
   */
  unregister(name: string): boolean {
    const command = this.commands.get(name);
    if (!command) return false;

    // Remove aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.delete(alias);
      }
    }

    this.commands.delete(name);
    this.emit("command:unregistered", { name });

    return true;
  }

  /**
   * Get a command by name or alias
   */
  get(name: string): SlashCommand | undefined {
    // Direct lookup
    const command = this.commands.get(name);
    if (command) return command;

    // Alias lookup
    const aliasTarget = this.aliases.get(name);
    if (aliasTarget) {
      return this.commands.get(aliasTarget);
    }

    return undefined;
  }

  /**
   * Check if command exists
   */
  has(name: string): boolean {
    return this.commands.has(name) || this.aliases.has(name);
  }

  /**
   * Get all commands
   */
  getAll(): SlashCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands by category
   */
  getByCategory(category: SlashCommandCategory): SlashCommand[] {
    return Array.from(this.commands.values()).filter(
      (cmd) => cmd.category === category
    );
  }

  /**
   * Parse a slash command input
   */
  parse(input: string): ParsedSlashCommand | null {
    const trimmed = input.trim();

    // Must start with /
    if (!trimmed.startsWith("/")) {
      return null;
    }

    // Extract command and args
    const match = trimmed.match(/^\/(\S+)(?:\s+(.*))?$/);
    if (!match) {
      return null;
    }

    return {
      command: match[1].toLowerCase(),
      args: match[2]?.trim() || "",
      raw: trimmed,
    };
  }

  /**
   * Execute a slash command
   */
  async execute(
    input: string,
    context: SlashCommandContext
  ): Promise<SlashCommandResult> {
    const parsed = this.parse(input);

    if (!parsed) {
      return {
        success: false,
        error: new Error("Invalid slash command format"),
      };
    }

    const command = this.get(parsed.command);

    if (!command) {
      return {
        success: false,
        error: new Error(`Unknown command: /${parsed.command}`),
        output: this.getSuggestionMessage(parsed.command),
      };
    }

    if (!command.enabled) {
      return {
        success: false,
        error: new Error(`Command /${parsed.command} is disabled`),
      };
    }

    try {
      const result = await command.handler(parsed.args, context);
      this.emit("command:executed", { name: parsed.command, result });
      return result;
    } catch (error) {
      const err = error as Error;
      this.emit("command:error", { name: parsed.command, error: err });
      return {
        success: false,
        error: err,
      };
    }
  }

  /**
   * Search for commands
   */
  search(query: string): SlashCommandSuggestion[] {
    const lowerQuery = query.toLowerCase();
    const suggestions: SlashCommandSuggestion[] = [];

    for (const command of this.commands.values()) {
      if (!command.enabled) continue;

      // Calculate match score
      let score = 0;

      // Exact match
      if (command.name === lowerQuery) {
        score = 1;
      }
      // Starts with
      else if (command.name.startsWith(lowerQuery)) {
        score = 0.9;
      }
      // Contains
      else if (command.name.includes(lowerQuery)) {
        score = 0.7;
      }
      // Description match
      else if (command.description.toLowerCase().includes(lowerQuery)) {
        score = 0.5;
      }
      // Korean fuzzy match
      else if (koreanFuzzyMatch(command.name, query)) {
        score = 0.6;
      }
      // Check aliases
      else if (command.aliases?.some((a) => a.includes(lowerQuery))) {
        score = 0.8;
      }

      if (score > 0) {
        suggestions.push({
          name: command.name,
          description: command.description,
          category: command.category,
          score,
        });
      }
    }

    // Sort by score descending
    suggestions.sort((a, b) => b.score - a.score);

    return suggestions;
  }

  /**
   * Load skill-based commands
   */
  async loadSkillCommands(): Promise<void> {
    if (this.skillCommandsLoaded) return;

    const loader = getSkillLoader();
    const skills = await loader.loadAll();

    for (const skill of skills) {
      this.registerSkillCommand(skill);
    }

    this.skillCommandsLoaded = true;
  }

  /**
   * Register a skill as a slash command
   */
  registerSkillCommand(skill: Skill): void {
    const handler = async (
      args: string,
      context: SlashCommandContext
    ): Promise<SlashCommandResult> => {
      // Build skill execution prompt
      const prompt = `<skill-invocation>
<skill-id>${skill.id}</skill-id>
<skill-name>${skill.name}</skill-name>
<description>${skill.frontmatter.description}</description>
<agent>${skill.frontmatter.agent || "cent"}</agent>
${args ? `<arguments>${args}</arguments>` : ""}

<instruction>
${skill.instruction}
</instruction>
</skill-invocation>

Execute this skill following the instruction above.`;

      return {
        success: true,
        prompt,
        continue: true,
      };
    };

    this.register({
      name: skill.id,
      description: skill.frontmatter.description,
      argumentHint: skill.frontmatter.argumentHint,
      category: "skill",
      handler,
      skill,
      showInPalette: true,
      priority: skill.frontmatter.priority || 0,
    });
  }

  /**
   * Get suggestion message for unknown command
   */
  private getSuggestionMessage(command: string): string {
    const suggestions = this.search(command).slice(0, 3);

    if (suggestions.length === 0) {
      return `Unknown command. Type / to see available commands.`;
    }

    const suggestionList = suggestions
      .map((s) => `  /${s.name} - ${s.description}`)
      .join("\n");

    return `Unknown command: /${command}\n\nDid you mean:\n${suggestionList}`;
  }

  /**
   * Clear all commands
   */
  clear(): void {
    this.commands.clear();
    this.aliases.clear();
    this.skillCommandsLoaded = false;
  }

  /**
   * Get command count
   */
  get size(): number {
    return this.commands.size;
  }
}

/**
 * Global slash command registry
 */
let globalRegistry: SlashCommandRegistry | null = null;

/**
 * Get the global slash command registry
 */
export function getSlashCommandRegistry(): SlashCommandRegistry {
  if (!globalRegistry) {
    globalRegistry = new SlashCommandRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global registry
 */
export function resetSlashCommandRegistry(): void {
  globalRegistry = null;
}
