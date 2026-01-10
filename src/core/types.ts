export type HookEvent =
  | "session.start"
  | "session.end"
  | "session.idle"
  | "request.before"
  | "request.after"
  | "response.before"
  | "response.after"
  | "tool.before"
  | "tool.after"
  | "agent.spawn"
  | "agent.complete"
  | "error";

export interface HookContext {
  sessionId: string;
  workdir: string;
  event: HookEvent;
  data?: unknown;
}

export type HookHandler = (context: HookContext) => Promise<HookResult | void>;

export interface HookResult {
  continue?: boolean;
  prompt?: string;
  modified?: unknown;
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
