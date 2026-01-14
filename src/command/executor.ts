import { commandRegistry, type CommandInfo } from "./registry";
import { expandTemplate, parseCommandArgs, detectFilePaths } from "./template";
import { type MCPCommandInfo, parseMCPCommandArgs } from "./mcp-discovery";

export interface CommandExecuteContext {
  sessionId: string;
  workdir: string;
  model?: string;
  agent?: string;
  onSubtask?: (options: SubtaskOptions) => Promise<void>;
  onSendPrompt?: (options: SendPromptOptions) => Promise<void>;
  onFilesDetected?: (paths: string[]) => Promise<void>;
}

export interface SubtaskOptions {
  sessionId: string;
  agent: string;
  prompt: string;
  model?: string;
  parentSessionId: string;
}

export interface SendPromptOptions {
  sessionId: string;
  text: string;
  model?: string;
  agent?: string;
  filePaths?: string[];
}

export interface CommandExecuteResult {
  success: boolean;
  expandedPrompt?: string;
  error?: string;
  isSubtask?: boolean;
  detectedFiles?: string[];
}

export async function executeCommand(
  input: string,
  context: CommandExecuteContext
): Promise<CommandExecuteResult> {
  const parsed = parseCommandInput(input);
  if (!parsed) {
    return { success: false, error: "Invalid command format" };
  }

  const command = commandRegistry.get(parsed.commandName);
  if (!command) {
    return { success: false, error: `Unknown command: ${parsed.commandName}` };
  }

  try {
    if (isMCPCommand(command)) {
      return await executeMCPCommandFlow(command as MCPCommandInfo, parsed.args, context);
    }

    return await executeStandardCommand(command, parsed.args, context);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Command execution failed",
    };
  }
}

function parseCommandInput(input: string): { commandName: string; args: string } | null {
  const trimmed = input.trim();

  if (!trimmed.startsWith("/")) {
    return null;
  }

  const withoutSlash = trimmed.slice(1);
  const spaceIndex = withoutSlash.indexOf(" ");

  if (spaceIndex === -1) {
    return { commandName: withoutSlash.toLowerCase(), args: "" };
  }

  return {
    commandName: withoutSlash.slice(0, spaceIndex).toLowerCase(),
    args: withoutSlash.slice(spaceIndex + 1).trim(),
  };
}

function isMCPCommand(command: CommandInfo): boolean {
  return "mcp" in command && typeof (command as MCPCommandInfo).mcp === "string";
}

async function executeStandardCommand(
  command: CommandInfo,
  rawArgs: string,
  context: CommandExecuteContext
): Promise<CommandExecuteResult> {
  const { positional, raw } = parseCommandArgs(rawArgs);

  let templateText: string;
  if (typeof command.template === "function") {
    templateText = await command.template();
  } else {
    templateText = command.template;
  }

  const expandResult = await expandTemplate({
    template: templateText,
    args: positional,
    rawArgs: raw,
    workdir: context.workdir,
  });

  const detectedFiles = detectFilePaths(expandResult.text);

  if (detectedFiles.length > 0 && context.onFilesDetected) {
    await context.onFilesDetected(detectedFiles);
  }

  if (command.subtask && command.agent) {
    if (context.onSubtask) {
      await context.onSubtask({
        sessionId: context.sessionId,
        agent: command.agent,
        prompt: expandResult.text,
        model: command.model || context.model,
        parentSessionId: context.sessionId,
      });
    }

    return {
      success: true,
      expandedPrompt: expandResult.text,
      isSubtask: true,
      detectedFiles,
    };
  }

  if (context.onSendPrompt) {
    await context.onSendPrompt({
      sessionId: context.sessionId,
      text: expandResult.text,
      model: command.model || context.model,
      agent: command.agent || context.agent,
      filePaths: detectedFiles,
    });
  }

  return {
    success: true,
    expandedPrompt: expandResult.text,
    isSubtask: false,
    detectedFiles,
  };
}

async function executeMCPCommandFlow(
  command: MCPCommandInfo,
  rawArgs: string,
  context: CommandExecuteContext
): Promise<CommandExecuteResult> {
  const args = parseMCPCommandArgs(command, rawArgs);

  return {
    success: true,
    expandedPrompt: `Execute MCP prompt ${command.mcpPromptName} from ${command.mcp} with args: ${JSON.stringify(args)}`,
    isSubtask: false,
  };
}

export function isCommand(input: string): boolean {
  return input.trim().startsWith("/");
}

export function getCommandName(input: string): string | null {
  const parsed = parseCommandInput(input);
  return parsed?.commandName ?? null;
}

export function getCommandHelp(commandName: string): string | null {
  const command = commandRegistry.get(commandName);
  if (!command) return null;

  let help = `/${command.name}`;

  if (command.aliases && command.aliases.length > 0) {
    help += ` (aliases: ${command.aliases.map((a) => "/" + a).join(", ")})`;
  }

  if (command.description) {
    help += `\n  ${command.description}`;
  }

  if (command.agent) {
    help += `\n  Agent: ${command.agent}`;
  }

  if (command.subtask) {
    help += `\n  Runs as subtask`;
  }

  if (command.hints && command.hints.length > 0) {
    help += `\n  Arguments: ${command.hints.join(", ")}`;
  }

  return help;
}

export function getAllCommandsHelp(): string {
  const commands = commandRegistry.list();
  const byCategory = new Map<string, CommandInfo[]>();

  for (const cmd of commands) {
    const category = cmd.category || "other";
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(cmd);
  }

  const lines: string[] = ["Available Commands:", ""];

  const categoryOrder = ["session", "agent", "context", "git", "mcp", "debug", "system", "navigation", "other"];

  for (const category of categoryOrder) {
    const cmds = byCategory.get(category);
    if (!cmds || cmds.length === 0) continue;

    lines.push(`${category.toUpperCase()}:`);

    for (const cmd of cmds) {
      const aliases = cmd.aliases ? ` (${cmd.aliases.join(", ")})` : "";
      const desc = cmd.description || "";
      lines.push(`  /${cmd.name}${aliases} - ${desc}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}
