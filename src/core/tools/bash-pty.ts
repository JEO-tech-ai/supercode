import type { ToolDefinition, ToolContext, ToolResult } from "../types";
import { ptyManager } from "../../services/pty/manager";
import { promptDetector } from "../../services/pty/prompt-detector";

async function executeInteractive(command: string, cwd: string, timeout: number): Promise<ToolResult> {
  try {
    // Spawn PTY process
    const process = await ptyManager.spawn({
      cwd,
      cols: 80,
      rows: 24,
    });

    let output = '';

    // Listen for data and prompts
    const dataHandler = (data: string) => {
      output += data;

      // Check for prompts
      const prompt = promptDetector.detect(data);
      if (prompt) {
        output += `\n🔔 Prompt detected: ${prompt.type}\n💡 Suggestions: ${prompt.suggestions.join(', ')}`;
      }
    };

    process.onData(dataHandler);

    // Write command
    process.write(`${command}\n`);

    // Wait for output or timeout
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        resolve();
      }, timeout);

      process.onExit(() => {
        clearTimeout(timer);
        resolve();
      });
    });

    process.onData(() => {}); // Remove handler

    return {
      success: true,
      output,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function executeNonInteractive(command: string, cwd: string, timeout: number): Promise<ToolResult> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');

  const execAsync = promisify(exec);

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout,
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      success: true,
      output: stdout + (stderr ? `\n${stderr}` : ''),
    };
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; message: string };
    return {
      success: false,
      output: execError.stdout || '',
      error: execError.stderr || execError.message,
    };
  }
}

export const bashTool: ToolDefinition = {
  name: "bash",
  description: "Execute bash command (supports interactive mode with PTY)",
  parameters: [
    {
      name: "command",
      type: "string",
      description: "The command to execute",
      required: true,
    },
    {
      name: "interactive",
      type: "boolean",
      description: "Enable interactive PTY mode for long-running commands",
      required: false,
      default: false,
    },
    {
      name: "workdir",
      type: "string",
      description: "Working directory",
      required: false,
    },
    {
      name: "timeout",
      type: "number",
      description: "Timeout in milliseconds (default: 30000)",
      required: false,
      default: 30000,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const command = args.command as string;
    const interactive = (args.interactive as boolean) ?? false;
    const workdir = (args.workdir as string) || context.workdir;
    const timeout = (args.timeout as number) || 30000;

    if (interactive) {
      return await executeInteractive(command, workdir, timeout);
    } else {
      return await executeNonInteractive(command, workdir, timeout);
    }
  },
};
