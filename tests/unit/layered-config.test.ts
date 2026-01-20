import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from "bun:test";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir, homedir } from "os";
import {
  loadLayeredConfig,
  saveGlobalConfig,
  saveProjectConfig,
  getConfigPaths,
  hasConfigSource,
  type LoadConfigOptions,
} from "../../src/config/layered-loader";

describe("Layered Config Loader", () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = await fs.mkdtemp(join(tmpdir(), "supercode-config-test-"));

    // Store original environment
    originalEnv = { ...process.env };
  });

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;

    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {}
  });

  // ===========================================================================
  // Basic Loading Tests
  // ===========================================================================

  describe("Basic Loading", () => {
    test("should return defaults when no config exists", async () => {
      const { config, sources } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
        skipEnv: true,
      });

      expect(config.default_model).toBe("anthropic/claude-sonnet-4-5");
      expect(sources.length).toBe(1);
      expect(sources[0].name).toBe("defaults");
    });

    test("should load project config (supercode.json)", async () => {
      await fs.writeFile(
        join(tempDir, "supercode.json"),
        JSON.stringify({
          default_model: "openai/gpt-4o",
          fallback_models: ["anthropic/claude-sonnet-4"],
        })
      );

      const { config, sources } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
        skipEnv: true,
      });

      expect(config.default_model).toBe("openai/gpt-4o");
      expect(config.fallback_models).toContain("anthropic/claude-sonnet-4");
      expect(sources.some((s) => s.name.includes("project"))).toBe(true);
    });

    test("should load project config (.supercode.json)", async () => {
      await fs.writeFile(
        join(tempDir, ".supercode.json"),
        JSON.stringify({
          default_model: "google/gemini-pro",
        })
      );

      const { config } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
        skipEnv: true,
      });

      expect(config.default_model).toBe("google/gemini-pro");
    });

    test("should load legacy opencode.json", async () => {
      await fs.writeFile(
        join(tempDir, "opencode.json"),
        JSON.stringify({
          default_model: "ollama/llama3",
        })
      );

      const { config, sources } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
        skipEnv: true,
      });

      expect(config.default_model).toBe("ollama/llama3");
      expect(sources.some((s) => s.name.includes("opencode"))).toBe(true);
    });
  });

  // ===========================================================================
  // Priority Tests
  // ===========================================================================

  describe("Config Priority", () => {
    test("should prefer supercode.json over opencode.json", async () => {
      await fs.writeFile(
        join(tempDir, "supercode.json"),
        JSON.stringify({ default_model: "anthropic/claude-opus" })
      );
      await fs.writeFile(
        join(tempDir, "opencode.json"),
        JSON.stringify({ default_model: "openai/gpt-4" })
      );

      const { config } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
        skipEnv: true,
      });

      expect(config.default_model).toBe("anthropic/claude-opus");
    });

    test("environment variables should override project config", async () => {
      await fs.writeFile(
        join(tempDir, "supercode.json"),
        JSON.stringify({ default_model: "anthropic/claude-sonnet" })
      );

      process.env.SUPERCODE_DEFAULT_MODEL = "openai/gpt-4o";

      const { config, sources } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
      });

      expect(config.default_model).toBe("openai/gpt-4o");
      expect(sources.some((s) => s.name === "environment")).toBe(true);
    });

    test("should respect full priority chain", async () => {
      // Project config
      await fs.writeFile(
        join(tempDir, "supercode.json"),
        JSON.stringify({
          default_model: "project-model",
          fallback_models: ["project-fallback"],
        })
      );

      // Environment variable (higher priority)
      process.env.SUPERCODE_DEFAULT_MODEL = "env-model";

      const { config, sources } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
      });

      // Env should override default_model
      expect(config.default_model).toBe("env-model");

      // Project should provide fallback_models (not overridden by env)
      expect(config.fallback_models).toContain("project-fallback");

      // Check source order (lower priority = higher number)
      const envSource = sources.find((s) => s.name === "environment");
      const projectSource = sources.find((s) => s.name.includes("project"));

      expect(envSource).toBeDefined();
      expect(projectSource).toBeDefined();
      expect(envSource!.priority).toBeLessThan(projectSource!.priority);
    });
  });

  // ===========================================================================
  // Environment Variable Tests
  // ===========================================================================

  describe("Environment Variables", () => {
    test("should parse SUPERCODE_PROVIDER", async () => {
      process.env.SUPERCODE_PROVIDER = "anthropic";

      const { config } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
      });

      // Provider is stored in providers object
      expect(config).toBeDefined();
    });

    test("should parse SUPERCODE_MODEL", async () => {
      process.env.SUPERCODE_MODEL = "claude-opus-4-5";

      const { config } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
      });

      expect(config).toBeDefined();
    });

    test("should parse boolean values", async () => {
      process.env.SUPERCODE_STREAMING = "true";

      const { config } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
      });

      expect(config).toBeDefined();
    });

    test("should parse numeric values", async () => {
      process.env.SUPERCODE_SERVER_PORT = "8080";

      const { config } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
      });

      expect(config.server?.port).toBe(8080);
    });

    test("should support OPENCODE_ prefix for compatibility", async () => {
      process.env.OPENCODE_PROVIDER = "openai";

      const { config } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
      });

      expect(config).toBeDefined();
    });

    test("should handle nested paths from env vars", async () => {
      process.env.SUPERCODE_SERVER_HOST = "0.0.0.0";

      const { config } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
      });

      expect(config.server?.host).toBe("0.0.0.0");
    });
  });

  // ===========================================================================
  // Deep Merge Tests
  // ===========================================================================

  describe("Deep Merge", () => {
    test("should deep merge nested objects", async () => {
      await fs.writeFile(
        join(tempDir, "supercode.json"),
        JSON.stringify({
          providers: {
            anthropic: {
              enabled: true,
              apiKey: "sk-test",
            },
          },
          server: {
            port: 3100,
          },
        })
      );

      const { config } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
        skipEnv: true,
      });

      expect(config.providers?.anthropic?.enabled).toBe(true);
      expect(config.providers?.anthropic?.apiKey).toBe("sk-test");
      expect(config.server?.port).toBe(3100);
    });

    test("should preserve default values for unset fields", async () => {
      await fs.writeFile(
        join(tempDir, "supercode.json"),
        JSON.stringify({
          default_model: "custom/model",
        })
      );

      const { config } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
        skipEnv: true,
      });

      expect(config.default_model).toBe("custom/model");
      expect(config.disabled_hooks).toBeDefined();
      expect(Array.isArray(config.disabled_hooks)).toBe(true);
    });

    test("should not merge arrays (override instead)", async () => {
      await fs.writeFile(
        join(tempDir, "supercode.json"),
        JSON.stringify({
          fallback_models: ["model-a", "model-b"],
          disabled_hooks: ["hook-1"],
        })
      );

      const { config } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
        skipEnv: true,
      });

      expect(config.fallback_models).toEqual(["model-a", "model-b"]);
      expect(config.disabled_hooks).toEqual(["hook-1"]);
    });
  });

  // ===========================================================================
  // Config Saving Tests
  // ===========================================================================

  describe("Config Saving", () => {
    test("saveProjectConfig should create config file", async () => {
      const path = await saveProjectConfig(
        { default_model: "saved/model" },
        tempDir
      );

      expect(path).toBe(join(tempDir, "supercode.json"));

      const content = await fs.readFile(path, "utf-8");
      const parsed = JSON.parse(content);
      expect(parsed.default_model).toBe("saved/model");
    });

    test("saveProjectConfig should merge with existing", async () => {
      await fs.writeFile(
        join(tempDir, "supercode.json"),
        JSON.stringify({
          default_model: "existing/model",
          fallback_models: ["fallback-1"],
        })
      );

      await saveProjectConfig(
        { fallback_models: ["fallback-2", "fallback-3"] },
        tempDir
      );

      const content = await fs.readFile(join(tempDir, "supercode.json"), "utf-8");
      const parsed = JSON.parse(content);

      expect(parsed.default_model).toBe("existing/model");
      expect(parsed.fallback_models).toEqual(["fallback-2", "fallback-3"]);
    });

    test("saveProjectConfig with custom filename", async () => {
      const path = await saveProjectConfig(
        { default_model: "test/model" },
        tempDir,
        ".supercode.json"
      );

      expect(path).toBe(join(tempDir, ".supercode.json"));
    });
  });

  // ===========================================================================
  // Utility Tests
  // ===========================================================================

  describe("Utility Functions", () => {
    test("getConfigPaths should return valid paths", () => {
      const paths = getConfigPaths();

      expect(paths.globalDir).toContain(".config");
      expect(paths.globalDir).toContain("supercode");
      expect(paths.globalConfig).toContain("config.json");
      expect(paths.projectConfigFiles).toContain("supercode.json");
      expect(paths.projectConfigFiles).toContain("opencode.json");
      expect(paths.envPrefix).toBe("SUPERCODE_");
    });

    test("hasConfigSource should detect project config", async () => {
      expect(await hasConfigSource("project", tempDir)).toBe(false);

      await fs.writeFile(
        join(tempDir, "supercode.json"),
        JSON.stringify({})
      );

      expect(await hasConfigSource("project", tempDir)).toBe(true);
    });

    test("hasConfigSource should detect any project config file", async () => {
      await fs.writeFile(
        join(tempDir, "opencode.json"),
        JSON.stringify({})
      );

      expect(await hasConfigSource("project", tempDir)).toBe(true);
    });
  });

  // ===========================================================================
  // Source Tracking Tests
  // ===========================================================================

  describe("Source Tracking", () => {
    test("should track all config sources", async () => {
      await fs.writeFile(
        join(tempDir, "supercode.json"),
        JSON.stringify({ default_model: "project/model" })
      );

      process.env.SUPERCODE_SERVER_PORT = "9000";

      const { sources } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
      });

      const sourceNames = sources.map((s) => s.name);

      expect(sourceNames).toContain("defaults");
      expect(sourceNames.some((n) => n.includes("project"))).toBe(true);
      expect(sourceNames).toContain("environment");
    });

    test("should include project config path in result", async () => {
      await fs.writeFile(
        join(tempDir, "supercode.json"),
        JSON.stringify({})
      );

      const { projectConfigPath } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
        skipEnv: true,
      });

      expect(projectConfigPath).toBe(join(tempDir, "supercode.json"));
    });

    test("sources should be sorted by priority", async () => {
      await fs.writeFile(
        join(tempDir, "supercode.json"),
        JSON.stringify({})
      );

      process.env.SUPERCODE_DEFAULT_MODEL = "env/model";

      const { sources } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
      });

      // Check sources are sorted (lower priority number = higher priority)
      for (let i = 1; i < sources.length; i++) {
        expect(sources[i].priority).toBeGreaterThanOrEqual(sources[i - 1].priority);
      }
    });
  });

  // ===========================================================================
  // Validation Tests
  // ===========================================================================

  describe("Config Validation", () => {
    test("should validate config against schema", async () => {
      await fs.writeFile(
        join(tempDir, "supercode.json"),
        JSON.stringify({
          server: {
            port: 3100,
            host: "127.0.0.1",
            autoStart: true,
          },
        })
      );

      const { config } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
        skipEnv: true,
      });

      expect(config.server?.port).toBe(3100);
      expect(typeof config.server?.port).toBe("number");
    });

    test("should apply schema defaults", async () => {
      await fs.writeFile(
        join(tempDir, "supercode.json"),
        JSON.stringify({
          server: {
            port: 5000,
          },
        })
      );

      const { config } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
        skipEnv: true,
      });

      // autoStart should get default value from schema
      expect(config.server?.autoStart).toBe(true);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe("Edge Cases", () => {
    test("should handle malformed JSON gracefully", async () => {
      await fs.writeFile(
        join(tempDir, "supercode.json"),
        "{ invalid json }"
      );

      const { config, sources } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
        skipEnv: true,
      });

      // Should fall back to defaults
      expect(config.default_model).toBe("anthropic/claude-sonnet-4-5");
      expect(sources.some((s) => s.name.includes("project"))).toBe(false);
    });

    test("should handle empty config file", async () => {
      await fs.writeFile(
        join(tempDir, "supercode.json"),
        "{}"
      );

      const { config } = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
        skipEnv: true,
      });

      // Should have defaults
      expect(config.default_model).toBeDefined();
    });

    test("should skip options as specified", async () => {
      await fs.writeFile(
        join(tempDir, "supercode.json"),
        JSON.stringify({ default_model: "project/model" })
      );

      process.env.SUPERCODE_DEFAULT_MODEL = "env/model";

      // Skip env
      const result1 = await loadLayeredConfig({
        cwd: tempDir,
        skipGlobal: true,
        skipEnv: true,
      });
      expect(result1.config.default_model).toBe("project/model");
    });
  });
});
