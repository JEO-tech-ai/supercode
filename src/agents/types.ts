/**
 * Agent System Types
 * Type definitions for metadata-driven agent orchestration.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import type { Tool } from "../core/tools/types";

/**
 * Agent category for classification
 */
export type AgentCategory =
  | "orchestrator"
  | "exploration"
  | "specialist"
  | "advisor"
  | "utility";

/**
 * Agent cost classification for resource selection
 */
export type AgentCost = "FREE" | "CHEAP" | "EXPENSIVE";

/**
 * Agent mode - primary or subagent
 */
export type AgentMode = "primary" | "subagent";

/**
 * Delegation trigger for routing decisions
 */
export interface DelegationTrigger {
  /** Domain/area of expertise */
  domain: string;
  /** Trigger condition description */
  trigger: string;
}

/**
 * Agent prompt metadata for dynamic prompt generation
 */
export interface AgentPromptMetadata {
  /** Agent category */
  category: AgentCategory;
  /** Cost classification */
  cost: AgentCost;
  /** Delegation triggers */
  triggers: DelegationTrigger[];
  /** When to use this agent */
  useWhen?: string[];
  /** When to avoid this agent */
  avoidWhen?: string[];
  /** Dedicated section name in orchestrator prompt */
  dedicatedSection?: string;
  /** Alias for prompt references */
  promptAlias?: string;
  /** Key trigger phrase */
  keyTrigger?: string;
}

/**
 * Available agent information for orchestrator
 */
export interface AvailableAgent {
  /** Agent name/identifier */
  name: string;
  /** Agent description */
  description: string;
  /** Prompt metadata */
  metadata: AgentPromptMetadata;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Agent mode */
  mode: AgentMode;
  /** Model identifier */
  model: string;
  /** System prompt */
  prompt: string;
  /** Agent description */
  description: string;
  /** Available tools */
  tools?: Tool[];
  /** Maximum turns */
  maxTurns?: number;
  /** Temperature */
  temperature?: number;
  /** Enable extended thinking */
  extendedThinking?: boolean;
  /** Thinking budget tokens */
  thinkingBudget?: number;
}

/**
 * Agent definition
 */
export interface AgentDefinition {
  /** Agent name/identifier */
  name: string;
  /** Agent description */
  description: string;
  /** Prompt metadata */
  metadata: AgentPromptMetadata;
  /** Create agent configuration */
  createConfig: (options?: AgentCreateOptions) => AgentConfig;
}

/**
 * Options for agent creation
 */
export interface AgentCreateOptions {
  /** Override mode */
  mode?: AgentMode;
  /** Override model */
  model?: string;
  /** Additional tools */
  additionalTools?: Tool[];
  /** Custom prompt additions */
  promptAdditions?: string;
  /** Available agents for orchestrator */
  availableAgents?: AvailableAgent[];
  /** Project context */
  projectContext?: ProjectContext;
}

/**
 * Project context for agent prompts
 */
export interface ProjectContext {
  /** Project name */
  name?: string;
  /** Project description */
  description?: string;
  /** Project type */
  type?: string;
  /** Tech stack */
  techStack?: string[];
  /** Root directory */
  rootDir?: string;
  /** Key files */
  keyFiles?: string[];
}

/**
 * Agent execution result
 */
export interface AgentResult {
  /** Success status */
  success: boolean;
  /** Result content */
  content?: string;
  /** Error if failed */
  error?: string;
  /** Tokens used */
  tokensUsed?: {
    input: number;
    output: number;
  };
  /** Execution duration in ms */
  durationMs?: number;
}

/**
 * Agent factory function type
 */
export type AgentFactory = (options?: AgentCreateOptions) => AgentDefinition;

/**
 * Built-in agent names
 */
export type BuiltinAgentName =
  | "sisyphus"
  | "cent"
  | "explore"
  | "oracle"
  | "librarian"
  | "frontend-engineer"
  | "document-writer"
  | "multimodal-looker";

/**
 * Agent registry type
 */
export type AgentRegistry = Map<string, AgentDefinition>;

/**
 * Tool selection entry for prompt tables
 */
export interface ToolSelectionEntry {
  /** Tool name */
  tool: string;
  /** When to use */
  when: string;
  /** Why to use */
  why: string;
}

/**
 * Phase definition for orchestrator workflow
 */
export interface WorkflowPhase {
  /** Phase number */
  number: number;
  /** Phase name */
  name: string;
  /** Phase description */
  description: string;
  /** Actions in this phase */
  actions: string[];
  /** Transition conditions */
  transitions?: {
    next?: string;
    condition?: string;
  }[];
}
