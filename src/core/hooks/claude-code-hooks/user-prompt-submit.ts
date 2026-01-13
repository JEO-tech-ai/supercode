import type {
  UserPromptSubmitInput,
  PostToolUseOutput,
  ClaudeHooksConfig,
} from "./types";
import {
  findMatchingHooks,
  executeHookCommand,
  DEFAULT_SHELL_CONFIG,
} from "./utils";
import logger from "../../../shared/logger";

const USER_PROMPT_SUBMIT_TAG_OPEN = "<user-prompt-submit-hook>";
const USER_PROMPT_SUBMIT_TAG_CLOSE = "</user-prompt-submit-hook>";

export interface MessagePart {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  [key: string]: unknown;
}

export interface UserPromptSubmitContext {
  sessionId: string;
  parentSessionId?: string;
  prompt: string;
  parts: MessagePart[];
  cwd: string;
  permissionMode?: "default" | "acceptEdits" | "bypassPermissions";
}

export interface UserPromptSubmitResult {
  block: boolean;
  reason?: string;
  modifiedParts: MessagePart[];
  messages: string[];
}

export async function executeUserPromptSubmitHooks(
  ctx: UserPromptSubmitContext,
  config: ClaudeHooksConfig | null,
  options?: { forceZsh?: boolean; zshPath?: string; debug?: boolean }
): Promise<UserPromptSubmitResult> {
  const modifiedParts = ctx.parts;
  const messages: string[] = [];

  if (ctx.parentSessionId) {
    return { block: false, modifiedParts, messages };
  }

  if (
    ctx.prompt.includes(USER_PROMPT_SUBMIT_TAG_OPEN) &&
    ctx.prompt.includes(USER_PROMPT_SUBMIT_TAG_CLOSE)
  ) {
    return { block: false, modifiedParts, messages };
  }

  if (!config) {
    return { block: false, modifiedParts, messages };
  }

  const matchers = findMatchingHooks(config, "UserPromptSubmit");
  if (matchers.length === 0) {
    return { block: false, modifiedParts, messages };
  }

  const stdinData: UserPromptSubmitInput = {
    session_id: ctx.sessionId,
    cwd: ctx.cwd,
    permission_mode: ctx.permissionMode ?? "bypassPermissions",
    hook_event_name: "UserPromptSubmit",
    prompt: ctx.prompt,
    session: { id: ctx.sessionId },
    hook_source: "supercode-plugin",
  };

  const shellConfig = {
    forceZsh: options?.forceZsh ?? DEFAULT_SHELL_CONFIG.forceZsh,
    zshPath: options?.zshPath ?? DEFAULT_SHELL_CONFIG.zshPath,
  };

  for (const matcher of matchers) {
    for (const hook of matcher.hooks) {
      if (hook.type !== "command") continue;

      const result = await executeHookCommand(
        hook.command,
        JSON.stringify(stdinData),
        ctx.cwd,
        shellConfig
      );

      if (result.stdout) {
        const output = result.stdout.trim();
        if (output.startsWith(USER_PROMPT_SUBMIT_TAG_OPEN)) {
          messages.push(output);
        } else {
          messages.push(
            `${USER_PROMPT_SUBMIT_TAG_OPEN}\n${output}\n${USER_PROMPT_SUBMIT_TAG_CLOSE}`
          );
        }
      }

      if (result.exitCode !== 0) {
        try {
          const output = JSON.parse(
            result.stdout || "{}"
          ) as PostToolUseOutput;
          if (output.decision === "block") {
            return {
              block: true,
              reason: output.reason || result.stderr,
              modifiedParts,
              messages,
            };
          }
        } catch {
        }
      }
    }
  }

  return { block: false, modifiedParts, messages };
}
