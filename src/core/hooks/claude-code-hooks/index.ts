import type { Hook, HookContext } from "../types";
import type { ClaudeCodeHooksOptions, ClaudeHookEvent } from "./types";
import { loadClaudeHooksConfig } from "./config";
import {
  executePreToolUseHooks,
  type PreToolUseContext,
} from "./pre-tool-use";
import {
  executePostToolUseHooks,
  type PostToolUseContext,
} from "./post-tool-use";
import {
  executeUserPromptSubmitHooks,
  type UserPromptSubmitContext,
  type MessagePart,
} from "./user-prompt-submit";
import {
  executeStopHooks,
  type StopContext,
  clearStopHookState,
} from "./stop";
import {
  executePreCompactHooks,
  type PreCompactContext,
} from "./pre-compact";
import { isHookDisabled } from "./utils";
import logger from "../../../shared/logger";

const sessionFirstMessageProcessed = new Set<string>();
const sessionErrorState = new Map<
  string,
  { hasError: boolean; errorMessage?: string }
>();
const sessionInterruptState = new Map<string, { interrupted: boolean }>();
const toolInputCache = new Map<string, Map<string, Record<string, unknown>>>();

function cacheToolInput(
  sessionId: string,
  toolName: string,
  callId: string,
  input: Record<string, unknown>
): void {
  const key = `${toolName}:${callId}`;
  if (!toolInputCache.has(sessionId)) {
    toolInputCache.set(sessionId, new Map());
  }
  toolInputCache.get(sessionId)!.set(key, input);
}

function getToolInput(
  sessionId: string,
  toolName: string,
  callId: string
): Record<string, unknown> | undefined {
  const key = `${toolName}:${callId}`;
  return toolInputCache.get(sessionId)?.get(key);
}

function clearSessionState(sessionId: string): void {
  sessionFirstMessageProcessed.delete(sessionId);
  sessionErrorState.delete(sessionId);
  sessionInterruptState.delete(sessionId);
  toolInputCache.delete(sessionId);
  clearStopHookState(sessionId);
}

export function createClaudeCodeHooksHook(
  options: ClaudeCodeHooksOptions = {}
): Hook {
  const {
    settingsPath,
    forceZsh,
    zshPath,
    disabledHooks,
    debug = false,
  } = options;

  const log = debug ? logger.debug.bind(logger) : () => {};

  const shellOptions = { forceZsh, zshPath, debug };

  return {
    name: "claude-code-hooks",
    description:
      "Claude Code hooks compatibility layer for settings.json commands",
    events: [
      "session.compacting",
      "message.before",
      "tool.before",
      "tool.after",
      "session.idle",
      "session.error",
      "session.deleted",
    ],
    priority: 50,

    handler: async (context: HookContext) => {
      const claudeConfig = await loadClaudeHooksConfig(settingsPath);
      if (!claudeConfig) {
        return;
      }

      switch (context.event) {
        case "session.compacting": {
          if (isHookDisabled(disabledHooks, "PreCompact")) {
            return;
          }

          const preCompactCtx: PreCompactContext = {
            sessionId: context.sessionId,
            cwd: context.workdir,
          };

          const result = await executePreCompactHooks(
            preCompactCtx,
            claudeConfig,
            shellOptions
          );

          if (result.context.length > 0) {
            log("[claude-code-hooks] PreCompact hooks injecting context", {
              sessionId: context.sessionId,
              contextCount: result.context.length,
              hookName: result.hookName,
              elapsedMs: result.elapsedMs,
            });
            return { context: result.context };
          }
          break;
        }

        case "message.before": {
          const interruptState = sessionInterruptState.get(context.sessionId);
          if (interruptState?.interrupted) {
            log(
              "[claude-code-hooks] message.before skipped - session interrupted",
              { sessionId: context.sessionId }
            );
            return;
          }

          if (isHookDisabled(disabledHooks, "UserPromptSubmit")) {
            return;
          }

          const data = context.data as {
            content?: string;
            parts?: MessagePart[];
            parentSessionId?: string;
          };
          const prompt = data?.content || "";
          const parts = data?.parts || [{ type: "text" as const, text: prompt }];

          const userPromptCtx: UserPromptSubmitContext = {
            sessionId: context.sessionId,
            parentSessionId: data?.parentSessionId,
            prompt,
            parts,
            cwd: context.workdir,
          };

          const result = await executeUserPromptSubmitHooks(
            userPromptCtx,
            claudeConfig,
            shellOptions
          );

          if (result.block) {
            throw new Error(result.reason ?? "Hook blocked the prompt");
          }

          const isFirstMessage = !sessionFirstMessageProcessed.has(
            context.sessionId
          );
          sessionFirstMessageProcessed.add(context.sessionId);

          if (result.messages.length > 0) {
            const hookContent = result.messages.join("\n\n");
            log(
              `[claude-code-hooks] Injecting ${result.messages.length} messages`,
              {
                sessionId: context.sessionId,
                contentLength: hookContent.length,
                isFirstMessage,
              }
            );
            return { prependContext: hookContent };
          }
          break;
        }

        case "tool.before": {
          const toolData = context.data as {
            toolName: string;
            toolId?: string;
            args?: Record<string, unknown>;
          };

          cacheToolInput(
            context.sessionId,
            toolData.toolName,
            toolData.toolId || "",
            toolData.args || {}
          );

          if (isHookDisabled(disabledHooks, "PreToolUse")) {
            return;
          }

          const preCtx: PreToolUseContext = {
            sessionId: context.sessionId,
            toolName: toolData.toolName,
            toolInput: toolData.args || {},
            cwd: context.workdir,
            toolUseId: toolData.toolId,
          };

          const result = await executePreToolUseHooks(
            preCtx,
            claudeConfig,
            shellOptions
          );

          if (result.decision === "deny") {
            log("[claude-code-hooks] PreToolUse hook BLOCKED", {
              sessionId: context.sessionId,
              toolName: result.toolName,
              hookName: result.hookName,
              elapsedMs: result.elapsedMs,
            });
            throw new Error(result.reason ?? "Hook blocked the operation");
          }

          if (result.modifiedInput) {
            return { modified: result.modifiedInput };
          }
          break;
        }

        case "tool.after": {
          if (isHookDisabled(disabledHooks, "PostToolUse")) {
            return;
          }

          const toolData = context.data as {
            toolName: string;
            toolId?: string;
            result?: unknown;
          };

          const cachedInput =
            getToolInput(
              context.sessionId,
              toolData.toolName,
              toolData.toolId || ""
            ) || {};

          const postCtx: PostToolUseContext = {
            sessionId: context.sessionId,
            toolName: toolData.toolName,
            toolInput: cachedInput,
            toolOutput:
              (toolData.result as Record<string, unknown>) || {},
            cwd: context.workdir,
            toolUseId: toolData.toolId,
          };

          const result = await executePostToolUseHooks(
            postCtx,
            claudeConfig,
            shellOptions
          );

          if (result.block) {
            log("[claude-code-hooks] PostToolUse hook warning", {
              sessionId: context.sessionId,
              reason: result.reason,
            });
          }

          if (result.additionalContext || result.message) {
            return {
              appendMessage:
                result.additionalContext || result.message,
            };
          }
          break;
        }

        case "session.idle": {
          const errorStateBefore = sessionErrorState.get(context.sessionId);
          const interruptStateBefore = sessionInterruptState.get(
            context.sessionId
          );

          if (isHookDisabled(disabledHooks, "Stop")) {
            clearSessionState(context.sessionId);
            return;
          }

          const data = context.data as { parentSessionId?: string };

          const stopCtx: StopContext = {
            sessionId: context.sessionId,
            parentSessionId: data?.parentSessionId,
            cwd: context.workdir,
          };

          const stopResult = await executeStopHooks(
            stopCtx,
            claudeConfig,
            shellOptions
          );

          const errorStateAfter = sessionErrorState.get(context.sessionId);
          const interruptStateAfter = sessionInterruptState.get(
            context.sessionId
          );

          const shouldBypass =
            errorStateBefore?.hasError ||
            errorStateAfter?.hasError ||
            interruptStateBefore?.interrupted ||
            interruptStateAfter?.interrupted;

          if (shouldBypass && stopResult.block) {
            log("[claude-code-hooks] Stop hook block ignored due to state", {
              sessionId: context.sessionId,
            });
          } else if (stopResult.block && stopResult.injectPrompt) {
            log("[claude-code-hooks] Stop hook returned block with inject", {
              sessionId: context.sessionId,
            });
            clearSessionState(context.sessionId);
            return { prompt: stopResult.injectPrompt };
          }

          clearSessionState(context.sessionId);
          break;
        }

        case "session.error": {
          const errorData = context.data as { error?: unknown };
          sessionErrorState.set(context.sessionId, {
            hasError: true,
            errorMessage: String(errorData?.error ?? "Unknown error"),
          });
          break;
        }

        case "session.deleted": {
          clearSessionState(context.sessionId);
          break;
        }
      }

      return;
    },
  };
}

export type {
  ClaudeCodeHooksOptions,
  ClaudeHooksConfig,
  ClaudeHookEvent,
  HookMatcher,
  HookCommand,
  PreToolUseInput,
  PostToolUseInput,
  UserPromptSubmitInput,
  StopInput,
  PreCompactInput,
  PreToolUseOutput,
  PostToolUseOutput,
  StopOutput,
  PreCompactOutput,
  PermissionDecision,
  PermissionMode,
} from "./types";
export { loadClaudeHooksConfig, getClaudeSettingsPaths } from "./config";
export {
  executePreToolUseHooks,
  type PreToolUseContext,
  type PreToolUseResult,
} from "./pre-tool-use";
export {
  executePostToolUseHooks,
  type PostToolUseContext,
  type PostToolUseResult,
} from "./post-tool-use";
export {
  executeUserPromptSubmitHooks,
  type UserPromptSubmitContext,
  type UserPromptSubmitResult,
  type MessagePart,
} from "./user-prompt-submit";
export {
  executeStopHooks,
  setStopHookActive,
  getStopHookActive,
  clearStopHookState,
  type StopContext,
  type StopResult,
} from "./stop";
export {
  executePreCompactHooks,
  type PreCompactContext,
  type PreCompactResult,
} from "./pre-compact";
export {
  executeHookCommand,
  findMatchingHooks,
  transformToolName,
  objectToSnakeCase,
  isHookDisabled,
} from "./utils";
