import type { ToolDefinition, ToolContext, ToolResult, ToolParameter } from "../core/types";
import type { MCPTool } from "./types";
import { MCPClient } from "./client";
import logger from "../shared/logger";

type JsonSchemaProperty = {
  type?: string;
  description?: string;
};

function mapParameterType(type?: string): ToolParameter["type"] {
  switch (type) {
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "array":
      return "array";
    case "object":
      return "object";
    default:
      return "string";
  }
}

function toToolParameters(tool: MCPTool): ToolParameter[] {
  const properties = tool.inputSchema?.properties ?? {};
  const required = new Set(tool.inputSchema?.required ?? []);

  return Object.entries(properties).map(([name, value]) => {
    const property =
      typeof value === "object" && value !== null
        ? (value as JsonSchemaProperty)
        : {};

    return {
      name,
      type: mapParameterType(property.type),
      description: property.description ?? name,
      required: required.has(name),
    };
  });
}

export function bridgeMCPTool(
  mcpTool: MCPTool,
  client: MCPClient,
  serverName: string
): ToolDefinition {
  return {
    name: `mcp_${serverName}_${mcpTool.name}`,
    description: `[MCP:${serverName}] ${mcpTool.description}`,
    parameters: toToolParameters(mcpTool),
    execute: async (
      args: Record<string, unknown>,
      _context: ToolContext
    ): Promise<ToolResult> => {
      try {
        logger.info(`[mcp:${serverName}] Calling tool`, { name: mcpTool.name });
        const result = await client.callTool(mcpTool.name, args);
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        logger.error(`[mcp:${serverName}] Tool error`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

export async function bridgeAllTools(
  client: MCPClient,
  serverName: string
): Promise<ToolDefinition[]> {
  const mcpTools = await client.listTools();

  return mcpTools.map((tool) => bridgeMCPTool(tool, client, serverName));
}
