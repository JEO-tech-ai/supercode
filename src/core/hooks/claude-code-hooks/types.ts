/**
 * Claude Code Hooks Type Definitions
 * Maps Claude Code hook concepts to SuperCode plugin events
 */

export type ClaudeHookEvent =
  | "PreToolUse"
  | "PostToolUse"
  | "UserPromptSubmit"
  | "Stop"
  | "PreCompact";

export interface HookMatcher {
  matcher: string;
  hooks: HookCommand[];
}

export interface HookCommand {
  type: "command";
  command: string;
}

export interface ClaudeHooksConfig {
  PreToolUse?: HookMatcher[];
  PostToolUse?: HookMatcher[];
  UserPromptSubmit?: HookMatcher[];
  Stop?: HookMatcher[];
  PreCompact?: HookMatcher[];
}

export interface PreToolUseInput {
  session_id: string;
  transcript_path?: string;
  cwd: string;
  permission_mode?: PermissionMode;
  hook_event_name: "PreToolUse";
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_use_id?: string;
  hook_source?: HookSource;
}

export interface PostToolUseInput {
  session_id: string;
  transcript_path?: string;
  cwd: string;
  permission_mode?: PermissionMode;
  hook_event_name: "PostToolUse";
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_response: {
    title?: string;
    output?: string;
    [key: string]: unknown;
  };
  tool_use_id?: string;
  hook_source?: HookSource;
}

export interface UserPromptSubmitInput {
  session_id: string;
  cwd: string;
  permission_mode?: PermissionMode;
  hook_event_name: "UserPromptSubmit";
  prompt: string;
  session?: {
    id: string;
  };
  hook_source?: HookSource;
}

export type PermissionMode =
  | "default"
  | "plan"
  | "acceptEdits"
  | "bypassPermissions";

export type HookSource = "supercode-plugin";

export interface StopInput {
  session_id: string;
  transcript_path?: string;
  cwd: string;
  permission_mode?: PermissionMode;
  hook_event_name: "Stop";
  stop_hook_active: boolean;
  todo_path?: string;
  hook_source?: HookSource;
}

export interface PreCompactInput {
  session_id: string;
  cwd: string;
  hook_event_name: "PreCompact";
  hook_source?: HookSource;
}

export type PermissionDecision = "allow" | "deny" | "ask";

/**
 * Common JSON fields for all hook outputs (Claude Code spec)
 */
export interface HookCommonOutput {
  /** If false, Claude stops entirely */
  continue?: boolean;
  /** Message shown to user when continue=false */
  stopReason?: string;
  /** Suppress output from transcript */
  suppressOutput?: boolean;
  /** Warning/message displayed to user */
  systemMessage?: string;
}

export interface PreToolUseOutput extends HookCommonOutput {
  /** Deprecated: use hookSpecificOutput.permissionDecision instead */
  decision?: "allow" | "deny" | "approve" | "block" | "ask";
  /** Deprecated: use hookSpecificOutput.permissionDecisionReason instead */
  reason?: string;
  hookSpecificOutput?: {
    hookEventName: "PreToolUse";
    permissionDecision: PermissionDecision;
    permissionDecisionReason?: string;
    updatedInput?: Record<string, unknown>;
  };
}

export interface PostToolUseOutput extends HookCommonOutput {
  decision?: "block";
  reason?: string;
  hookSpecificOutput?: {
    hookEventName: "PostToolUse";
    /** Additional context to provide to Claude */
    additionalContext?: string;
  };
}

export interface HookResult {
  exitCode: number;
  stdout?: string;
  stderr?: string;
}

export interface StopOutput {
  decision?: "block" | "continue";
  reason?: string;
  stop_hook_active?: boolean;
  permission_mode?: PermissionMode;
  inject_prompt?: string;
}

export interface PreCompactOutput extends HookCommonOutput {
  /** Additional context to inject into compaction prompt */
  context?: string[];
  hookSpecificOutput?: {
    hookEventName: "PreCompact";
    /** Additional context strings to inject */
    additionalContext?: string[];
  };
}

/**
 * Plugin configuration options for Claude Code hooks
 */
export interface ClaudeCodeHooksOptions {
  /** Custom settings.json path */
  settingsPath?: string;
  /** Force use of zsh shell */
  forceZsh?: boolean;
  /** Custom zsh path */
  zshPath?: string;
  /** Disabled hook events */
  disabledHooks?: boolean | ClaudeHookEvent[];
  /** Enable debug logging */
  debug?: boolean;
}
