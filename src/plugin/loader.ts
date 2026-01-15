import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type {
  PluginManifest,
  LoadedPlugin,
  PluginFactory,
  PluginInput,
  PluginConfig,
} from "./types";
import logger from "../shared/logger";

export function resolvePluginsDir(dir: string): string {
  if (dir.startsWith("~")) {
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

    const manifestPath = path.join(dir, entry.name, "manifest.json");
    if (fs.existsSync(manifestPath)) {
      pluginPaths.push(path.join(dir, entry.name));
    }
  }

  return pluginPaths;
}

export async function loadPluginManifest(
  pluginPath: string
): Promise<PluginManifest | null> {
  const manifestPath = path.join(pluginPath, "manifest.json");

  try {
    const content = fs.readFileSync(manifestPath, "utf-8");
    return JSON.parse(content) as PluginManifest;
  } catch (error) {
    logger.error("[plugin] Failed to load manifest", {
      path: pluginPath,
      error,
    });
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
    logger.error("[plugin] Main file not found", { path: mainPath });
    return null;
  }

  try {
    const module = await import(mainPath);
    const factory: PluginFactory =
      module.default ?? module.plugin ?? module;

    if (typeof factory !== "function") {
      throw new Error("Plugin must export a function");
    }

    const output = await Promise.race([
      factory(input),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Plugin load timeout")),
          config.timeout
        )
      ),
    ]);

    return {
      manifest,
      output,
      path: pluginPath,
      loadedAt: new Date(),
      status: "active",
    };
  } catch (error) {
    logger.error("[plugin] Failed to load plugin", {
      name: manifest.name,
      error,
    });
    return {
      manifest,
      output: {},
      path: pluginPath,
      loadedAt: new Date(),
      status: "error",
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
