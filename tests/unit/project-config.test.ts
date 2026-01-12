import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  loadProjectConfig,
  getDefaultProvider,
  getDefaultModel,
  resolveProviderFromConfig,
} from "../../src/config/project";

describe("SuperCoin Project Config", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), "supercoin-test-"));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {}
  });

  describe("loadProjectConfig", () => {
    test("should return defaults when no config file exists", async () => {
      const config = await loadProjectConfig(tempDir);
      expect(config.provider).toBe("ollama");
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(4096);
      expect(config.streaming).toBe(true);
    });

    test("should load supercoin.json", async () => {
      await fs.writeFile(
        join(tempDir, "supercoin.json"),
        JSON.stringify({
          provider: "anthropic",
          model: "claude-opus-4-5",
          temperature: 0.5,
        })
      );

      const config = await loadProjectConfig(tempDir);
      expect(config.provider).toBe("anthropic");
      expect(config.model).toBe("claude-opus-4-5");
      expect(config.temperature).toBe(0.5);
    });

    test("should load .supercoin.json", async () => {
      await fs.writeFile(
        join(tempDir, ".supercoin.json"),
        JSON.stringify({
          provider: "google",
          model: "gemini-pro",
        })
      );

      const config = await loadProjectConfig(tempDir);
      expect(config.provider).toBe("google");
      expect(config.model).toBe("gemini-pro");
    });

    test("should load opencode.json for backward compatibility", async () => {
      await fs.writeFile(
        join(tempDir, "opencode.json"),
        JSON.stringify({
          provider: "lmstudio",
          baseURL: "http://localhost:5000/v1",
        })
      );

      const config = await loadProjectConfig(tempDir);
      expect(config.provider).toBe("lmstudio");
      expect(config.baseURL).toBe("http://localhost:5000/v1");
    });

    test("should prefer supercoin.json over opencode.json", async () => {
      await fs.writeFile(
        join(tempDir, "supercoin.json"),
        JSON.stringify({ provider: "anthropic" })
      );
      await fs.writeFile(
        join(tempDir, "opencode.json"),
        JSON.stringify({ provider: "google" })
      );

      const config = await loadProjectConfig(tempDir);
      expect(config.provider).toBe("anthropic");
    });

    test("should support supercent provider", async () => {
      await fs.writeFile(
        join(tempDir, "supercoin.json"),
        JSON.stringify({
          provider: "supercent",
          model: "cent-1",
        })
      );

      const config = await loadProjectConfig(tempDir);
      expect(config.provider).toBe("supercent");
      expect(config.model).toBe("cent-1");
    });
  });

  describe("getDefaultProvider", () => {
    test("should return ollama as default", () => {
      expect(getDefaultProvider()).toBe("ollama");
    });
  });

  describe("getDefaultModel", () => {
    test("should return correct default for each provider", () => {
      expect(getDefaultModel("anthropic")).toBe("claude-sonnet-4-5");
      expect(getDefaultModel("openai")).toBe("gpt-4o");
      expect(getDefaultModel("google")).toBe("gemini-2.0-flash");
      expect(getDefaultModel("ollama")).toBe("rnj-1");
      expect(getDefaultModel("lmstudio")).toBe("local-model");
      expect(getDefaultModel("llamacpp")).toBe("local-model");
      expect(getDefaultModel("supercent")).toBe("cent-1");
    });
  });

  describe("resolveProviderFromConfig", () => {
    test("should resolve with defaults when no config", async () => {
      const result = await resolveProviderFromConfig(tempDir);
      expect(result.provider).toBe("ollama");
      expect(result.model).toBe("rnj-1");
      expect(result.temperature).toBe(0.7);
      expect(result.maxTokens).toBe(4096);
    });

    test("should resolve with config values", async () => {
      await fs.writeFile(
        join(tempDir, "supercoin.json"),
        JSON.stringify({
          provider: "anthropic",
          model: "claude-opus-4-5",
          temperature: 0.3,
          maxTokens: 8192,
        })
      );

      const result = await resolveProviderFromConfig(tempDir);
      expect(result.provider).toBe("anthropic");
      expect(result.model).toBe("claude-opus-4-5");
      expect(result.temperature).toBe(0.3);
      expect(result.maxTokens).toBe(8192);
    });

    test("should use default model when not specified", async () => {
      await fs.writeFile(
        join(tempDir, "supercoin.json"),
        JSON.stringify({ provider: "google" })
      );

      const result = await resolveProviderFromConfig(tempDir);
      expect(result.provider).toBe("google");
      expect(result.model).toBe("gemini-2.0-flash");
    });

    test("should resolve supercent provider", async () => {
      await fs.writeFile(
        join(tempDir, "supercoin.json"),
        JSON.stringify({ provider: "supercent" })
      );

      const result = await resolveProviderFromConfig(tempDir);
      expect(result.provider).toBe("supercent");
      expect(result.model).toBe("cent-1");
    });
  });
});
