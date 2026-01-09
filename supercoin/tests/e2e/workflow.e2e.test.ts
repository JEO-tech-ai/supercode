import { expect, test, describe, beforeAll } from "bun:test";
import { createSuperCoin } from "../../src/supercoin";
import { SuperCoinConfigSchema } from "../../src/config/schema";
import { classifyRequest } from "../../src/services/agents/orchestrator";
import { RequestType } from "../../src/services/agents/types";

describe("E2E: Full Workflow Integration", () => {
  const config = SuperCoinConfigSchema.parse({
    default_model: "anthropic/claude-sonnet-4",
    fallback_models: ["openai/gpt-4o", "google/gemini-2.0-flash"],
  });

  const supercoin = createSuperCoin(config, process.cwd());

  beforeAll(async () => {
    await supercoin.initialize();
  });

  describe("Initialization", () => {
    test("should initialize all subsystems", async () => {
      expect(supercoin.auth).toBeDefined();
      expect(supercoin.models).toBeDefined();
      expect(supercoin.agents).toBeDefined();
      expect(supercoin.todos).toBeDefined();
      expect(supercoin.background).toBeDefined();
      expect(supercoin.sessions).toBeDefined();
      expect(supercoin.hooks).toBeDefined();
      expect(supercoin.tools).toBeDefined();
    });
  });

  describe("Model System", () => {
    test("should list models from all providers", () => {
      const models = supercoin.models.listModels();

      expect(models.length).toBeGreaterThan(0);

      const providers = new Set(models.map((m: { provider: string }) => m.provider));
      expect(providers.size).toBe(4); // anthropic, openai, google, antigravity
    });

    test("should resolve aliases", () => {
      const aliases = ["opus", "sonnet", "haiku", "gpt-4o", "gemini", "flash", "quantum", "ag-ultra"];

      for (const alias of aliases) {
        const info = supercoin.models.getModelInfo(alias);
        expect(info).not.toBeNull();
      }
    });
  });

  describe("Agent System", () => {
    test("should have all agents registered", () => {
      const agentNames = ["orchestrator", "explorer", "analyst", "executor", "code_reviewer", "doc_writer"];

      for (const name of agentNames) {
        expect(supercoin.agents.has(name as any)).toBe(true);
      }
    });

    test("should classify requests correctly", () => {
      expect(classifyRequest("What is this?")).toBe(RequestType.TRIVIAL);
      expect(classifyRequest("Run npm test")).toBe(RequestType.EXPLICIT);
      expect(classifyRequest("How does the auth module work?")).toBe(RequestType.EXPLORATORY);
      expect(classifyRequest("Improve performance")).toBe(RequestType.OPEN_ENDED);
      expect(classifyRequest("Build and deploy")).toBe(RequestType.COMPLEX);
    });
  });

  describe("Todo Management", () => {
    test("should track task lifecycle", async () => {
      supercoin.todos.clear();

      const todo = await supercoin.todos.create({ content: "Test task", priority: "high" });
      expect(todo.status).toBe("pending");

      await supercoin.todos.updateStatus(todo.id, "in_progress");
      expect(supercoin.todos.get(todo.id)?.status).toBe("in_progress");

      await supercoin.todos.updateStatus(todo.id, "completed");
      expect(supercoin.todos.get(todo.id)?.status).toBe("completed");

      expect(supercoin.todos.hasPending()).toBe(false);
    });
  });

  describe("Background Tasks", () => {
    test("should spawn and track tasks", async () => {
      const taskId = await supercoin.spawnBackground("explorer", "Find files", "File search");

      expect(taskId).toBeDefined();

      const status = await supercoin.background.getStatus(taskId);
      expect(status).not.toBeNull();
    });
  });

  describe("Session Management", () => {
    test("should create and manage sessions", () => {
      const sessionId = supercoin.createSession();
      expect(sessionId).toBeDefined();

      const current = supercoin.sessions.getCurrent();
      expect(current).not.toBeNull();
      expect(current?.id).toBe(sessionId);
    });
  });

  describe("Tool Execution", () => {
    test("should execute grep tool", async () => {
      const result = await supercoin.executeTool("grep", {
        pattern: "function",
        path: "src",
        include: "*.ts",
      });

      expect(result.success).toBe(true);
    });

    test("should execute glob tool", async () => {
      const result = await supercoin.executeTool("glob", {
        pattern: "**/*.ts",
        path: "src",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Hook System", () => {
    test("should have hooks registered", () => {
      const hooks = supercoin.hooks.list();
      expect(hooks.length).toBeGreaterThan(0);
    });

    test("should get hooks for events", () => {
      const idleHooks = supercoin.hooks.getForEvent("session.idle");
      expect(idleHooks.length).toBeGreaterThan(0);
    });
  });

  describe("Auth Integration", () => {
    test("should provide auth status", async () => {
      const statuses = await supercoin.auth.status();

      expect(statuses.length).toBe(4);

      for (const status of statuses) {
        expect(["claude", "codex", "gemini", "antigravity"]).toContain(status.provider);
      }
    });
  });
});
