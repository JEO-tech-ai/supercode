import type { ToolDefinition, ToolContext, ToolResult } from "../types";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const bashTool: ToolDefinition = {
  name: "bash",
  description: "Execute a bash command",
  parameters: [
    {
      name: "command",
      type: "string",
      description: "The command to execute",
      required: true,
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
      description: "Timeout in milliseconds",
      required: false,
      default: 120000,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const command = args.command as string;
    const workdir = (args.workdir as string) || context.workdir;
    const timeout = (args.timeout as number) || 120000;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workdir,
        timeout,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        success: true,
        output: stdout + (stderr ? `\n${stderr}` : ""),
      };
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string; message: string };
      return {
        success: false,
        output: execError.stdout || "",
        error: execError.stderr || execError.message,
      };
    }
  },
};
