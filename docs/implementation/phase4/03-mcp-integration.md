# Phase 4.3: Full MCP Integration

> Priority: P3 (Lower)
> Effort: 4-5 days
> Dependencies: Plugin system

## Overview

Full MCP (Model Context Protocol) integration enables SuperCode to act as both an MCP server (exposing tools to other clients) and MCP client (consuming tools from external MCP servers).

## Current State in SuperCode

### Existing Files
```
src/command/mcp-discovery.ts   # Basic MCP discovery
```

### What Exists
- Basic MCP discovery logic

### What's Missing
- MCP server implementation
- MCP client implementation
- Tool bridging
- Configuration management

## Implementation Plan

### File Structure
```
src/mcp/
├── index.ts          # Main exports
├── server.ts         # MCP server implementation
├── client.ts         # MCP client wrapper
├── bridge.ts         # Tool bridging
├── config.ts         # MCP configuration
└── types.ts          # Type definitions
```

### 1. Types (`types.ts`)

```typescript
export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
}

export interface MCPConfig {
  servers: Record<string, MCPServerConfig>;
  defaultTimeout: number;
  autoStart: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface MCPServerStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
  error?: string;
}

export const DEFAULT_CONFIG: MCPConfig = {
  servers: {},
  defaultTimeout: 30000,
  autoStart: true,
};
```

### 2. MCP Client (`client.ts`)

```typescript
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import type { 
  MCPServerConfig, 
  MCPTool, 
  MCPResource, 
  MCPPrompt,
  MCPServerStatus 
} from './types';
import { Log } from '../shared/logger';

interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
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
  private pendingRequests = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private buffer = '';

  constructor(
    private name: string,
    private config: MCPServerConfig
  ) {
    super();
  }

  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Server already running');
    }

    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.config.command, this.config.args ?? [], {
          env: { ...process.env, ...this.config.env },
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        this.process.stdout?.on('data', (data) => {
          this.handleData(data.toString());
        });

        this.process.stderr?.on('data', (data) => {
          Log.warn(`[MCP:${this.name}] stderr:`, data.toString());
        });

        this.process.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });

        this.process.on('exit', (code) => {
          this.process = null;
          this.emit('exit', code);
        });

        // Initialize handshake
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
    
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';

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
      } catch (error) {
        Log.warn(`[MCP:${this.name}] Invalid JSON:`, line);
      }
    }
  }

  private async request(method: string, params?: unknown): Promise<unknown> {
    if (!this.process) {
      throw new Error('Server not running');
    }

    const id = ++this.requestId;
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      const data = JSON.stringify(request) + '\n';
      this.process!.stdin?.write(data);
    });
  }

  private async initialize(): Promise<void> {
    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: { listChanged: true },
      },
      clientInfo: {
        name: 'SuperCode',
        version: '1.0.0',
      },
    });

    await this.request('notifications/initialized');
  }

  async listTools(): Promise<MCPTool[]> {
    const result = await this.request('tools/list') as { tools: MCPTool[] };
    return result.tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const result = await this.request('tools/call', {
      name,
      arguments: args,
    });
    return result;
  }

  async listResources(): Promise<MCPResource[]> {
    const result = await this.request('resources/list') as { resources: MCPResource[] };
    return result.resources;
  }

  async readResource(uri: string): Promise<string> {
    const result = await this.request('resources/read', { uri }) as {
      contents: Array<{ text?: string; blob?: string }>;
    };
    return result.contents[0]?.text ?? '';
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    const result = await this.request('prompts/list') as { prompts: MCPPrompt[] };
    return result.prompts;
  }

  async getPrompt(name: string, args?: Record<string, string>): Promise<string> {
    const result = await this.request('prompts/get', {
      name,
      arguments: args,
    }) as { messages: Array<{ content: { text: string } }> };
    return result.messages.map(m => m.content.text).join('\n');
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
        status: 'running',
        tools,
        resources,
        prompts,
      };
    } catch (error) {
      return {
        name: this.name,
        status: this.process ? 'error' : 'stopped',
        tools: [],
        resources: [],
        prompts: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
```

### 3. MCP Bridge (`bridge.ts`)

```typescript
import type { ToolDefinition, ToolContext, ToolResult } from '../core/types';
import type { MCPTool } from './types';
import { MCPClient } from './client';
import { Log } from '../shared/logger';

/**
 * Convert MCP tool to SuperCode tool
 */
export function bridgeMCPTool(
  mcpTool: MCPTool,
  client: MCPClient,
  serverName: string
): ToolDefinition {
  return {
    name: `mcp_${serverName}_${mcpTool.name}`,
    description: `[MCP:${serverName}] ${mcpTool.description}`,
    parameters: mcpTool.inputSchema,
    
    execute: async (
      args: Record<string, unknown>,
      context: ToolContext
    ): Promise<ToolResult> => {
      try {
        Log.info(`[MCP:${serverName}] Calling tool: ${mcpTool.name}`);
        
        const result = await client.callTool(mcpTool.name, args);
        
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        Log.error(`[MCP:${serverName}] Tool error:`, error);
        
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

/**
 * Bridge all tools from an MCP server
 */
export async function bridgeAllTools(
  client: MCPClient,
  serverName: string
): Promise<ToolDefinition[]> {
  const mcpTools = await client.listTools();
  
  return mcpTools.map(tool => bridgeMCPTool(tool, client, serverName));
}
```

### 4. MCP Manager (`index.ts`)

```typescript
import type { MCPConfig, MCPServerConfig, MCPServerStatus } from './types';
import { DEFAULT_CONFIG } from './types';
import { MCPClient } from './client';
import { bridgeAllTools } from './bridge';
import { getToolRegistry } from '../core/tools';
import { Log } from '../shared/logger';

export * from './types';
export { MCPClient } from './client';
export { bridgeMCPTool, bridgeAllTools } from './bridge';

class MCPManager {
  private clients = new Map<string, MCPClient>();
  private config: MCPConfig;

  constructor(config: Partial<MCPConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async startServer(name: string): Promise<void> {
    const serverConfig = this.config.servers[name];
    if (!serverConfig) {
      throw new Error(`Unknown MCP server: ${name}`);
    }

    if (serverConfig.disabled) {
      Log.info(`[MCP] Server ${name} is disabled`);
      return;
    }

    if (this.clients.has(name)) {
      throw new Error(`Server ${name} already running`);
    }

    const client = new MCPClient(name, serverConfig);
    await client.start();
    
    this.clients.set(name, client);

    // Bridge tools
    const tools = await bridgeAllTools(client, name);
    const registry = getToolRegistry();
    
    for (const tool of tools) {
      registry.register(tool);
    }

    Log.info(`[MCP] Started server ${name} with ${tools.length} tools`);
  }

  async stopServer(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (!client) return;

    await client.stop();
    this.clients.delete(name);

    // TODO: Unregister tools

    Log.info(`[MCP] Stopped server ${name}`);
  }

  async startAll(): Promise<void> {
    for (const name of Object.keys(this.config.servers)) {
      try {
        await this.startServer(name);
      } catch (error) {
        Log.error(`[MCP] Failed to start ${name}:`, error);
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

    // Include stopped servers
    for (const name of Object.keys(this.config.servers)) {
      if (!this.clients.has(name)) {
        statuses.push({
          name,
          status: 'stopped',
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
    this.stopServer(name);
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
```

## Configuration

```json
// .supercode/mcp.json
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "..."
      }
    }
  }
}
```

## Usage

```typescript
// Initialize MCP
await initializeMCP({
  servers: {
    filesystem: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/path'],
    },
  },
});

// Use bridged tools
const result = await toolRegistry.execute('mcp_filesystem_read_file', {
  path: '/path/to/file.txt',
}, context);
```

## Testing

```typescript
describe('MCPIntegration', () => {
  describe('MCPClient', () => {
    it('should start server process');
    it('should list tools');
    it('should call tools');
    it('should handle errors');
  });

  describe('MCPBridge', () => {
    it('should convert MCP tool to SuperCode tool');
    it('should bridge all tools from server');
  });

  describe('MCPManager', () => {
    it('should start all servers');
    it('should stop servers');
    it('should report status');
  });
});
```

## Success Criteria

- [ ] MCP client connects to servers
- [ ] Tool listing works
- [ ] Tool calling works
- [ ] Tool bridging works
- [ ] Multiple servers supported
- [ ] Error handling works
- [ ] Server lifecycle management
