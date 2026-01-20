/**
 * E2E Tests for Configuration System
 * Tests the full configuration workflow including:
 * - Layered config loading
 * - Environment variable overrides
 * - Config file creation and updates
 * - CLI config commands
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from "bun:test";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir, homedir } from "os";
import { execSync, spawn } from "child_process";
import {
  loadLayeredConfig,
  saveGlobalConfig,
  saveProjectConfig,
  getConfigPaths,
  hasConfigSource,
} from "../../src/config/layered-loader";
import { getDefaultConfig } from "../../src/config/schema";

describe("E2E: Configuration System", () => {
  let testDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalCwd: string;

  beforeEach(async () => {
    // Create isolated test directory
    testDir = await fs.mkdtemp(join(tmpdir(), "supercode-e2e-config-"));
    originalEnv = { ...process.env };
    originalCwd = process.cwd();

    // Clear any SUPERCODE_ environment variables
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("SUPERCODE_") || key.startsWith("OPENCODE_")) {
        delete process.env[key];
      }
    }
  });

  afterEach(async () => {
    // Restore environment
    process.env = originalEnv;

    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  // ===========================================================================
  // Full Configuration Workflow
  // ===========================================================================

  describe("Full Configuration Workflow", () => {
    test("should load config from all sources with correct priority", async () => {
      // 1. Create project config
      await fs.writeFile(
        join(testDir, "supercode.json"),
        JSON.stringify({
          default_model: "project/model",
          fallback_models: ["project/fallback"],
          server: { port: 3001 },
        })
      );

      // 2. Set environment variable
      process.env.SUPERCODE_DEFAULT_MODEL = "env/model";
      process.env.SUPERCODE_SERVER_HOST = "0.0.0.0";

      // 3. Load config
      const { config, sources } = await loadLayeredConfig({
        cwd: testDir,
        skipGlobal: true,
      });

      // Verify priority: env > project > defaults
      expect(config.default_model).toBe("env/model"); // From env
      expect(config.server?.host).toBe("0.0.0.0"); // From env
      expect(config.server?.port).toBe(3001); // From project
      expect(config.fallback_models).toContain("project/fallback"); // From project

      // Verify sources are tracked
      expect(sources.some((s) => s.name === "environment")).toBe(true);
      expect(sources.some((s) => s.name.includes("project"))).toBe(true);
      expect(sources.some((s) => s.name === "defaults")).toBe(true);
    });

    test("should merge nested config objects deeply", async () => {
      await fs.writeFile(
        join(testDir, "supercode.json"),
        JSON.stringify({
          providers: {
            anthropic: { enabled: true },
            ollama: { enabled: true, baseUrl: "http://custom:11434/v1" },
          },
        })
      );

      const { config } = await loadLayeredConfig({
        cwd: testDir,
        skipGlobal: true,
        skipEnv: true,
      });

      expect(config.providers?.anthropic?.enabled).toBe(true);
      expect(config.providers?.ollama?.enabled).toBe(true);
      expect(config.providers?.ollama?.baseUrl).toBe("http://custom:11434/v1");
    });

    test("should handle config file creation workflow", async () => {
      // 1. Verify no config exists
      expect(await hasConfigSource("project", testDir)).toBe(false);

      // 2. Create config
      const path = await saveProjectConfig(
        {
          default_model: "anthropic/claude-sonnet-4-5",
          fallback_models: ["openai/gpt-4o"],
        },
        testDir
      );

      expect(path).toBe(join(testDir, "supercode.json"));

      // 3. Verify config exists
      expect(await hasConfigSource("project", testDir)).toBe(true);

      // 4. Load and verify
      const { config } = await loadLayeredConfig({
        cwd: testDir,
        skipGlobal: true,
        skipEnv: true,
      });

      expect(config.default_model).toBe("anthropic/claude-sonnet-4-5");
      expect(config.fallback_models).toContain("openai/gpt-4o");
    });

    test("should handle config update workflow", async () => {
      // 1. Create initial config
      await saveProjectConfig({ default_model: "model-v1" }, testDir);

      // 2. Update config
      await saveProjectConfig({ default_model: "model-v2", server: { port: 5000 } }, testDir);

      // 3. Verify update
      const content = await fs.readFile(join(testDir, "supercode.json"), "utf-8");
      const parsed = JSON.parse(content);

      expect(parsed.default_model).toBe("model-v2");
      expect(parsed.server?.port).toBe(5000);
    });
  });

  // ===========================================================================
  // Environment Variable Handling
  // ===========================================================================

  describe("Environment Variable Handling", () => {
    test("should parse all supported env var types", async () => {
      // String
      process.env.SUPERCODE_DEFAULT_MODEL = "test/model";

      // Number
      process.env.SUPERCODE_SERVER_PORT = "8080";

      // Boolean
      process.env.SUPERCODE_SERVER_AUTOSTART = "true";

      const { config } = await loadLayeredConfig({
        cwd: testDir,
        skipGlobal: true,
      });

      expect(config.default_model).toBe("test/model");
      expect(config.server?.port).toBe(8080);
      expect(config.server?.autoStart).toBe(true);
    });

    test("should support OPENCODE_ prefix for backwards compatibility", async () => {
      process.env.OPENCODE_PROVIDER = "anthropic";

      const { config, sources } = await loadLayeredConfig({
        cwd: testDir,
        skipGlobal: true,
      });

      // Should have environment source
      expect(sources.some((s) => s.name === "environment")).toBe(true);
    });

    test("should prefer SUPERCODE_ over OPENCODE_ when both set", async () => {
      process.env.SUPERCODE_DEFAULT_MODEL = "supercode-model";
      process.env.OPENCODE_DEFAULT_MODEL = "opencode-model";

      const { config } = await loadLayeredConfig({
        cwd: testDir,
        skipGlobal: true,
      });

      // SUPERCODE_ should take precedence
      expect(config.default_model).toBe("supercode-model");
    });
  });

  // ===========================================================================
  // Project Config File Handling
  // ===========================================================================

  describe("Project Config File Handling", () => {
    test("should prefer supercode.json over opencode.json", async () => {
      await fs.writeFile(
        join(testDir, "supercode.json"),
        JSON.stringify({ default_model: "from-supercode" })
      );
      await fs.writeFile(
        join(testDir, "opencode.json"),
        JSON.stringify({ default_model: "from-opencode" })
      );

      const { config, projectConfigPath } = await loadLayeredConfig({
        cwd: testDir,
        skipGlobal: true,
        skipEnv: true,
      });

      expect(config.default_model).toBe("from-supercode");
      expect(projectConfigPath).toContain("supercode.json");
    });

    test("should load .supercode.json (hidden file)", async () => {
      await fs.writeFile(
        join(testDir, ".supercode.json"),
        JSON.stringify({ default_model: "from-hidden" })
      );

      const { config } = await loadLayeredConfig({
        cwd: testDir,
        skipGlobal: true,
        skipEnv: true,
      });

      expect(config.default_model).toBe("from-hidden");
    });

    test("should handle malformed JSON gracefully", async () => {
      await fs.writeFile(join(testDir, "supercode.json"), "{ invalid json }");

      const { config, sources } = await loadLayeredConfig({
        cwd: testDir,
        skipGlobal: true,
        skipEnv: true,
      });

      // Should fallback to defaults
      expect(config.default_model).toBe("anthropic/claude-sonnet-4-5");
      expect(sources.some((s) => s.name.includes("project"))).toBe(false);
    });

    test("should handle empty config file", async () => {
      await fs.writeFile(join(testDir, "supercode.json"), "{}");

      const { config } = await loadLayeredConfig({
        cwd: testDir,
        skipGlobal: true,
        skipEnv: true,
      });

      // Should have defaults
      expect(config.default_model).toBeDefined();
      expect(config.disabled_hooks).toBeDefined();
    });
  });

  // ===========================================================================
  // Default Values
  // ===========================================================================

  describe("Default Values", () => {
    test("should provide sensible defaults when no config exists", async () => {
      const { config, sources } = await loadLayeredConfig({
        cwd: testDir,
        skipGlobal: true,
        skipEnv: true,
      });

      expect(config.default_model).toBe("anthropic/claude-sonnet-4-5");
      expect(Array.isArray(config.fallback_models)).toBe(true);
      expect(Array.isArray(config.disabled_hooks)).toBe(true);
      expect(config.providers).toBeDefined();
      expect(config.server).toBeDefined();

      // Only defaults source
      expect(sources.length).toBe(1);
      expect(sources[0].name).toBe("defaults");
    });

    test("should match schema defaults", () => {
      const defaults = getDefaultConfig();

      expect(defaults.default_model).toBe("anthropic/claude-sonnet-4-5");
      expect(defaults.server?.port).toBe(3100);
      expect(defaults.server?.autoStart).toBe(true);
    });
  });

  // ===========================================================================
  // Config Paths
  // ===========================================================================

  describe("Config Paths", () => {
    test("should return correct config paths", () => {
      const paths = getConfigPaths();

      expect(paths.globalDir).toContain(".config");
      expect(paths.globalDir).toContain("supercode");
      expect(paths.globalConfig).toContain("config.json");
      expect(paths.projectConfigFiles).toContain("supercode.json");
      expect(paths.projectConfigFiles).toContain(".supercode.json");
      expect(paths.projectConfigFiles).toContain("opencode.json");
      expect(paths.envPrefix).toBe("SUPERCODE_");
    });
  });

  // ===========================================================================
  // Source Tracking
  // ===========================================================================

  describe("Source Tracking", () => {
    test("should track all config sources with correct priority", async () => {
      await fs.writeFile(
        join(testDir, "supercode.json"),
        JSON.stringify({ default_model: "project/model" })
      );

      process.env.SUPERCODE_SERVER_PORT = "9000";

      const { sources } = await loadLayeredConfig({
        cwd: testDir,
        skipGlobal: true,
      });

      // Should have 3 sources
      expect(sources.length).toBe(3);

      // Check priority order
      const envSource = sources.find((s) => s.name === "environment");
      const projectSource = sources.find((s) => s.name.includes("project"));
      const defaultSource = sources.find((s) => s.name === "defaults");

      expect(envSource).toBeDefined();
      expect(projectSource).toBeDefined();
      expect(defaultSource).toBeDefined();

      // Priority: env (1) < project (2) < defaults (4)
      expect(envSource!.priority).toBeLessThan(projectSource!.priority);
      expect(projectSource!.priority).toBeLessThan(defaultSource!.priority);
    });

    test("sources should be sorted by priority", async () => {
      await fs.writeFile(join(testDir, "supercode.json"), JSON.stringify({}));
      process.env.SUPERCODE_DEFAULT_MODEL = "env/model";

      const { sources } = await loadLayeredConfig({
        cwd: testDir,
        skipGlobal: true,
      });

      // Sources should be sorted (lower priority number first)
      for (let i = 1; i < sources.length; i++) {
        expect(sources[i].priority).toBeGreaterThanOrEqual(sources[i - 1].priority);
      }
    });
  });
});

// ===========================================================================
// Localhost Model Configuration E2E
// ===========================================================================

describe("E2E: Localhost Model Configuration", () => {
  let testDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), "supercode-localhost-e2e-"));
    originalEnv = { ...process.env };

    for (const key of Object.keys(process.env)) {
      if (key.startsWith("SUPERCODE_") || key.startsWith("OPENCODE_")) {
        delete process.env[key];
      }
    }
  });

  afterEach(async () => {
    process.env = originalEnv;
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  test("should configure Ollama provider via config file", async () => {
    await fs.writeFile(
      join(testDir, "supercode.json"),
      JSON.stringify({
        default_model: "ollama/llama3.3",
        providers: {
          ollama: {
            enabled: true,
            baseUrl: "http://localhost:11434/v1",
          },
        },
      })
    );

    const { config } = await loadLayeredConfig({
      cwd: testDir,
      skipGlobal: true,
      skipEnv: true,
    });

    expect(config.default_model).toBe("ollama/llama3.3");
    expect(config.providers?.ollama?.enabled).toBe(true);
    expect(config.providers?.ollama?.baseUrl).toBe("http://localhost:11434/v1");
  });

  test("should configure LM Studio provider via config file", async () => {
    await fs.writeFile(
      join(testDir, "supercode.json"),
      JSON.stringify({
        default_model: "local/llama-2-7b",
        providers: {
          local: {
            enabled: true,
            baseUrl: "http://localhost:1234/v1",
          },
        },
      })
    );

    const { config } = await loadLayeredConfig({
      cwd: testDir,
      skipGlobal: true,
      skipEnv: true,
    });

    expect(config.default_model).toBe("local/llama-2-7b");
    expect(config.providers?.local?.enabled).toBe(true);
  });

  test("should configure remote localhost server", async () => {
    await fs.writeFile(
      join(testDir, "supercode.json"),
      JSON.stringify({
        default_model: "ollama/mistral",
        providers: {
          ollama: {
            enabled: true,
            baseUrl: "http://192.168.1.100:11434/v1",
          },
        },
      })
    );

    const { config } = await loadLayeredConfig({
      cwd: testDir,
      skipGlobal: true,
      skipEnv: true,
    });

    expect(config.providers?.ollama?.baseUrl).toBe("http://192.168.1.100:11434/v1");
  });

  test("should override localhost model via environment variable", async () => {
    await fs.writeFile(
      join(testDir, "supercode.json"),
      JSON.stringify({
        default_model: "ollama/llama3",
        providers: {
          ollama: {
            baseUrl: "http://localhost:11434/v1",
          },
        },
      })
    );

    // Override default model via env var
    process.env.SUPERCODE_DEFAULT_MODEL = "ollama/mistral";

    const { config } = await loadLayeredConfig({
      cwd: testDir,
      skipGlobal: true,
    });

    // Env should override default_model
    expect(config.default_model).toBe("ollama/mistral");
    // Project config values should be preserved
    expect(config.providers?.ollama?.baseUrl).toBe("http://localhost:11434/v1");
  });
});
