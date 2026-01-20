/**
 * Plugin Tools System
 * Tool registration and permission wrapping for plugins.
 */

import type {
  PluginToolDefinition,
  ToolContext,
  PluginContext,
} from "./types";
import type { ToolDefinition, ToolResult } from "../core/types";
import {
  createPermissionRequest,
  type IPermissionManager,
} from "../core/permission";
import { getToolRegistry } from "../core/tools";
import logger from "../shared/logger";

// =============================================================================
// Tool Conversion
// =============================================================================

/**
 * Convert a PluginToolDefinition to a core ToolDefinition
 */
export function convertPluginTool(
  name: string,
  pluginTool: PluginToolDefinition,
  pluginName: string,
  permission: IPermissionManager
): ToolDefinition {
  // Extract parameter info from Zod schema
  const parameters = extractParametersFromZod(pluginTool.args);

  return {
    name,
    description: pluginTool.description,
    parameters,
    execute: async (
      args: Record<string, unknown>,
      coreContext: { sessionId: string; workdir: string }
    ): Promise<ToolResult> => {
      const toolContext: ToolContext = {
        sessionId: coreContext.sessionId,
        workdir: coreContext.workdir,
        abort: new AbortController().signal,
      };

      try {
        // Permission check if required
        if (pluginTool.requiresPermission !== false) {
          const permissionResult = await checkToolPermission(
            name,
            args,
            permission,
            pluginTool.riskLevel
          );

          if (permissionResult.decision === "deny") {
            return {
              success: false,
              error: `Permission denied: ${permissionResult.reason ?? "Access not allowed"}`,
            };
          }

          if (permissionResult.decision === "ask" && permissionResult.requiresUserInput) {
            // In async context, we need to wait for user input
            // This will be handled by the permission manager
            return {
              success: false,
              error: "Permission required. Please approve the action.",
            };
          }
        }

        // Validate args with Zod
        const validationResult = pluginTool.args.safeParse(args);
        if (!validationResult.success) {
          return {
            success: false,
            error: `Invalid arguments: ${validationResult.error.message}`,
          };
        }

        // Execute the tool
        const output = await pluginTool.execute(validationResult.data, toolContext);

        return {
          success: true,
          output,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[plugin] Tool ${name} from ${pluginName} failed:`, error);

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
  };
}

/**
 * Extract parameter definitions from Zod schema
 */
function extractParametersFromZod(
  schema: PluginToolDefinition["args"]
): ToolDefinition["parameters"] {
  const shape = schema.shape;
  const parameters: ToolDefinition["parameters"] = [];

  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as { _def?: { typeName?: string; description?: string }; isOptional?: () => boolean };
    const typeName = zodType._def?.typeName ?? "ZodString";
    const description = zodType._def?.description ?? "";
    const isOptional = typeof zodType.isOptional === "function" ? zodType.isOptional() : false;

    let type: "string" | "number" | "boolean" | "array" | "object" = "string";
    switch (typeName) {
      case "ZodNumber":
        type = "number";
        break;
      case "ZodBoolean":
        type = "boolean";
        break;
      case "ZodArray":
        type = "array";
        break;
      case "ZodObject":
        type = "object";
        break;
      default:
        type = "string";
    }

    parameters.push({
      name: key,
      type,
      description,
      required: !isOptional,
    });
  }

  return parameters;
}

/**
 * Check permission for tool execution
 */
async function checkToolPermission(
  toolName: string,
  args: Record<string, unknown>,
  permission: IPermissionManager,
  riskLevel?: "low" | "medium" | "high" | "critical"
) {
  const request = createPermissionRequest(toolName, args, {
    description: `Plugin tool: ${toolName}`,
    riskLevel: riskLevel ?? "medium",
  });

  return permission.check(request);
}

// =============================================================================
// Tool Registry Integration
// =============================================================================

/**
 * Register plugin tools with the core tool registry
 */
export function registerPluginTools(
  tools: Record<string, PluginToolDefinition>,
  pluginName: string,
  context: PluginContext
): string[] {
  const registry = getToolRegistry();
  const registeredNames: string[] = [];

  for (const [name, toolDef] of Object.entries(tools)) {
    // Add plugin prefix to avoid conflicts
    const fullName = `${pluginName}.${name}`;

    // Set the name on the tool definition
    const toolWithName: PluginToolDefinition = {
      ...toolDef,
      name: fullName,
    };

    // Convert and register
    const coreTool = convertPluginTool(
      fullName,
      toolWithName,
      pluginName,
      context.permission
    );

    registry.register(coreTool);
    registeredNames.push(fullName);

    logger.debug(`[plugin] Registered tool: ${fullName}`);
  }

  return registeredNames;
}

/**
 * Unregister plugin tools from the core tool registry
 */
export function unregisterPluginTools(
  toolNames: string[]
): void {
  const registry = getToolRegistry();

  for (const name of toolNames) {
    registry.unregister(name);
    logger.debug(`[plugin] Unregistered tool: ${name}`);
  }
}

// =============================================================================
// Tool Wrapper with Hooks
// =============================================================================

/**
 * Create a wrapped tool that triggers hooks before/after execution
 */
export function createHookedTool(
  tool: ToolDefinition,
  hooks: {
    before?: (name: string, args: unknown) => Promise<unknown>;
    after?: (name: string, result: ToolResult) => Promise<void>;
  }
): ToolDefinition {
  return {
    ...tool,
    execute: async (args, context) => {
      // Before hook
      const modifiedArgs = hooks.before
        ? await hooks.before(tool.name, args)
        : args;

      // Execute
      const result = await tool.execute(
        modifiedArgs as Record<string, unknown>,
        context
      );

      // After hook
      if (hooks.after) {
        await hooks.after(tool.name, result);
      }

      return result;
    },
  };
}

// =============================================================================
// Plugin Tool Builder
// =============================================================================

/**
 * Builder for creating plugin tools with fluent API
 */
export class PluginToolBuilder<TArgs extends Record<string, unknown> = Record<string, unknown>> {
  private _name = "";
  private _description = "";
  private _args: PluginToolDefinition["args"] | null = null;
  private _execute: ((args: TArgs, ctx: ToolContext) => Promise<string>) | null = null;
  private _requiresPermission = true;
  private _riskLevel: "low" | "medium" | "high" | "critical" = "medium";

  name(name: string): this {
    this._name = name;
    return this;
  }

  description(description: string): this {
    this._description = description;
    return this;
  }

  args<T extends PluginToolDefinition["args"]>(schema: T): PluginToolBuilder<T["_output"]> {
    this._args = schema;
    return this as unknown as PluginToolBuilder<T["_output"]>;
  }

  execute(fn: (args: TArgs, ctx: ToolContext) => Promise<string>): this {
    this._execute = fn;
    return this;
  }

  requiresPermission(value: boolean): this {
    this._requiresPermission = value;
    return this;
  }

  riskLevel(level: "low" | "medium" | "high" | "critical"): this {
    this._riskLevel = level;
    return this;
  }

  build(): PluginToolDefinition {
    if (!this._args) {
      throw new Error("Tool args schema is required");
    }
    if (!this._execute) {
      throw new Error("Tool execute function is required");
    }

    return {
      name: this._name,
      description: this._description,
      args: this._args,
      execute: this._execute as (args: unknown, ctx: ToolContext) => Promise<string>,
      requiresPermission: this._requiresPermission,
      riskLevel: this._riskLevel,
    };
  }
}

/**
 * Create a new tool builder
 */
export function toolBuilder(): PluginToolBuilder {
  return new PluginToolBuilder();
}
