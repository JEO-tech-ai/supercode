import type { LoadedPlugin, PluginConfig, PluginInput } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { loadAllPlugins } from "./loader";
import logger from "../shared/logger";

interface RegistryCallbacks {
  onToolRegister?: (name: string, tool: unknown) => void;
  onToolUnregister?: (name: string) => void;
  onHookRegister?: (hook: unknown) => void;
  onHookUnregister?: (name: string) => void;
}

class PluginRegistry {
  private plugins = new Map<string, LoadedPlugin>();
  private config: PluginConfig;
  private callbacks: RegistryCallbacks;

  constructor(config: PluginConfig, callbacks: RegistryCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
  }

  async loadAll(input: PluginInput): Promise<void> {
    const plugins = await loadAllPlugins(this.config, input);

    for (const plugin of plugins) {
      await this.register(plugin);
    }

    logger.info("[plugin] Loaded plugins", { count: plugins.length });
  }

  async register(plugin: LoadedPlugin): Promise<void> {
    const { manifest, output } = plugin;

    if (output.tools) {
      for (const [name, tool] of Object.entries(output.tools)) {
        if (this.callbacks.onToolRegister) {
          this.callbacks.onToolRegister(name, { ...tool, name });
        }
        logger.info("[plugin] Registered tool", {
          plugin: manifest.name,
          tool: name,
        });
      }
    }

    if (output.hooks) {
      for (const hook of output.hooks) {
        if (this.callbacks.onHookRegister) {
          this.callbacks.onHookRegister(hook);
        }
        logger.info("[plugin] Registered hook", {
          plugin: manifest.name,
          hook: hook.name,
        });
      }
    }

    if (output.agents) {
      for (const [name] of Object.entries(output.agents)) {
        logger.info("[plugin] Registered agent", {
          plugin: manifest.name,
          agent: name,
        });
      }
    }

    this.plugins.set(manifest.name, plugin);
  }

  unregister(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;

    if (plugin.output.tools) {
      for (const toolName of Object.keys(plugin.output.tools)) {
        if (this.callbacks.onToolUnregister) {
          this.callbacks.onToolUnregister(toolName);
        }
      }
    }

    if (plugin.output.hooks) {
      for (const hook of plugin.output.hooks) {
        if (this.callbacks.onHookUnregister) {
          this.callbacks.onHookUnregister(hook.name);
        }
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
      active: plugins.filter((p) => p.status === "active").length,
      error: plugins.filter((p) => p.status === "error").length,
      tools: plugins.reduce(
        (sum, p) => sum + Object.keys(p.output.tools ?? {}).length,
        0
      ),
      hooks: plugins.reduce(
        (sum, p) => sum + (p.output.hooks?.length ?? 0),
        0
      ),
    };
  }
}

let registryInstance: PluginRegistry | null = null;

export function getPluginRegistry(
  config?: PluginConfig,
  callbacks?: RegistryCallbacks
): PluginRegistry {
  if (!registryInstance) {
    registryInstance = new PluginRegistry(
      config ?? DEFAULT_CONFIG,
      callbacks
    );
  }
  return registryInstance;
}

export function resetPluginRegistry(): void {
  registryInstance = null;
}
