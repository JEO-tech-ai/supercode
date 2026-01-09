/**
 * Config Command
 * Manage SuperCoin configuration
 */
import { Command } from "commander";
import type { SuperCoinConfig } from "../../config/schema";
import logger from "../../shared/logger";

export function createConfigCommand(config: SuperCoinConfig): Command {
  const configCmd = new Command("config")
    .description("Manage configuration");

  // Get config value
  configCmd
    .command("get <key>")
    .description("Get a configuration value")
    .action(async (key: string) => {
      const value = getNestedValue(config, key);
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
    .action(async (key: string, value: string) => {
      logger.info(`Would set ${key} = ${value}`);
      logger.warn("Config persistence will be implemented in a future phase.");
    });

  // List all config
  configCmd
    .command("list")
    .description("List all configuration")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      if (options.json) {
        console.log(JSON.stringify(config, null, 2));
        return;
      }

      console.log("\nConfiguration:\n");
      printConfig(config);
    });

  // Reset config
  configCmd
    .command("reset")
    .description("Reset configuration to defaults")
    .option("--confirm", "Confirm reset")
    .action(async (options) => {
      if (!options.confirm) {
        logger.warn("Use --confirm to reset configuration");
        return;
      }

      logger.info("Configuration reset to defaults");
      logger.warn("Config persistence will be implemented in a future phase.");
    });

  // Show config path
  configCmd
    .command("path")
    .description("Show configuration file paths")
    .action(async () => {
      const home = process.env.HOME || process.env.USERPROFILE || "";
      console.log("\nConfiguration file paths (in priority order):\n");
      console.log(`  1. User:    ${home}/.config/supercoin/config.json`);
      console.log(`  2. Project: .supercoin/config.json`);
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
