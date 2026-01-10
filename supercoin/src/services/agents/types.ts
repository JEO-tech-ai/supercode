import type { AIRequest, AIResponse } from "../models/types";

export type AgentName = "coin" | "analyst" | "executor" | "code_reviewer" | "doc_writer" | "explorer";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled" | "failed";

export enum RequestType {
  TRIVIAL = "trivial",
  EXPLICIT = "explicit",
  EXPLORATORY = "exploratory",
  OPEN_ENDED = "open_ended",
  COMPLEX = "complex",
}

export interface AgentResult {
  success: boolean;
  content?: string;
  error?: string;
  toolCalls?: AIResponse["toolCalls"];
  usage?: AIResponse["usage"];
  model?: string;
  pending?: boolean;
  taskId?: string;
}

export interface Agent {
  readonly name: AgentName;
  readonly displayName: string;
  readonly model?: string;
  readonly capabilities: string[];
  readonly allowedTools?: string[];
  readonly restrictedTools?: string[];

  execute(prompt: string, context?: AgentContext): Promise<AgentResult>;
}

export interface AgentContext {
  sessionId: string;
  workdir: string;
  files?: string[];
}

export interface Task {
  id: string;
  description: string;
  type: TaskType;
  expectedOutcome: string;
  agent?: AgentName;
  requirements?: string[];
  restrictions?: string[];
  allowedTools?: string[];
  context?: string;
  outputFormat?: string;
  runInBackground?: boolean;
  critical?: boolean;
}

export type TaskType = "analysis" | "execution" | "code_review" | "documentation" | "frontend" | "exploration";

export interface Todo {
  id: string;
  content: string;
  status: TaskStatus;
  priority: "high" | "medium" | "low";
  agent?: AgentName;
  createdAt: Date;
  updatedAt: Date;
}

export interface BackgroundTask {
  id: string;
  sessionId: string;
  agent: AgentName;
  prompt: string;
  description: string;
  status: TaskStatus;
  progress: {
    step: number;
    total: number;
    message: string;
  };
  startedAt: Date;
  completedAt?: Date;
  result?: AgentResult;
  error?: string;
}

export interface ExecutionPlan {
  tasks: Task[];
  parallel: boolean;
}

export interface ExecutionResult {
  success: boolean;
  taskId?: string;
  pending?: boolean;
  error?: string;
}
