/**
 * Plugin Context Factory
 * Creates and manages PluginContext instances for plugin execution.
 */

import { spawn } from "child_process";
import type {
  PluginContext,
  PluginClient,
  ProjectMetadata,
  ShellInterface,
  ShellPromise,
  ShellOutput,
} from "./types";
import { getPermissionManager, type IPermissionManager } from "../core/permission";
import logger from "../shared/logger";

// =============================================================================
// Shell Implementation
// =============================================================================

/**
 * Create a shell output object from child process result
 */
function createShellOutput(
  stdout: Buffer,
  stderr: Buffer,
  exitCode: number
): ShellOutput {
  return {
    stdout,
    stderr,
    exitCode,
    text(encoding: BufferEncoding = "utf-8") {
      return stdout.toString(encoding);
    },
    json() {
      return JSON.parse(stdout.toString("utf-8"));
    },
  };
}

/**
 * Escape shell argument
 */
function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Create a shell interface for plugin use
 */
function createShellInterface(
  cwd: string,
  env: Record<string, string | undefined> = {},
  throwOnError = true
): ShellInterface {
  const executeCommand = (
    command: string,
    options: {
      cwd?: string;
      env?: Record<string, string>;
      quiet?: boolean;
      nothrow?: boolean;
    } = {}
  ): ShellPromise => {
    const finalCwd = options.cwd ?? cwd;
    const finalEnv = { ...process.env, ...env, ...options.env };
    const shouldThrow = throwOnError && !options.nothrow;

    const promise = new Promise<ShellOutput>((resolve, reject) => {
      const child = spawn("sh", ["-c", command], {
        cwd: finalCwd,
        env: finalEnv as Record<string, string>,
        stdio: options.quiet ? "pipe" : ["pipe", "pipe", "pipe"],
      });

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      child.stdout?.on("data", (chunk) => stdoutChunks.push(chunk));
      child.stderr?.on("data", (chunk) => stderrChunks.push(chunk));

      child.on("close", (code) => {
        const stdout = Buffer.concat(stdoutChunks);
        const stderr = Buffer.concat(stderrChunks);
        const exitCode = code ?? 0;

        if (shouldThrow && exitCode !== 0) {
          const error = new Error(
            `Command failed with exit code ${exitCode}: ${stderr.toString()}`
          );
          (error as Error & { exitCode: number }).exitCode = exitCode;
          reject(error);
        } else {
          resolve(createShellOutput(stdout, stderr, exitCode));
        }
      });

      child.on("error", reject);
    }) as ShellPromise;

    // Add chainable methods
    (promise as ShellPromise).cwd = function (newCwd: string) {
      return executeCommand(command, { ...options, cwd: newCwd });
    };

    (promise as ShellPromise).env = function (newEnv: Record<string, string>) {
      return executeCommand(command, { ...options, env: { ...options.env, ...newEnv } });
    };

    (promise as ShellPromise).quiet = function () {
      return executeCommand(command, { ...options, quiet: true });
    };

    (promise as ShellPromise).nothrow = function () {
      return executeCommand(command, { ...options, nothrow: true });
    };

    (promise as ShellPromise).text = async function (encoding: BufferEncoding = "utf-8") {
      const result = await promise;
      return result.text(encoding);
    };

    (promise as ShellPromise).json = async function () {
      const result = await promise;
      return result.json();
    };

    (promise as ShellPromise).lines = async function* () {
      const result = await promise;
      const lines = result.text().split("\n");
      for (const line of lines) {
        if (line) yield line;
      }
    };

    return promise;
  };

  const shell = ((
    strings: TemplateStringsArray,
    ...expressions: unknown[]
  ): ShellPromise => {
    // Build command from template literal
    let command = strings[0];
    for (let i = 0; i < expressions.length; i++) {
      const expr = expressions[i];
      // Escape expressions for safety
      const escaped = typeof expr === "string" ? escapeShellArg(expr) : String(expr);
      command += escaped + strings[i + 1];
    }
    return executeCommand(command);
  }) as ShellInterface;

  shell.escape = escapeShellArg;

  shell.env = (newEnv?: Record<string, string | undefined>) => {
    return createShellInterface(cwd, { ...env, ...newEnv }, throwOnError);
  };

  shell.cwd = (newCwd?: string) => {
    return createShellInterface(newCwd ?? cwd, env, throwOnError);
  };

  shell.nothrow = () => {
    return createShellInterface(cwd, env, false);
  };

  return shell;
}

// =============================================================================
// Project Detection
// =============================================================================

/**
 * Detect project metadata from directory
 */
async function detectProject(directory: string): Promise<ProjectMetadata> {
  const fs = await import("fs/promises");
  const path = await import("path");

  let projectName = path.basename(directory);
  let vcsDir: string | undefined;
  let vcs: "git" | undefined;

  // Check for git
  const gitDir = path.join(directory, ".git");
  try {
    const stat = await fs.stat(gitDir);
    if (stat.isDirectory()) {
      vcs = "git";
      vcsDir = gitDir;
    }
  } catch {
    // Not a git repo
  }

  // Try to get name from package.json
  const packageJsonPath = path.join(directory, "package.json");
  try {
    const content = await fs.readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    if (pkg.name) {
      projectName = pkg.name;
    }
  } catch {
    // No package.json
  }

  return {
    id: `project_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: projectName,
    path: directory,
    vcs,
    vcsDir,
    createdAt: Date.now(),
  };
}

// =============================================================================
// Context Factory
// =============================================================================

export interface CreatePluginContextOptions {
  client: PluginClient;
  directory: string;
  config?: Record<string, unknown>;
  serverUrl?: string;
  sessionId?: string;
  abort?: AbortSignal;
  permission?: IPermissionManager;
}

/**
 * Create a PluginContext for plugin execution
 */
export async function createPluginContext(
  options: CreatePluginContextOptions
): Promise<PluginContext> {
  const { client, directory, config = {}, serverUrl, sessionId, abort } = options;

  // Detect project
  const project = await detectProject(directory);

  // Create shell interface
  const shell = createShellInterface(directory);

  // Get permission manager
  const permission = options.permission ?? getPermissionManager();

  // Ensure permission manager is initialized
  await permission.initialize();

  const context: PluginContext = {
    client,
    project,
    directory,
    worktree: project.vcsDir ? directory : undefined,
    serverUrl,
    shell,
    config,
    permission,
    sessionId,
    abort,
  };

  logger.debug("[plugin] Created context", {
    project: project.name,
    directory,
    hasSession: !!sessionId,
  });

  return context;
}

/**
 * Create a minimal PluginContext for testing
 */
export function createTestPluginContext(
  overrides: Partial<PluginContext> = {}
): PluginContext {
  const defaultClient: PluginClient = {
    session: {
      messages: async () => ({ data: [] }),
      prompt: async () => {},
      abort: async () => {},
      todo: async () => ({ data: [] }),
    },
    tui: {
      showToast: async () => {},
    },
    tool: {
      execute: async () => ({}),
    },
  };

  const defaultProject: ProjectMetadata = {
    id: "test-project",
    name: "test",
    path: "/tmp/test",
    createdAt: Date.now(),
  };

  return {
    client: overrides.client ?? defaultClient,
    project: overrides.project ?? defaultProject,
    directory: overrides.directory ?? "/tmp/test",
    shell: overrides.shell ?? createShellInterface("/tmp/test"),
    config: overrides.config ?? {},
    permission: overrides.permission ?? getPermissionManager(),
    ...overrides,
  };
}
