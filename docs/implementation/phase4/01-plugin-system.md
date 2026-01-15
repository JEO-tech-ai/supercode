# Phase 4.1: Plugin System

> Priority: P3 (Lower)
> Effort: 5-7 days
> Dependencies: All previous phases

## Overview

The Plugin System enables extending SuperCode with external plugins, similar to OpenCode's `@opencode-ai/plugin` architecture. This allows third-party tools, hooks, and agents to be loaded dynamically.

## Current State in SuperCode

### Existing Files
```
src/core/hooks.ts           # Basic hook registry
src/core/tools.ts           # Basic tool registry
src/agents/index.ts         # Agent definitions
```

### What Exists
- Hook registry pattern
- Tool registry pattern
- Agent definitions

### What's Missing
- Plugin loader
- Plugin configuration
- SDK client wrapper
- Plugin lifecycle management
- Hot-reload support

## Reference Implementation (OpenCode)

```typescript
// @opencode-ai/plugin types
interface PluginInput {
  client: OpencodeClient;
  directory: string;
  config?: Record<string, unknown>;
}

interface PluginOutput {
  agents?: Record<string, AgentConfig>;
  tools?: Record<string, ToolDefinition>;
  hooks?: HookDefinition[];
}

type Plugin = (input: PluginInput) => PluginOutput | Promise<PluginOutput>;
```

## Implementation Plan

### File Structure
```
src/plugin/
├── index.ts          # Main exports
├── types.ts          # Plugin type definitions
├── loader.ts         # Plugin loading logic
├── registry.ts       # Plugin registration
├── client.ts         # SDK client wrapper
└── lifecycle.ts      # Plugin lifecycle management
```

### 1. Types (`types.ts`)

```typescript
export interface PluginInput {
  client: PluginClient;
  directory: string;
  config?: Record<string, unknown>;
}

export interface PluginOutput {
  agents?: Record<string, AgentDefinition>;
  tools?: Record<string, ToolDefinition>;
  hooks?: HookDefinition[];
  commands?: Record<string, CommandDefinition>;
}

export type PluginFactory = (input: PluginInput) => PluginOutput | Promise<PluginOutput>;

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  main: string;
  config?: {
    schema?: Record<string, unknown>;
    defaults?: Record<string, unknown>;
  };
  dependencies?: string[];
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  output: PluginOutput;
  path: string;
  loadedAt: Date;
  status: 'active' | 'inactive' | 'error';
  error?: Error;
}

export interface PluginConfig {
  pluginsDir: string;
  autoLoad: boolean;
  enableHotReload: boolean;
  timeout: number;
}

export const DEFAULT_CONFIG: PluginConfig = {
  pluginsDir: '~/.supercode/plugins',
  autoLoad: true,
  enableHotReload: false,
  timeout: 10000,
};
```

### 2. Client Wrapper (`client.ts`)

```typescript
import type { SessionManager } from '../core/session/manager';
import type { IToolRegistry } from '../core/tools';
import type { IHookRegistry } from '../core/hooks';

export interface PluginClient {
  session: SessionClient;
  tui: TUIClient;
  tool: ToolClient;
}

interface SessionClient {
  messages: (params: { path: { id: string }; query?: { directory: string } }) => Promise<{ data: unknown[] }>;
  prompt: (params: { path: { id: string }; body: { parts: unknown[]; agent?: string; model?: unknown }; query?: { directory: string } }) => Promise<void>;
  abort: (params: { path: { id: string } }) => Promise<void>;
  todo: (params: { path: { id: string } }) => Promise<{ data: unknown[] }>;
  summarize?: (sessionId: string) => Promise<void>;
}

interface TUIClient {
  showToast: (params: { body: { title: string; message: string; variant: string; duration?: number } }) => Promise<void>;
}

interface ToolClient {
  execute: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

export function createPluginClient(
  sessionManager: SessionManager,
  toolRegistry: IToolRegistry,
  hookRegistry: IHookRegistry,
  options: { directory: string }
): PluginClient {
  return {
    session: {
      messages: async ({ path }) => {
        const session = await sessionManager.getSession(path.id);
        return { data: session?.messages ?? [] };
      },
      
      prompt: async ({ path, body }) => {
        await sessionManager.addMessage(path.id, {
          role: 'user',
          content: body.parts.map((p: any) => p.text ?? '').join(''),
        });
      },
      
      abort: async ({ path }) => {
        // Implement abort logic
      },
      
      todo: async ({ path }) => {
        const session = await sessionManager.getSession(path.id);
        return { data: session?.todos ?? [] };
      },
    },

    tui: {
      showToast: async ({ body }) => {
        // Integrate with TUI toast system
        console.log(`[Toast] ${body.title}: ${body.message}`);
      },
    },

    tool: {
      execute: async (name, args) => {
        return toolRegistry.execute(name, args, { 
          sessionId: '', 
          workdir: options.directory 
        });
      },
    },
  };
}
```

### 3. Plugin Loader (`loader.ts`)

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { 
  PluginManifest, 
  LoadedPlugin, 
  PluginFactory, 
  PluginInput,
  PluginConfig 
} from './types';
import { createPluginClient } from './client';
import { Log } from '../shared/logger';

export function resolvePluginsDir(dir: string): string {
  if (dir.startsWith('~')) {
    return path.join(os.homedir(), dir.slice(1));
  }
  return dir;
}

export async function discoverPlugins(config: PluginConfig): Promise<string[]> {
  const dir = resolvePluginsDir(config.pluginsDir);
  
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const pluginPaths: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const manifestPath = path.join(dir, entry.name, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      pluginPaths.push(path.join(dir, entry.name));
    }
  }

  return pluginPaths;
}

export async function loadPluginManifest(pluginPath: string): Promise<PluginManifest | null> {
  const manifestPath = path.join(pluginPath, 'manifest.json');
  
  try {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content) as PluginManifest;
  } catch (error) {
    Log.error(`Failed to load manifest from ${pluginPath}:`, error);
    return null;
  }
}

export async function loadPlugin(
  pluginPath: string,
  input: PluginInput,
  config: PluginConfig
): Promise<LoadedPlugin | null> {
  const manifest = await loadPluginManifest(pluginPath);
  if (!manifest) return null;

  const mainPath = path.join(pluginPath, manifest.main);
  
  if (!fs.existsSync(mainPath)) {
    Log.error(`Plugin main file not found: ${mainPath}`);
    return null;
  }

  try {
    // Dynamic import
    const module = await import(mainPath);
    const factory: PluginFactory = module.default ?? module.plugin ?? module;

    if (typeof factory !== 'function') {
      throw new Error('Plugin must export a function');
    }

    // Execute with timeout
    const output = await Promise.race([
      factory(input),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Plugin load timeout')), config.timeout)
      ),
    ]);

    return {
      manifest,
      output: output as any,
      path: pluginPath,
      loadedAt: new Date(),
      status: 'active',
    };

  } catch (error) {
    Log.error(`Failed to load plugin ${manifest.name}:`, error);
    return {
      manifest,
      output: {},
      path: pluginPath,
      loadedAt: new Date(),
      status: 'error',
      error: error as Error,
    };
  }
}

export async function loadAllPlugins(
  config: PluginConfig,
  input: PluginInput
): Promise<LoadedPlugin[]> {
  const pluginPaths = await discoverPlugins(config);
  const plugins: LoadedPlugin[] = [];

  for (const pluginPath of pluginPaths) {
    const plugin = await loadPlugin(pluginPath, input, config);
    if (plugin) {
      plugins.push(plugin);
    }
  }

  return plugins;
}
```

### 4. Plugin Registry (`registry.ts`)

```typescript
import type { LoadedPlugin, PluginConfig, PluginInput } from './types';
import { loadAllPlugins, loadPlugin } from './loader';
import { getToolRegistry } from '../core/tools';
import { getHookRegistry } from '../core/hooks';
import { Log } from '../shared/logger';

class PluginRegistry {
  private plugins = new Map<string, LoadedPlugin>();
  private config: PluginConfig;

  constructor(config: PluginConfig) {
    this.config = config;
  }

  async loadAll(input: PluginInput): Promise<void> {
    const plugins = await loadAllPlugins(this.config, input);
    
    for (const plugin of plugins) {
      await this.register(plugin);
    }

    Log.info(`Loaded ${plugins.length} plugins`);
  }

  async register(plugin: LoadedPlugin): Promise<void> {
    const { manifest, output } = plugin;

    // Register tools
    if (output.tools) {
      const toolRegistry = getToolRegistry();
      for (const [name, tool] of Object.entries(output.tools)) {
        toolRegistry.register({ ...tool, name });
        Log.info(`Registered tool from ${manifest.name}: ${name}`);
      }
    }

    // Register hooks
    if (output.hooks) {
      const hookRegistry = getHookRegistry();
      for (const hook of output.hooks) {
        hookRegistry.register(hook);
        Log.info(`Registered hook from ${manifest.name}: ${hook.name}`);
      }
    }

    // Register agents (if applicable)
    if (output.agents) {
      // Store in agent registry
      for (const [name, agent] of Object.entries(output.agents)) {
        Log.info(`Registered agent from ${manifest.name}: ${name}`);
      }
    }

    this.plugins.set(manifest.name, plugin);
  }

  unregister(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;

    // Unregister tools
    if (plugin.output.tools) {
      const toolRegistry = getToolRegistry();
      for (const toolName of Object.keys(plugin.output.tools)) {
        toolRegistry.unregister(toolName);
      }
    }

    // Unregister hooks
    if (plugin.output.hooks) {
      const hookRegistry = getHookRegistry();
      for (const hook of plugin.output.hooks) {
        hookRegistry.unregister(hook.name);
      }
    }

    this.plugins.delete(name);
    return true;
  }

  get(name: string): LoadedPlugin | undefined {
    return this.plugins.get(name);
  }

  list(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  getStats(): {
    total: number;
    active: number;
    error: number;
    tools: number;
    hooks: number;
  } {
    const plugins = this.list();
    return {
      total: plugins.length,
      active: plugins.filter(p => p.status === 'active').length,
      error: plugins.filter(p => p.status === 'error').length,
      tools: plugins.reduce((sum, p) => sum + Object.keys(p.output.tools ?? {}).length, 0),
      hooks: plugins.reduce((sum, p) => sum + (p.output.hooks?.length ?? 0), 0),
    };
  }
}

let registryInstance: PluginRegistry | null = null;

export function getPluginRegistry(config?: PluginConfig): PluginRegistry {
  if (!registryInstance) {
    registryInstance = new PluginRegistry(config ?? DEFAULT_CONFIG);
  }
  return registryInstance;
}
```

### 5. Main Export (`index.ts`)

```typescript
export * from './types';
export { createPluginClient } from './client';
export { discoverPlugins, loadPlugin, loadAllPlugins } from './loader';
export { getPluginRegistry } from './registry';

import { getPluginRegistry } from './registry';
import { createPluginClient } from './client';
import type { PluginConfig, PluginInput } from './types';
import { DEFAULT_CONFIG } from './types';

export async function initializePlugins(options: {
  config?: Partial<PluginConfig>;
  sessionManager: any;
  toolRegistry: any;
  hookRegistry: any;
  directory: string;
}): Promise<void> {
  const config: PluginConfig = { ...DEFAULT_CONFIG, ...options.config };
  
  const client = createPluginClient(
    options.sessionManager,
    options.toolRegistry,
    options.hookRegistry,
    { directory: options.directory }
  );

  const input: PluginInput = {
    client,
    directory: options.directory,
  };

  const registry = getPluginRegistry(config);
  
  if (config.autoLoad) {
    await registry.loadAll(input);
  }
}
```

## Plugin Example

```typescript
// ~/.supercode/plugins/my-plugin/index.ts
import type { PluginInput, PluginOutput } from 'supercode';

export default function myPlugin(input: PluginInput): PluginOutput {
  return {
    tools: {
      my_tool: {
        name: 'my_tool',
        description: 'My custom tool',
        parameters: { type: 'object', properties: {} },
        execute: async (args, context) => {
          return { success: true, data: 'Hello from plugin!' };
        },
      },
    },
    hooks: [
      {
        name: 'my-hook',
        events: ['session.idle'],
        handler: async (context) => {
          console.log('Session idle:', context.sessionId);
        },
      },
    ],
  };
}
```

## Testing

```typescript
describe('PluginSystem', () => {
  it('should discover plugins');
  it('should load plugin manifest');
  it('should execute plugin factory');
  it('should register tools from plugin');
  it('should register hooks from plugin');
  it('should handle plugin errors');
  it('should unregister plugin');
});
```

## Success Criteria

- [ ] Plugin discovery works
- [ ] Manifest loading works
- [ ] Plugin execution with timeout
- [ ] Tool registration from plugins
- [ ] Hook registration from plugins
- [ ] Plugin unregistration works
- [ ] Error handling for bad plugins
