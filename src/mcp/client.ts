import { spawn, type ChildProcess } from "child_process";
import { EventEmitter } from "events";
import type {
  MCPServerConfig,
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPServerStatus,
} from "./types";
import logger from "../shared/logger";

interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
}

interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
  private buffer = "";

  constructor(private name: string, private config: MCPServerConfig) {
    super();
  }

  async start(): Promise<void> {
    if (this.process) {
      throw new Error("Server already running");
    }

    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.config.command, this.config.args ?? [], {
          env: { ...process.env, ...this.config.env },
          stdio: ["pipe", "pipe", "pipe"],
        });

        this.process.stdout?.on("data", (data) => {
          this.handleData(data.toString());
        });

        this.process.stderr?.on("data", (data) => {
          logger.warn(`[mcp:${this.name}] stderr`, { output: data.toString() });
        });

        this.process.on("error", (error) => {
          this.emit("error", error);
          reject(error);
        });

        this.process.on("exit", (code) => {
          this.process = null;
          this.emit("exit", code);
        });

        this.initialize().then(resolve).catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.process) return;

    this.process.kill();
    this.process = null;
  }

  private handleData(data: string): void {
    this.buffer += data;

    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const response = JSON.parse(line) as JSONRPCResponse;
        const pending = this.pendingRequests.get(response.id);

        if (pending) {
          this.pendingRequests.delete(response.id);

          if (response.error) {
            pending.reject(new Error(response.error.message));
          } else {
            pending.resolve(response.result);
          }
        }
      } catch {
        logger.warn(`[mcp:${this.name}] Invalid JSON`, { line });
      }
    }
  }

  private async request(method: string, params?: unknown): Promise<unknown> {
    if (!this.process) {
      throw new Error("Server not running");
    }

    const id = ++this.requestId;
    const request: JSONRPCRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const data = JSON.stringify(request) + "\n";
      this.process?.stdin?.write(data);
    });
  }

  private async initialize(): Promise<void> {
    await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {
        roots: { listChanged: true },
      },
      clientInfo: {
        name: "SuperCode",
        version: "1.0.0",
      },
    });

    await this.request("notifications/initialized");
  }

  async listTools(): Promise<MCPTool[]> {
    const result = (await this.request("tools/list")) as { tools: MCPTool[] };
    return result.tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    return this.request("tools/call", {
      name,
      arguments: args,
    });
  }

  async listResources(): Promise<MCPResource[]> {
    const result = (await this.request("resources/list")) as {
      resources: MCPResource[];
    };
    return result.resources;
  }

  async readResource(uri: string): Promise<string> {
    const result = (await this.request("resources/read", { uri })) as {
      contents: Array<{ text?: string; blob?: string }>;
    };
    return result.contents[0]?.text ?? "";
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    const result = (await this.request("prompts/list")) as {
      prompts: MCPPrompt[];
    };
    return result.prompts;
  }

  async getPrompt(
    name: string,
    args?: Record<string, string>
  ): Promise<string> {
    const result = (await this.request("prompts/get", {
      name,
      arguments: args,
    })) as { messages: Array<{ content: { text: string } }> };
    return result.messages.map((message) => message.content.text).join("\n");
  }

  async getStatus(): Promise<MCPServerStatus> {
    try {
      const [tools, resources, prompts] = await Promise.all([
        this.listTools().catch(() => []),
        this.listResources().catch(() => []),
        this.listPrompts().catch(() => []),
      ]);

      return {
        name: this.name,
        status: "running",
        tools,
        resources,
        prompts,
      };
    } catch (error) {
      return {
        name: this.name,
        status: this.process ? "error" : "stopped",
        tools: [],
        resources: [],
        prompts: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
