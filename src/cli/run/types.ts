/**
 * Run Command Types
 * Event-driven execution system for multi-agent workflows.
 */

export interface RunContext {
  sessionId: string;
  mainSessionId: string;
  workdir: string;
  model: string;
  provider: string;
  verbose: boolean;
  format: "default" | "json";
}

export type EventType =
  | "session.start"
  | "session.end"
  | "session.error"
  | "agent.spawn"
  | "agent.complete"
  | "tool.start"
  | "tool.end"
  | "tool.error"
  | "message.start"
  | "message.chunk"
  | "message.end"
  | "thinking.start"
  | "thinking.chunk"
  | "thinking.end"
  | "todo.update"
  | "background.start"
  | "background.complete";

export interface EventPayload {
  type: EventType;
  sessionId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface SessionEvent {
  type: "session.start" | "session.end" | "session.error";
  sessionId: string;
  parentId?: string;
  status?: "idle" | "active" | "error" | "completed";
  error?: string;
}

export interface AgentEvent {
  type: "agent.spawn" | "agent.complete";
  sessionId: string;
  agentName: string;
  taskId?: string;
  result?: {
    success: boolean;
    content?: string;
    error?: string;
  };
}

export interface ToolEvent {
  type: "tool.start" | "tool.end" | "tool.error";
  sessionId: string;
  toolName: string;
  args?: Record<string, unknown>;
  result?: string;
  error?: string;
  duration?: number;
}

export interface MessageEvent {
  type: "message.start" | "message.chunk" | "message.end";
  sessionId: string;
  role: "user" | "assistant";
  content?: string;
  chunk?: string;
}

export interface ThinkingEvent {
  type: "thinking.start" | "thinking.chunk" | "thinking.end";
  sessionId: string;
  content?: string;
  chunk?: string;
}

export interface TodoEvent {
  type: "todo.update";
  sessionId: string;
  todos: Array<{
    content: string;
    status: "pending" | "in_progress" | "completed";
  }>;
}

export interface BackgroundEvent {
  type: "background.start" | "background.complete";
  sessionId: string;
  taskId: string;
  description?: string;
  result?: unknown;
}

export type RunEvent =
  | SessionEvent
  | AgentEvent
  | ToolEvent
  | MessageEvent
  | ThinkingEvent
  | TodoEvent
  | BackgroundEvent;

export interface SessionStatus {
  id: string;
  parentId?: string;
  status: "idle" | "active" | "error" | "completed";
  agentName?: string;
  childIds: string[];
  todos: Array<{
    content: string;
    status: "pending" | "in_progress" | "completed";
  }>;
  lastActivity: number;
}

export interface EventState {
  mainSessionIdle: boolean;
  mainSessionError: boolean;
  lastError: string | null;
  lastOutput: string;
  lastPartText: string;
  currentTool: string | null;
  currentToolStart: number | null;
  sessions: Map<string, SessionStatus>;
  backgroundTasks: Map<string, {
    description: string;
    status: "running" | "completed" | "error";
  }>;
}
