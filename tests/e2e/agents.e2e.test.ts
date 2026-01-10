import { expect, test, describe, beforeAll } from "bun:test";
import {
  getAgentRegistry,
  initializeAgents,
  getTodoManager,
  getBackgroundManager,
  RequestType,
} from "../../src/services/agents";
import { classifyRequest } from "../../src/services/agents/coin";

describe("E2E: Agent System", () => {
  beforeAll(() => {
    initializeAgents();
  });

  describe("Agent Registry", () => {
    test("should have all agents registered", () => {
      const registry = getAgentRegistry();

      expect(registry.has("coin")).toBe(true);
      expect(registry.has("explorer")).toBe(true);
      expect(registry.has("analyst")).toBe(true);
      expect(registry.has("executor")).toBe(true);
      expect(registry.has("code_reviewer")).toBe(true);
      expect(registry.has("doc_writer")).toBe(true);
    });

    test("should return agent details", () => {
      const registry = getAgentRegistry();
      const agents = registry.list();

      for (const agent of agents) {
        expect(agent.name).toBeDefined();
        expect(agent.displayName).toBeDefined();
        expect(agent.model).toBeDefined();
        expect(agent.capabilities.length).toBeGreaterThan(0);
      }
    });

    test("should have correct model assignments", () => {
      const registry = getAgentRegistry();

      const explorer = registry.get("explorer");
      expect(explorer?.model).toBe("anthropic/claude-haiku-3-5");

      const analyst = registry.get("analyst");
      expect(analyst?.model).toBe("google/gemini-2.0-flash");

      const executor = registry.get("executor");
      expect(executor?.model).toBe("openai/gpt-4o");

      const codeReviewer = registry.get("code_reviewer");
      expect(codeReviewer?.model).toBe("anthropic/claude-opus-4-5");
    });
  });

  describe("Request Classification", () => {
    const testCases = [
      { input: "What is TypeScript?", expected: RequestType.TRIVIAL },
      { input: "How does React work?", expected: RequestType.TRIVIAL },
      { input: "Explain this error", expected: RequestType.TRIVIAL },

      { input: "Run npm test", expected: RequestType.EXPLICIT },
      { input: "Create a new component", expected: RequestType.EXPLICIT },
      { input: "Install lodash", expected: RequestType.EXPLICIT },
      { input: "Delete the old file", expected: RequestType.EXPLICIT },

      { input: "How does the auth module work?", expected: RequestType.EXPLORATORY },
      { input: "Where is the config defined?", expected: RequestType.EXPLORATORY },
      { input: "Find all usages of useState", expected: RequestType.EXPLORATORY },

      { input: "Improve the performance", expected: RequestType.OPEN_ENDED },
      { input: "Refactor the database layer", expected: RequestType.OPEN_ENDED },
      { input: "Review the codebase", expected: RequestType.OPEN_ENDED },

      { input: "Create a new API and then test it", expected: RequestType.COMPLEX },
      { input: "Build the project and deploy it", expected: RequestType.COMPLEX },
    ];

    for (const { input, expected } of testCases) {
      test(`should classify "${input}" as ${expected}`, () => {
        const result = classifyRequest(input);
        expect(result).toBe(expected);
      });
    }
  });

  describe("Todo Manager", () => {
    test("should create and track todos", async () => {
      const manager = getTodoManager();
      manager.clear();

      const todo1 = await manager.create({ content: "Task 1", priority: "high" });
      const todo2 = await manager.create({ content: "Task 2", priority: "medium" });

      expect(manager.list().length).toBe(2);
      expect(manager.hasPending()).toBe(true);

      await manager.updateStatus(todo1.id, "completed");

      const pending = manager.listPending();
      expect(pending.length).toBe(1);
      expect(pending[0].content).toBe("Task 2");
    });

    test("should track task status transitions", async () => {
      const manager = getTodoManager();
      manager.clear();

      const todo = await manager.create({ content: "Test task" });

      expect(todo.status).toBe("pending");

      await manager.updateStatus(todo.id, "in_progress");
      expect(manager.get(todo.id)?.status).toBe("in_progress");

      await manager.updateStatus(todo.id, "completed");
      expect(manager.get(todo.id)?.status).toBe("completed");

      expect(manager.hasPending()).toBe(false);
    });
  });

  describe("Background Manager", () => {
    test("should spawn background tasks", async () => {
      const manager = getBackgroundManager();

      const taskId = await manager.spawn({
        sessionId: "test-session",
        agent: "explorer",
        prompt: "Find all TypeScript files",
        description: "File search",
      });

      expect(taskId).toBeDefined();

      const status = await manager.getStatus(taskId);
      expect(status).not.toBeNull();
      expect(["pending", "in_progress", "completed", "failed"]).toContain(status?.status || "");
    });

    test("should list tasks by session", async () => {
      const manager = getBackgroundManager();

      await manager.spawn({
        sessionId: "session-a",
        agent: "explorer",
        prompt: "Task A",
        description: "A",
      });

      await manager.spawn({
        sessionId: "session-b",
        agent: "analyst",
        prompt: "Task B",
        description: "B",
      });

      const sessionATasks = manager.listTasks("session-a");
      const sessionBTasks = manager.listTasks("session-b");

      expect(sessionATasks.length).toBeGreaterThanOrEqual(1);
      expect(sessionBTasks.length).toBeGreaterThanOrEqual(1);
    });

    test("should cancel tasks", async () => {
      const manager = getBackgroundManager();

      const taskId = await manager.spawn({
        sessionId: "cancel-test",
        agent: "explorer",
        prompt: "Long task",
        description: "To be cancelled",
      });

      const cancelled = await manager.cancel(taskId);

      const status = await manager.getStatus(taskId);
      expect(["cancelled", "completed", "failed"]).toContain(status?.status || "");
    });
  });
});
