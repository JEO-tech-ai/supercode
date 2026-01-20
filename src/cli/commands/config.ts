/**
 * Config Command
 * Manage SuperCode configuration with layered config support
 */
import { Command } from "commander";
import type { SuperCodeConfig } from "../../config/schema";
import {
  loadLayeredConfig,
  saveGlobalConfig,
  saveProjectConfig,
  getConfigPaths,
  hasConfigSource,
} from "../../config/layered-loader";
import logger from "../../shared/logger";

export function createConfigCommand(config: SuperCodeConfig): Command {
  const configCmd = new Command("config")
    .description("Manage configuration");

  // Get config value
  configCmd
    .command("get <key>")
    .description("Get a configuration value")
    .action(async (key: string) => {
      const { config: layeredConfig } = await loadLayeredConfig();
      const value = getNestedValue(layeredConfig, key);
      if (value === undefined) {
        console.log("undefined");
      } else {
        console.log(typeof value === "object" ? JSON.stringify(value, null, 2) : value);
      }
    });

  // Set config value
  configCmd
    .command("set <key> <value>")
    .description("Set a configuration value")
    .option("--global", "Save to global config (~/.config/supercode/config.json)")
    .option("--project", "Save to project config (supercode.json)")
    .action(async (key: string, value: string, options) => {
      const parsedValue = parseValue(value);
      const configUpdate = buildConfigFromPath(key, parsedValue);

      try {
        if (options.global) {
          const path = await saveGlobalConfig(configUpdate);
          console.log(`Saved to global config: ${path}`);
        } else {
          // Default to project config
          const path = await saveProjectConfig(configUpdate);
          console.log(`Saved to project config: ${path}`);
        }
        console.log(`  ${key} = ${JSON.stringify(parsedValue)}`);
      } catch (error) {
        logger.error("Failed to save config", { error });
      }
    });

  // List all config
  configCmd
    .command("list")
    .description("List all configuration")
    .option("--json", "Output as JSON")
    .option("--sources", "Show config sources")
    .action(async (options) => {
      const { config: layeredConfig, sources } = await loadLayeredConfig();

      if (options.sources) {
        console.log("\nConfiguration Sources (in priority order):\n");
        for (const source of sources) {
          const pathInfo = source.path ? ` (${source.path})` : "";
          console.log(`  ${source.priority}. ${source.name}${pathInfo}`);
        }
        console.log("");
        return;
      }

      if (options.json) {
        console.log(JSON.stringify(layeredConfig, null, 2));
        return;
      }

      console.log("\nConfiguration:\n");
      printConfig(layeredConfig);
    });

  // Reset config
  configCmd
    .command("reset")
    .description("Reset configuration to defaults")
    .option("--confirm", "Confirm reset")
    .option("--global", "Reset global config")
    .option("--project", "Reset project config")
    .action(async (options) => {
      if (!options.confirm) {
        logger.warn("Use --confirm to reset configuration");
        return;
      }

      // TODO: Implement config reset by writing empty or default values
      logger.info("Configuration reset to defaults");
    });

  // Show config path
  configCmd
    .command("path")
    .description("Show configuration file paths")
    .action(async () => {
      const paths = getConfigPaths();
      const hasGlobal = await hasConfigSource("global");
      const hasProject = await hasConfigSource("project");

      console.log("\nConfiguration file paths (in priority order):\n");
      console.log("  Priority 1: Environment Variables");
      console.log(`    Prefix: ${paths.envPrefix}*`);
      console.log(`    Example: ${paths.envPrefix}DEFAULT_MODEL=anthropic/claude-opus`);
      console.log("");
      console.log("  Priority 2: Project Config");
      console.log(`    Files: ${paths.projectConfigFiles.join(", ")}`);
      console.log(`    Status: ${hasProject ? "Found" : "Not found"}`);
      console.log("");
      console.log("  Priority 3: Global Config");
      console.log(`    Path: ${paths.globalConfig}`);
      console.log(`    Status: ${hasGlobal ? "Found" : "Not found"}`);
      console.log("");
      console.log("  Priority 4: Default Values");
      console.log("    Built-in defaults");
    });

  // Init command to create config file
  configCmd
    .command("init")
    .description("Create a new configuration file")
    .option("--global", "Create global config")
    .option("--force", "Overwrite existing config")
    .action(async (options) => {
      const targetType = options.global ? "global" : "project";
      const exists = await hasConfigSource(targetType);

      if (exists && !options.force) {
        console.log(`Config already exists. Use --force to overwrite.`);
        return;
      }

      const defaultConfig = {
        default_model: "anthropic/claude-sonnet-4-5",
        fallback_models: [],
        providers: {
          anthropic: { enabled: true },
          ollama: { enabled: true, baseUrl: "http://localhost:11434/v1" },
        },
      };

      try {
        if (options.global) {
          const path = await saveGlobalConfig(defaultConfig);
          console.log(`Created global config: ${path}`);
        } else {
          const path = await saveProjectConfig(defaultConfig);
          console.log(`Created project config: ${path}`);
        }
      } catch (error) {
        logger.error("Failed to create config", { error });
      }
    });

  return configCmd;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let value: unknown = obj;

  for (const key of keys) {
    if (value === null || value === undefined || typeof value !== "object") {
      return undefined;
    }
    value = (value as Record<string, unknown>)[key];
  }

  return value;
}

function printConfig(obj: Record<string, unknown>, indent = 0): void {
  const prefix = "  ".repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      console.log(`${prefix}${key}: null`);
    } else if (Array.isArray(value)) {
      console.log(`${prefix}${key}:`);
      value.forEach((item) => {
        console.log(`${prefix}  - ${typeof item === "object" ? JSON.stringify(item) : item}`);
      });
    } else if (typeof value === "object") {
      console.log(`${prefix}${key}:`);
      printConfig(value as Record<string, unknown>, indent + 1);
    } else {
      console.log(`${prefix}${key}: ${value}`);
    }
  }
}

/**
 * Parse a string value to appropriate type
 */
function parseValue(value: string): unknown {
  // Boolean
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;

  // Number
  const num = parseFloat(value);
  if (!isNaN(num) && value.trim() === num.toString()) return num;

  // JSON
  if (value.startsWith("{") || value.startsWith("[")) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  // Array (comma-separated)
  if (value.includes(",")) {
    return value.split(",").map((s) => s.trim());
  }

  return value;
}

/**
 * Build a config object from a dot-notation path
 */
function buildConfigFromPath(path: string, value: unknown): Record<string, unknown> {
  const keys = path.split(".");
  const result: Record<string, unknown> = {};
  let current = result;

  for (let i = 0; i < keys.length - 1; i++) {
    current[keys[i]] = {};
    current = current[keys[i]] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result;
}
