#!/usr/bin/env bun
import { Command } from "commander";
import { loadConfig } from "../config/loader.js";
import { createAuthCommand } from "./commands/auth";
import { createModelsCommand } from "./commands/models";
import { createServerCommand } from "./commands/server";
import { createConfigCommand } from "./commands/config";
import { createDoctorCommand } from "./commands/doctor";
import { resolveProviderFromConfig } from "../config/opencode";
import { streamAIResponse, checkLocalhostAvailability } from "../services/models/ai-sdk";
import type { AISDKProviderName } from "../services/models/ai-sdk/types";
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
    .option("-p, --provider <name>", "AI provider (anthropic|openai|google|ollama|lmstudio|llamacpp)")
    .option("-m, --model <id>", "AI model to use")
    .option("-t, --temperature <number>", "Temperature setting", parseFloat)
    .option("--max-tokens <number>", "Maximum tokens", parseInt)
    .option("--base-url <url>", "Base URL for localhost providers")
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

  program
    .argument("[prompt...]", "Prompt for AI")
    .action(async (promptParts: string[], options) => {
      const prompt = promptParts.join(" ");

      if (!prompt) {
        program.help();
        return;
      }

      try {
        const projectConfig = await resolveProviderFromConfig();
        
        const provider = (options.provider || projectConfig.provider) as AISDKProviderName;
        const model = options.model || projectConfig.model;
        const temperature = options.temperature ?? projectConfig.temperature;
        const maxTokens = options.maxTokens ?? projectConfig.maxTokens;
        const baseURL = options.baseUrl || projectConfig.baseURL;

        const isLocalhost = ["ollama", "lmstudio", "llamacpp"].includes(provider);
        
        if (isLocalhost) {
          const available = await checkLocalhostAvailability(
            provider as "ollama" | "lmstudio" | "llamacpp",
            baseURL
          );
          if (!available) {
            logger.error(`${provider} is not available. Make sure it's running.`);
            process.exit(1);
          }
        }

        if (!options.quiet) {
          logger.info(`Provider: ${provider} | Model: ${model}`);
        }

        const result = await streamAIResponse({
          provider,
          model,
          baseURL,
          temperature,
          maxTokens,
          messages: [{ role: "user", content: prompt }],
          onChunk: (text) => process.stdout.write(text),
        });

        console.log();

        if (options.verbose && result.usage) {
          logger.info(
            `Tokens: ${result.usage.promptTokens} in / ${result.usage.completionTokens} out`
          );
        }
      } catch (error) {
        logger.error("Chat failed", error as Error);
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  logger.error("Fatal error", error);
  process.exit(1);
});
