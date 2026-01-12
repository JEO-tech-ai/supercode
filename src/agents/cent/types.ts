/**
 * Cent Agent Type Definitions
 * Enhanced orchestrator agent evolved from Sisyphus.
 * Implements 6-phase workflow with multi-agent coordination.
 */

import type {
  AgentCategory,
  AgentCost,
  AgentCreateOptions,
  AgentMode,
  AgentPromptMetadata,
  AvailableAgent,
  ProjectContext,
  ToolSelectionEntry,
} from "../types";

/**
 * Cent workflow phases
 */
export type CentPhase =
  | "intent"        // Phase 0: Intent Classification
  | "context"       // Phase 1: Context Gathering
  | "decomposition" // Phase 2: Task Decomposition
  | "delegation"    // Phase 3: Agent Delegation
  | "execution"     // Phase 4: Task Execution
  | "verification"; // Phase 5: Verification & Completion

/**
 * Phase state for workflow tracking
 */
export interface CentPhaseState {
  /** Current phase */
  current: CentPhase;
  /** Phase number (0-5) */
  number: number;
  /** Phase start time */
  startedAt: string;
  /** Whether phase is complete */
  complete: boolean;
  /** Phase-specific data */
  data?: Record<string, unknown>;
}

/**
 * Cent workflow state
 */
export interface CentWorkflowState {
  /** Session ID */
  sessionId: string;
  /** Task prompt */
  prompt: string;
  /** Current phase */
  phase: CentPhaseState;
  /** Phase history */
  history: CentPhaseState[];
  /** Workflow start time */
  startedAt: string;
  /** Whether workflow is complete */
  complete: boolean;
  /** Delegated tasks */
  delegatedTasks: DelegatedTask[];
  /** Execution results */
  results: ExecutionResult[];
}

/**
 * Delegated task tracking
 */
export interface DelegatedTask {
  /** Task ID */
  id: string;
  /** Task description */
  description: string;
  /** Delegated agent */
  agent: string;
  /** Task status */
  status: "pending" | "running" | "completed" | "failed";
  /** Task priority */
  priority: "low" | "medium" | "high";
  /** Dependencies (other task IDs) */
  dependencies?: string[];
  /** Task result */
  result?: string;
  /** Error if failed */
  error?: string;
}

/**
 * Execution result from delegated task
 */
export interface ExecutionResult {
  /** Task ID */
  taskId: string;
  /** Agent that executed */
  agent: string;
  /** Success status */
  success: boolean;
  /** Result content */
  content?: string;
  /** Error message */
  error?: string;
  /** Duration in ms */
  durationMs?: number;
}

/**
 * Multi-agent coordinator configuration
 */
export interface MultiAgentConfig {
  /** Claude Code - Primary orchestrator */
  claude?: {
    enabled: boolean;
    model?: string;
    role: "orchestrator";
  };
  /** Gemini CLI - Analyst agent */
  gemini?: {
    enabled: boolean;
    model?: string;
    role: "analyst";
    mcpTool?: string;
  };
  /** Codex CLI - Executor agent */
  codex?: {
    enabled: boolean;
    role: "executor";
    mcpTool?: string;
  };
}

/**
 * Cent agent configuration options
 * Extends AgentCreateOptions with Cent-specific properties
 */
export interface CentAgentOptions extends AgentCreateOptions {
  /** Multi-agent configuration */
  multiAgentConfig?: MultiAgentConfig;
  /** Enable Ralph Loop integration */
  enableRalphLoop?: boolean;
  /** Custom phases to include */
  customPhases?: CentPhaseDefinition[];
  /** Tool selection hints (for prompt generation) */
  toolSelectionHints?: ToolSelectionEntry[];
  /** Debug mode */
  debug?: boolean;
}

/**
 * Phase definition for workflow
 */
export interface CentPhaseDefinition {
  /** Phase identifier */
  id: CentPhase;
  /** Phase number */
  number: number;
  /** Phase name */
  name: string;
  /** Phase description */
  description: string;
  /** Actions in this phase */
  actions: string[];
  /** Transition conditions */
  transitions?: CentPhaseTransition[];
  /** Agents to use in this phase */
  suggestedAgents?: string[];
  /** Tools to use in this phase */
  suggestedTools?: string[];
}

/**
 * Phase transition definition
 */
export interface CentPhaseTransition {
  /** Target phase */
  target: CentPhase | "complete" | "ask_user";
  /** Condition description */
  condition: string;
  /** Priority (higher = check first) */
  priority?: number;
}

/**
 * Cent prompt builder options
 */
export interface CentPromptBuilderOptions {
  /** Available specialist agents */
  availableAgents: AvailableAgent[];
  /** Project context */
  projectContext?: ProjectContext;
  /** Multi-agent configuration */
  multiAgentConfig?: MultiAgentConfig;
  /** Include phase definitions */
  includePhases?: boolean;
  /** Include tool selection */
  includeToolSelection?: boolean;
  /** Include multi-agent section */
  includeMultiAgent?: boolean;
  /** Include Ralph Loop section */
  includeRalphLoop?: boolean;
  /** Custom sections */
  customSections?: string[];
}

/**
 * Cost-aware agent selection
 */
export interface AgentSelectionCriteria {
  /** Task complexity */
  complexity: "simple" | "moderate" | "complex";
  /** Required capabilities */
  capabilities: string[];
  /** Preferred cost level */
  preferredCost?: AgentCost;
  /** Whether extended thinking is needed */
  needsExtendedThinking?: boolean;
}

/**
 * Agent selection result
 */
export interface AgentSelectionResult {
  /** Selected agent name */
  agent: string;
  /** Selection reason */
  reason: string;
  /** Estimated cost */
  cost: AgentCost;
  /** Confidence score (0-1) */
  confidence: number;
}
