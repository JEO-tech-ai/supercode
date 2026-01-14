export type HookEvent =
  | "session.start"
  | "session.end"
  | "session.idle"
  | "session.error"
  | "session.compacting"
  | "session.deleted"
  | "request.before"
  | "request.after"
  | "response.before"
  | "response.after"
  | "message.before"
  | "message.after"
  | "message.updated"
  | "message.error"
  | "tool.before"
  | "tool.after"
  | "tool.error"
  | "agent.spawn"
  | "agent.complete"
  | "agent.error"
  | "context.overflow"
  | "context.compacting"
  | "user.prompt"
  | "user.cancel"
  | "error";

export interface HookContext {
  sessionId: string;
  workdir: string;
  event: HookEvent;
  data?: unknown;
  toolName?: string;
  toolResult?: unknown;
  message?: string;
  taskId?: string;
  agent?: string;
  error?: Error | string;
  description?: string;
  todos?: Todo[];
  toolStats?: Record<string, number>;
}

export type HookHandler = (context: HookContext) => Promise<HookResult | void>;

export type HookAction = "continue" | "skip" | "retry" | "abort" | "inject" | "modify";

export interface HookResult {
  continue?: boolean;
  prompt?: string;
  modified?: unknown;
  action?: HookAction;
  data?: unknown;
}

export interface Hook {
  name: string;
  events: HookEvent[];
  priority?: number;
  handler: HookHandler;
}

export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required?: boolean;
  default?: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  sessionId: string;
  workdir: string;
}

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  data?: unknown;
}

export interface Session {
  id: string;
  startedAt: Date;
  workdir: string;
  model: string;
  messages: SessionMessage[];
  mode?: "normal" | "ultrawork";
  loop?: {
    iteration: number;
    maxIterations: number;
    stagnantCount: number;
    lastPendingHash?: string;
  };
}

export interface SessionMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result?: string;
  }>;
}

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled" | "failed";

export interface Todo {
  id: string;
  sessionId: string;
  content: string;
  status: TaskStatus;
  priority: "high" | "medium" | "low";
  createdAt: Date;
  updatedAt: Date;
}
