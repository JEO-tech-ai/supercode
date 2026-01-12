export * from "./types";

export { getAgentRegistry, type IAgentRegistry } from "./registry";
export { getTodoManager, type ITodoManager } from "./todo-manager";
export { getBackgroundManager, type IBackgroundManager, type ISpawnInput } from "./background";

export { Cent, classifyRequest } from "./cent";
export { Coin } from "./coin";
export { ExplorerAgent, EXPLORER_METADATA } from "./explorer";
export { AnalystAgent, ANALYST_METADATA } from "./analyst";
export { ExecutorAgent } from "./executor";
export { CodeReviewerAgent } from "./code-reviewer";
export { DocWriterAgent, DOC_WRITER_METADATA } from "./doc-writer";

export { librarian, createLibrarian, LIBRARIAN_METADATA } from "./librarian";
export { frontend, createFrontend, FRONTEND_METADATA } from "./frontend";
export { multimodal, createMultimodal, MULTIMODAL_METADATA } from "./multimodal";

export {
  buildOrchestratorPrompt,
  buildDelegationTable,
  buildKeyTriggersSection,
  buildToolSelectionTable,
  collectAgentMetadata,
  type CollectedAgentMetadata,
} from "./sisyphus/prompt-builder";

import { getAgentRegistry } from "./registry";
import { Cent } from "./cent";
import { Coin } from "./coin";
import { ExplorerAgent } from "./explorer";
import { AnalystAgent } from "./analyst";
import { ExecutorAgent } from "./executor";
import { CodeReviewerAgent } from "./code-reviewer";
import { DocWriterAgent } from "./doc-writer";
import { librarian } from "./librarian";
import { frontend } from "./frontend";
import { multimodal } from "./multimodal";

export function initializeAgents(): void {
  const registry = getAgentRegistry();

  registry.register(new Cent());
  registry.register(new Coin());
  registry.register(new ExplorerAgent());
  registry.register(new AnalystAgent());
  registry.register(new ExecutorAgent());
  registry.register(new CodeReviewerAgent());
  registry.register(new DocWriterAgent());

  registry.register(librarian);
  registry.register(frontend);
  registry.register(multimodal);
}
