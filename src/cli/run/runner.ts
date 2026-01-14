/**
 * Run Command Runner
 * Main execution logic for multi-agent workflows with event streaming.
 */

import { EOL } from "os";
import * as clack from "@clack/prompts";
import { UI, Style } from "../../shared/ui";
import { sessionManager } from "../../core/session/manager";
import { resolveProviderFromConfig } from "../../config/project";
import {
  streamAIResponse,
  checkLocalhostAvailability,
} from "../../services/models/ai-sdk";
import {
  getSlashCommandRegistry,
  registerBuiltinCommands,
  type SlashCommandResult,
} from "../../tools/slashcommand";
import { getSkillLoader } from "../../tools/skill";
import type { AISDKProviderName } from "../../services/models/ai-sdk/types";
import type { RunContext, EventState, RunEvent } from "./types";
import { createEventState, processEvent, formatSessionTag } from "./events";
import {
  checkCompletionConditions,
  formatWorkflowSummary,
  getWorkflowSummary,
} from "./completion";

export interface RunOptions {
  message: string;
  model?: string;
  sessionId?: string;
  continueSession?: boolean;
  title?: string;
  verbose?: boolean;
  format?: "default" | "json";
  timeout?: number;
  agent?: string;
}

/**
 * Emit an event to the event state and process it
 */
function emitEvent(
  ctx: RunContext,
  state: EventState,
  event: Omit<RunEvent, "sessionId"> & { sessionId?: string }
): void {
  const fullEvent: RunEvent = {
    ...event,
    sessionId: event.sessionId || ctx.sessionId,
  } as RunEvent;

  processEvent(ctx, fullEvent, state);
}

/**
 * Print session info header
 */
function printSessionHeader(
  ctx: RunContext,
  session: { sessionId: string },
  provider: string,
  model: string
): void {
  if (ctx.format === "json") return;

  UI.println(
    Style.TEXT_INFO_BOLD + "|",
    Style.TEXT_DIM + " Session ",
    "",
    Style.TEXT_NORMAL + session.sessionId
  );
  UI.println(
    Style.TEXT_INFO_BOLD + "|",
    Style.TEXT_DIM + " Provider",
    "",
    Style.TEXT_NORMAL + `${provider}/${model}`
  );

  if (ctx.verbose) {
    UI.println(
      Style.TEXT_INFO_BOLD + "|",
      Style.TEXT_DIM + " Mode    ",
      "",
      Style.TEXT_NORMAL + "verbose"
    );
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
  ctx: RunContext
): Promise<{ handled: boolean; result?: SlashCommandResult }> {
  if (!input.trim().startsWith("/")) {
    return { handled: false };
  }

  const registry = await initializeSlashCommands(ctx.workdir);
  const parsed = registry.parse(input);

  if (!parsed || !registry.has(parsed.command)) {
    return { handled: false };
  }

  const result = await registry.execute(input, {
    sessionId: ctx.sessionId,
    cwd: ctx.workdir,
    input,
    env: normalizeEnv(process.env),
  });

  return { handled: true, result };
}

/**
 * Print completion summary
 */
function printCompletionSummary(ctx: RunContext, state: EventState): void {
  if (ctx.format === "json") return;

  const summary = getWorkflowSummary(ctx, state);

  UI.empty();

  if (summary.errorSessions > 0) {
    UI.println(
      Style.TEXT_DANGER_BOLD + "Completed with errors" + Style.RESET
    );
  } else {
    UI.println(
      Style.TEXT_SUCCESS_BOLD + "Completed" + Style.RESET
    );
  }

  if (summary.totalSessions > 1 || summary.totalTodos > 0) {
    UI.println(
      Style.TEXT_DIM + formatWorkflowSummary(ctx, state) + Style.RESET
    );
  }
}

/**
 * Run a prompt with streaming and event tracking
 */
export async function runPrompt(options: RunOptions): Promise<{
  success: boolean;
  sessionId: string;
  output?: string;
  error?: string;
}> {
  const projectConfig = await resolveProviderFromConfig();
  let provider = projectConfig.provider as AISDKProviderName;
  let model = projectConfig.model;

  // Parse model option
  if (options.model) {
    const parts = options.model.split("/");
    if (parts.length === 2) {
      provider = parts[0] as AISDKProviderName;
      model = parts[1];
    } else {
      model = options.model;
    }
  }

  // Check localhost availability
  const isLocalhost = ["ollama", "lmstudio", "llamacpp"].includes(provider);
  if (isLocalhost) {
    const available = await checkLocalhostAvailability(
      provider as "ollama" | "lmstudio" | "llamacpp",
      projectConfig.baseURL
    );
    if (!available) {
      return {
        success: false,
        sessionId: "",
        error: `${provider} is not available. Make sure it's running.`,
      };
    }
  }

  // Get or create session
  let session;
  if (options.continueSession) {
    const sessions = sessionManager.listSessions({});
    sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    session = sessions.find((s) => s.status !== "completed");
    if (!session) {
      session = await sessionManager.createSession({
        model: `${provider}/${model}`,
        provider,
      });
    }
  } else if (options.sessionId) {
    session = await sessionManager.getSession(options.sessionId);
    if (!session) {
      return {
        success: false,
        sessionId: options.sessionId,
        error: `Session not found: ${options.sessionId}`,
      };
    }
  } else {
    const title =
      options.title ||
      options.message.slice(0, 50) + (options.message.length > 50 ? "..." : "");
    session = await sessionManager.createSession({
      model: `${provider}/${model}`,
      provider,
    });
    await sessionManager.updateSession(session.sessionId, {
      metadata: { ...session.metadata, title },
    });
  }

  // Create run context
  const ctx: RunContext = {
    sessionId: session.sessionId,
    mainSessionId: session.sessionId,
    workdir: process.cwd(),
    model,
    provider,
    verbose: options.verbose || false,
    format: options.format || "default",
  };

  // Create event state
  const state = createEventState();

  // Print header
  printSessionHeader(ctx, session, provider, model);

  // Emit session start
  emitEvent(ctx, state, {
    type: "session.start",
    sessionId: session.sessionId,
    status: "active",
  });

  const originalMessage = options.message;
  const commandExecution = await tryExecuteSlashCommand(options.message, ctx);

  if (commandExecution.handled) {
    const result = commandExecution.result;

    if (!result) {
      return {
        success: false,
        sessionId: session.sessionId,
        error: "Command execution failed",
      };
    }

    if (!result.success) {
      return {
        success: false,
        sessionId: session.sessionId,
        error: result.error?.message ?? "Command execution failed",
      };
    }

    if (result.data && typeof result.data === "object" && "action" in result.data) {
      if (result.data.action === "clear") {
        await sessionManager.clearMessages(session.sessionId);
      }
    }

    if (result.prompt) {
      options.message = result.prompt;
    } else {
      const output = result.output ?? "Command executed.";
      await sessionManager.addMessage(session.sessionId, {
        role: "user",
        content: originalMessage,
      });
      await sessionManager.addMessage(session.sessionId, {
        role: "assistant",
        content: output,
      });
      await sessionManager.updateSession(session.sessionId, {
        status: "idle",
      });

      emitEvent(ctx, state, {
        type: "message.start",
        role: "assistant",
      });
      emitEvent(ctx, state, {
        type: "message.end",
        role: "assistant",
        content: output,
      });
      emitEvent(ctx, state, {
        type: "session.end",
        sessionId: session.sessionId,
        status: "idle",
      });

      printCompletionSummary(ctx, state);

      if (ctx.format === "json") {
        console.log(
          JSON.stringify(
            {
              type: "result",
              sessionID: session.sessionId,
              content: output,
            },
            null,
            2
          )
        );
      }

      return {
        success: true,
        sessionId: session.sessionId,
        output,
      };
    }
  }

  // Add user message
  await sessionManager.addMessage(session.sessionId, {
    role: "user",
    content: options.message,
  });

  UI.empty();

  try {
    let responseText = "";

    // Emit message start
    emitEvent(ctx, state, {
      type: "message.start",
      role: "assistant",
    });

    // Stream response
    const result = await streamAIResponse({
      provider,
      model,
      baseURL: projectConfig.baseURL,
      temperature: projectConfig.temperature,
      maxTokens: projectConfig.maxTokens,
      messages: session.messages
        .map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        }))
        .concat([{ role: "user", content: options.message }]),
      onChunk: (text) => {
        responseText += text;
        emitEvent(ctx, state, {
          type: "message.chunk",
          role: "assistant",
          chunk: text,
        });
      },
    });

    // Emit message end
    emitEvent(ctx, state, {
      type: "message.end",
      role: "assistant",
      content: responseText,
    });

    // Save assistant message
    await sessionManager.addMessage(session.sessionId, {
      role: "assistant",
      content: responseText,
      metadata: {
        model: `${provider}/${model}`,
        tokens: result.usage
          ? {
              input: result.usage.promptTokens,
              output: result.usage.completionTokens,
              total: result.usage.totalTokens,
            }
          : undefined,
      },
    });

    // Update session status
    await sessionManager.updateSession(session.sessionId, {
      status: "idle",
    });

    // Emit session end
    emitEvent(ctx, state, {
      type: "session.end",
      sessionId: session.sessionId,
      status: "idle",
    });

    // Print summary
    printCompletionSummary(ctx, state);

    // JSON output
    if (options.format === "json") {
      console.log(
        JSON.stringify(
          {
            type: "result",
            sessionID: session.sessionId,
            content: responseText,
            usage: result.usage,
            summary: getWorkflowSummary(ctx, state),
          },
          null,
          2
        )
      );
    }

    return {
      success: true,
      sessionId: session.sessionId,
      output: responseText,
    };
  } catch (error) {
    const errorMessage = (error as Error).message;

    // Emit error
    emitEvent(ctx, state, {
      type: "session.error",
      sessionId: session.sessionId,
      status: "error",
      error: errorMessage,
    });

    // Update session
    await sessionManager.updateSession(session.sessionId, {
      status: "error",
    });

    if (options.format === "json") {
      console.log(
        JSON.stringify(
          {
            type: "error",
            sessionID: session.sessionId,
            error: errorMessage,
          },
          null,
          2
        )
      );
    } else {
      UI.error(errorMessage);
    }

    return {
      success: false,
      sessionId: session.sessionId,
      error: errorMessage,
    };
  }
}

/**
 * Interactive run mode with continuous prompt input
 */
export async function runInteractive(options: Omit<RunOptions, "message">): Promise<void> {
  const projectConfig = await resolveProviderFromConfig();
  let provider = projectConfig.provider as AISDKProviderName;
  let model = projectConfig.model;

  if (options.model) {
    const parts = options.model.split("/");
    if (parts.length === 2) {
      provider = parts[0] as AISDKProviderName;
      model = parts[1];
    } else {
      model = options.model;
    }
  }

  // Check localhost availability
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
      return;
    }

    s.stop(`${provider} is ready`);
  }

  UI.println(
    Style.TEXT_INFO_BOLD + "|",
    Style.TEXT_DIM + " Provider",
    "",
    Style.TEXT_NORMAL + `${provider}/${model}`
  );

  clack.log.info("Type your message. Use /help for commands, Ctrl+C to exit.");

  // Create or continue session
  let session = options.sessionId
    ? await sessionManager.getSession(options.sessionId)
    : null;

  if (!session) {
    session = await sessionManager.createSession({
      model: `${provider}/${model}`,
      provider,
    });
  }

  const ctx: RunContext = {
    sessionId: session.sessionId,
    mainSessionId: session.sessionId,
    workdir: process.cwd(),
    model,
    provider,
    verbose: options.verbose || false,
    format: "default",
  };

  const state = createEventState();

  while (true) {
    const input = await clack.text({
      message: formatSessionTag(session.sessionId, ctx.mainSessionId) + " >",
      placeholder: "Enter your message...",
    });

    if (clack.isCancel(input)) {
      break;
    }

    const trimmedInput = (input as string).trim();

    // Handle commands
    if (trimmedInput.startsWith("/")) {
      const commandExecution = await tryExecuteSlashCommand(trimmedInput, ctx);

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
            await sessionManager.clearMessages(session.sessionId);
          }
        }

        if (result.output) {
          clack.log.info(result.output);
          continue;
        }

        if (result.prompt) {
          const commandResult = await runPrompt({
            message: result.prompt,
            model: options.model,
            sessionId: session.sessionId,
            verbose: ctx.verbose,
          });

          if (!commandResult.success) {
            clack.log.warn(commandResult.error ?? "Command execution failed");
          }

          session = (await sessionManager.getSession(session.sessionId))!;
          continue;
        }

        continue;
      }

      const command = trimmedInput.slice(1).toLowerCase();

      if (command === "help" || command === "h") {
        clack.log.info("Commands:");
        clack.log.info("  /status  - Show workflow status");
        clack.log.info("  /todos   - Show todo list");
        clack.log.info("  /session - Show session info");
        clack.log.info("  /verbose - Toggle verbose mode");
        clack.log.info("  /exit    - Exit interactive mode");
        continue;
      }

      if (command === "status" || command === "s") {
        clack.log.info(formatWorkflowSummary(ctx, state));
        continue;
      }

      if (command === "todos" || command === "t") {
        const mainSession = state.sessions.get(ctx.mainSessionId);
        if (mainSession && mainSession.todos.length > 0) {
          for (const todo of mainSession.todos) {
            const icon =
              todo.status === "completed"
                ? "✓"
                : todo.status === "in_progress"
                  ? "▶"
                  : "○";
            clack.log.info(`${icon} ${todo.content}`);
          }
        } else {
          clack.log.info("No todos");
        }
        continue;
      }

      if (command === "session") {
        clack.log.info(`Session: ${session.sessionId}`);
        clack.log.info(`Messages: ${session.messages.length}`);
        clack.log.info(`Status: ${session.status}`);
        continue;
      }

      if (command === "verbose" || command === "v") {
        ctx.verbose = !ctx.verbose;
        clack.log.info(`Verbose mode: ${ctx.verbose ? "on" : "off"}`);
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

    // Run the prompt
    const result = await runPrompt({
      message: trimmedInput,
      model: options.model,
      sessionId: session.sessionId,
      verbose: ctx.verbose,
    });

    if (!result.success) {
      // Continue even on error
    }

    // Reload session to get updated messages
    session = (await sessionManager.getSession(session.sessionId))!;
  }
}
