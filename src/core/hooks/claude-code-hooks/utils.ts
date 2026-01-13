import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { ClaudeHooksConfig, HookMatcher, HookResult } from "./types";

const DEFAULT_ZSH_PATHS = ["/bin/zsh", "/usr/bin/zsh", "/usr/local/bin/zsh"];
const DEFAULT_BASH_PATHS = ["/bin/bash", "/usr/bin/bash", "/usr/local/bin/bash"];
const isWindows = process.platform === "win32";

export const DEFAULT_SHELL_CONFIG = {
  forceZsh: !isWindows,
  zshPath: "/bin/zsh",
};

function getHomeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || homedir();
}

function findShellPath(
  defaultPaths: string[],
  customPath?: string
): string | null {
  if (customPath && existsSync(customPath)) {
    return customPath;
  }
  for (const path of defaultPaths) {
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

function findZshPath(customZshPath?: string): string | null {
  return findShellPath(DEFAULT_ZSH_PATHS, customZshPath);
}

function findBashPath(): string | null {
  return findShellPath(DEFAULT_BASH_PATHS);
}

export interface ExecuteHookOptions {
  forceZsh?: boolean;
  zshPath?: string;
}

export async function executeHookCommand(
  command: string,
  stdin: string,
  cwd: string,
  options?: ExecuteHookOptions
): Promise<HookResult> {
  const home = getHomeDir();

  const expandedCommand = command
    .replace(/^~(?=\/|$)/g, home)
    .replace(/\s~(?=\/)/g, ` ${home}`)
    .replace(/\$CLAUDE_PROJECT_DIR/g, cwd)
    .replace(/\$\{CLAUDE_PROJECT_DIR\}/g, cwd);

  let finalCommand = expandedCommand;

  if (options?.forceZsh) {
    const zshPath = findZshPath(options.zshPath);
    const escapedCommand = expandedCommand.replace(/'/g, "'\\''");
    if (zshPath) {
      finalCommand = `${zshPath} -lc '${escapedCommand}'`;
    } else {
      const bashPath = findBashPath();
      if (bashPath) {
        finalCommand = `${bashPath} -lc '${escapedCommand}'`;
      }
    }
  }

  return new Promise((resolve) => {
    const proc = spawn(finalCommand, {
      cwd,
      shell: true,
      env: { ...process.env, HOME: home, CLAUDE_PROJECT_DIR: cwd },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.stdin?.write(stdin);
    proc.stdin?.end();

    proc.on("close", (code) => {
      resolve({
        exitCode: code ?? 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });

    proc.on("error", (err) => {
      resolve({
        exitCode: 1,
        stderr: err.message,
      });
    });
  });
}

export function matchesToolMatcher(toolName: string, matcher: string): boolean {
  if (!matcher) {
    return true;
  }
  const patterns = matcher.split("|").map((p) => p.trim());
  return patterns.some((p) => {
    if (p.includes("*")) {
      const regex = new RegExp(`^${p.replace(/\*/g, ".*")}$`, "i");
      return regex.test(toolName);
    }
    return p.toLowerCase() === toolName.toLowerCase();
  });
}

export function findMatchingHooks(
  config: ClaudeHooksConfig,
  eventName: keyof ClaudeHooksConfig,
  toolName?: string
): HookMatcher[] {
  const hookMatchers = config[eventName];
  if (!hookMatchers) return [];

  return hookMatchers.filter((hookMatcher) => {
    if (!toolName) return true;
    return matchesToolMatcher(toolName, hookMatcher.matcher);
  });
}

const SPECIAL_TOOL_MAPPINGS: Record<string, string> = {
  webfetch: "WebFetch",
  websearch: "WebSearch",
  todoread: "TodoRead",
  todowrite: "TodoWrite",
};

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

export function transformToolName(toolName: string): string {
  const lower = toolName.toLowerCase();
  if (lower in SPECIAL_TOOL_MAPPINGS) {
    return SPECIAL_TOOL_MAPPINGS[lower];
  }

  if (toolName.includes("-") || toolName.includes("_")) {
    return toPascalCase(toolName);
  }

  return toolName.charAt(0).toUpperCase() + toolName.slice(1);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function objectToSnakeCase(
  obj: Record<string, unknown>,
  deep: boolean = true
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    if (deep && isPlainObject(value)) {
      result[snakeKey] = objectToSnakeCase(value, true);
    } else if (deep && Array.isArray(value)) {
      result[snakeKey] = value.map((item) =>
        isPlainObject(item) ? objectToSnakeCase(item, true) : item
      );
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
}

export function isHookDisabled(
  disabledHooks: boolean | string[] | undefined,
  hookName: string
): boolean {
  if (disabledHooks === true) {
    return true;
  }
  if (Array.isArray(disabledHooks)) {
    return disabledHooks.includes(hookName);
  }
  return false;
}
