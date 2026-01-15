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
import { 
  killTree, 
  withTimeout, 
  type Disposable 
} from "../shared/shutdown";

const DEFAULT_REQUEST_TIMEOUT_MS = 30000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5000;

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

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class MCPClient extends EventEmitter implements Disposable {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, PendingRequest>();
  private buffer = "";
  private isDisposing = false;
  private requestTimeoutMs: number;

  constructor(
    private name: string, 
    private config: MCPServerConfig,
    options?: { requestTimeoutMs?: number }
  ) {
    super();
    this.requestTimeoutMs = options?.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  }

  async start(): Promise<void> {
    if (this.process) {
      throw new Error("Server already running");
    }

    if (this.isDisposing) {
      throw new Error("Client is disposing, cannot start");
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
          this.handleProcessError(error);
          reject(error);
        });

        this.process.on("exit", (code, signal) => {
          this.handleProcessExit(code, signal);
        });

        this.initialize().then(resolve).catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(timeoutMs: number = DEFAULT_SHUTDOWN_TIMEOUT_MS): Promise<void> {
    if (!this.process || this.isDisposing) return;

    this.isDisposing = true;
    logger.info(`[mcp:${this.name}] Stopping client`);

    this.rejectAllPending(new Error("Client is shutting down"));

    const proc = this.process;
    let exited = false;

    await killTree(proc, {
      exited: () => exited,
      timeoutMs,
    });

    if (!exited && proc.pid) {
      try {
        proc.kill("SIGKILL");
      } catch {}
    }

    this.process = null;
    this.isDisposing = false;
  }

  async dispose(): Promise<void> {
    logger.info(`[mcp:${this.name}] Disposing client`);
    await this.stop();
    this.removeAllListeners();
  }

  private handleProcessError(error: Error): void {
    logger.error(`[mcp:${this.name}] Process error`, error);
    this.emit("error", error);
    this.rejectAllPending(error);
  }

  private handleProcessExit(code: number | null, signal: string | null): void {
    logger.info(`[mcp:${this.name}] Process exited`, { code, signal });
    this.process = null;
    this.emit("exit", code);
    this.rejectAllPending(new Error(`Process exited with code ${code}`));
  }

  private rejectAllPending(error: Error): void {
    const pending = Array.from(this.pendingRequests.values());
    this.pendingRequests.clear();

    for (const request of pending) {
      clearTimeout(request.timer);
      request.reject(error);
    }
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
          clearTimeout(pending.timer);
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

  private async request(
    method: string, 
    params?: unknown,
    timeoutMs?: number
  ): Promise<unknown> {
    if (!this.process) {
      throw new Error("Server not running");
    }

    if (this.isDisposing) {
      throw new Error("Client is shutting down");
    }

    const id = ++this.requestId;
    const timeout = timeoutMs ?? this.requestTimeoutMs;

    const request: JSONRPCRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${method} timed out after ${timeout}ms`));
      }, timeout);

      this.pendingRequests.set(id, { resolve, reject, timer });

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

  async callTool(
    name: string, 
    args: Record<string, unknown>,
    timeoutMs?: number
  ): Promise<unknown> {
    return this.request("tools/call", { name, arguments: args }, timeoutMs);
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

  isRunning(): boolean {
    return this.process !== null && !this.isDisposing;
  }

  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }
}
