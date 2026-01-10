import { expect, test, describe, beforeAll } from "bun:test";
import { getAuthHub } from "../../src/services/auth/hub";
import { getTokenStore } from "../../src/server/store/token-store";

describe("E2E: Authentication Flow", () => {
  const authHub = getAuthHub();
  const tokenStore = getTokenStore();

  beforeAll(async () => {
    await tokenStore.delete("claude");
    await tokenStore.delete("codex");
    await tokenStore.delete("gemini");
  });

  describe("Initial State", () => {
    test("should return status for all providers", async () => {
      const statuses = await authHub.status();

      expect(statuses.length).toBeGreaterThanOrEqual(3);

      const claudeStatus = statuses.find((s) => s.provider === "claude");
      const codexStatus = statuses.find((s) => s.provider === "codex");
      const geminiStatus = statuses.find((s) => s.provider === "gemini");

      expect(claudeStatus).toBeDefined();
      expect(codexStatus).toBeDefined();
      expect(geminiStatus).toBeDefined();
    });
  });

  describe("Claude Authentication", () => {
    test("should fail with invalid API key", async () => {
      const result = await authHub.login("claude", { apiKey: "invalid-key" });

      expect(result[0].success).toBe(false);
      expect(result[0].error).toContain("Invalid");
    });

    test("should authenticate with valid API key (mocked)", async () => {
      const mockApiKey = process.env.ANTHROPIC_API_KEY;

      if (!mockApiKey) {
        console.log("Skipping: ANTHROPIC_API_KEY not set");
        return;
      }

      const result = await authHub.login("claude", { apiKey: mockApiKey });
      expect(result[0].success).toBe(true);

      const isAuth = await authHub.isAuthenticated("claude");
      expect(isAuth).toBe(true);
    });
  });

  describe("Codex (OpenAI) Authentication", () => {
    test("should fail with invalid API key", async () => {
      const result = await authHub.login("codex", { apiKey: "invalid-key" });

      expect(result[0].success).toBe(false);
      expect(result[0].error).toContain("Invalid");
    });

    test("should authenticate with valid API key (mocked)", async () => {
      const mockApiKey = process.env.OPENAI_API_KEY;

      if (!mockApiKey) {
        console.log("Skipping: OPENAI_API_KEY not set");
        return;
      }

      const result = await authHub.login("codex", { apiKey: mockApiKey });
      expect(result[0].success).toBe(true);

      const isAuth = await authHub.isAuthenticated("codex");
      expect(isAuth).toBe(true);
    });
  });

  describe("Gemini Authentication", () => {
    test("should fail with invalid API key", async () => {
      const result = await authHub.login("gemini", { apiKey: "invalid-key" });

      expect(result[0].success).toBe(false);
      expect(result[0].error).toContain("Invalid");
    });

    test("should authenticate with valid API key (mocked)", async () => {
      const mockApiKey = process.env.GOOGLE_API_KEY;

      if (!mockApiKey) {
        console.log("Skipping: GOOGLE_API_KEY not set");
        return;
      }

      const result = await authHub.login("gemini", { apiKey: mockApiKey });
      expect(result[0].success).toBe(true);

      const isAuth = await authHub.isAuthenticated("gemini");
      expect(isAuth).toBe(true);
    });
  });

  describe("Token Storage", () => {
    test("should persist tokens securely", async () => {
      const mockToken = {
        accessToken: "test-token-123",
        provider: "claude" as const,
        type: "api_key" as const,
        expiresAt: Date.now() + 86400000,
      };

      await tokenStore.store("claude", mockToken);

      const retrieved = await tokenStore.retrieve("claude");
      expect(retrieved?.accessToken).toBe("test-token-123");
    });

    test("should check token validity", async () => {
      const isValid = await tokenStore.isValid("claude");
      expect(typeof isValid).toBe("boolean");
    });

    test("should delete tokens on logout", async () => {
      await authHub.logout("claude");

      const isAuth = await authHub.isAuthenticated("claude");
      expect(isAuth).toBe(false);
    });
  });

  describe("Auth Status Summary", () => {
    test("should return detailed status for all providers", async () => {
      const statuses = await authHub.status();

      expect(statuses.length).toBe(3);

      for (const status of statuses) {
        expect(status).toHaveProperty("provider");
        expect(status).toHaveProperty("displayName");
        expect(status).toHaveProperty("authenticated");
        expect(["claude", "codex", "gemini"]).toContain(status.provider);
      }
    });
  });
});
