/**
 * Hook System Types
 * Event-driven extensibility for agent behavior modification
 * Inspired by oh-my-opencode's 22 hook system
 */
import type { AgentName, AgentResult } from "../agents/types";
import type { ToolCall } from "../models/types";

// Hook Event Types
export type HookEventType =
  | "PreToolUse"
  | "PostToolUse"
  | "UserPromptSubmit"
  | "Stop"
  | "OnSummarize"
  | "OnError"
  | "BackgroundTaskComplete"
  | "SessionStart"
  | "SessionEnd"
  | "ContextOverflow";

// Hook Result
export interface HookResult {
  /** Whether to continue processing */
  continue: boolean;
  /** Modified data to pass to next handler */
  modified?: unknown;
  /** Message to log or display */
  message?: string;
  /** Skip remaining hooks of this event */
  skipRemaining?: boolean;
}

// Event Arguments
export interface PreToolUseArgs {
  toolName: string;
  toolInput: Record<string, unknown>;
  sessionId: string;
  agent?: AgentName;
}

export interface PostToolUseArgs {
  toolName: string;
  toolInput: Record<string, unknown>;
  toolOutput: unknown;
  duration: number;
  sessionId: string;
  agent?: AgentName;
  error?: Error;
}

export interface UserPromptSubmitArgs {
  prompt: string;
  sessionId: string;
  files?: string[];
  images?: string[];
}

export interface StopArgs {
  sessionId: string;
  reason: "idle" | "completed" | "error" | "cancelled";
  hasPendingTodos?: boolean;
  lastMessage?: string;
}

export interface SummarizeArgs {
  sessionId: string;
  tokenCount: number;
  maxTokens: number;
  messages: Array<{ role: string; content: string }>;
}

export interface ErrorArgs {
  sessionId: string;
  error: Error;
  context?: string;
  recoverable: boolean;
}

export interface BackgroundTaskCompleteArgs {
  taskId: string;
  sessionId: string;
  parentSessionId?: string;
  agent: AgentName;
  status: "completed" | "failed";
  result?: AgentResult;
  error?: Error;
  duration: number;
}

export interface SessionStartArgs {
  sessionId: string;
  model: string;
  workingDirectory: string;
}

export interface SessionEndArgs {
  sessionId: string;
  tokenCount: number;
  duration: number;
}

export interface ContextOverflowArgs {
  sessionId: string;
  currentTokens: number;
  maxTokens: number;
  percentUsed: number;
}

// Event Args Map
export interface HookEventArgs {
  PreToolUse: PreToolUseArgs;
  PostToolUse: PostToolUseArgs;
  UserPromptSubmit: UserPromptSubmitArgs;
  Stop: StopArgs;
  OnSummarize: SummarizeArgs;
  OnError: ErrorArgs;
  BackgroundTaskComplete: BackgroundTaskCompleteArgs;
  SessionStart: SessionStartArgs;
  SessionEnd: SessionEndArgs;
  ContextOverflow: ContextOverflowArgs;
}

// Hook Handler Type
export type HookHandler<E extends HookEventType> = (
  args: HookEventArgs[E]
) => Promise<HookResult>;

// Hook Definition
export interface Hook<E extends HookEventType = HookEventType> {
  /** Unique hook name */
  name: string;
  /** Event this hook listens to */
  event: E;
  /** Handler function */
  handler: HookHandler<E>;
  /** Priority (lower runs first, default: 100) */
  priority?: number;
  /** Whether hook is enabled */
  enabled?: boolean;
  /** Description for documentation */
  description?: string;
}

// Hook Configuration
export interface HookConfig<E extends HookEventType = HookEventType> {
  name: string;
  event: E;
  handler: HookHandler<E>;
  priority?: number;
  description?: string;
}

// Factory function type
export type CreateHookFn = <E extends HookEventType>(config: HookConfig<E>) => Hook<E>;

/**
 * Create a hook with proper typing
 */
export function createHook<E extends HookEventType>(config: HookConfig<E>): Hook<E> {
  return {
    name: config.name,
    event: config.event,
    handler: config.handler,
    priority: config.priority ?? 100,
    enabled: true,
    description: config.description,
  };
}
