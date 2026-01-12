import { describe, test, expect } from "bun:test";
import {
  getProviderConfig,
  isLocalhostProvider,
  listProviders,
  listLocalhostProviders,
  PROVIDER_REGISTRY,
} from "../../src/services/models/ai-sdk/registry";
import type { AISDKProviderName } from "../../src/services/models/ai-sdk/types";

describe("AI SDK Provider Registry", () => {
  describe("getProviderConfig", () => {
    test("should return config for anthropic", () => {
      const config = getProviderConfig("anthropic");
      expect(config.name).toBe("Claude (Anthropic)");
      expect(config.requiresAuth).toBe(true);
      expect(config.supportsStreaming).toBe(true);
      expect(config.defaultModel).toBe("claude-sonnet-4-5");
    });

    test("should return config for openai", () => {
      const config = getProviderConfig("openai");
      expect(config.name).toBe("OpenAI");
      expect(config.requiresAuth).toBe(true);
      expect(config.defaultModel).toBe("gpt-4o");
    });

    test("should return config for google", () => {
      const config = getProviderConfig("google");
      expect(config.name).toBe("Gemini (Google)");
      expect(config.requiresAuth).toBe(true);
      expect(config.defaultModel).toBe("gemini-2.0-flash");
    });

    test("should return config for ollama with baseURL", () => {
      const config = getProviderConfig("ollama");
      expect(config.name).toBe("Ollama (Localhost)");
      expect(config.requiresAuth).toBe(false);
      expect(config.defaultBaseURL).toBe("http://localhost:11434/v1");
      expect(config.defaultModel).toBe("rnj-1");
    });

    test("should return config for lmstudio", () => {
      const config = getProviderConfig("lmstudio");
      expect(config.name).toBe("LM Studio (Localhost)");
      expect(config.requiresAuth).toBe(false);
      expect(config.defaultBaseURL).toBe("http://localhost:1234/v1");
    });

    test("should return config for llamacpp", () => {
      const config = getProviderConfig("llamacpp");
      expect(config.name).toBe("llama.cpp (Localhost)");
      expect(config.requiresAuth).toBe(false);
      expect(config.defaultBaseURL).toBe("http://localhost:8080/v1");
    });

    test("should throw for unknown provider", () => {
      expect(() => getProviderConfig("unknown" as AISDKProviderName)).toThrow(
        "Unknown provider: unknown"
      );
    });
  });

  describe("isLocalhostProvider", () => {
    test("should return true for ollama", () => {
      expect(isLocalhostProvider("ollama")).toBe(true);
    });

    test("should return true for lmstudio", () => {
      expect(isLocalhostProvider("lmstudio")).toBe(true);
    });

    test("should return true for llamacpp", () => {
      expect(isLocalhostProvider("llamacpp")).toBe(true);
    });

    test("should return false for anthropic", () => {
      expect(isLocalhostProvider("anthropic")).toBe(false);
    });

    test("should return false for openai", () => {
      expect(isLocalhostProvider("openai")).toBe(false);
    });

    test("should return false for google", () => {
      expect(isLocalhostProvider("google")).toBe(false);
    });
  });

  describe("listProviders", () => {
    test("should return all 7 providers", () => {
      const providers = listProviders();
      expect(providers).toHaveLength(7);
    });

    test("should include all expected providers", () => {
      const providers = listProviders();
      const names = providers.map((p) => p.name);
      expect(names).toContain("Claude (Anthropic)");
      expect(names).toContain("OpenAI");
      expect(names).toContain("Gemini (Google)");
      expect(names).toContain("Ollama (Localhost)");
      expect(names).toContain("LM Studio (Localhost)");
      expect(names).toContain("llama.cpp (Localhost)");
      expect(names).toContain("SuperCent (API)");
    });
  });

  describe("listLocalhostProviders", () => {
    test("should return only 3 localhost providers", () => {
      const providers = listLocalhostProviders();
      expect(providers).toHaveLength(3);
    });

    test("should only include localhost providers", () => {
      const providers = listLocalhostProviders();
      for (const provider of providers) {
        expect(provider.requiresAuth).toBe(false);
        expect(provider.defaultBaseURL).toBeDefined();
      }
    });
  });

  describe("PROVIDER_REGISTRY", () => {
    test("should have all expected keys", () => {
      const keys = Object.keys(PROVIDER_REGISTRY);
      expect(keys).toContain("anthropic");
      expect(keys).toContain("openai");
      expect(keys).toContain("google");
      expect(keys).toContain("ollama");
      expect(keys).toContain("lmstudio");
      expect(keys).toContain("llamacpp");
    });
  });
});
