import { createInterface } from "readline";
import type { ToolDefinition, ToolParameter } from "../core/types";
import { getToolRegistry } from "../core/tools";
import logger from "../shared/logger";
import type { MCPTool } from "./types";

interface JSONRPCRequest {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: unknown;
}

interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

type ToolCallParams = {
  name: string;
  arguments?: Record<string, unknown>;
};

type JsonSchemaProperty = {
  type?: string;
  description?: string;
};

function mapParameterType(type: ToolParameter["type"]): string {
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

function toMcpTool(tool: ToolDefinition): MCPTool {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  for (const param of tool.parameters) {
    properties[param.name] = {
      type: mapParameterType(param.type),
      description: param.description,
    };

    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    },
  };
}

export class MCPServer {
  private running = false;
  private lineReader: ReturnType<typeof createInterface> | null = null;

  start(): void {
    if (this.running) return;
    this.running = true;

    process.stdin.setEncoding("utf-8");
    this.lineReader = createInterface({ input: process.stdin });

    this.lineReader.on("line", (line) => {
      void this.handleLine(line);
    });
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.lineReader?.close();
    this.lineReader = null;
  }

  private async handleLine(line: string): Promise<void> {
    if (!line.trim()) return;

    let request: JSONRPCRequest | null = null;
    try {
      request = JSON.parse(line) as JSONRPCRequest;
    } catch (error) {
      logger.warn("[mcp] Invalid JSON request", { line });
      return;
    }

    if (!request) return;

    if (request.id === undefined) {
      return;
    }

    const response = await this.handleRequest(request);
    process.stdout.write(JSON.stringify(response) + "\n");
  }

  private async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const id = request.id ?? null;

    try {
      switch (request.method) {
        case "initialize":
          return { jsonrpc: "2.0", id, result: { capabilities: {} } };
        case "tools/list": {
          const tools = getToolRegistry().list().map(toMcpTool);
          return { jsonrpc: "2.0", id, result: { tools } };
        }
        case "tools/call": {
          const params = request.params as ToolCallParams;
          const result = await getToolRegistry().execute(
            params.name,
            params.arguments ?? {},
            { sessionId: "", workdir: process.cwd() }
          );
          return { jsonrpc: "2.0", id, result };
        }
        case "resources/list":
          return { jsonrpc: "2.0", id, result: { resources: [] } };
        case "resources/read":
          return { jsonrpc: "2.0", id, result: { contents: [] } };
        case "prompts/list":
          return { jsonrpc: "2.0", id, result: { prompts: [] } };
        case "prompts/get":
          return { jsonrpc: "2.0", id, result: { messages: [] } };
        case "notifications/initialized":
          return { jsonrpc: "2.0", id, result: {} };
        default:
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`,
            },
          };
      }
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
