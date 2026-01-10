export * from "./types";
export { getAgentRegistry, type IAgentRegistry } from "./registry";
export { getTodoManager, type ITodoManager } from "./todo-manager";
export { getBackgroundManager, type IBackgroundManager, type ISpawnInput } from "./background";
export { Coin, classifyRequest } from "./coin";
export { ExplorerAgent } from "./explorer";
export { AnalystAgent } from "./analyst";
export { ExecutorAgent } from "./executor";
export { CodeReviewerAgent } from "./code-reviewer";
export { DocWriterAgent } from "./doc-writer";

import { getAgentRegistry } from "./registry";
import { Coin } from "./coin";
import { ExplorerAgent } from "./explorer";
import { AnalystAgent } from "./analyst";
import { ExecutorAgent } from "./executor";
import { CodeReviewerAgent } from "./code-reviewer";
import { DocWriterAgent } from "./doc-writer";

export function initializeAgents(): void {
  const registry = getAgentRegistry();

  registry.register(new Coin());
  registry.register(new ExplorerAgent());
  registry.register(new AnalystAgent());
  registry.register(new ExecutorAgent());
  registry.register(new CodeReviewerAgent());
  registry.register(new DocWriterAgent());
}
