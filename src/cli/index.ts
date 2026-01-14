#!/usr/bin/env bun
import * as clack from "@clack/prompts";
import { Command } from "commander";
import { loadConfig } from "../config/loader.js";
import { createAuthCommand } from "./commands/auth";
import { createModelsCommand } from "./commands/models";
import { createServerCommand } from "./commands/server";
import { createConfigCommand } from "./commands/config";
import { createDoctorCommand } from "./commands/doctor";
import { createDashboardCommand } from "./commands/dashboard";
import { createSessionCommand } from "./commands/session";
import { createTuiCommand } from "./commands/tui";
import { createMcpCommand } from "./commands/mcp";
import { sessionManager } from "../core/session/manager";
import { resolveProviderFromConfig } from "../config/project";
import { streamAIResponse, checkLocalhostAvailability, checkOllamaModel, getAvailableOllamaModels } from "../services/models/ai-sdk";
import type { AISDKProviderName } from "../services/models/ai-sdk/types";
import { UI, CancelledError } from "../shared/ui";
import logger, { type LogLevel } from "../shared/logger";
import { formatError, formatUnknownError } from "./error";
import { EOL } from "os";
import { runPrompt, runInteractive } from "./run";
import {
  getSlashCommandRegistry,
  registerBuiltinCommands,
  type SlashCommandResult,
} from "../tools/slashcommand";
import { getSkillLoader } from "../tools/skill";

import React from "react";
import { render } from "ink";
import { TuiApp } from "../tui";
import { ptyManager } from "../services/pty/manager";

const VERSION = "0.2.0";

let isShuttingDown = false;
let exitCode = 0;

async function gracefulShutdown(code: number = 0): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  exitCode = code;

  logger.info("Initiating graceful shutdown...");

  try {
    await ptyManager.shutdownAll();
    logger.info("PTY processes cleaned up");
  } catch (error) {
    logger.error("Error during PTY cleanup", error as Error);
  }

  // Allow pending I/O to flush before exit
  setTimeout(() => process.exit(exitCode), 100);
}

process.on("SIGINT", () => {
  logger.info("Received SIGINT");
  gracefulShutdown(0);
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM");
  gracefulShutdown(0);
});

process.on("unhandledRejection", (e) => {
  logger.error("rejection", e instanceof Error ? e : new Error(String(e)));
});

process.on("uncaughtException", (e) => {
  logger.error("exception", e);
  if (!isShuttingDown) {
    gracefulShutdown(1);
  }
});

function handleChatError(error: unknown, provider: string, model: string) {
  const err = error instanceof Error ? error : new Error(String(error));
  const message = err.message.toLowerCase();

  // Check for model not found errors
  if (
    (message.includes("model") && message.includes("not found")) ||
    ((err as any).statusCode === 404 && provider === "ollama")
  ) {
    UI.error(`Model '${model}' not found.`);

    if (provider === "ollama") {
      clack.log.info(`To install this model, run:`);
      process.stdout.write(UI.Style.TEXT_INFO_BOLD + `  ollama pull ${model}` + UI.Style.RESET + EOL + EOL);
      
      clack.log.info(`Or check available models with:`);
      process.stdout.write(UI.Style.TEXT_DIM + `  ollama list` + UI.Style.RESET + EOL);
    }
    return;
  }

  // Handle connection errors
  if (message.includes("fetch failed") || message.includes("connection refused")) {
    UI.error(`Could not connect to ${provider}.`);
    if (provider === "ollama") {
      clack.log.info("Make sure Ollama is running.");
    }
    return;
  }

  // Fallback for other errors
  if (err.name === "AI_APICallError") {
     UI.error(`API Error (${provider}): ${err.message}`);
  } else {
     UI.error(err.message);
  }
}

function normalizeEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );
}

async function initializeSlashCommands(workdir: string) {
  const registry = getSlashCommandRegistry();
  registerBuiltinCommands();
  getSkillLoader(workdir);
  await registry.loadSkillCommands();
  return registry;
}

async function tryExecuteSlashCommand(
  input: string,
  workdir: string,
  sessionId?: string
): Promise<{ handled: boolean; result?: SlashCommandResult }> {
  if (!input.trim().startsWith("/")) {
    return { handled: false };
  }

  const registry = await initializeSlashCommands(workdir);
  const parsed = registry.parse(input);

  if (!parsed || !registry.has(parsed.command)) {
    return { handled: false };
  }

  const result = await registry.execute(input, {
    sessionId: sessionId ?? "direct-chat",
    cwd: workdir,
    input,
    env: normalizeEnv(process.env),
  });

  return { handled: true, result };
}

async function runInteractiveMode() {
  UI.empty();
  process.stderr.write(UI.logo() + EOL + EOL);
  clack.intro("⚡ SuperCode - AI-Powered Coding Assistant");

  await runDirectChatMode();

  clack.outro("✨ Done!");
}

async function runNewTui() {
  const projectConfig = await resolveProviderFromConfig();
  const provider = projectConfig.provider as AISDKProviderName;
  const model = projectConfig.model;

  // Message handler that integrates with AI SDK
  const handleSendMessage = async (message: string, sessionId: string): Promise<string> => {
    let response = "";

    await streamAIResponse({
      provider,
      model,
      baseURL: projectConfig.baseURL,
      temperature: projectConfig.temperature,
      maxTokens: projectConfig.maxTokens,
      messages: [{ role: "user", content: message }],
      onChunk: (text) => {
        response += text;
      },
    });

    return response;
  };

  const { waitUntilExit } = render(
    React.createElement(TuiApp, {
      initialTheme: "catppuccin",
      initialMode: "dark",
      provider,
      model,
      onSendMessage: handleSendMessage,
    })
  );

  await waitUntilExit();
}

async function runDirectChatMode() {
  const projectConfig = await resolveProviderFromConfig();
  const provider = projectConfig.provider as AISDKProviderName;
  let model = projectConfig.model;

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
        clack.log.info("Run: ollama pull rnj-1");
      }

      await runMenuMode();
      return;
    }

    s.stop(`${provider} is ready`);

    // Check if the model is available (Ollama only)
    if (provider === "ollama") {
      const modelExists = await checkOllamaModel(model, projectConfig.baseURL);
      if (!modelExists) {
        const availableModels = await getAvailableOllamaModels(projectConfig.baseURL);

        if (availableModels.length === 0) {
          clack.log.error(`No models installed. Run: ollama pull rnj-1`);
          await runMenuMode();
          return;
        }

        clack.log.warn(`Model '${model}' not found.`);

        const selected = await clack.select({
          message: "Select from available models:",
          options: availableModels.map((m) => ({ value: m, label: m })),
        });

        if (clack.isCancel(selected)) {
          await runMenuMode();
          return;
        }

        model = selected as string;
      }
    }
  }

  UI.println(
    UI.Style.TEXT_INFO_BOLD + "|",
    UI.Style.TEXT_DIM + " Provider",
    "",
    UI.Style.TEXT_NORMAL + `${provider}/${model}`
  );

  clack.log.info("Type your message, or /help for commands, /menu for options");

  while (true) {
    const input = await clack.text({
      message: ">",
      placeholder: "Ask me anything... (Ctrl+C to exit)",
    });

    if (clack.isCancel(input)) {
      break;
    }

    const trimmedInput = (input as string).trim();

    if (trimmedInput.startsWith("/")) {
      const commandExecution = await tryExecuteSlashCommand(trimmedInput, process.cwd());

      if (commandExecution.handled) {
        const result = commandExecution.result;

        if (!result) {
          clack.log.warn("Command execution failed");
          continue;
        }

        if (!result.success) {
          clack.log.warn(result.error?.message ?? "Command execution failed");
          continue;
        }

        if (result.data && typeof result.data === "object" && "action" in result.data) {
          if (result.data.action === "clear") {
            clack.log.info("Context cleared (direct chat mode - no persistent session)");
            continue;
          }
        }

        if (result.output) {
          clack.log.info(result.output);
          continue;
        }

        if (result.prompt) {
          UI.println();
          try {
            await streamAIResponse({
              provider,
              model,
              baseURL: projectConfig.baseURL,
              temperature: projectConfig.temperature,
              maxTokens: projectConfig.maxTokens,
              messages: [{ role: "user", content: result.prompt }],
              onChunk: (text) => process.stdout.write(text),
            });
            process.stdout.write(EOL + EOL);
          } catch (error) {
            handleChatError(error, provider, model);
          }
          continue;
        }

        continue;
      }

      const command = trimmedInput.slice(1).toLowerCase();

      if (command === "help" || command === "h") {
        clack.log.info("CLI Commands: /menu, /session, /auth, /models, /config, /exit");
        clack.log.info("Slash Commands: /plan, /review, /test, /fix, /explain, /refactor, /skills, /ultrawork");
        continue;
      }

      if (command === "menu" || command === "m") {
        await runMenuMode();
        break;
      }

      if (command === "session" || command === "s") {
        await runSessionFlow();
        continue;
      }

      if (command === "auth" || command === "a") {
        await runAuthFlow();
        continue;
      }

      if (command === "models") {
        await runModelsFlow();
        continue;
      }

      if (command === "config" || command === "c") {
        await runConfigFlow();
        continue;
      }

      if (command === "exit" || command === "quit" || command === "q") {
        break;
      }

      clack.log.warn(`Unknown command: ${trimmedInput}. Type /help for commands.`);
      continue;
    }

    if (!trimmedInput) {
      continue;
    }

    UI.println();

    try {
      await streamAIResponse({
        provider,
        model,
        baseURL: projectConfig.baseURL,
        temperature: projectConfig.temperature,
        maxTokens: projectConfig.maxTokens,
        messages: [{ role: "user", content: trimmedInput }],
        onChunk: (text) => process.stdout.write(text),
      });

      process.stdout.write(EOL + EOL);
    } catch (error) {
      handleChatError(error, provider, model);
    }
  }
}

async function runMenuMode() {
  const action = await clack.select({
    message: "What would you like to do?",
    options: [
      { value: "chat", label: "💬 Start Chat", hint: "Chat with AI models" },
      { value: "run", label: "▶️  Run", hint: "Run with a prompt" },
      { value: "session", label: "📋 Sessions", hint: "List and manage sessions" },
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
    case "run":
      await runRunFlow();
      break;
    case "session":
      await runSessionFlow();
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
}

async function runRunFlow() {
  const modeChoice = await clack.select({
    message: "Run mode",
    options: [
      { value: "single", label: "💬 Single prompt", hint: "Run a single message" },
      { value: "interactive", label: "🔄 Interactive", hint: "Continuous conversation" },
    ],
  });

  if (clack.isCancel(modeChoice)) {
    throw new CancelledError();
  }

  if (modeChoice === "interactive") {
    await runInteractive({
      verbose: false,
    });
    return;
  }

  const prompt = await clack.text({
    message: "Enter your message",
    placeholder: "Ask me anything...",
    validate: (value) => {
      if (!value?.trim()) return "Message is required";
    },
  });

  if (clack.isCancel(prompt)) {
    throw new CancelledError();
  }

  const verbose = await clack.confirm({
    message: "Enable verbose mode?",
    initialValue: false,
  });

  if (clack.isCancel(verbose)) {
    throw new CancelledError();
  }

  const result = await runPrompt({
    message: prompt,
    verbose: verbose as boolean,
  });

  if (!result.success) {
    UI.error(result.error || "Unknown error");
  }
}

async function runChatFlow() {
  const projectConfig = await resolveProviderFromConfig();

  const provider = await clack.select({
    message: "Select AI provider",
    options: [
      { value: "ollama", label: "🦙 Ollama (Local)", hint: "Privacy-first, cost-free" },
      { value: "lmstudio", label: "💻 LM Studio (Local)", hint: "Run models locally" },
      { value: "llamacpp", label: "🔧 llama.cpp (Local)", hint: "Raw performance" },
      { value: "supercent", label: "⚡ SuperCent", hint: "SuperCode's native AI" },
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
        clack.log.info("Run: ollama pull rnj-1");
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
    handleChatError(error, provider, model);
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

  clack.log.info(`Run: supercode auth ${authAction} --help`);
  clack.note("Use command-line for auth operations", "Authentication");
}

async function runModelsFlow() {
  clack.log.info("Run: supercode models list");
  clack.note("Use command-line for model operations", "Models");
}

async function runConfigFlow() {
  clack.log.info("Run: supercode config show");
  clack.note("Use command-line for config operations", "Configuration");
}

async function runServerFlow() {
  clack.log.info("Run: supercode server start");
  clack.note("Use command-line for server operations", "Server");
}

async function runDoctorFlow() {
  clack.log.info("Run: supercode doctor");
  clack.note("Use command-line for diagnostics", "Doctor");
}

async function runDashboardFlow() {
  clack.log.info("Run: supercode dashboard");
  clack.note("Use command-line for dashboard", "Dashboard");
}

async function runSessionFlow() {
  const sessions = sessionManager.listSessions({});
  sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  if (sessions.length === 0) {
    clack.log.info("No sessions found. Create one by running a prompt.");
    return;
  }

  const options = sessions.slice(0, 10).map((s) => ({
    value: s.sessionId,
    label: s.metadata.title || "Untitled",
    hint: `${s.status} - ${s.messages.length} messages`,
  }));

  options.unshift({ value: "list", label: "📋 List all sessions", hint: "Show detailed list" });

  const selected = await clack.select({
    message: "Select a session",
    options,
  });

  if (clack.isCancel(selected)) {
    throw new CancelledError();
  }

  if (selected === "list") {
    clack.log.info("Run: supercoin session list");
    return;
  }

  const session = await sessionManager.getSession(selected as string);
  if (!session) {
    clack.log.error("Session not found");
    return;
  }

  UI.println();
  UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + "Session: " + UI.Style.RESET + session.sessionId);
  UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Status  " + UI.Style.RESET + session.status);
  UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Provider" + UI.Style.RESET + " " + session.context.provider + "/" + session.context.model);
  UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Messages" + UI.Style.RESET + " " + session.messages.length);

  const action = await clack.select({
    message: "What would you like to do?",
    options: [
      { value: "continue", label: "▶️  Continue session", hint: "Resume this session" },
      { value: "show", label: "👁️  View details", hint: "Show full session info" },
      { value: "delete", label: "🗑️  Delete", hint: "Remove this session" },
    ],
  });

  if (clack.isCancel(action)) {
    throw new CancelledError();
  }

  if (action === "continue") {
    clack.log.info(`Run: supercode run --session ${session.sessionId}`);
    return;
  }

  if (action === "show") {
    clack.log.info(`Run: supercode session show ${session.sessionId}`);
    return;
  }

  if (action === "delete") {
    const confirm = await clack.confirm({
      message: `Delete session ${session.sessionId}?`,
    });

    if (clack.isCancel(confirm) || !confirm) {
      clack.log.info("Cancelled");
      return;
    }

    await sessionManager.deleteSession(session.sessionId);
    clack.log.success("Session deleted");
  }
}

function createRunCommand(): Command {
  return new Command("run")
    .description("Run with a message (event-driven multi-agent support)")
    .argument("[message...]", "Message to send")
    .option("-c, --continue", "Continue the last session")
    .option("-s, --session <id>", "Session ID to continue")
    .option("-m, --model <model>", "Model to use (provider/model format)")
    .option("-f, --file <paths...>", "Attach files (images, PDFs)")
    .option("--title <title>", "Title for the session")
    .option("--format <format>", "Output format (default or json)", "default")
    .option("-v, --verbose", "Verbose output with session tagging")
    .option("-i, --interactive", "Interactive mode with continuous prompts")
    .option("--timeout <ms>", "Timeout for completion (default: 300000)", parseInt)
    .action(async (messageParts: string[], options, cmd: Command) => {
      // Merge with global options for -m, -v which exist on both parent and this command
      const opts = cmd.optsWithGlobals();
      const message = messageParts.join(" ");

      if (opts.interactive || (!message && !opts.continue && !opts.session)) {
        await runInteractive({
          model: opts.model,
          sessionId: opts.session,
          verbose: opts.verbose,
        });
        return;
      }

      const result = await runPrompt({
        message,
        model: opts.model,
        sessionId: opts.session,
        continueSession: opts.continue,
        title: opts.title,
        verbose: opts.verbose,
        format: opts.format,
        timeout: opts.timeout,
        files: opts.file,
      });

      if (!result.success) {
        process.exit(1);
      }
    });
}

async function main() {
  process.env.SUPERCODE = "1";
  process.env.AGENT = "1";

  const program = new Command();
  const config = await loadConfig();

  program
    .name("supercode")
    .description("Modern AI-powered coding assistant with OpenCode-level TUI")
    .version(VERSION)
    .option("-p, --provider <name>", "AI provider (anthropic|openai|google|ollama|lmstudio|llamacpp)")
    .option("-m, --model <id>", "AI model to use")
    .option("-t, --temperature <number>", "Temperature setting", parseFloat)
    .option("--max-tokens <number>", "Maximum tokens", parseInt)
    .option("--base-url <url>", "Base URL for localhost providers")
    .option("--no-tui", "Disable interactive UI")
    .option("--json", "Output as JSON")
    .option("-v, --verbose", "Verbose output")
    .option("-q, --quiet", "Minimal output")
    .option("--log-level <level>", "Log level (DEBUG|INFO|WARN|ERROR)")
    .option("--print-logs", "Print logs to stderr")
    .hook("preAction", (thisCommand) => {
      const opts = thisCommand.opts();
      const logLevel = (opts.logLevel as LogLevel) || (opts.verbose ? "DEBUG" : "INFO");
      logger.init({
        level: logLevel,
        print: opts.printLogs || opts.verbose,
        file: true,
      });
      logger.info("supercode", { version: VERSION, args: process.argv.slice(2) });
    });

  program.addCommand(createAuthCommand(config));
  program.addCommand(createModelsCommand(config));
  program.addCommand(createServerCommand(config));
  program.addCommand(createConfigCommand(config));
  program.addCommand(createDoctorCommand(config));
  program.addCommand(createDashboardCommand(config));
  program.addCommand(createSessionCommand());
  program.addCommand(createRunCommand());
  program.addCommand(createTuiCommand(config));
  program.addCommand(createMcpCommand());

  program
    .argument("[prompt...]", "Prompt for AI")
    .option("--classic", "Use classic clack-based UI instead of new TUI")
    .action(async (promptParts: string[], options) => {
      const prompt = promptParts.join(" ");

      if (!prompt && options.tui !== false) {
        // Use new TUI by default, --classic for old UI
        if (options.classic) {
          await runInteractiveMode();
        } else {
          await runNewTui();
        }
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
    exitCode = 0;
  } else {
    const formatted = formatError(error);
    if (formatted) {
      UI.error(formatted);
    } else if (formatted === undefined) {
      UI.error(`Unexpected error. Check log file at ${logger.file()} for details`);
      UI.error(formatUnknownError(error));
    }
    logger.error("Fatal error", error);
    exitCode = 1;
  }
}).finally(() => {
  gracefulShutdown(exitCode);
});
