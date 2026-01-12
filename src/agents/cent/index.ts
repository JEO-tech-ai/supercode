/**
 * Cent Agent
 * Enhanced orchestrator agent evolved from Sisyphus.
 * Implements 6-phase workflow with multi-agent coordination.
 */

import type {
  AgentDefinition,
  AgentPromptMetadata,
  AgentConfig,
  AvailableAgent,
} from "../types";
import type { CentAgentOptions } from "./types";
import { createBaseConfig, DEFAULT_MODELS } from "../utils";
import { buildCentPrompt } from "./prompt-builder";
import {
  AGENT_NAME,
  AGENT_DESCRIPTION,
  DEFAULT_MULTI_AGENT_CONFIG,
  CENT_PHASES,
} from "./constants";

// Re-export types and utilities
export * from "./types";
export * from "./constants";
export {
  buildCentPrompt,
  buildCoreIdentity,
  buildPhaseWorkflow,
  buildDelegationTable,
  buildToolSelectionTable,
  buildMultiAgentSection,
  buildSpecialistSection,
  buildExploreAgentSection,
  buildOracleAgentSection,
  getPhasePrompt,
  getTransitionHint,
} from "./prompt-builder";

/**
 * Cent agent metadata
 */
export const CENT_METADATA: AgentPromptMetadata = {
  category: "orchestrator",
  cost: "CHEAP",
  triggers: [
    { domain: "orchestration", trigger: "Complex multi-step tasks" },
    { domain: "coordination", trigger: "Tasks requiring multiple agents" },
    { domain: "planning", trigger: "Implementation planning and execution" },
    { domain: "autonomous", trigger: "Self-directed task completion" },
    { domain: "multi-agent", trigger: "Cross-agent coordination" },
  ],
  useWhen: [
    "Task requires multiple steps or phases",
    "Need to coordinate between different concerns",
    "Complex implementation with exploration needed",
    "Autonomous task completion (Ralph Loop)",
    "Multi-agent workflow coordination",
  ],
  avoidWhen: [
    "Simple single-file changes",
    "Direct questions with clear answers",
    "Tasks that can be done directly without delegation",
  ],
  dedicatedSection: undefined,
  promptAlias: "cent",
  keyTrigger: "Orchestrate and coordinate",
};

/**
 * Base Cent prompt (without dynamic sections)
 */
const BASE_PROMPT = `# Cent - Enhanced Orchestrator Agent

You are Cent (센트), an evolved orchestrator agent for SuperCode. Your role is to:
1. Understand user intent and requirements
2. Gather context from the codebase
3. Decompose complex tasks into subtasks
4. Delegate to specialist agents
5. Execute with monitoring and recovery
6. Verify and ensure completion

## 6-Phase Workflow

0. **Intent Classification**: Parse and validate user requests
1. **Context Gathering**: Assess codebase and gather context
2. **Task Decomposition**: Break tasks into manageable steps
3. **Agent Delegation**: Route to appropriate specialists
4. **Task Execution**: Execute with error recovery
5. **Verification**: Ensure quality and completeness

## Operating Principles

1. **Efficiency First**: Use the right tool/agent for each task
2. **Quality Over Speed**: Understand before changing
3. **Proactive Communication**: Keep user informed
4. **Graceful Recovery**: Handle errors without stopping
5. **Cost Awareness**: Prefer FREE/CHEAP over EXPENSIVE

## Completion

When task is fully complete, output: \`<promise>DONE</promise>\`
`;

/**
 * Create Cent agent definition
 */
export function createCentAgent(options?: CentAgentOptions): AgentDefinition {
  return {
    name: AGENT_NAME,
    description: AGENT_DESCRIPTION,
    metadata: CENT_METADATA,
    createConfig: (configOptions?: CentAgentOptions): AgentConfig => {
      const mergedOptions: CentAgentOptions = { ...options, ...configOptions };
      const availableAgents = mergedOptions.availableAgents ?? [];

      // Build dynamic prompt if agents are available
      let prompt: string;
      if (availableAgents.length > 0) {
        prompt = buildCentPrompt({
          availableAgents,
          projectContext: mergedOptions?.projectContext,
          multiAgentConfig: mergedOptions?.multiAgentConfig ?? DEFAULT_MULTI_AGENT_CONFIG,
          includePhases: true,
          includeToolSelection: true,
          includeMultiAgent: true,
          includeRalphLoop: mergedOptions?.enableRalphLoop ?? true,
        });
      } else {
        prompt = BASE_PROMPT;
      }

      const config = createBaseConfig(
        CENT_METADATA,
        prompt,
        AGENT_DESCRIPTION,
        mergedOptions
      );

      // Cent always runs as primary
      config.mode = "primary";
      config.model = mergedOptions?.model ?? DEFAULT_MODELS.CHEAP;

      return config;
    },
  };
}

/**
 * Default Cent instance
 */
export const centAgent = createCentAgent();

/**
 * Get Cent agent with all builtin agents
 */
export function getCentWithBuiltinAgents(
  options?: CentAgentOptions
): AgentDefinition {
  // Import builtin agents dynamically to avoid circular dependency
  const {
    createExploreAgent,
    createOracleAgent,
    createLibrarianAgent,
    createFrontendEngineerAgent,
    createDocumentWriterAgent,
    createMultimodalLookerAgent,
  } = require("../index");

  const specialists = [
    createExploreAgent(options),
    createOracleAgent(options),
    createLibrarianAgent(options),
    createFrontendEngineerAgent(options),
    createDocumentWriterAgent(options),
    createMultimodalLookerAgent(options),
  ];

  const availableAgents: AvailableAgent[] = specialists.map((agent: AgentDefinition) => ({
    name: agent.name,
    description: agent.description,
    metadata: agent.metadata,
  }));

  return createCentAgent({
    ...options,
    availableAgents,
  });
}

/**
 * Get current phase information
 */
export function getPhaseInfo(phaseId: string) {
  return CENT_PHASES.find((p) => p.id === phaseId);
}

/**
 * Get all phases
 */
export function getAllPhases() {
  return CENT_PHASES;
}

/**
 * Get next phase based on current phase
 */
export function getNextPhase(currentPhaseId: string): string | null {
  const currentIndex = CENT_PHASES.findIndex((p) => p.id === currentPhaseId);
  if (currentIndex === -1 || currentIndex >= CENT_PHASES.length - 1) {
    return null;
  }
  return CENT_PHASES[currentIndex + 1].id;
}

/**
 * Get previous phase based on current phase
 */
export function getPreviousPhase(currentPhaseId: string): string | null {
  const currentIndex = CENT_PHASES.findIndex((p) => p.id === currentPhaseId);
  if (currentIndex <= 0) {
    return null;
  }
  return CENT_PHASES[currentIndex - 1].id;
}
