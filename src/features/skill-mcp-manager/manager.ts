import type {
  McpServerConfig,
  SkillMcpClientInfo,
  SkillMcpServerContext,
  McpTool,
  McpResource,
  McpPrompt,
} from "./types";
import { createCleanMcpEnvironment, expandEnvVarsInObject } from "./env-cleaner";

type McpClient = {
  connect: (transport: unknown) => Promise<void>;
  close: () => Promise<void>;
  listTools: () => Promise<{ tools: McpTool[] }>;
  listResources: () => Promise<{ resources: McpResource[] }>;
  listPrompts: () => Promise<{ prompts: McpPrompt[] }>;
  callTool: (params: { name: string; arguments: Record<string, unknown> }) => Promise<{ content: unknown }>;
  readResource: (params: { uri: string }) => Promise<{ contents: unknown }>;
  getPrompt: (params: { name: string; arguments: Record<string, string> }) => Promise<{ messages: unknown }>;
};

type McpTransport = {
  close: () => Promise<void>;
};

type McpSdkModule = {
  Client: new (info: { name: string; version: string }, opts: { capabilities: Record<string, unknown> }) => McpClient;
  StdioClientTransport: new (opts: { command: string; args: string[]; env: Record<string, string>; stderr: string }) => McpTransport;
};

let mcpSdkModule: McpSdkModule | null = null;

async function getMcpSdk(): Promise<McpSdkModule> {
  if (mcpSdkModule) return mcpSdkModule;
  
  try {
    const clientModulePath = "@modelcontextprotocol/sdk/client/index.js";
    const transportModulePath = "@modelcontextprotocol/sdk/client/stdio.js";
    const clientModule = await import(/* @vite-ignore */ clientModulePath);
    const transportModule = await import(/* @vite-ignore */ transportModulePath);
    mcpSdkModule = {
      Client: clientModule.Client,
      StdioClientTransport: transportModule.StdioClientTransport,
    };
    return mcpSdkModule;
  } catch {
    throw new Error(
      "MCP SDK is not installed. To use Skill MCP features, install @modelcontextprotocol/sdk:\n\n" +
      "  bun add @modelcontextprotocol/sdk\n"
    );
  }
}

interface ManagedClient {
  client: McpClient;
  transport: McpTransport;
  skillName: string;
  lastUsedAt: number;
}

export class SkillMcpManager {
  private clients: Map<string, ManagedClient> = new Map();
  private pendingConnections: Map<string, Promise<McpClient>> = new Map();
  private cleanupRegistered = false;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000;

  private getClientKey(info: SkillMcpClientInfo): string {
    return `${info.sessionId}:${info.skillName}:${info.serverName}`;
  }

  private registerProcessCleanup(): void {
    if (this.cleanupRegistered) return;
    this.cleanupRegistered = true;

    const cleanup = async () => {
      for (const [, managed] of this.clients) {
        try {
          await managed.client.close();
        } catch {
        }
        try {
          await managed.transport.close();
        } catch {
        }
      }
      this.clients.clear();
      this.pendingConnections.clear();
    };

    process.on("SIGINT", async () => {
      await cleanup();
      process.exit(0);
    });
    process.on("SIGTERM", async () => {
      await cleanup();
      process.exit(0);
    });
    if (process.platform === "win32") {
      process.on("SIGBREAK", async () => {
        await cleanup();
        process.exit(0);
      });
    }
  }

  async getOrCreateClient(
    info: SkillMcpClientInfo,
    config: McpServerConfig
  ): Promise<McpClient> {
    const key = this.getClientKey(info);
    const existing = this.clients.get(key);

    if (existing) {
      existing.lastUsedAt = Date.now();
      return existing.client;
    }

    const pending = this.pendingConnections.get(key);
    if (pending) {
      return pending;
    }

    const expandedConfig = expandEnvVarsInObject(config);
    const connectionPromise = this.createClient(info, expandedConfig);
    this.pendingConnections.set(key, connectionPromise);

    try {
      const client = await connectionPromise;
      return client;
    } finally {
      this.pendingConnections.delete(key);
    }
  }

  private async createClient(
    info: SkillMcpClientInfo,
    config: McpServerConfig
  ): Promise<McpClient> {
    const key = this.getClientKey(info);

    if (!config.command) {
      throw new Error(
        `MCP server "${info.serverName}" is missing required 'command' field.\n\n` +
          `The MCP configuration in skill "${info.skillName}" must specify a command to execute.\n\n` +
          `Example:\n` +
          `  mcp:\n` +
          `    ${info.serverName}:\n` +
          `      command: npx\n` +
          `      args: [-y, @some/mcp-server]`
      );
    }

    const sdk = await getMcpSdk();
    const command = config.command;
    const args = config.args || [];

    const mergedEnv = createCleanMcpEnvironment(config.env);

    this.registerProcessCleanup();

    const transport = new sdk.StdioClientTransport({
      command,
      args,
      env: mergedEnv,
      stderr: "ignore",
    });

    const client = new sdk.Client(
      {
        name: `skill-mcp-${info.skillName}-${info.serverName}`,
        version: "1.0.0",
      },
      { capabilities: {} }
    );

    try {
      await client.connect(transport);
    } catch (error) {
      try {
        await transport.close();
      } catch {
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to connect to MCP server "${info.serverName}".\n\n` +
          `Command: ${command} ${args.join(" ")}\n` +
          `Reason: ${errorMessage}\n\n` +
          `Hints:\n` +
          `  - Ensure the command is installed and available in PATH\n` +
          `  - Check if the MCP server package exists\n` +
          `  - Verify the args are correct for this server`
      );
    }

    this.clients.set(key, {
      client,
      transport,
      skillName: info.skillName,
      lastUsedAt: Date.now(),
    });
    this.startCleanupTimer();
    return client;
  }

  async disconnectSession(sessionId: string): Promise<void> {
    for (const [key, managed] of this.clients.entries()) {
      if (key.startsWith(`${sessionId}:`)) {
        this.clients.delete(key);
        try {
          await managed.client.close();
        } catch {
        }
        try {
          await managed.transport.close();
        } catch {
        }
      }
    }
  }

  async disconnectAll(): Promise<void> {
    this.stopCleanupTimer();
    const clients = Array.from(this.clients.values());
    this.clients.clear();
    for (const managed of clients) {
      try {
        await managed.client.close();
      } catch {
      }
      try {
        await managed.transport.close();
      } catch {
      }
    }
  }

  private startCleanupTimer(): void {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleClients();
    }, 60_000);
    this.cleanupInterval.unref();
  }

  private stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private async cleanupIdleClients(): Promise<void> {
    const now = Date.now();
    for (const [key, managed] of this.clients) {
      if (now - managed.lastUsedAt > this.IDLE_TIMEOUT) {
        this.clients.delete(key);
        try {
          await managed.client.close();
        } catch {
        }
        try {
          await managed.transport.close();
        } catch {
        }
      }
    }
  }

  async listTools(
    info: SkillMcpClientInfo,
    context: SkillMcpServerContext
  ): Promise<McpTool[]> {
    const client = await this.getOrCreateClientWithRetry(info, context.config);
    const result = await client.listTools();
    return result.tools;
  }

  async listResources(
    info: SkillMcpClientInfo,
    context: SkillMcpServerContext
  ): Promise<McpResource[]> {
    const client = await this.getOrCreateClientWithRetry(info, context.config);
    const result = await client.listResources();
    return result.resources;
  }

  async listPrompts(
    info: SkillMcpClientInfo,
    context: SkillMcpServerContext
  ): Promise<McpPrompt[]> {
    const client = await this.getOrCreateClientWithRetry(info, context.config);
    const result = await client.listPrompts();
    return result.prompts;
  }

  async callTool(
    info: SkillMcpClientInfo,
    context: SkillMcpServerContext,
    name: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const client = await this.getOrCreateClientWithRetry(info, context.config);
    const result = await client.callTool({ name, arguments: args });
    return result.content;
  }

  async readResource(
    info: SkillMcpClientInfo,
    context: SkillMcpServerContext,
    uri: string
  ): Promise<unknown> {
    const client = await this.getOrCreateClientWithRetry(info, context.config);
    const result = await client.readResource({ uri });
    return result.contents;
  }

  async getPrompt(
    info: SkillMcpClientInfo,
    context: SkillMcpServerContext,
    name: string,
    args: Record<string, string>
  ): Promise<unknown> {
    const client = await this.getOrCreateClientWithRetry(info, context.config);
    const result = await client.getPrompt({ name, arguments: args });
    return result.messages;
  }

  private async getOrCreateClientWithRetry(
    info: SkillMcpClientInfo,
    config: McpServerConfig
  ): Promise<McpClient> {
    try {
      return await this.getOrCreateClient(info, config);
    } catch (error) {
      const key = this.getClientKey(info);
      const existing = this.clients.get(key);
      if (existing) {
        this.clients.delete(key);
        try {
          await existing.client.close();
        } catch {
        }
        try {
          await existing.transport.close();
        } catch {
        }
        return await this.getOrCreateClient(info, config);
      }
      throw error;
    }
  }

  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  isConnected(info: SkillMcpClientInfo): boolean {
    return this.clients.has(this.getClientKey(info));
  }
}

let globalManager: SkillMcpManager | null = null;

export function getSkillMcpManager(): SkillMcpManager {
  if (!globalManager) {
    globalManager = new SkillMcpManager();
  }
  return globalManager;
}
