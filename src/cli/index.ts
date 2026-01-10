import * as clack from "@clack/prompts";
import { Command } from "commander";
import { loadConfig } from "../config/loader.js";
import { createAuthCommand } from "./commands/auth";
import { createModelsCommand } from "./commands/models";
import { createServerCommand } from "./commands/server";
import { createConfigCommand } from "./commands/config";
import { createDoctorCommand } from "./commands/doctor";
import { createDashboardCommand } from "./commands/dashboard";
import { resolveProviderFromConfig } from "../config/opencode";
import { streamAIResponse, checkLocalhostAvailability } from "../services/models/ai-sdk";
import type { AISDKProviderName } from "../services/models/ai-sdk/types";
import { UI, CancelledError } from "../shared/ui";
import logger from "../shared/logger";

const VERSION = "0.1.0";

async function runInteractiveMode() {
  UI.empty();
  clack.intro("🪙 SuperCoin - Unified AI CLI Hub");

  const action = await clack.select({
    message: "What would you like to do?",
    options: [
      { value: "chat", label: "💬 Start Chat", hint: "Chat with AI models" },
      { value: "auth", label: "🔐 Authentication", hint: "Manage provider authentication" },
      { value: "models", label: "🤖 Models", hint: "List and manage AI models" },
      { value: "config", label: "⚙️  Configuration", hint: "View and edit settings" },
      { value: "server", label: "🌐 Server", hint: "Manage local auth server" },
      { value: "doctor", label: "🩺 Doctor", hint: "Run system diagnostics" },
      { value: "dashboard", label: "📊 Dashboard", hint: "View agent status and progress" },
    ],
  });

  if (clack.isCancel(action)) {
    throw new CancelledError();
  }

  switch (action) {
    case "chat":
      await runChatFlow();
      break;
    case "auth":
      await runAuthFlow();
      break;
    case "models":
      await runModelsFlow();
      break;
    case "config":
      await runConfigFlow();
      break;
    case "server":
      await runServerFlow();
      break;
    case "doctor":
      await runDoctorFlow();
      break;
    case "dashboard":
      await runDashboardFlow();
      break;
  }

  clack.outro("✨ Done!");
}

async function runChatFlow() {
  const projectConfig = await resolveProviderFromConfig();

  const provider = await clack.select({
    message: "Select AI provider",
    options: [
      { value: "ollama", label: "🦙 Ollama (Local)", hint: "Privacy-first, cost-free" },
      { value: "lmstudio", label: "💻 LM Studio (Local)", hint: "Run models locally" },
      { value: "llamacpp", label: "🔧 llama.cpp (Local)", hint: "Raw performance" },
      { value: "anthropic", label: "🤖 Claude (Anthropic)", hint: "Requires API key" },
      { value: "openai", label: "⚡ Codex (OpenAI)", hint: "Requires API key" },
      { value: "google", label: "🔮 Gemini (Google)", hint: "OAuth or API key" },
    ],
    initialValue: projectConfig.provider as AISDKProviderName,
  });

  if (clack.isCancel(provider)) {
    throw new CancelledError();
  }

  const isLocalhost = ["ollama", "lmstudio", "llamacpp"].includes(provider);

  if (isLocalhost) {
    const s = clack.spinner();
    s.start(`Checking ${provider} availability...`);
    
    const available = await checkLocalhostAvailability(
      provider as "ollama" | "lmstudio" | "llamacpp",
      projectConfig.baseURL
    );
    
    if (!available) {
      s.stop(`${provider} is not available`);
      clack.log.error(`Please start ${provider} first.`);
      
      if (provider === "ollama") {
        clack.log.info("Install: curl -fsSL https://ollama.com/install.sh | sh");
        clack.log.info("Run: ollama pull llama3");
      }
      return;
    }
    
    s.stop(`${provider} is ready`);
  }

  let model = projectConfig.model;
  
  const customizeModel = await clack.confirm({
    message: "Customize model?",
    initialValue: false,
  });

  if (clack.isCancel(customizeModel)) {
    throw new CancelledError();
  }

  if (customizeModel) {
    const modelInput = await clack.text({
      message: "Model name",
      placeholder: model,
      defaultValue: model,
    });

    if (clack.isCancel(modelInput)) {
      throw new CancelledError();
    }

    model = modelInput;
  }

  const prompt = await clack.text({
    message: "Your prompt",
    placeholder: "Ask me anything...",
    validate: (value) => {
      if (!value) return "Prompt is required";
    },
  });

  if (clack.isCancel(prompt)) {
    throw new CancelledError();
  }

  const s = clack.spinner();
  s.start(`${provider} (${model}) is thinking...`);

  console.log();

  try {
    const result = await streamAIResponse({
      provider: provider as AISDKProviderName,
      model,
      baseURL: projectConfig.baseURL,
      temperature: projectConfig.temperature,
      maxTokens: projectConfig.maxTokens,
      messages: [{ role: "user", content: prompt }],
      onChunk: (text) => process.stdout.write(text),
    });

    console.log("\n");
    s.stop("Complete");

    if (result.usage) {
      clack.log.info(
        `Tokens: ${result.usage.promptTokens} in / ${result.usage.completionTokens} out`
      );
    }
  } catch (error) {
    s.stop("Failed");
    clack.log.error((error as Error).message);
  }
}

async function runAuthFlow() {
  const authAction = await clack.select({
    message: "Authentication action",
    options: [
      { value: "status", label: "📊 Status", hint: "Check authentication status" },
      { value: "login", label: "🔑 Login", hint: "Login to a provider" },
      { value: "logout", label: "🚪 Logout", hint: "Logout from providers" },
      { value: "refresh", label: "🔄 Refresh", hint: "Refresh OAuth tokens" },
    ],
  });

  if (clack.isCancel(authAction)) {
    throw new CancelledError();
  }

  clack.log.info(`Run: supercoin auth ${authAction} --help`);
  clack.note("Use command-line for auth operations", "Authentication");
}

async function runModelsFlow() {
  clack.log.info("Run: supercoin models list");
  clack.note("Use command-line for model operations", "Models");
}

async function runConfigFlow() {
  clack.log.info("Run: supercoin config show");
  clack.note("Use command-line for config operations", "Configuration");
}

async function runServerFlow() {
  clack.log.info("Run: supercoin server start");
  clack.note("Use command-line for server operations", "Server");
}

async function runDoctorFlow() {
  clack.log.info("Run: supercoin doctor");
  clack.note("Use command-line for diagnostics", "Doctor");
}

async function runDashboardFlow() {
  clack.log.info("Run: supercoin dashboard");
  clack.note("Use command-line for dashboard", "Dashboard");
}

async function main() {
  const program = new Command();
  const config = await loadConfig();

  program
    .name("supercoin")
    .description("Unified AI CLI hub for Claude, Codex, Gemini, and localhost models")
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

  program.addCommand(createAuthCommand(config));
  program.addCommand(createModelsCommand(config));
  program.addCommand(createServerCommand(config));
  program.addCommand(createConfigCommand(config));
  program.addCommand(createDoctorCommand(config));
  program.addCommand(createDashboardCommand(config));

  program
    .argument("[prompt...]", "Prompt for AI")
    .action(async (promptParts: string[], options) => {
      const prompt = promptParts.join(" ");

      if (!prompt && options.tui !== false) {
        await runInteractiveMode();
        return;
      }

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
  if (error instanceof CancelledError) {
    clack.cancel("Operation cancelled");
    process.exit(0);
  }
  logger.error("Fatal error", error);
  process.exit(1);
});
