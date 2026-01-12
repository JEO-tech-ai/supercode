import type { AIRequest, AIResponse } from "../models/types";

/**
 * Agent names (extended with new agents)
 */
export type AgentName =
  | "coin"            // Master orchestrator
  | "analyst"         // Code analysis specialist
  | "executor"        // Command execution specialist
  | "code_reviewer"   // Code review specialist
  | "doc_writer"      // Documentation specialist
  | "explorer"        // Codebase exploration
  | "librarian"       // External research (GitHub, docs, web)
  | "frontend"        // UI/UX specialist
  | "multimodal";     // PDF/image analysis

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled" | "failed";

/**
 * Request classification types
 */
export enum RequestType {
  TRIVIAL = "trivial",
  EXPLICIT = "explicit",
  EXPLORATORY = "exploratory",
  OPEN_ENDED = "open_ended",
  COMPLEX = "complex",
  SKILL_MATCH = "skill_match",     // Matches a specific skill/command
  GITHUB_WORK = "github_work",     // GitHub-related work (PR, issues)
  AMBIGUOUS = "ambiguous",         // Needs clarification
}

/**
 * Agent category for delegation decisions
 */
export type AgentCategory =
  | "orchestrator"   // Primary orchestrator (coin)
  | "exploration"    // Codebase/external search (explorer, librarian)
  | "specialist"     // Domain experts (frontend, doc_writer)
  | "advisor"        // Strategic advisors (analyst)
  | "utility";       // Utility tasks (multimodal, executor)

/**
 * Agent cost classification for resource optimization
 */
export type AgentCost = "FREE" | "CHEAP" | "EXPENSIVE";

/**
 * Delegation trigger for agent selection
 */
export interface DelegationTrigger {
  /** Domain this trigger applies to (e.g., "Frontend UI/UX", "Documentation") */
  domain: string;
  /** Trigger description for the orchestrator */
  trigger: string;
}

/**
 * Agent prompt metadata for dynamic prompt generation
 */
export interface AgentPromptMetadata {
  /** Agent category for grouping */
  category: AgentCategory;
  /** Cost classification */
  cost: AgentCost;
  /** Triggers that should delegate to this agent */
  triggers: DelegationTrigger[];
  /** When to use this agent */
  useWhen?: string[];
  /** When to avoid this agent */
  avoidWhen?: string[];
  /** Dedicated section in orchestrator prompt */
  dedicatedSection?: string;
  /** Display alias for prompts */
  promptAlias?: string;
  /** Key trigger for blocking gate (Phase 0) */
  keyTrigger?: string;
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

/**
 * Agent configuration (static definition)
 */
export interface AgentConfig {
  /** Agent display name */
  name: string;
  /** Agent description */
  description: string;
  /** Agent mode */
  mode: "primary" | "subagent";
  /** Model identifier */
  model: string;
  /** Temperature for LLM calls */
  temperature?: number;
  /** Max tokens for response */
  maxTokens?: number;
  /** Allowed tools for this agent */
  allowedTools?: string[];
  /** Restricted tools for this agent */
  restrictedTools?: string[];
  /** System prompt */
  prompt: string;
  /** Extended thinking budget (for reasoning models) */
  thinkingBudget?: number;
}

/**
 * Agent factory function type
 */
export type AgentFactory = (model?: string) => AgentConfig;

/**
 * Agent interface (runtime instance)
 */
export interface Agent {
  readonly name: AgentName;
  readonly displayName: string;
  readonly model?: string;
  readonly capabilities: string[];
  readonly allowedTools?: string[];
  readonly restrictedTools?: string[];
  /** Agent prompt metadata for delegation */
  readonly metadata?: AgentPromptMetadata;

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
  sessionId: string;
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
