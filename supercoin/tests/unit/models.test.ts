import { expect, test, describe } from "bun:test";
import { getModelRouter } from "../../src/services/models/router";

describe("ModelRouter", () => {
  test("should initialize with default config", () => {
    const router = getModelRouter({
      defaultModel: "anthropic/claude-sonnet-4-5",
      fallbackModels: ["openai/gpt-5.2", "google/gemini-3-flash"],
    });

    const current = router.getCurrentModel();
    expect(current.provider).toBe("anthropic");
    expect(current.model).toBe("claude-sonnet-4-5");
  });

    const current = router.getCurrentModel();
    expect(current.provider).toBe("anthropic");
    expect(current.model).toBe("claude-sonnet-4");
  });

  test("should list all models", () => {
    const router = getModelRouter();
    const models = router.listModels();

    expect(models.length).toBeGreaterThan(0);

    const anthropicModels = models.filter((m) => m.provider === "anthropic");
    const openaiModels = models.filter((m) => m.provider === "openai");
    const googleModels = models.filter((m) => m.provider === "google");

    expect(anthropicModels.length).toBe(5);
    expect(openaiModels.length).toBe(5);
    expect(googleModels.length).toBe(4);
  });

  test("should resolve model aliases", () => {
    const router = getModelRouter();

    const opusInfo = router.getModelInfo("opus");
    expect(opusInfo?.id).toBe("anthropic/claude-opus-4-5");

    const gptInfo = router.getModelInfo("gpt-4o");
    expect(gptInfo?.id).toBe("openai/gpt-4o");

    const geminiInfo = router.getModelInfo("gemini");
    expect(geminiInfo?.id).toBe("google/gemini-2.0-flash");
  });

  test("should get model info", () => {
    const router = getModelRouter();

    const info = router.getModelInfo("anthropic/claude-sonnet-4");
    expect(info).not.toBeNull();
    expect(info?.name).toBe("Claude Sonnet 4");
    expect(info?.contextWindow).toBe(200000);
  });
});
