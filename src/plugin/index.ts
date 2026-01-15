export * from "./types";
export { createPluginClient } from "./client";
export type { PluginClientOptions } from "./client";
export {
  discoverPlugins,
  loadPlugin,
  loadAllPlugins,
  loadPluginManifest,
  resolvePluginsDir,
} from "./loader";
export { getPluginRegistry, resetPluginRegistry } from "./registry";
export { startPluginHotReload } from "./lifecycle";
export type { PluginLifecycle } from "./lifecycle";

import { getPluginRegistry } from "./registry";
import { createPluginClient, PluginClientOptions } from "./client";
import type { PluginConfig, PluginInput } from "./types";
import { DEFAULT_CONFIG } from "./types";

export interface InitializePluginsOptions {
  config?: Partial<PluginConfig>;
  directory: string;
  sessionManager?: PluginClientOptions["sessionManager"];
  toolRegistry?: PluginClientOptions["toolRegistry"];
  onToast?: PluginClientOptions["onToast"];
  onToolRegister?: (name: string, tool: unknown) => void;
  onToolUnregister?: (name: string) => void;
  onHookRegister?: (hook: unknown) => void;
  onHookUnregister?: (name: string) => void;
}

export async function initializePlugins(
  options: InitializePluginsOptions
): Promise<void> {
  const config: PluginConfig = { ...DEFAULT_CONFIG, ...options.config };

  const client = createPluginClient({
    directory: options.directory,
    sessionManager: options.sessionManager,
    toolRegistry: options.toolRegistry,
    onToast: options.onToast,
  });

  const input: PluginInput = {
    client,
    directory: options.directory,
  };

  const registry = getPluginRegistry(config, {
    onToolRegister: options.onToolRegister,
    onToolUnregister: options.onToolUnregister,
    onHookRegister: options.onHookRegister,
    onHookUnregister: options.onHookUnregister,
  });

  if (config.autoLoad) {
    await registry.loadAll(input);
  }
}
