import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type {
  PluginManifest,
  LoadedPlugin,
  PluginFactory,
  PluginInput,
  PluginConfig,
  Plugin,
  PluginOutput,
  PluginContext,
} from "./types";
import { createPluginContext } from "./context";
import { registerPluginTools, unregisterPluginTools } from "./tools";
import { getPluginHookRegistry } from "./hooks";
import logger from "../shared/logger";

// =============================================================================
// Path Resolution
// =============================================================================

export function resolvePluginsDir(dir: string): string {
  if (dir.startsWith("~")) {
    return path.join(os.homedir(), dir.slice(1));
  }
  return dir;
}

/**
 * Resolve a plugin source to a loadable path
 * Supports: npm packages, local paths, URLs
 */
export function resolvePluginSource(source: string, baseDir: string): string {
  // Local path (relative or absolute)
  if (source.startsWith("./") || source.startsWith("../") || path.isAbsolute(source)) {
    return path.resolve(baseDir, source);
  }

  // npm package - will be resolved by import()
  return source;
}

// =============================================================================
// Plugin Discovery
// =============================================================================

export async function discoverPlugins(config: PluginConfig): Promise<string[]> {
  const dir = resolvePluginsDir(config.pluginsDir);
  const pluginPaths: string[] = [];

  // Discover from plugins directory
  if (fs.existsSync(dir)) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const manifestPath = path.join(dir, entry.name, "manifest.json");
      if (fs.existsSync(manifestPath)) {
        pluginPaths.push(path.join(dir, entry.name));
      }
    }
  }

  // Add configured sources
  if (config.sources) {
    for (const source of config.sources) {
      pluginPaths.push(resolvePluginSource(source, process.cwd()));
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

/**
 * Check if result is a Plugin interface (has name and version)
 */
function isPluginInterface(result: unknown): result is Plugin {
  return (
    typeof result === "object" &&
    result !== null &&
    "name" in result &&
    "version" in result
  );
}

/**
 * Convert Plugin interface to PluginOutput for compatibility
 */
function pluginToOutput(plugin: Plugin): PluginOutput {
  return {
    tools: plugin.tools as PluginOutput["tools"],
    hooks: plugin.legacyHooks,
    agents: {},
    commands: {},
  };
}

export async function loadPlugin(
  pluginPath: string,
  input: PluginInput,
  config: PluginConfig
): Promise<LoadedPlugin | null> {
  // Check if it's a directory with manifest or a direct file/package
  const isDirectory = fs.existsSync(pluginPath) && fs.statSync(pluginPath).isDirectory();

  let manifest: PluginManifest;
  let mainPath: string;

  if (isDirectory) {
    const loadedManifest = await loadPluginManifest(pluginPath);
    if (!loadedManifest) return null;
    manifest = loadedManifest;
    mainPath = path.join(pluginPath, manifest.main);

    if (!fs.existsSync(mainPath)) {
      logger.error("[plugin] Main file not found", { path: mainPath });
      return null;
    }
  } else {
    // Direct file or npm package
    mainPath = pluginPath;
    manifest = {
      name: path.basename(pluginPath, path.extname(pluginPath)),
      version: "0.0.0",
      main: pluginPath,
    };
  }

  try {
    const module = await import(mainPath);
    const factory: PluginFactory =
      module.default ?? module.plugin ?? module;

    if (typeof factory !== "function") {
      throw new Error("Plugin must export a function");
    }

    const result = await Promise.race([
      factory(input),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Plugin load timeout")),
          config.timeout
        )
      ),
    ]);

    // Handle both Plugin and PluginOutput formats
    let output: PluginOutput;
    let plugin: Plugin | undefined;

    if (isPluginInterface(result)) {
      plugin = result;
      output = pluginToOutput(result);
      // Update manifest from plugin if available
      manifest.name = result.name;
      manifest.version = result.version;
      if (result.description) manifest.description = result.description;
      if (result.author) manifest.author = result.author;
    } else {
      output = result as PluginOutput;
    }

    return {
      manifest,
      output,
      plugin,
      path: pluginPath,
      loadedAt: new Date(),
      status: "active",
    };
  } catch (error) {
    logger.error("[plugin] Failed to load plugin", {
      name: manifest.name,
      path: pluginPath,
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

/**
 * Load a plugin with full context (new style)
 */
export async function loadPluginWithContext(
  pluginPath: string,
  context: PluginContext,
  config: PluginConfig
): Promise<LoadedPlugin | null> {
  const loaded = await loadPlugin(
    pluginPath,
    { client: context.client, directory: context.directory, config: context.config },
    config
  );

  if (!loaded || loaded.status === "error") {
    return loaded;
  }

  // Handle lifecycle and registration for Plugin interface
  if (loaded.plugin) {
    try {
      // Call onLoad lifecycle
      if (loaded.plugin.onLoad) {
        await loaded.plugin.onLoad(context);
      }

      // Register tools
      if (loaded.plugin.tools) {
        registerPluginTools(loaded.plugin.tools, loaded.manifest.name, context);
      }

      // Register hooks
      if (loaded.plugin.hooks) {
        const hookRegistry = getPluginHookRegistry();
        hookRegistry.registerPluginHooks(loaded.manifest.name, loaded.plugin.hooks, context);
      }

      logger.info("[plugin] Loaded plugin with context", {
        name: loaded.manifest.name,
        tools: Object.keys(loaded.plugin.tools ?? {}).length,
        hooks: Object.keys(loaded.plugin.hooks ?? {}).length,
      });
    } catch (error) {
      logger.error("[plugin] Plugin initialization failed", {
        name: loaded.manifest.name,
        error,
      });
      loaded.status = "error";
      loaded.error = error as Error;
    }
  }

  return loaded;
}

/**
 * Unload a plugin (cleanup)
 */
export async function unloadPlugin(
  loaded: LoadedPlugin,
  context: PluginContext
): Promise<void> {
  if (loaded.plugin) {
    try {
      // Call onUnload lifecycle
      if (loaded.plugin.onUnload) {
        await loaded.plugin.onUnload(context);
      }

      // Unregister tools
      if (loaded.plugin.tools) {
        const toolNames = Object.keys(loaded.plugin.tools).map(
          (name) => `${loaded.manifest.name}.${name}`
        );
        unregisterPluginTools(toolNames);
      }

      // Unregister hooks
      const hookRegistry = getPluginHookRegistry();
      hookRegistry.unregisterPluginHooks(loaded.manifest.name);

      logger.info("[plugin] Unloaded plugin", { name: loaded.manifest.name });
    } catch (error) {
      logger.error("[plugin] Plugin unload failed", {
        name: loaded.manifest.name,
        error,
      });
    }
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

/**
 * Load all plugins with full context
 */
export async function loadAllPluginsWithContext(
  config: PluginConfig,
  context: PluginContext
): Promise<LoadedPlugin[]> {
  const pluginPaths = await discoverPlugins(config);
  const plugins: LoadedPlugin[] = [];

  for (const pluginPath of pluginPaths) {
    const plugin = await loadPluginWithContext(pluginPath, context, config);
    if (plugin) {
      plugins.push(plugin);
    }
  }

  return plugins;
}
