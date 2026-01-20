/**
 * Plugin Hooks System
 * Extended hook management for plugins with new hook types.
 */

import type { PluginContext, PluginHooks, PluginHookEvent } from "./types";
import { getHookRegistry } from "../core/hooks";
import type { HookContext, HookResult } from "../core/types";
import logger from "../shared/logger";

// =============================================================================
// Hook Type Definitions
// =============================================================================

/**
 * Chat message hook input/output
 */
export interface ChatMessageHookInput {
  sessionId: string;
  agent?: string;
  model?: { providerId: string; modelId: string };
  messageId?: string;
  variant?: string;
}

export interface ChatMessageHookOutput {
  message: unknown;
  parts: unknown[];
}

/**
 * Chat params hook input/output
 */
export interface ChatParamsHookInput {
  sessionId: string;
  agent: string;
  model: unknown;
  provider?: unknown;
  message?: unknown;
}

export interface ChatParamsHookOutput {
  temperature: number;
  topP: number;
  topK: number;
  options: Record<string, unknown>;
}

/**
 * Permission ask hook input/output
 */
export interface PermissionAskHookInput {
  tool: string;
  pattern?: string;
  type: string;
  args?: unknown;
}

export interface PermissionAskHookOutput {
  status: "ask" | "deny" | "allow";
}

/**
 * Tool execute hook input/output
 */
export interface ToolExecuteHookInput {
  tool: string;
  sessionId: string;
  callId: string;
}

export interface ToolExecuteBeforeOutput {
  args: unknown;
}

export interface ToolExecuteAfterOutput {
  title: string;
  output: string;
  metadata: unknown;
}

/**
 * Experimental system transform hook
 */
export interface SystemTransformHookInput {
  sessionId: string;
}

export interface SystemTransformHookOutput {
  system: string[];
}

/**
 * Experimental session compacting hook
 */
export interface SessionCompactingHookInput {
  sessionId: string;
}

export interface SessionCompactingHookOutput {
  context: string[];
  prompt?: string;
}

// =============================================================================
// Hook Registry for Plugins
// =============================================================================

type PluginHookHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  output: TOutput
) => Promise<void>;

interface RegisteredPluginHook {
  pluginName: string;
  hookType: keyof PluginHooks;
  handler: PluginHookHandler;
  priority: number;
}

class PluginHookRegistry {
  private hooks: Map<string, RegisteredPluginHook[]> = new Map();

  /**
   * Register a plugin's hooks
   */
  registerPluginHooks(
    pluginName: string,
    hooks: PluginHooks,
    context: PluginContext
  ): void {
    // Event hook
    if (hooks.event) {
      this.registerHook(pluginName, "event", hooks.event);
    }

    // Config hook
    if (hooks.config) {
      this.registerHook(pluginName, "config", hooks.config);
    }

    // Chat hooks
    if (hooks["chat.message"]) {
      this.registerHook(pluginName, "chat.message", hooks["chat.message"]);
    }

    if (hooks["chat.params"]) {
      this.registerHook(pluginName, "chat.params", hooks["chat.params"]);
    }

    // Permission hook
    if (hooks["permission.ask"]) {
      this.registerHook(pluginName, "permission.ask", hooks["permission.ask"]);
    }

    // Tool execution hooks
    if (hooks["tool.execute.before"]) {
      this.registerHook(pluginName, "tool.execute.before", hooks["tool.execute.before"]);
    }

    if (hooks["tool.execute.after"]) {
      this.registerHook(pluginName, "tool.execute.after", hooks["tool.execute.after"]);
    }

    // Experimental hooks
    if (hooks["experimental.chat.messages.transform"]) {
      this.registerHook(
        pluginName,
        "experimental.chat.messages.transform",
        hooks["experimental.chat.messages.transform"]
      );
    }

    if (hooks["experimental.chat.system.transform"]) {
      this.registerHook(
        pluginName,
        "experimental.chat.system.transform",
        hooks["experimental.chat.system.transform"]
      );
    }

    if (hooks["experimental.session.compacting"]) {
      this.registerHook(
        pluginName,
        "experimental.session.compacting",
        hooks["experimental.session.compacting"]
      );
    }

    logger.debug(`[plugin] Registered hooks for ${pluginName}`, {
      hooks: Object.keys(hooks).filter((k) => hooks[k as keyof PluginHooks]),
    });
  }

  private registerHook(
    pluginName: string,
    hookType: keyof PluginHooks,
    handler: PluginHookHandler
  ): void {
    const existing = this.hooks.get(hookType) ?? [];
    existing.push({
      pluginName,
      hookType,
      handler,
      priority: 0,
    });
    this.hooks.set(hookType, existing);
  }

  /**
   * Unregister all hooks for a plugin
   */
  unregisterPluginHooks(pluginName: string): void {
    for (const [hookType, handlers] of this.hooks) {
      this.hooks.set(
        hookType,
        handlers.filter((h) => h.pluginName !== pluginName)
      );
    }
    logger.debug(`[plugin] Unregistered hooks for ${pluginName}`);
  }

  /**
   * Trigger a hook with input/output pattern
   */
  async trigger<TInput, TOutput>(
    hookType: keyof PluginHooks,
    input: TInput,
    output: TOutput
  ): Promise<TOutput> {
    const handlers = this.hooks.get(hookType) ?? [];

    for (const { pluginName, handler } of handlers) {
      try {
        await handler(input, output);
      } catch (error) {
        logger.error(`[plugin] Hook ${hookType} failed for ${pluginName}:`, error);
      }
    }

    return output;
  }

  /**
   * Check if any hooks are registered for a type
   */
  hasHooks(hookType: keyof PluginHooks): boolean {
    const handlers = this.hooks.get(hookType);
    return !!handlers && handlers.length > 0;
  }

  /**
   * Get all registered hook types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear();
  }
}

// Singleton instance
let pluginHookRegistryInstance: PluginHookRegistry | null = null;

export function getPluginHookRegistry(): PluginHookRegistry {
  if (!pluginHookRegistryInstance) {
    pluginHookRegistryInstance = new PluginHookRegistry();
  }
  return pluginHookRegistryInstance;
}

export function resetPluginHookRegistry(): void {
  if (pluginHookRegistryInstance) {
    pluginHookRegistryInstance.clear();
    pluginHookRegistryInstance = null;
  }
}

// =============================================================================
// Integration with Core Hook Registry
// =============================================================================

/**
 * Bridge plugin hooks to core hook registry
 */
export function bridgePluginHooksToCore(context: PluginContext): void {
  const coreRegistry = getHookRegistry();
  const pluginRegistry = getPluginHookRegistry();

  // Bridge tool.execute.before to tool.before
  if (pluginRegistry.hasHooks("tool.execute.before")) {
    coreRegistry.register({
      name: "plugin-tool-before-bridge",
      events: ["tool.before"],
      priority: 50,
      handler: async (ctx: HookContext): Promise<HookResult | void> => {
        const input: ToolExecuteHookInput = {
          tool: ctx.toolName ?? "",
          sessionId: ctx.sessionId,
          callId: `${ctx.sessionId}_${Date.now()}`,
        };
        const output: ToolExecuteBeforeOutput = { args: ctx.data };

        await pluginRegistry.trigger("tool.execute.before", input, output);

        // Return modified args if changed
        if (output.args !== ctx.data) {
          return { modified: output.args };
        }
      },
    });
  }

  // Bridge tool.execute.after to tool.after
  if (pluginRegistry.hasHooks("tool.execute.after")) {
    coreRegistry.register({
      name: "plugin-tool-after-bridge",
      events: ["tool.after"],
      priority: 50,
      handler: async (ctx: HookContext): Promise<HookResult | void> => {
        const input: ToolExecuteHookInput = {
          tool: ctx.toolName ?? "",
          sessionId: ctx.sessionId,
          callId: `${ctx.sessionId}_${Date.now()}`,
        };
        const output: ToolExecuteAfterOutput = {
          title: ctx.toolName ?? "",
          output: String(ctx.toolResult ?? ""),
          metadata: {},
        };

        await pluginRegistry.trigger("tool.execute.after", input, output);
      },
    });
  }

  // Bridge permission.ask (will be called from permission manager)
  // This is handled differently - see permission integration

  logger.debug("[plugin] Bridged plugin hooks to core registry");
}

// =============================================================================
// Permission Hook Integration
// =============================================================================

/**
 * Trigger permission.ask hooks and return modified status
 */
export async function triggerPermissionAskHooks(
  tool: string,
  pattern?: string,
  args?: unknown
): Promise<"ask" | "deny" | "allow" | null> {
  const registry = getPluginHookRegistry();

  if (!registry.hasHooks("permission.ask")) {
    return null;
  }

  const input: PermissionAskHookInput = {
    tool,
    pattern,
    type: "permission",
    args,
  };
  const output: PermissionAskHookOutput = { status: "ask" };

  await registry.trigger("permission.ask", input, output);

  return output.status;
}

// =============================================================================
// Chat Hook Helpers
// =============================================================================

/**
 * Trigger chat.params hooks
 */
export async function triggerChatParamsHooks(
  input: ChatParamsHookInput,
  defaults: ChatParamsHookOutput
): Promise<ChatParamsHookOutput> {
  const registry = getPluginHookRegistry();

  if (!registry.hasHooks("chat.params")) {
    return defaults;
  }

  const output = { ...defaults };
  await registry.trigger("chat.params", input, output);
  return output;
}

/**
 * Trigger chat.message hooks
 */
export async function triggerChatMessageHooks(
  input: ChatMessageHookInput,
  output: ChatMessageHookOutput
): Promise<void> {
  const registry = getPluginHookRegistry();

  if (!registry.hasHooks("chat.message")) {
    return;
  }

  await registry.trigger("chat.message", input, output);
}

/**
 * Trigger experimental.chat.system.transform hooks
 */
export async function triggerSystemTransformHooks(
  sessionId: string,
  system: string[]
): Promise<string[]> {
  const registry = getPluginHookRegistry();

  if (!registry.hasHooks("experimental.chat.system.transform")) {
    return system;
  }

  const input: SystemTransformHookInput = { sessionId };
  const output: SystemTransformHookOutput = { system: [...system] };

  await registry.trigger("experimental.chat.system.transform", input, output);
  return output.system;
}
