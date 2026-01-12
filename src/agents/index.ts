/**
 * Agent System
 * Metadata-driven agent orchestration for SuperCode.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

// Type exports
export * from "./types";

// Utility exports
export * from "./utils";

// Prompt builder exports
export {
  buildDelegationTable,
  buildToolSelectionTable,
  buildExploreSection,
  buildOracleSection,
  buildSpecialistSection,
  buildWorkflowPhasesSection,
  buildDedicatedAgentSections,
  buildSisyphusPrompt,
  DEFAULT_WORKFLOW_PHASES,
  DEFAULT_TOOL_SELECTION,
} from "./sisyphus-prompt-builder";

// Sisyphus exports
export {
  createSisyphusAgent,
  sisyphusAgent,
  SISYPHUS_METADATA,
} from "./sisyphus";

// Explore exports
export {
  createExploreAgent,
  exploreAgent,
  EXPLORE_METADATA,
} from "./explore";

// Oracle exports
export {
  createOracleAgent,
  oracleAgent,
  ORACLE_METADATA,
} from "./oracle";

// Librarian exports
export {
  createLibrarianAgent,
  librarianAgent,
  LIBRARIAN_METADATA,
} from "./librarian";

// Frontend Engineer exports
export {
  createFrontendEngineerAgent,
  frontendEngineerAgent,
  FRONTEND_ENGINEER_METADATA,
} from "./frontend-engineer";

// Document Writer exports
export {
  createDocumentWriterAgent,
  documentWriterAgent,
  DOCUMENT_WRITER_METADATA,
} from "./document-writer";

// Multimodal Looker exports
export {
  createMultimodalLookerAgent,
  multimodalLookerAgent,
  MULTIMODAL_LOOKER_METADATA,
} from "./multimodal-looker";

// Cent Agent exports (Sisyphus Evolution)
export {
  createCentAgent,
  centAgent,
  getCentWithBuiltinAgents,
  CENT_METADATA,
  buildCentPrompt,
  getPhaseInfo,
  getAllPhases,
  getNextPhase,
  getPreviousPhase,
  AGENT_NAME as CENT_AGENT_NAME,
  CENT_PHASES,
  CENT_TOOL_SELECTION,
  DEFAULT_MULTI_AGENT_CONFIG,
} from "./cent";
export type {
  CentPhase,
  CentPhaseState,
  CentWorkflowState,
  CentAgentOptions,
  CentPhaseDefinition,
  CentPromptBuilderOptions,
  MultiAgentConfig,
  DelegatedTask,
  ExecutionResult,
  AgentSelectionCriteria,
  AgentSelectionResult,
} from "./cent";

// Import for builtin agents factory
import type {
  AgentDefinition,
  AgentRegistry,
  AvailableAgent,
  AgentCreateOptions,
} from "./types";
import {
  createAgentRegistry,
  registerAgent,
  getAvailableAgents,
} from "./utils";
import { createSisyphusAgent } from "./sisyphus";
import { createExploreAgent } from "./explore";
import { createOracleAgent } from "./oracle";
import { createLibrarianAgent } from "./librarian";
import { createFrontendEngineerAgent } from "./frontend-engineer";
import { createDocumentWriterAgent } from "./document-writer";
import { createMultimodalLookerAgent } from "./multimodal-looker";
import { createCentAgent } from "./cent";

/**
 * Create all builtin agents with optional configuration
 */
export function createBuiltinAgents(
  options?: AgentCreateOptions
): AgentRegistry {
  const registry = createAgentRegistry();

  // Create all specialist agents first
  const explore = createExploreAgent(options);
  const oracle = createOracleAgent(options);
  const librarian = createLibrarianAgent(options);
  const frontendEngineer = createFrontendEngineerAgent(options);
  const documentWriter = createDocumentWriterAgent(options);
  const multimodalLooker = createMultimodalLookerAgent(options);

  // Register specialists
  registerAgent(registry, explore);
  registerAgent(registry, oracle);
  registerAgent(registry, librarian);
  registerAgent(registry, frontendEngineer);
  registerAgent(registry, documentWriter);
  registerAgent(registry, multimodalLooker);

  // Get available agents for Sisyphus
  const availableAgents = getAvailableAgents(registry);

  // Create Sisyphus with available agents
  const sisyphus = createSisyphusAgent({
    ...options,
    availableAgents,
  });

  // Create Cent with available agents
  const cent = createCentAgent({
    ...options,
    availableAgents,
  });

  // Register orchestrators
  registerAgent(registry, sisyphus);
  registerAgent(registry, cent);

  return registry;
}

/**
 * Get builtin agent definitions (without creating registry)
 */
export function getBuiltinAgentDefinitions(
  options?: AgentCreateOptions
): AgentDefinition[] {
  return [
    createExploreAgent(options),
    createOracleAgent(options),
    createLibrarianAgent(options),
    createFrontendEngineerAgent(options),
    createDocumentWriterAgent(options),
    createMultimodalLookerAgent(options),
  ];
}

/**
 * Get Sisyphus with all builtin agents
 */
export function getSisyphusWithBuiltinAgents(
  options?: AgentCreateOptions
): AgentDefinition {
  const specialists = getBuiltinAgentDefinitions(options);

  const availableAgents: AvailableAgent[] = specialists.map((agent) => ({
    name: agent.name,
    description: agent.description,
    metadata: agent.metadata,
  }));

  return createSisyphusAgent({
    ...options,
    availableAgents,
  });
}

/**
 * Default builtin agents registry
 */
let defaultRegistry: AgentRegistry | null = null;

/**
 * Get or create default builtin agents registry
 */
export function getDefaultAgentRegistry(): AgentRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createBuiltinAgents();
  }
  return defaultRegistry;
}

/**
 * Reset default registry (for testing)
 */
export function resetDefaultAgentRegistry(): void {
  defaultRegistry = null;
}
