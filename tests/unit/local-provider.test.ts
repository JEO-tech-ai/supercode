import { describe, test, expect, beforeEach } from "bun:test";
import { LocalProvider } from "../../src/services/models/providers/local";
import type { LocalProviderConfig } from "../../src/services/models/providers/local";

describe("LocalProvider", () => {
  let provider: LocalProvider;

  beforeEach(() => {
    provider = new LocalProvider();
  });

  describe("Configuration", () => {
    test("should use default config", () => {
      const info = provider.getModelInfo("test-model");
      expect(info).toBeDefined();
      expect(info?.pricing.input).toBe(0);
      expect(info?.pricing.output).toBe(0);
    });

    test("should accept custom config", () => {
      const customProvider = new LocalProvider({
        baseUrl: "http://localhost:5000/v1",
        apiType: "openai-compatible",
        defaultContextWindow: 16384,
      });

      const info = customProvider.getModelInfo("test-model");
      expect(info?.contextWindow).toBe(16384);
    });

    test("should update config", () => {
      provider.updateConfig({ defaultContextWindow: 32768 });
      const info = provider.getModelInfo("new-model");
      expect(info?.contextWindow).toBe(32768);
    });
  });

  describe("Model Validation", () => {
    test("should accept any non-empty model name", () => {
      expect(provider.isValidModel("llama3")).toBe(true);
      expect(provider.isValidModel("custom-model:latest")).toBe(true);
      expect(provider.isValidModel("")).toBe(false);
    });
  });

  describe("Default Models", () => {
    test("should return default models list", () => {
      const models = provider.listModels();
      expect(models.length).toBeGreaterThan(0);

      const modelIds = models.map((m) => m.id);
      expect(modelIds).toContain("llama3.3:latest");
      expect(modelIds).toContain("qwen2.5-coder:latest");
      expect(modelIds).toContain("deepseek-coder-v2:latest");
      expect(modelIds).toContain("mistral:latest");
    });

    test("should have correct model properties", () => {
      const models = provider.listModels();
      const llama = models.find((m) => m.id === "llama3.3:latest");

      expect(llama).toBeDefined();
      expect(llama?.name).toBe("Llama 3.3");
      expect(llama?.contextWindow).toBe(128000);
      expect(llama?.capabilities).toContain("chat");
      expect(llama?.capabilities).toContain("coding");
      expect(llama?.pricing.input).toBe(0);
      expect(llama?.pricing.output).toBe(0);
    });
  });

  describe("Model Info", () => {
    test("should return info for known model", () => {
      const info = provider.getModelInfo("llama3.3:latest");
      expect(info).toBeDefined();
      expect(info?.id).toBe("llama3.3:latest");
    });

    test("should return generic info for unknown model", () => {
      const info = provider.getModelInfo("unknown-model");
      expect(info).toBeDefined();
      expect(info?.id).toBe("unknown-model");
      expect(info?.capabilities).toContain("chat");
    });
  });

  describe("Context Window Inference", () => {
    test("should use default context window for unknown models", () => {
      // Unknown models get default context window
      const info = provider.getModelInfo("unknown-model");
      expect(info?.contextWindow).toBe(8192); // default
    });

    test("should have correct context window for known default models", () => {
      // Test llama3.3 (from default list)
      const llama = provider.getModelInfo("llama3.3:latest");
      expect(llama?.contextWindow).toBe(128000);

      // Test qwen coder (from default list)
      const qwen = provider.getModelInfo("qwen2.5-coder:latest");
      expect(qwen?.contextWindow).toBe(32768);

      // Test deepseek coder (from default list)
      const deepseek = provider.getModelInfo("deepseek-coder-v2:latest");
      expect(deepseek?.contextWindow).toBe(64000);

      // Test mistral (from default list)
      const mistral = provider.getModelInfo("mistral:latest");
      expect(mistral?.contextWindow).toBe(32768);
    });
  });

  describe("Capability Inference", () => {
    test("should have coding capability for coder models in default list", () => {
      const qwen = provider.getModelInfo("qwen2.5-coder:latest");
      expect(qwen?.capabilities).toContain("coding");

      const deepseek = provider.getModelInfo("deepseek-coder-v2:latest");
      expect(deepseek?.capabilities).toContain("coding");
    });

    test("should have chat capability for all models", () => {
      const info = provider.getModelInfo("any-model");
      expect(info?.capabilities).toContain("chat");
    });
  });

  describe("Model Name Formatting", () => {
    test("should format model name with spaces for display", () => {
      const info = provider.getModelInfo("llama3.3:latest");
      // formatModelName splits by - and _, capitalizes each part
      expect(info?.name).toBe("Llama 3.3");
    });
  });
});

describe("LocalProvider Configs", () => {
  describe("Ollama Config", () => {
    test("should create ollama provider with correct defaults", () => {
      const provider = new LocalProvider({
        baseUrl: "http://localhost:11434/v1",
        apiType: "ollama",
      });

      expect(provider.isValidModel("llama3")).toBe(true);
    });
  });

  describe("LM Studio Config", () => {
    test("should create lmstudio provider with correct defaults", () => {
      const provider = new LocalProvider({
        baseUrl: "http://localhost:1234/v1",
        apiType: "openai-compatible",
      });

      expect(provider.isValidModel("local-model")).toBe(true);
    });
  });

  describe("llama.cpp Config", () => {
    test("should create llamacpp provider with correct defaults", () => {
      const provider = new LocalProvider({
        baseUrl: "http://localhost:8080/v1",
        apiType: "openai-compatible",
      });

      expect(provider.isValidModel("llama-2-7b")).toBe(true);
    });
  });
});
