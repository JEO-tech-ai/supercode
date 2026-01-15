import { existsSync, watch } from "fs";
import path from "path";
import type { LoadedPlugin, PluginConfig, PluginInput } from "./types";
import { loadPlugin, resolvePluginsDir } from "./loader";
import { getPluginRegistry } from "./registry";
import logger from "../shared/logger";

export interface PluginLifecycle {
  close: () => void;
}

type PluginRegistryShape = {
  register: (plugin: LoadedPlugin) => Promise<void>;
  unregister: (name: string) => boolean;
  list: () => LoadedPlugin[];
};

function getRegistry(config: PluginConfig): PluginRegistryShape {
  return getPluginRegistry(config) as PluginRegistryShape;
}

function findPluginByPath(
  registry: PluginRegistryShape,
  pluginPath: string
): LoadedPlugin | undefined {
  return registry.list().find((plugin) => plugin.path === pluginPath);
}

export function startPluginHotReload(
  config: PluginConfig,
  input: PluginInput
): PluginLifecycle {
  if (!config.enableHotReload) {
    return { close: () => {} };
  }

  const pluginsDir = resolvePluginsDir(config.pluginsDir);
  if (!existsSync(pluginsDir)) {
    return { close: () => {} };
  }

  const registry = getRegistry(config);
  const debounceMap = new Map<string, NodeJS.Timeout>();

  const scheduleReload = (pluginPath: string): void => {
    const existing = debounceMap.get(pluginPath);
    if (existing) {
      clearTimeout(existing);
    }

    debounceMap.set(
      pluginPath,
      setTimeout(async () => {
        debounceMap.delete(pluginPath);
        const existingPlugin = findPluginByPath(registry, pluginPath);
        if (existingPlugin) {
          registry.unregister(existingPlugin.manifest.name);
        }

        const plugin = await loadPlugin(pluginPath, input, config);
        if (plugin) {
          await registry.register(plugin);
          logger.info("[plugin] Reloaded plugin", {
            name: plugin.manifest.name,
          });
        }
      }, 200)
    );
  };

  const watcher = watch(pluginsDir, { recursive: false }, (_event, filename) => {
    if (!filename) return;
    const pluginDir = filename.split(path.sep)[0];
    if (!pluginDir) return;
    const pluginPath = path.join(pluginsDir, pluginDir);
    scheduleReload(pluginPath);
  });

  return {
    close: () => {
      watcher.close();
      for (const timeout of debounceMap.values()) {
        clearTimeout(timeout);
      }
      debounceMap.clear();
    },
  };
}
