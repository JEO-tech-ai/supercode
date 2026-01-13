import type {
  PostToolUseInput,
  PostToolUseOutput,
  ClaudeHooksConfig,
} from "./types";
import {
  findMatchingHooks,
  executeHookCommand,
  objectToSnakeCase,
  transformToolName,
  DEFAULT_SHELL_CONFIG,
} from "./utils";
import logger from "../../../shared/logger";

export interface PostToolUseContext {
  sessionId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown>;
  cwd: string;
  transcriptPath?: string;
  toolUseId?: string;
  permissionMode?: "default" | "plan" | "acceptEdits" | "bypassPermissions";
}

export interface PostToolUseResult {
  block: boolean;
  reason?: string;
  message?: string;
  warnings?: string[];
  elapsedMs?: number;
  hookName?: string;
  toolName?: string;
  additionalContext?: string;
  continue?: boolean;
  stopReason?: string;
  suppressOutput?: boolean;
  systemMessage?: string;
}

export async function executePostToolUseHooks(
  ctx: PostToolUseContext,
  config: ClaudeHooksConfig | null,
  options?: { forceZsh?: boolean; zshPath?: string; debug?: boolean }
): Promise<PostToolUseResult> {
  if (!config) {
    return { block: false };
  }

  const transformedToolName = transformToolName(ctx.toolName);
  const matchers = findMatchingHooks(
    config,
    "PostToolUse",
    transformedToolName
  );
  if (matchers.length === 0) {
    return { block: false };
  }

  const stdinData: PostToolUseInput = {
    session_id: ctx.sessionId,
    transcript_path: ctx.transcriptPath,
    cwd: ctx.cwd,
    permission_mode: ctx.permissionMode ?? "bypassPermissions",
    hook_event_name: "PostToolUse",
    tool_name: transformedToolName,
    tool_input: objectToSnakeCase(ctx.toolInput),
    tool_response: objectToSnakeCase(ctx.toolOutput),
    tool_use_id: ctx.toolUseId,
    hook_source: "supercode-plugin",
  };

  const messages: string[] = [];
  const warnings: string[] = [];
  let firstHookName: string | undefined;

  const startTime = Date.now();

  const shellConfig = {
    forceZsh: options?.forceZsh ?? DEFAULT_SHELL_CONFIG.forceZsh,
    zshPath: options?.zshPath ?? DEFAULT_SHELL_CONFIG.zshPath,
  };

  for (const matcher of matchers) {
    for (const hook of matcher.hooks) {
      if (hook.type !== "command") continue;

      const hookName = hook.command.split("/").pop() || hook.command;
      if (!firstHookName) firstHookName = hookName;

      const result = await executeHookCommand(
        hook.command,
        JSON.stringify(stdinData),
        ctx.cwd,
        shellConfig
      );

      if (result.stdout) {
        messages.push(result.stdout);
      }

      if (result.exitCode === 2) {
        if (result.stderr) {
          warnings.push(`[${hookName}]\n${result.stderr.trim()}`);
        }
        continue;
      }

      if (result.exitCode === 0 && result.stdout) {
        try {
          const output = JSON.parse(result.stdout) as PostToolUseOutput;
          if (output.decision === "block") {
            return {
              block: true,
              reason: output.reason || result.stderr,
              message: messages.join("\n"),
              warnings: warnings.length > 0 ? warnings : undefined,
              elapsedMs: Date.now() - startTime,
              hookName: firstHookName,
              toolName: transformedToolName,
              additionalContext: output.hookSpecificOutput?.additionalContext,
              continue: output.continue,
              stopReason: output.stopReason,
              suppressOutput: output.suppressOutput,
              systemMessage: output.systemMessage,
            };
          }
          if (
            output.hookSpecificOutput?.additionalContext ||
            output.continue !== undefined ||
            output.systemMessage ||
            output.suppressOutput === true ||
            output.stopReason !== undefined
          ) {
            return {
              block: false,
              message: messages.join("\n"),
              warnings: warnings.length > 0 ? warnings : undefined,
              elapsedMs: Date.now() - startTime,
              hookName: firstHookName,
              toolName: transformedToolName,
              additionalContext: output.hookSpecificOutput?.additionalContext,
              continue: output.continue,
              stopReason: output.stopReason,
              suppressOutput: output.suppressOutput,
              systemMessage: output.systemMessage,
            };
          }
        } catch {
          if (options?.debug) {
            logger.debug(
              "[claude-code-hooks] Failed to parse PostToolUse hook output"
            );
          }
        }
      } else if (result.exitCode !== 0 && result.exitCode !== 2) {
        try {
          const output = JSON.parse(
            result.stdout || "{}"
          ) as PostToolUseOutput;
          if (output.decision === "block") {
            return {
              block: true,
              reason: output.reason || result.stderr,
              message: messages.join("\n"),
              warnings: warnings.length > 0 ? warnings : undefined,
              elapsedMs: Date.now() - startTime,
              hookName: firstHookName,
              toolName: transformedToolName,
              additionalContext: output.hookSpecificOutput?.additionalContext,
              continue: output.continue,
              stopReason: output.stopReason,
              suppressOutput: output.suppressOutput,
              systemMessage: output.systemMessage,
            };
          }
        } catch {
        }
      }
    }
  }

  const elapsedMs = Date.now() - startTime;

  return {
    block: false,
    message: messages.length > 0 ? messages.join("\n") : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    elapsedMs,
    hookName: firstHookName,
    toolName: transformedToolName,
  };
}
