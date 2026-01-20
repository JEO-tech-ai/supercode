import { expect, test, describe, beforeEach, afterEach, mock } from "bun:test";
import { z } from "zod";
import {
  createPluginContext,
  createTestPluginContext,
  type CreatePluginContextOptions,
} from "../../src/plugin/context";
import {
  getPluginHookRegistry,
  resetPluginHookRegistry,
  triggerPermissionAskHooks,
  triggerChatParamsHooks,
  type ChatParamsHookInput,
  type ChatParamsHookOutput,
} from "../../src/plugin/hooks";
import {
  convertPluginTool,
  registerPluginTools,
  unregisterPluginTools,
  toolBuilder,
  PluginToolBuilder,
} from "../../src/plugin/tools";
import {
  resolvePluginsDir,
  resolvePluginSource,
} from "../../src/plugin/loader";
import {
  defineTool,
  type PluginToolDefinition,
  type PluginContext,
  type PluginHooks,
  type PluginClient,
} from "../../src/plugin/types";
import { createPermissionManager, resetPermissionManager } from "../../src/core/permission";
import { getToolRegistry, resetToolRegistry } from "../../src/core/tools";

// =============================================================================
// Test Plugin Context
// =============================================================================

describe("Plugin Context", () => {
  test("createTestPluginContext creates minimal context", () => {
    const context = createTestPluginContext();

    expect(context.directory).toBe("/tmp/test");
    expect(context.project.name).toBe("test");
    expect(context.shell).toBeDefined();
    expect(context.config).toEqual({});
  });

  test("createTestPluginContext accepts overrides", () => {
    const context = createTestPluginContext({
      directory: "/custom/path",
      config: { debug: true },
    });

    expect(context.directory).toBe("/custom/path");
    expect(context.config).toEqual({ debug: true });
  });

  test("createPluginContext creates shell interface", async () => {
    const mockClient: PluginClient = {
      session: {
        messages: async () => ({ data: [] }),
        prompt: async () => {},
        abort: async () => {},
        todo: async () => ({ data: [] }),
      },
      tui: { showToast: async () => {} },
      tool: { execute: async () => ({}) },
    };

    const context = await createPluginContext({
      client: mockClient,
      directory: "/tmp/test-context",
      config: { test: true },
    });

    expect(context.directory).toBe("/tmp/test-context");
    expect(context.shell).toBeDefined();
    expect(context.config).toEqual({ test: true });
    expect(context.project.path).toBe("/tmp/test-context");
  });
});

// =============================================================================
// Test Plugin Hook Registry
// =============================================================================

describe("Plugin Hook Registry", () => {
  beforeEach(() => {
    resetPluginHookRegistry();
  });

  afterEach(() => {
    resetPluginHookRegistry();
  });

  test("should register and retrieve hooks", () => {
    const registry = getPluginHookRegistry();
    const context = createTestPluginContext();

    const hooks: PluginHooks = {
      event: async () => {},
    };

    registry.registerPluginHooks("test-plugin", hooks, context);

    expect(registry.hasHooks("event")).toBe(true);
    expect(registry.getRegisteredTypes()).toContain("event");
  });

  test("should unregister plugin hooks", () => {
    const registry = getPluginHookRegistry();
    const context = createTestPluginContext();

    registry.registerPluginHooks("test-plugin", { event: async () => {} }, context);
    expect(registry.hasHooks("event")).toBe(true);

    registry.unregisterPluginHooks("test-plugin");
    expect(registry.hasHooks("event")).toBe(false);
  });

  test("should trigger hooks with input/output", async () => {
    const registry = getPluginHookRegistry();
    const context = createTestPluginContext();
    let triggered = false;

    const hooks: PluginHooks = {
      "permission.ask": async (input, output) => {
        triggered = true;
        output.status = "allow";
      },
    };

    registry.registerPluginHooks("test-plugin", hooks, context);

    const output = { status: "ask" as const };
    await registry.trigger(
      "permission.ask",
      { tool: "Test", type: "permission" },
      output
    );

    expect(triggered).toBe(true);
    expect(output.status).toBe("allow");
  });

  test("should register multiple hook types", () => {
    const registry = getPluginHookRegistry();
    const context = createTestPluginContext();

    const hooks: PluginHooks = {
      event: async () => {},
      "chat.message": async () => {},
      "chat.params": async () => {},
      "permission.ask": async () => {},
      "tool.execute.before": async () => {},
      "tool.execute.after": async () => {},
    };

    registry.registerPluginHooks("multi-hook-plugin", hooks, context);

    expect(registry.hasHooks("event")).toBe(true);
    expect(registry.hasHooks("chat.message")).toBe(true);
    expect(registry.hasHooks("chat.params")).toBe(true);
    expect(registry.hasHooks("permission.ask")).toBe(true);
    expect(registry.hasHooks("tool.execute.before")).toBe(true);
    expect(registry.hasHooks("tool.execute.after")).toBe(true);
  });

  test("should clear all hooks", () => {
    const registry = getPluginHookRegistry();
    const context = createTestPluginContext();

    registry.registerPluginHooks("plugin1", { event: async () => {} }, context);
    registry.registerPluginHooks("plugin2", { "chat.message": async () => {} }, context);

    registry.clear();

    expect(registry.hasHooks("event")).toBe(false);
    expect(registry.hasHooks("chat.message")).toBe(false);
    expect(registry.getRegisteredTypes()).toEqual([]);
  });
});

// =============================================================================
// Test Hook Helper Functions
// =============================================================================

describe("Hook Helper Functions", () => {
  beforeEach(() => {
    resetPluginHookRegistry();
  });

  afterEach(() => {
    resetPluginHookRegistry();
  });

  test("triggerPermissionAskHooks returns null when no hooks", async () => {
    const result = await triggerPermissionAskHooks("Bash", "rm *");
    expect(result).toBeNull();
  });

  test("triggerPermissionAskHooks returns modified status", async () => {
    const registry = getPluginHookRegistry();
    const context = createTestPluginContext();

    registry.registerPluginHooks(
      "test",
      {
        "permission.ask": async (input, output) => {
          if (input.tool === "Bash") {
            output.status = "deny";
          }
        },
      },
      context
    );

    const result = await triggerPermissionAskHooks("Bash", undefined, { command: "rm" });
    expect(result).toBe("deny");
  });

  test("triggerChatParamsHooks returns defaults when no hooks", async () => {
    const input: ChatParamsHookInput = {
      sessionId: "test",
      agent: "default",
      model: { providerId: "test", modelId: "test" },
    };
    const defaults: ChatParamsHookOutput = {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      options: {},
    };

    const result = await triggerChatParamsHooks(input, defaults);
    expect(result).toEqual(defaults);
  });

  test("triggerChatParamsHooks returns modified params", async () => {
    const registry = getPluginHookRegistry();
    const context = createTestPluginContext();

    registry.registerPluginHooks(
      "test",
      {
        "chat.params": async (input, output) => {
          output.temperature = 0.5;
          output.options = { maxTokens: 1000 };
        },
      },
      context
    );

    const result = await triggerChatParamsHooks(
      { sessionId: "test", agent: "default", model: {} },
      { temperature: 0.7, topP: 0.9, topK: 40, options: {} }
    );

    expect(result.temperature).toBe(0.5);
    expect(result.options).toEqual({ maxTokens: 1000 });
  });
});

// =============================================================================
// Test Plugin Tools
// =============================================================================

describe("Plugin Tools", () => {
  beforeEach(() => {
    resetPermissionManager();
    resetToolRegistry();
  });

  afterEach(() => {
    resetPermissionManager();
    resetToolRegistry();
  });

  test("defineTool creates tool definition", () => {
    const tool = defineTool({
      description: "Test tool",
      args: { name: z.string() },
      execute: async (args) => `Hello ${args.name}`,
    });

    expect(tool.description).toBe("Test tool");
    expect(tool.args).toBeDefined();
    expect(tool.execute).toBeDefined();
  });

  test("defineTool.schema provides zod helpers", () => {
    expect(defineTool.schema.string()).toBeDefined();
    expect(defineTool.schema.number()).toBeDefined();
    expect(defineTool.schema.boolean()).toBeDefined();
    expect(defineTool.schema.array(z.string())).toBeDefined();
    expect(defineTool.schema.object({ key: z.string() })).toBeDefined();
    expect(defineTool.schema.optional(z.string())).toBeDefined();
  });

  test("toolBuilder creates tool with fluent API", () => {
    const builder = new PluginToolBuilder();
    const tool = builder
      .name("my-tool")
      .description("A test tool")
      .args(z.object({ input: z.string() }))
      .execute(async (args) => args.input.toUpperCase())
      .requiresPermission(true)
      .riskLevel("low")
      .build();

    expect(tool.name).toBe("my-tool");
    expect(tool.description).toBe("A test tool");
    expect(tool.requiresPermission).toBe(true);
    expect(tool.riskLevel).toBe("low");
  });

  test("toolBuilder throws if args not set", () => {
    const builder = new PluginToolBuilder();
    builder.name("test").description("test");

    expect(() => builder.build()).toThrow("Tool args schema is required");
  });

  test("toolBuilder throws if execute not set", () => {
    const builder = new PluginToolBuilder();
    builder.name("test").description("test").args(z.object({}));

    expect(() => builder.build()).toThrow("Tool execute function is required");
  });

  test("convertPluginTool creates core tool definition", () => {
    const permission = createPermissionManager();
    const pluginTool: PluginToolDefinition = {
      description: "Test tool",
      args: z.object({
        input: z.string().describe("Input value"),
      }),
      execute: async (args) => `Processed: ${args.input}`,
    };

    const coreTool = convertPluginTool("test.tool", pluginTool, "test", permission);

    expect(coreTool.name).toBe("test.tool");
    expect(coreTool.description).toBe("Test tool");
    expect(coreTool.parameters).toHaveLength(1);
    expect(coreTool.parameters[0].name).toBe("input");
    expect(coreTool.parameters[0].type).toBe("string");
    expect(coreTool.execute).toBeDefined();
  });

  test("registerPluginTools adds tools to registry", () => {
    const context = createTestPluginContext();
    context.permission = createPermissionManager();

    const tools = {
      echo: defineTool({
        description: "Echo tool",
        args: { message: z.string() },
        execute: async (args) => args.message,
      }),
      reverse: defineTool({
        description: "Reverse tool",
        args: { text: z.string() },
        execute: async (args) => args.text.split("").reverse().join(""),
      }),
    };

    const registered = registerPluginTools(tools, "myPlugin", context);

    expect(registered).toContain("myPlugin.echo");
    expect(registered).toContain("myPlugin.reverse");

    const registry = getToolRegistry();
    expect(registry.get("myPlugin.echo")).toBeDefined();
    expect(registry.get("myPlugin.reverse")).toBeDefined();
  });

  test("unregisterPluginTools removes tools from registry", () => {
    const context = createTestPluginContext();
    context.permission = createPermissionManager();

    const tools = {
      test: defineTool({
        description: "Test",
        args: {},
        execute: async () => "done",
      }),
    };

    registerPluginTools(tools, "tempPlugin", context);

    const registry = getToolRegistry();
    expect(registry.get("tempPlugin.test")).toBeDefined();

    unregisterPluginTools(["tempPlugin.test"]);
    expect(registry.get("tempPlugin.test")).toBeUndefined();
  });
});

// =============================================================================
// Test Plugin Loader
// =============================================================================

describe("Plugin Loader", () => {
  test("resolvePluginsDir expands tilde", () => {
    const resolved = resolvePluginsDir("~/plugins");
    expect(resolved).toContain("/plugins");
    expect(resolved).not.toContain("~");
  });

  test("resolvePluginsDir returns absolute path", () => {
    const resolved = resolvePluginsDir("/absolute/path");
    expect(resolved).toBe("/absolute/path");
  });

  test("resolvePluginSource handles relative paths", () => {
    const resolved = resolvePluginSource("./plugin.ts", "/base/dir");
    expect(resolved).toBe("/base/dir/plugin.ts");
  });

  test("resolvePluginSource handles parent paths", () => {
    const resolved = resolvePluginSource("../plugin.ts", "/base/dir");
    expect(resolved).toBe("/base/plugin.ts");
  });

  test("resolvePluginSource handles absolute paths", () => {
    const resolved = resolvePluginSource("/absolute/plugin.ts", "/base/dir");
    expect(resolved).toBe("/absolute/plugin.ts");
  });

  test("resolvePluginSource returns npm packages as-is", () => {
    const resolved = resolvePluginSource("my-plugin-package", "/base/dir");
    expect(resolved).toBe("my-plugin-package");
  });

  test("resolvePluginSource handles scoped packages", () => {
    const resolved = resolvePluginSource("@scope/plugin", "/base/dir");
    expect(resolved).toBe("@scope/plugin");
  });
});

// =============================================================================
// Test defineTool Integration
// =============================================================================

describe("defineTool Integration", () => {
  test("tool execution with zod validation", async () => {
    const tool = defineTool({
      description: "Add numbers",
      args: {
        a: z.number(),
        b: z.number(),
      },
      execute: async (args) => String(args.a + args.b),
    });

    // Direct execution (bypasses permission check)
    const result = await tool.execute(
      { a: 5, b: 3 },
      { sessionId: "test", workdir: "/tmp", abort: new AbortController().signal }
    );

    expect(result).toBe("8");
  });

  test("tool with optional args", async () => {
    const tool = defineTool({
      description: "Greet",
      args: {
        name: z.string(),
        greeting: z.string().optional(),
      },
      execute: async (args) => {
        const greeting = args.greeting ?? "Hello";
        return `${greeting}, ${args.name}!`;
      },
    });

    const ctx = { sessionId: "test", workdir: "/tmp", abort: new AbortController().signal };

    expect(await tool.execute({ name: "World" }, ctx)).toBe("Hello, World!");
    expect(await tool.execute({ name: "World", greeting: "Hi" }, ctx)).toBe("Hi, World!");
  });

  test("tool with complex args", async () => {
    const tool = defineTool({
      description: "Process items",
      args: {
        items: z.array(z.object({
          id: z.number(),
          name: z.string(),
        })),
        config: z.object({
          uppercase: z.boolean().optional(),
        }).optional(),
      },
      execute: async (args) => {
        const names = args.items.map((i) => i.name);
        if (args.config?.uppercase) {
          return names.map((n) => n.toUpperCase()).join(", ");
        }
        return names.join(", ");
      },
    });

    const ctx = { sessionId: "test", workdir: "/tmp", abort: new AbortController().signal };
    const items = [{ id: 1, name: "apple" }, { id: 2, name: "banana" }];

    expect(await tool.execute({ items }, ctx)).toBe("apple, banana");
    expect(await tool.execute({ items, config: { uppercase: true } }, ctx)).toBe("APPLE, BANANA");
  });
});
