/**
 * Plugin System
 * Extended plugin architecture with lifecycle, hooks, and tool support.
 *
 * @example
 * ```typescript
 * import { initializePlugins, defineTool } from '~/plugin';
 *
 * // Initialize plugin system
 * await initializePlugins({
 *   directory: process.cwd(),
 *   config: {
 *     sources: ['my-plugin-package', './local-plugin.ts']
 *   }
 * });
 *
 * // Define a tool in a plugin
 * const myTool = defineTool({
 *   description: 'My custom tool',
 *   args: { input: defineTool.schema.string() },
 *   execute: async (args) => args.input.toUpperCase()
 * });
 * ```
 */

// Types
export * from "./types";
export { defineTool } from "./types";

// Context
export {
  createPluginContext,
  createTestPluginContext,
  type CreatePluginContextOptions,
} from "./context";

// Client
export { createPluginClient } from "./client";
export type { PluginClientOptions } from "./client";

// Loader
export {
  discoverPlugins,
  loadPlugin,
  loadPluginWithContext,
  loadAllPlugins,
  loadAllPluginsWithContext,
  loadPluginManifest,
  resolvePluginsDir,
  resolvePluginSource,
  unloadPlugin,
} from "./loader";

// Registry
export { getPluginRegistry, resetPluginRegistry } from "./registry";

// Lifecycle
export { startPluginHotReload } from "./lifecycle";
export type { PluginLifecycle } from "./lifecycle";

// Hooks
export {
  getPluginHookRegistry,
  resetPluginHookRegistry,
  bridgePluginHooksToCore,
  triggerPermissionAskHooks,
  triggerChatParamsHooks,
  triggerChatMessageHooks,
  triggerSystemTransformHooks,
} from "./hooks";

// Tools
export {
  convertPluginTool,
  registerPluginTools,
  unregisterPluginTools,
  createHookedTool,
  toolBuilder,
  PluginToolBuilder,
} from "./tools";

// =============================================================================
// Main Initialization
// =============================================================================

import { getPluginRegistry } from "./registry";
import { createPluginClient, type PluginClientOptions } from "./client";
import { createPluginContext } from "./context";
import { loadAllPluginsWithContext } from "./loader";
import { bridgePluginHooksToCore } from "./hooks";
import type { PluginConfig, PluginInput, PluginContext } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { getPermissionManager } from "../core/permission";
import logger from "../shared/logger";

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
  /** Use new context-based loading (recommended) */
  useContext?: boolean;
}

/**
 * Initialize the plugin system
 */
export async function initializePlugins(
  options: InitializePluginsOptions
): Promise<PluginContext | void> {
  const config: PluginConfig = { ...DEFAULT_CONFIG, ...options.config };

  const client = createPluginClient({
    directory: options.directory,
    sessionManager: options.sessionManager,
    toolRegistry: options.toolRegistry,
    onToast: options.onToast,
  });

  // Use new context-based loading if requested
  if (options.useContext) {
    const context = await createPluginContext({
      client,
      directory: options.directory,
      permission: getPermissionManager(),
    });

    if (config.autoLoad) {
      const plugins = await loadAllPluginsWithContext(config, context);

      // Bridge hooks to core
      bridgePluginHooksToCore(context);

      logger.info("[plugin] Initialized with context", {
        plugins: plugins.length,
        active: plugins.filter((p) => p.status === "active").length,
      });
    }

    return context;
  }

  // Legacy loading
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
