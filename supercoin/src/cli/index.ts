#!/usr/bin/env bun
/**
 * SuperCoin CLI Entry Point
 * Unified AI CLI for Claude, Codex, and Gemini
 */
import { Command } from "commander";
import { loadConfig } from "../config/loader.js";
import { createAuthCommand } from "./commands/auth";
import { createModelsCommand } from "./commands/models";
import { createServerCommand } from "./commands/server";
import { createConfigCommand } from "./commands/config";
import { createDoctorCommand } from "./commands/doctor";
import logger from "../shared/logger";

const VERSION = "0.1.0";

async function main() {
  const program = new Command();

  // Load configuration
  const config = await loadConfig();

  program
    .name("supercoin")
    .description("Unified AI CLI hub for Claude, Codex, and Gemini")
    .version(VERSION)
    .option("-m, --model <id>", "AI model to use")
    .option("-t, --temperature <number>", "Temperature setting", parseFloat)
    .option("--max-tokens <number>", "Maximum tokens", parseInt)
    .option("--no-tui", "Disable interactive UI")
    .option("--json", "Output as JSON")
    .option("-v, --verbose", "Verbose output")
    .option("-q, --quiet", "Minimal output");

  // Add subcommands
  program.addCommand(createAuthCommand(config));
  program.addCommand(createModelsCommand(config));
  program.addCommand(createServerCommand(config));
  program.addCommand(createConfigCommand(config));
  program.addCommand(createDoctorCommand(config));

  // Default action (AI chat)
  program
    .argument("[prompt...]", "Prompt for AI")
    .action(async (promptParts: string[], options) => {
      const prompt = promptParts.join(" ");

      if (!prompt) {
        // No prompt provided, show help
        program.help();
        return;
      }

      // TODO: Implement chat functionality
      logger.info(`Model: ${options.model || config.default_model}`);
      logger.info(`Prompt: ${prompt}`);
      logger.warn("Chat functionality not yet implemented. Coming in Phase 3.");
    });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  logger.error("Fatal error", error);
  process.exit(1);
});
