import { expect, test, describe, beforeEach } from "bun:test";
import { getModelRouter, resetModelRouter } from "../../src/services/models/router";

describe("E2E: Model Router", () => {
  beforeEach(() => {
    resetModelRouter();
  });

  const getRouter = () => getModelRouter({
    defaultModel: "anthropic/claude-sonnet-4-5",
    fallbackModels: ["openai/gpt-5.2", "google/gemini-3-flash"],
  });

  describe("Model Listing", () => {
    test("should list all available models", () => {
      const router = getRouter();
      const models = router.listModels();

      expect(models.length).toBeGreaterThan(0);

      const providers = new Set(models.map((m) => m.provider));
      expect(providers.has("anthropic")).toBe(true);
      expect(providers.has("openai")).toBe(true);
      expect(providers.has("google")).toBe(true);
    });

    test("should provide model details", () => {
      const router = getRouter();
      const models = router.listModels();

      for (const model of models) {
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.provider).toBeDefined();
        expect(model.contextWindow).toBeGreaterThan(0);
        expect(model.pricing).toBeDefined();
        expect(model.pricing.input).toBeGreaterThanOrEqual(0);
        expect(model.pricing.output).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Model Selection", () => {
    test("should get current model", () => {
      const router = getRouter();
      const current = router.getCurrentModel();

      expect(current.provider).toBe("anthropic");
      expect(current.model).toBe("claude-sonnet-4-5");
    });

    test("should resolve aliases correctly", () => {
      const router = getRouter();
      const aliases = [
        { alias: "opus", expected: "anthropic/claude-opus-4-5" },
        { alias: "sonnet", expected: "anthropic/claude-sonnet-4-5" },
        { alias: "haiku", expected: "anthropic/claude-haiku-4-5" },
        { alias: "gpt-4o", expected: "openai/gpt-4o" },
        { alias: "gemini", expected: "google/gemini-3-flash" },
        { alias: "flash", expected: "google/gemini-3-flash" },
      ];

      for (const { alias, expected } of aliases) {
        const info = router.getModelInfo(alias);
        expect(info?.id).toBe(expected);
      }
    });

    test("should get model info by full ID", () => {
      const router = getRouter();
      const info = router.getModelInfo("anthropic/claude-sonnet-4-5");

      expect(info).not.toBeNull();
      expect(info?.name).toBe("Claude Sonnet 4.5");
      expect(info?.contextWindow).toBe(200000);
      expect(info?.capabilities).toContain("chat");
    });
  });

  describe("Provider Comparison", () => {
    test("should compare context windows", () => {
      const router = getRouter();
      const claudeInfo = router.getModelInfo("anthropic/claude-sonnet-4-5");
      const geminiInfo = router.getModelInfo("google/gemini-3-flash");

      expect(geminiInfo!.contextWindow).toBeGreaterThan(claudeInfo!.contextWindow);
    });

    test("should compare pricing", () => {
      const router = getRouter();
      const haikuInfo = router.getModelInfo("anthropic/claude-haiku-4-5");
      const opusInfo = router.getModelInfo("anthropic/claude-opus-4-5");

      expect(haikuInfo!.pricing.input).toBeLessThan(opusInfo!.pricing.input);
    });
  });

  describe("Model Validation", () => {
    test("should return null for unknown model", () => {
      const router = getRouter();
      const info = router.getModelInfo("unknown/model");
      expect(info).toBeNull();
    });

    test("should return null for invalid alias", () => {
      const router = getRouter();
      const info = router.getModelInfo("invalid-alias");
      expect(info).toBeNull();
    });
  });
});
