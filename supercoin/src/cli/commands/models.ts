import { Command } from "commander";
import type { SuperCoinConfig } from "../../config/schema";
import { getModelRouter } from "../../services/models/router";
import type { ModelInfo as ModelInfoType } from "../../services/models/types";

function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) {
    return `${tokens / 1000000}M`;
  }
  return `${tokens / 1000}K`;
}

export function createModelsCommand(config: SuperCoinConfig): Command {
  const models = new Command("models")
    .description("Manage AI models");

  models
    .command("list")
    .description("List all available models")
    .option("--provider <provider>", "Filter by provider")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const router = getModelRouter({
        defaultModel: config.default_model,
        fallbackModels: config.fallback_models,
      });

      let modelList: ModelInfoType[] = router.listModels();

      if (options.provider) {
        modelList = modelList.filter((m) => m.provider === options.provider);
      }

      if (options.json) {
        console.log(JSON.stringify(modelList, null, 2));
        return;
      }

      console.log("\nAvailable Models:\n");
      console.log("+----------------------------------+-----------+-------------+--------------+");
      console.log("| Model ID                         | Provider  | Context     | Input Cost   |");
      console.log("+----------------------------------+-----------+-------------+--------------+");

      for (const model of modelList) {
        const id = model.id.padEnd(32);
        const provider = model.provider.padEnd(9);
        const context = formatContextWindow(model.contextWindow).padEnd(11);
        const cost = `$${model.pricing.input.toFixed(2)}/M`.padEnd(12);

        console.log(`| ${id} | ${provider} | ${context} | ${cost} |`);
      }

      console.log("+----------------------------------+-----------+-------------+--------------+");
    });

  models
    .command("info <modelId>")
    .description("Get detailed information about a model")
    .action(async (modelId: string) => {
      const router = getModelRouter({
        defaultModel: config.default_model,
        fallbackModels: config.fallback_models,
      });

      const model = router.getModelInfo(modelId);

      if (!model) {
        console.error(`Model not found: ${modelId}`);
        console.log("\nAvailable models:");
        router.listModels().forEach((m) => console.log(`  - ${m.id}`));
        process.exit(1);
      }

      console.log(`\nModel: ${model.name}`);
      console.log(`ID: ${model.id}`);
      console.log(`Provider: ${model.provider}`);
      console.log(`Context Window: ${formatContextWindow(model.contextWindow)}`);
      console.log(`Capabilities: ${model.capabilities.join(", ")}`);
      console.log(`Pricing:`);
      console.log(`  Input: $${model.pricing.input.toFixed(2)} per 1M tokens`);
      console.log(`  Output: $${model.pricing.output.toFixed(2)} per 1M tokens`);
    });

  models
    .command("set-default <modelId>")
    .description("Set the default model")
    .action(async (modelId: string) => {
      const router = getModelRouter({
        defaultModel: config.default_model,
        fallbackModels: config.fallback_models,
      });

      try {
        await router.setModel(modelId);
        const current = router.getCurrentModel();
        console.log(`Default model set to: ${current.provider}/${current.model}`);
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  models
    .command("current")
    .description("Show the current default model")
    .action(() => {
      const router = getModelRouter({
        defaultModel: config.default_model,
        fallbackModels: config.fallback_models,
      });

      const current = router.getCurrentModel();
      console.log(`Current model: ${current.provider}/${current.model}`);
    });

  return models;
}
