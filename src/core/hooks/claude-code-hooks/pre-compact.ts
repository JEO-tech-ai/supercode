import type {
  PreCompactInput,
  PreCompactOutput,
  ClaudeHooksConfig,
} from "./types";
import {
  findMatchingHooks,
  executeHookCommand,
  DEFAULT_SHELL_CONFIG,
} from "./utils";
import logger from "../../../shared/logger";

export interface PreCompactContext {
  sessionId: string;
  cwd: string;
}

export interface PreCompactResult {
  context: string[];
  elapsedMs?: number;
  hookName?: string;
  continue?: boolean;
  stopReason?: string;
  suppressOutput?: boolean;
  systemMessage?: string;
}

export async function executePreCompactHooks(
  ctx: PreCompactContext,
  config: ClaudeHooksConfig | null,
  options?: { forceZsh?: boolean; zshPath?: string; debug?: boolean }
): Promise<PreCompactResult> {
  if (!config) {
    return { context: [] };
  }

  const matchers = findMatchingHooks(config, "PreCompact", "*");
  if (matchers.length === 0) {
    return { context: [] };
  }

  const stdinData: PreCompactInput = {
    session_id: ctx.sessionId,
    cwd: ctx.cwd,
    hook_event_name: "PreCompact",
    hook_source: "supercode-plugin",
  };

  const startTime = Date.now();
  let firstHookName: string | undefined;
  const collectedContext: string[] = [];

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

      if (result.exitCode === 2) {
        if (options?.debug) {
          logger.debug("[claude-code-hooks] PreCompact hook blocked", {
            hookName,
            stderr: result.stderr,
          });
        }
        continue;
      }

      if (result.stdout) {
        try {
          const output = JSON.parse(result.stdout) as PreCompactOutput;

          if (output.hookSpecificOutput?.additionalContext) {
            collectedContext.push(
              ...output.hookSpecificOutput.additionalContext
            );
          } else if (output.context) {
            collectedContext.push(...output.context);
          }

          if (output.continue === false) {
            return {
              context: collectedContext,
              elapsedMs: Date.now() - startTime,
              hookName: firstHookName,
              continue: output.continue,
              stopReason: output.stopReason,
              suppressOutput: output.suppressOutput,
              systemMessage: output.systemMessage,
            };
          }
        } catch {
          if (result.stdout.trim()) {
            collectedContext.push(result.stdout.trim());
          }
        }
      }
    }
  }

  return {
    context: collectedContext,
    elapsedMs: Date.now() - startTime,
    hookName: firstHookName,
  };
}
