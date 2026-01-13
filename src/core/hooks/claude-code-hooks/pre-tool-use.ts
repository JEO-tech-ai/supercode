import type {
  PreToolUseInput,
  PreToolUseOutput,
  PermissionDecision,
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

export interface PreToolUseContext {
  sessionId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  cwd: string;
  transcriptPath?: string;
  toolUseId?: string;
  permissionMode?: "default" | "plan" | "acceptEdits" | "bypassPermissions";
}

export interface PreToolUseResult {
  decision: PermissionDecision;
  reason?: string;
  modifiedInput?: Record<string, unknown>;
  elapsedMs?: number;
  hookName?: string;
  toolName?: string;
  inputLines?: string;
  continue?: boolean;
  stopReason?: string;
  suppressOutput?: boolean;
  systemMessage?: string;
}

function buildInputLines(toolInput: Record<string, unknown>): string {
  return Object.entries(toolInput)
    .slice(0, 3)
    .map(([key, val]) => {
      const valStr = String(val).slice(0, 40);
      return `  ${key}: ${valStr}${String(val).length > 40 ? "..." : ""}`;
    })
    .join("\n");
}

export async function executePreToolUseHooks(
  ctx: PreToolUseContext,
  config: ClaudeHooksConfig | null,
  options?: { forceZsh?: boolean; zshPath?: string; debug?: boolean }
): Promise<PreToolUseResult> {
  if (!config) {
    return { decision: "allow" };
  }

  const transformedToolName = transformToolName(ctx.toolName);
  const matchers = findMatchingHooks(config, "PreToolUse", transformedToolName);
  if (matchers.length === 0) {
    return { decision: "allow" };
  }

  const stdinData: PreToolUseInput = {
    session_id: ctx.sessionId,
    transcript_path: ctx.transcriptPath,
    cwd: ctx.cwd,
    permission_mode: ctx.permissionMode ?? "bypassPermissions",
    hook_event_name: "PreToolUse",
    tool_name: transformedToolName,
    tool_input: objectToSnakeCase(ctx.toolInput),
    tool_use_id: ctx.toolUseId,
    hook_source: "supercode-plugin",
  };

  const startTime = Date.now();
  let firstHookName: string | undefined;
  const inputLines = buildInputLines(ctx.toolInput);

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
        return {
          decision: "deny",
          reason: result.stderr || result.stdout || "Hook blocked the operation",
          elapsedMs: Date.now() - startTime,
          hookName: firstHookName,
          toolName: transformedToolName,
          inputLines,
        };
      }

      if (result.exitCode === 1) {
        return {
          decision: "ask",
          reason: result.stderr || result.stdout,
          elapsedMs: Date.now() - startTime,
          hookName: firstHookName,
          toolName: transformedToolName,
          inputLines,
        };
      }

      if (result.stdout) {
        try {
          const output = JSON.parse(result.stdout) as PreToolUseOutput;

          let decision: PermissionDecision | undefined;
          let reason: string | undefined;
          let modifiedInput: Record<string, unknown> | undefined;

          if (output.hookSpecificOutput?.permissionDecision) {
            decision = output.hookSpecificOutput.permissionDecision;
            reason = output.hookSpecificOutput.permissionDecisionReason;
            modifiedInput = output.hookSpecificOutput.updatedInput;
          } else if (output.decision) {
            const legacyDecision = output.decision;
            if (legacyDecision === "approve" || legacyDecision === "allow") {
              decision = "allow";
            } else if (legacyDecision === "block" || legacyDecision === "deny") {
              decision = "deny";
            } else if (legacyDecision === "ask") {
              decision = "ask";
            }
            reason = output.reason;
          }

          const hasCommonFields =
            output.continue !== undefined ||
            output.stopReason !== undefined ||
            output.suppressOutput !== undefined ||
            output.systemMessage !== undefined;

          if (decision || hasCommonFields) {
            return {
              decision: decision ?? "allow",
              reason,
              modifiedInput,
              elapsedMs: Date.now() - startTime,
              hookName: firstHookName,
              toolName: transformedToolName,
              inputLines,
              continue: output.continue,
              stopReason: output.stopReason,
              suppressOutput: output.suppressOutput,
              systemMessage: output.systemMessage,
            };
          }
        } catch {
          if (options?.debug) {
            logger.debug(
              "[claude-code-hooks] Failed to parse PreToolUse hook output"
            );
          }
        }
      }
    }
  }

  return { decision: "allow" };
}
