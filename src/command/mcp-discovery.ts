import type { CommandInfo } from "./registry";
import type { McpPrompt } from "../features/skill-mcp-manager/types";

export interface MCPServer {
  name: string;
  status: "connected" | "connecting" | "disconnected" | "error";
  toolCount?: number;
  resourceCount?: number;
  promptCount?: number;
}

export interface MCPCommandInfo extends CommandInfo {
  mcp: string;
  mcpPromptName: string;
  mcpArguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface MCPDiscoveryOptions {
  getConnectedServers: () => Promise<MCPServer[]>;
  getServerPrompts: (serverName: string) => Promise<McpPrompt[]>;
}

let discoveryOptions: MCPDiscoveryOptions | null = null;

export function configureMCPDiscovery(options: MCPDiscoveryOptions): void {
  discoveryOptions = options;
}

export async function discoverMCPCommands(): Promise<MCPCommandInfo[]> {
  if (!discoveryOptions) {
    return [];
  }

  const commands: MCPCommandInfo[] = [];

  try {
    const servers = await discoveryOptions.getConnectedServers();

    for (const server of servers) {
      if (server.status !== "connected") continue;

      try {
        const prompts = await discoveryOptions.getServerPrompts(server.name);

        for (const prompt of prompts) {
          const commandName = `${server.name}:${prompt.name}`;

          commands.push({
            name: commandName,
            description: prompt.description || `MCP prompt from ${server.name}`,
            mcp: server.name,
            mcpPromptName: prompt.name,
            mcpArguments: prompt.arguments,
            category: "mcp",
            hints: prompt.arguments?.map((arg) => arg.name),
            template: "",
          });
        }
      } catch (error) {
        console.warn(`Failed to discover prompts from ${server.name}:`, error);
      }
    }
  } catch (error) {
    console.warn("Failed to discover MCP commands:", error);
  }

  return commands;
}

export async function executeMCPCommand(
  command: MCPCommandInfo,
  args: Record<string, string>,
  getMCPPrompt: (
    serverName: string,
    promptName: string,
    args: Record<string, string>
  ) => Promise<{ messages: Array<{ content: { text: string } }> }>
): Promise<string> {
  const result = await getMCPPrompt(command.mcp, command.mcpPromptName, args);
  return result.messages.map((m) => m.content.text).join("\n");
}

export function parseMCPCommandArgs(
  command: MCPCommandInfo,
  rawArgs: string
): Record<string, string> {
  const args: Record<string, string> = {};

  if (!command.mcpArguments || command.mcpArguments.length === 0) {
    return args;
  }

  const parts = rawArgs.split(/\s+/).filter(Boolean);

  for (let i = 0; i < command.mcpArguments.length && i < parts.length; i++) {
    const argDef = command.mcpArguments[i];
    args[argDef.name] = parts[i];
  }

  if (parts.length > command.mcpArguments.length) {
    const lastArg = command.mcpArguments[command.mcpArguments.length - 1];
    args[lastArg.name] = parts.slice(command.mcpArguments.length - 1).join(" ");
  }

  return args;
}

export function formatMCPCommandHelp(command: MCPCommandInfo): string {
  let help = `/${command.name}`;

  if (command.mcpArguments && command.mcpArguments.length > 0) {
    const argStrings = command.mcpArguments.map((arg) => {
      const bracket = arg.required ? "<>" : "[]";
      return `${bracket[0]}${arg.name}${bracket[1]}`;
    });
    help += " " + argStrings.join(" ");
  }

  if (command.description) {
    help += `\n  ${command.description}`;
  }

  if (command.mcpArguments && command.mcpArguments.length > 0) {
    help += "\n  Arguments:";
    for (const arg of command.mcpArguments) {
      const required = arg.required ? " (required)" : "";
      const desc = arg.description ? ` - ${arg.description}` : "";
      help += `\n    ${arg.name}${required}${desc}`;
    }
  }

  return help;
}
