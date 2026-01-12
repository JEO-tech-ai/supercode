/**
 * Non-Interactive Environment Hook
 * Ensures commands run non-interactively.
 */

import type { Hook, HookContext, HookResult } from "./types";

export interface NonInteractiveEnvOptions {
  /** Environment variables to set */
  envVars?: Record<string, string>;
  /** Commands to modify */
  targetCommands?: string[];
  /** Debug mode */
  debug?: boolean;
}

const DEFAULT_ENV_VARS: Record<string, string> = {
  GIT_EDITOR: ":",
  GIT_PAGER: "cat",
  EDITOR: "cat",
  VISUAL: "cat",
  PAGER: "cat",
  GIT_TERMINAL_PROMPT: "0",
  NPM_CONFIG_YES: "true",
  CI: "true",
};

const DEFAULT_TARGET_COMMANDS = [
  "git",
  "npm",
  "yarn",
  "pnpm",
  "bun",
  "pip",
  "cargo",
  "go",
];

/**
 * Check if command is a target command
 */
function isTargetCommand(command: string, targets: string[]): boolean {
  const lowerCommand = command.toLowerCase().trim();
  return targets.some((target) =>
    lowerCommand.startsWith(target.toLowerCase())
  );
}

/**
 * Modify command to run non-interactively
 */
function makeNonInteractive(
  command: string,
  envVars: Record<string, string>
): string {
  // Build env prefix
  const envPrefix = Object.entries(envVars)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");

  // Check if command already has env vars
  if (command.includes("GIT_EDITOR=") || command.includes("CI=")) {
    return command;
  }

  return `${envPrefix} ${command}`;
}

/**
 * Create non-interactive environment hook
 */
export function createNonInteractiveEnvHook(
  options: NonInteractiveEnvOptions = {}
): Hook {
  const {
    envVars = DEFAULT_ENV_VARS,
    targetCommands = DEFAULT_TARGET_COMMANDS,
    debug = false,
  } = options;

  return {
    name: "non-interactive-env",
    description: "Ensures commands run non-interactively",
    events: ["tool.before"],

    async handler(context: HookContext): Promise<HookResult> {
      const { toolName, toolArgs } = context;

      // Only modify bash/command tools
      if (toolName !== "bash" && toolName !== "Bash") {
        return { action: "continue" };
      }

      const args = toolArgs as Record<string, unknown>;
      const command = args?.command as string;

      if (!command || typeof command !== "string") {
        return { action: "continue" };
      }

      // Check if this is a target command
      if (!isTargetCommand(command, targetCommands)) {
        return { action: "continue" };
      }

      // Make command non-interactive
      const modifiedCommand = makeNonInteractive(command, envVars);

      if (debug) {
        console.log(`[non-interactive-env] Modified: ${command}`);
        console.log(`[non-interactive-env] To: ${modifiedCommand}`);
      }

      return {
        action: "continue",
        modified: true,
        modifiedArgs: {
          ...args,
          command: modifiedCommand,
        },
      };
    },
  };
}

/**
 * Get default environment variables
 */
export function getDefaultEnvVars(): Record<string, string> {
  return { ...DEFAULT_ENV_VARS };
}

/**
 * Get default target commands
 */
export function getDefaultTargetCommands(): string[] {
  return [...DEFAULT_TARGET_COMMANDS];
}
