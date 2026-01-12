/**
 * Auto Slash Command Hook
 * Detects slash commands and executes predefined templates.
 */

import type { Hook, HookContext, HookResult } from "./types";

export interface SlashCommand {
  /** Command name (without slash) */
  name: string;
  /** Command description */
  description: string;
  /** Template to execute */
  template: string;
  /** Arguments pattern */
  argsPattern?: RegExp;
  /** Aliases */
  aliases?: string[];
}

export interface AutoSlashCommandOptions {
  /** Custom commands */
  commands?: SlashCommand[];
  /** Prefix for commands (default: /) */
  prefix?: string;
  /** Debug mode */
  debug?: boolean;
}

const DEFAULT_COMMANDS: SlashCommand[] = [
  {
    name: "plan",
    description: "Create a detailed implementation plan",
    template: `Create a detailed implementation plan for the following task. Include:
1. Objectives and success criteria
2. Step-by-step implementation tasks
3. Files that will be created or modified
4. Potential risks and mitigations
5. Testing approach

Task: {args}`,
    aliases: ["planning"],
  },
  {
    name: "review",
    description: "Review code changes",
    template: `Review the following code changes for:
1. Code quality and best practices
2. Potential bugs or issues
3. Performance considerations
4. Security implications
5. Suggestions for improvement

{args}`,
    aliases: ["code-review", "cr"],
  },
  {
    name: "test",
    description: "Run tests and analyze results",
    template: `Run the test suite and analyze the results:
1. Execute all relevant tests
2. Report any failures with details
3. Suggest fixes for failing tests
4. Check test coverage if available

{args}`,
    aliases: ["tests"],
  },
  {
    name: "fix",
    description: "Fix an issue or bug",
    template: `Fix the following issue:
1. Analyze the problem
2. Identify the root cause
3. Implement a solution
4. Verify the fix works
5. Ensure no regressions

Issue: {args}`,
    aliases: ["bugfix", "solve"],
  },
  {
    name: "explain",
    description: "Explain code or concept",
    template: `Explain the following in detail:
1. What it does
2. How it works
3. Key components and their interactions
4. Any important considerations

{args}`,
    aliases: ["describe", "what"],
  },
  {
    name: "refactor",
    description: "Refactor code",
    template: `Refactor the following code:
1. Identify improvement opportunities
2. Apply clean code principles
3. Improve readability and maintainability
4. Preserve existing functionality
5. Add comments where helpful

{args}`,
    aliases: ["improve", "cleanup"],
  },
];

/**
 * Parse a slash command from message
 */
function parseSlashCommand(
  message: string,
  commands: SlashCommand[],
  prefix: string
): { command: SlashCommand; args: string } | null {
  const trimmed = message.trim();

  if (!trimmed.startsWith(prefix)) {
    return null;
  }

  const withoutPrefix = trimmed.slice(prefix.length);
  const spaceIndex = withoutPrefix.indexOf(" ");
  const commandName = spaceIndex === -1
    ? withoutPrefix.toLowerCase()
    : withoutPrefix.slice(0, spaceIndex).toLowerCase();
  const args = spaceIndex === -1
    ? ""
    : withoutPrefix.slice(spaceIndex + 1).trim();

  // Find matching command
  for (const command of commands) {
    if (
      command.name === commandName ||
      command.aliases?.includes(commandName)
    ) {
      return { command, args };
    }
  }

  return null;
}

/**
 * Create auto slash command hook
 */
export function createAutoSlashCommandHook(
  options: AutoSlashCommandOptions = {}
): Hook {
  const {
    commands = DEFAULT_COMMANDS,
    prefix = "/",
    debug = false,
  } = options;

  return {
    name: "auto-slash-command",
    description: "Detects slash commands and executes predefined templates",
    events: ["message.before"],

    async handler(context: HookContext): Promise<HookResult> {
      const { message } = context;

      if (!message || typeof message !== "string") {
        return { action: "continue" };
      }

      const parsed = parseSlashCommand(message, commands, prefix);

      if (!parsed) {
        return { action: "continue" };
      }

      if (debug) {
        console.log(`[auto-slash-command] Executing command: ${parsed.command.name}`);
      }

      // Replace {args} in template
      const expandedTemplate = parsed.command.template.replace(
        /\{args\}/g,
        parsed.args || "(no additional context provided)"
      );

      return {
        action: "continue",
        modified: true,
        replaceMessage: expandedTemplate,
      };
    },
  };
}

/**
 * Get all available slash commands
 */
export function getAvailableSlashCommands(
  customCommands?: SlashCommand[]
): SlashCommand[] {
  return [...DEFAULT_COMMANDS, ...(customCommands || [])];
}

/**
 * Create a custom slash command
 */
export function createSlashCommand(
  name: string,
  description: string,
  template: string,
  aliases?: string[]
): SlashCommand {
  return { name, description, template, aliases };
}
