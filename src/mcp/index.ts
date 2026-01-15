import type { MCPConfig, MCPServerConfig, MCPServerStatus } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { MCPClient } from "./client";
import { bridgeAllTools } from "./bridge";
import { getToolRegistry } from "../core/tools";
import logger from "../shared/logger";

export * from "./types";
export { MCPClient } from "./client";
export { bridgeAllTools, bridgeMCPTool } from "./bridge";
export { MCPServer } from "./server";
export { getMcpConfigPath, loadMcpConfig } from "./config";

class MCPManager {
  private clients = new Map<string, MCPClient>();
  private config: MCPConfig;
  private bridgedTools = new Map<string, string[]>();

  constructor(config: Partial<MCPConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config } as MCPConfig;
  }

  async startServer(name: string): Promise<void> {
    const serverConfig = this.config.servers[name];
    if (!serverConfig) {
      throw new Error(`Unknown MCP server: ${name}`);
    }

    if (serverConfig.disabled) {
      logger.info("[mcp] Server disabled", { name });
      return;
    }

    if (this.clients.has(name)) {
      throw new Error(`Server ${name} already running`);
    }

    const client = new MCPClient(name, serverConfig);
    await client.start();

    this.clients.set(name, client);

    const tools = await bridgeAllTools(client, name);
    const registry = getToolRegistry();

    for (const tool of tools) {
      registry.register(tool);
    }

    this.bridgedTools.set(
      name,
      tools.map((tool) => tool.name)
    );

    logger.info("[mcp] Started server", { name, toolCount: tools.length });
  }

  async stopServer(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (!client) return;

    await client.stop();
    this.clients.delete(name);

    const registry = getToolRegistry();
    const bridged = this.bridgedTools.get(name) ?? [];
    for (const toolName of bridged) {
      registry.unregister(toolName);
    }
    this.bridgedTools.delete(name);

    logger.info("[mcp] Stopped server", { name });
  }

  async startAll(): Promise<void> {
    for (const name of Object.keys(this.config.servers)) {
      try {
        await this.startServer(name);
      } catch (error) {
        logger.error("[mcp] Failed to start server", error);
      }
    }
  }

  async stopAll(): Promise<void> {
    for (const name of this.clients.keys()) {
      await this.stopServer(name);
    }
  }

  getClient(name: string): MCPClient | undefined {
    return this.clients.get(name);
  }

  async getStatus(): Promise<MCPServerStatus[]> {
    const statuses: MCPServerStatus[] = [];

    for (const [name, client] of this.clients) {
      statuses.push(await client.getStatus());
    }

    for (const name of Object.keys(this.config.servers)) {
      if (!this.clients.has(name)) {
        statuses.push({
          name,
          status: "stopped",
          tools: [],
          resources: [],
          prompts: [],
        });
      }
    }

    return statuses;
  }

  addServer(name: string, config: MCPServerConfig): void {
    this.config.servers[name] = config;
  }

  removeServer(name: string): void {
    void this.stopServer(name);
    delete this.config.servers[name];
  }
}

let managerInstance: MCPManager | null = null;

export function getMCPManager(config?: Partial<MCPConfig>): MCPManager {
  if (!managerInstance) {
    managerInstance = new MCPManager(config);
  }
  return managerInstance;
}

export async function initializeMCP(config?: Partial<MCPConfig>): Promise<void> {
  const manager = getMCPManager(config);

  if (config?.autoStart ?? DEFAULT_CONFIG.autoStart) {
    await manager.startAll();
  }
}
