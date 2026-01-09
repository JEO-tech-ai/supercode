import { expect, test, describe } from "bun:test";
import { getHookRegistry } from "../../src/core/hooks";
import { getToolRegistry } from "../../src/core/tools";
import { getSessionManager } from "../../src/core/session";
import { initializeHooks } from "../../src/core/hooks/index";
import { initializeTools } from "../../src/core/tools/index";

describe("Hook Registry", () => {
  test("should register hooks", () => {
    initializeHooks();
    const registry = getHookRegistry();
    const hooks = registry.list();

    expect(hooks.length).toBeGreaterThan(0);
  });

  test("should get hooks for event", () => {
    initializeHooks();
    const registry = getHookRegistry();
    const idleHooks = registry.getForEvent("session.idle");

    expect(idleHooks.length).toBeGreaterThan(0);
  });
});

describe("Tool Registry", () => {
  test("should register tools", () => {
    initializeTools();
    const registry = getToolRegistry();
    const tools = registry.list();

    expect(tools.length).toBeGreaterThan(0);
  });

  test("should have core tools", () => {
    initializeTools();
    const registry = getToolRegistry();

    expect(registry.get("bash")).toBeDefined();
    expect(registry.get("read")).toBeDefined();
    expect(registry.get("write")).toBeDefined();
    expect(registry.get("edit")).toBeDefined();
    expect(registry.get("grep")).toBeDefined();
    expect(registry.get("glob")).toBeDefined();
  });
});

describe("Session Manager", () => {
  test("should create session", () => {
    const manager = getSessionManager();
    const session = manager.create("/tmp", "anthropic/claude-sonnet-4");

    expect(session.id).toBeDefined();
    expect(session.workdir).toBe("/tmp");
    expect(session.model).toBe("anthropic/claude-sonnet-4");
  });

  test("should get current session", () => {
    const manager = getSessionManager();
    const session = manager.create("/tmp", "anthropic/claude-sonnet-4");

    const current = manager.getCurrent();
    expect(current?.id).toBe(session.id);
  });

  test("should add messages to session", () => {
    const manager = getSessionManager();
    const session = manager.create("/tmp", "anthropic/claude-sonnet-4");

    manager.addMessage(session.id, { role: "user", content: "Hello" });
    manager.addMessage(session.id, { role: "assistant", content: "Hi!" });

    const messages = manager.getMessages(session.id);
    expect(messages.length).toBe(2);
    expect(messages[0].content).toBe("Hello");
    expect(messages[1].content).toBe("Hi!");
  });
});
