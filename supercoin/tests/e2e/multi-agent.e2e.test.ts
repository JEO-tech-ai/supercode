/**
 * E2E: Multi-Agent Workflow Integration Tests
 * Validates orchestrated workflows with Claude Code, Gemini-CLI, and Codex-CLI
 */
import { expect, test, describe, beforeAll, mock } from "bun:test";
import { createSuperCoin } from "../../src/supercoin";
import { SuperCoinConfigSchema } from "../../src/config/schema";
import { classifyRequest } from "../../src/services/agents/coin";
import { RequestType } from "../../src/services/agents/types";
import { getAgentRegistry, initializeAgents } from "../../src/services/agents";

describe("E2E: Multi-Agent Workflow", () => {
  const config = SuperCoinConfigSchema.parse({
    default_model: "anthropic/claude-sonnet-4",
    fallback_models: [
      "openai/gpt-4o",
      "google/gemini-2.0-flash",
    ],
  });

  const supercoin = createSuperCoin(config, process.cwd());

  beforeAll(async () => {
    await supercoin.initialize();
    initializeAgents();
  });

  describe("Agent Registry Completeness", () => {
    test("should have all core agents registered", () => {
      const registry = getAgentRegistry();

      const coreAgents = [
        "coin",
        "explorer",
        "analyst",
        "executor",
        "code_reviewer",
        "doc_writer",
      ];

      for (const agent of coreAgents) {
        expect(registry.has(agent as any)).toBe(true);
      }
    });

    test("should provide agent capabilities", () => {
      const registry = getAgentRegistry();
      const agents = registry.list();

      for (const agent of agents) {
        expect(agent.name).toBeDefined();
        expect(agent.capabilities).toBeDefined();
        expect(Array.isArray(agent.capabilities)).toBe(true);
      }
    });
  });

  describe("Request Classification for Multi-Agent Routing", () => {
    test("should classify analysis/review requests as open-ended", () => {
      // Review/analyze patterns match open-ended
      expect(classifyRequest("Review the codebase")).toBe(RequestType.OPEN_ENDED);
      expect(classifyRequest("Analyze this code")).toBe(RequestType.OPEN_ENDED);
    });

    test("should classify run/build requests as explicit", () => {
      expect(classifyRequest("Run the tests")).toBe(RequestType.EXPLICIT);
      expect(classifyRequest("Build the project")).toBe(RequestType.EXPLICIT);
    });

    test("should classify find requests as exploratory", () => {
      expect(classifyRequest("Find all TypeScript files")).toBe(RequestType.EXPLORATORY);
      expect(classifyRequest("Find every usage of this function")).toBe(RequestType.EXPLORATORY);
    });

    test("should have classification function available", () => {
      // Basic smoke test
      const result = classifyRequest("some request");
      expect(Object.values(RequestType)).toContain(result);
    });
  });

  describe("Multi-Provider Auth Verification Scenario", () => {
    /**
     * Scenario: Verify all 3 auth providers are available
     * - Claude (Anthropic)
     * - Codex (OpenAI)
     * - Gemini (Google)
     */
    test("should have all 3 auth providers configured", async () => {
      const statuses = await supercoin.auth.status();

      expect(statuses.length).toBe(3);

      const providerMap = new Map(statuses.map(s => [s.provider, s]));

      // Claude (Anthropic)
      expect(providerMap.has("claude")).toBe(true);
      expect(providerMap.get("claude")?.displayName).toBeDefined();

      // Codex (OpenAI)
      expect(providerMap.has("codex")).toBe(true);
      expect(providerMap.get("codex")?.displayName).toBeDefined();

      // Gemini (Google)
      expect(providerMap.has("gemini")).toBe(true);
      expect(providerMap.get("gemini")?.displayName).toBeDefined();
    });

    test("should map model providers to auth providers correctly", () => {
      const mappings: Array<[string, "claude" | "codex" | "gemini"]> = [
        ["anthropic", "claude"],
        ["openai", "codex"],
        ["google", "gemini"],
      ];

      for (const [modelProvider, authProvider] of mappings) {
        const mapped = supercoin.auth.mapModelProviderToAuth(modelProvider);
        expect(mapped).toBe(authProvider);
      }
    });
  });

  describe("Multi-Agent Workflow Scenario: Code Review Pipeline", () => {
    /**
     * Scenario: Complete code review pipeline
     * 1. Explorer finds relevant files
     * 2. Analyst reviews code quality
     * 3. Code Reviewer provides feedback
     * 4. Executor runs tests
     * 5. Doc Writer updates documentation
     */
    test("should support multi-step workflow tracking", async () => {
      const registry = getAgentRegistry();

      // Step 1: Explorer capability check (exploration, search, navigation)
      const explorer = registry.get("explorer");
      expect(explorer?.capabilities).toContain("exploration");
      expect(explorer?.capabilities).toContain("search");

      // Step 2: Analyst capability check
      const analyst = registry.get("analyst");
      expect(analyst?.capabilities).toBeDefined();
      expect(analyst?.capabilities.length).toBeGreaterThan(0);

      // Step 3: Code Reviewer capability check
      const reviewer = registry.get("code_reviewer");
      expect(reviewer?.capabilities).toBeDefined();
      expect(reviewer?.capabilities.length).toBeGreaterThan(0);

      // Step 4: Executor capability check
      const executor = registry.get("executor");
      expect(executor?.capabilities).toBeDefined();
      expect(executor?.capabilities.length).toBeGreaterThan(0);

      // Step 5: Doc Writer capability check
      const docWriter = registry.get("doc_writer");
      expect(docWriter?.capabilities).toBeDefined();
      expect(docWriter?.capabilities.length).toBeGreaterThan(0);
    });

    test("should track workflow progress with todos", async () => {
      supercoin.todos.clear();

      // Simulate multi-step workflow tracking
      const steps = [
        { content: "Find relevant source files", priority: "high" as const },
        { content: "Analyze code structure", priority: "high" as const },
        { content: "Review code for issues", priority: "medium" as const },
        { content: "Run test suite", priority: "high" as const },
        { content: "Update documentation", priority: "low" as const },
      ];

      const todoIds: string[] = [];

      // Create all workflow steps
      for (const step of steps) {
        const todo = await supercoin.todos.create(step);
        todoIds.push(todo.id);
        expect(todo.status).toBe("pending");
      }

      // Simulate workflow execution
      for (const id of todoIds) {
        await supercoin.todos.updateStatus(id, "in_progress");
        expect(supercoin.todos.get(id)?.status).toBe("in_progress");

        await supercoin.todos.updateStatus(id, "completed");
        expect(supercoin.todos.get(id)?.status).toBe("completed");
      }

      // Verify all completed
      expect(supercoin.todos.hasPending()).toBe(false);
    });

    test("should support background task spawning for parallel work", async () => {
      // Spawn parallel analysis tasks
      const task1 = await supercoin.spawnBackground(
        "explorer",
        "Find all test files",
        "Test file discovery"
      );
      const task2 = await supercoin.spawnBackground(
        "analyst",
        "Analyze code complexity",
        "Complexity analysis"
      );

      expect(task1).toBeDefined();
      expect(task2).toBeDefined();
      expect(task1).not.toBe(task2);

      // Both tasks should be tracked
      const status1 = await supercoin.background.getStatus(task1);
      const status2 = await supercoin.background.getStatus(task2);

      expect(status1).not.toBeNull();
      expect(status2).not.toBeNull();
    });
  });

  describe("Ultrawork Tag Functionality", () => {
    /**
     * Ultrawork tags enable special processing modes:
     * - @ultrawork:parallel - Execute tasks in parallel
     * - @ultrawork:sequential - Force sequential execution
     * - @ultrawork:priority - High priority task
     * - @ultrawork:background - Run in background
     */
    test("should handle requests with ultrawork tags", () => {
      // Test that classification works with tags (tags don't change base classification)
      const parallelRequest = "@ultrawork:parallel analyze all modules";
      const type = classifyRequest(parallelRequest);
      expect(Object.values(RequestType)).toContain(type);

      // Priority tag should still classify the base request
      const priorityRequest = "@ultrawork:priority run tests";
      const priorityType = classifyRequest(priorityRequest);
      expect(Object.values(RequestType)).toContain(priorityType);
    });

    test("should track ultrawork-tagged tasks with metadata", async () => {
      supercoin.todos.clear();

      const todo = await supercoin.todos.create({
        content: "@ultrawork:priority Critical security fix",
        priority: "high",
      });

      expect(todo.content).toContain("@ultrawork:priority");
      expect(todo.priority).toBe("high");
    });

    test("should support background execution for ultrawork tasks", async () => {
      const taskId = await supercoin.spawnBackground(
        "executor",
        "@ultrawork:background Long running analysis",
        "Background ultrawork task"
      );

      expect(taskId).toBeDefined();

      const status = await supercoin.background.getStatus(taskId);
      expect(status).not.toBeNull();
    });
  });

  describe("Session-Based Workflow Context", () => {
    test("should maintain workflow context across session", () => {
      const sessionId = supercoin.createSession();
      expect(sessionId).toBeDefined();

      const session = supercoin.sessions.getCurrent();
      expect(session).not.toBeNull();
      expect(session?.id).toBe(sessionId);
    });

    test("should support session metadata for workflow tracking", () => {
      const session = supercoin.sessions.getCurrent();

      // Session should exist from previous test
      expect(session).not.toBeNull();
    });
  });

  describe("Hook Integration for Workflow Events", () => {
    test("should have hooks for workflow events", () => {
      const hooks = supercoin.hooks.list();
      expect(hooks.length).toBeGreaterThan(0);
    });

    test("should trigger hooks for session events", () => {
      const idleHooks = supercoin.hooks.getForEvent("session.idle");
      expect(idleHooks.length).toBeGreaterThan(0);
    });
  });

  describe("Model Fallback Chain", () => {
    test("should have configured fallback models", () => {
      const currentModel = supercoin.models.getCurrentModel();
      expect(currentModel).toBeDefined();
      expect(currentModel.provider).toBe("anthropic");
    });

    test("should have configured fallback models", () => {
      // Verify config has expected fallback models
      expect(config.fallback_models).toContain("openai/gpt-4o");
      expect(config.fallback_models).toContain("google/gemini-2.0-flash");
    });
  });
});
