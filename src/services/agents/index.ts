// Type exports
export * from "./types";

// Registry exports
export { getAgentRegistry, type IAgentRegistry } from "./registry";
export { getTodoManager, type ITodoManager } from "./todo-manager";
export { getBackgroundManager, type IBackgroundManager, type ISpawnInput } from "./background";

// Agent exports
export { Coin, classifyRequest } from "./coin";
export { ExplorerAgent, EXPLORER_METADATA } from "./explorer";
export { AnalystAgent, ANALYST_METADATA } from "./analyst";
export { ExecutorAgent } from "./executor";
export { CodeReviewerAgent } from "./code-reviewer";
export { DocWriterAgent, DOC_WRITER_METADATA } from "./doc-writer";

// New agents
export { librarian, createLibrarian, LIBRARIAN_METADATA } from "./librarian";
export { frontend, createFrontend, FRONTEND_METADATA } from "./frontend";
export { multimodal, createMultimodal, MULTIMODAL_METADATA } from "./multimodal";

// Prompt builder exports
export {
  buildOrchestratorPrompt,
  buildDelegationTable,
  buildKeyTriggersSection,
  buildToolSelectionTable,
  collectAgentMetadata,
  type CollectedAgentMetadata,
} from "./sisyphus/prompt-builder";

import { getAgentRegistry } from "./registry";
import { Coin } from "./coin";
import { ExplorerAgent } from "./explorer";
import { AnalystAgent } from "./analyst";
import { ExecutorAgent } from "./executor";
import { CodeReviewerAgent } from "./code-reviewer";
import { DocWriterAgent } from "./doc-writer";
import { librarian } from "./librarian";
import { frontend } from "./frontend";
import { multimodal } from "./multimodal";

/**
 * Initialize all agents and register them
 */
export function initializeAgents(): void {
  const registry = getAgentRegistry();

  // Core agents
  registry.register(new Coin());
  registry.register(new ExplorerAgent());
  registry.register(new AnalystAgent());
  registry.register(new ExecutorAgent());
  registry.register(new CodeReviewerAgent());
  registry.register(new DocWriterAgent());

  // New agents (Sisyphus-style)
  registry.register(librarian);
  registry.register(frontend);
  registry.register(multimodal);
}
