/**
 * Configuration Tests
 */
import { expect, test, describe } from "bun:test";
import { SuperCoinConfigSchema, getDefaultConfig } from "../../src/config/schema";

describe("SuperCoinConfig", () => {
  test("should parse empty config with defaults", () => {
    const config = SuperCoinConfigSchema.parse({});

    expect(config.default_model).toBe("anthropic/claude-sonnet-4");
    expect(config.fallback_models).toEqual([
      "openai/gpt-4o",
      "google/gemini-2.0-flash",
    ]);
  });

  test("should accept valid config", () => {
    const config = SuperCoinConfigSchema.parse({
      default_model: "google/gemini-2.0-flash",
      server: {
        port: 4000,
        host: "localhost",
      },
    });

    expect(config.default_model).toBe("google/gemini-2.0-flash");
    expect(config.server?.port).toBe(4000);
  });

  test("should reject invalid port", () => {
    expect(() => {
      SuperCoinConfigSchema.parse({
        server: {
          port: 100, // Invalid: below 1024
        },
      });
    }).toThrow();
  });

  test("should handle agent config", () => {
    const config = SuperCoinConfigSchema.parse({
      agents: {
        analyst: {
          model: "google/gemini-3-flash",
          disabled: false,
        },
      },
    });

    expect(config.agents?.analyst?.model).toBe("google/gemini-3-flash");
    expect(config.agents?.analyst?.disabled).toBe(false);
  });
});
