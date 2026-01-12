/**
 * Agent Utilities
 * Helper functions for agent creation and management.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import type {
  AgentDefinition,
  AgentRegistry,
  AvailableAgent,
  AgentCreateOptions,
  AgentConfig,
  AgentPromptMetadata,
  DelegationTrigger,
  ProjectContext,
} from "./types";

/**
 * Default models for different cost levels
 */
export const DEFAULT_MODELS = {
  FREE: "claude-3-5-haiku-latest",
  CHEAP: "claude-sonnet-4-20250514",
  EXPENSIVE: "claude-opus-4-20250514",
} as const;

/**
 * Create an agent registry
 */
export function createAgentRegistry(): AgentRegistry {
  return new Map<string, AgentDefinition>();
}

/**
 * Register an agent definition
 */
export function registerAgent(
  registry: AgentRegistry,
  agent: AgentDefinition
): void {
  registry.set(agent.name, agent);
}

/**
 * Get agent by name
 */
export function getAgent(
  registry: AgentRegistry,
  name: string
): AgentDefinition | undefined {
  return registry.get(name);
}

/**
 * Get all available agents for orchestrator
 */
export function getAvailableAgents(registry: AgentRegistry): AvailableAgent[] {
  const agents: AvailableAgent[] = [];

  for (const [name, definition] of registry) {
    // Skip orchestrator itself
    if (definition.metadata.category === "orchestrator") continue;

    agents.push({
      name,
      description: definition.description,
      metadata: definition.metadata,
    });
  }

  return agents;
}

/**
 * Get model for agent based on cost
 */
export function getModelForCost(
  cost: "FREE" | "CHEAP" | "EXPENSIVE",
  override?: string
): string {
  if (override) return override;
  return DEFAULT_MODELS[cost];
}

/**
 * Create base agent config
 */
export function createBaseConfig(
  metadata: AgentPromptMetadata,
  prompt: string,
  description: string,
  options?: AgentCreateOptions
): AgentConfig {
  const model = getModelForCost(metadata.cost, options?.model);

  return {
    mode: options?.mode ?? "subagent",
    model,
    prompt: options?.promptAdditions
      ? `${prompt}\n\n${options.promptAdditions}`
      : prompt,
    description,
  };
}

/**
 * Format triggers for prompt
 */
export function formatTriggers(triggers: DelegationTrigger[]): string {
  if (triggers.length === 0) return "";

  const lines = triggers.map((t) => `- **${t.domain}**: ${t.trigger}`);
  return lines.join("\n");
}

/**
 * Format use when conditions
 */
export function formatUseWhen(conditions?: string[]): string {
  if (!conditions || conditions.length === 0) return "";

  return conditions.map((c) => `- ${c}`).join("\n");
}

/**
 * Format avoid when conditions
 */
export function formatAvoidWhen(conditions?: string[]): string {
  if (!conditions || conditions.length === 0) return "";

  return conditions.map((c) => `- ${c}`).join("\n");
}

/**
 * Build project context section for prompts
 */
export function buildProjectContextSection(context?: ProjectContext): string {
  if (!context) return "";

  const sections: string[] = [];

  if (context.name) {
    sections.push(`**Project**: ${context.name}`);
  }

  if (context.description) {
    sections.push(`**Description**: ${context.description}`);
  }

  if (context.type) {
    sections.push(`**Type**: ${context.type}`);
  }

  if (context.techStack && context.techStack.length > 0) {
    sections.push(`**Tech Stack**: ${context.techStack.join(", ")}`);
  }

  if (context.rootDir) {
    sections.push(`**Root Directory**: ${context.rootDir}`);
  }

  if (context.keyFiles && context.keyFiles.length > 0) {
    sections.push(`**Key Files**:\n${context.keyFiles.map((f) => `- ${f}`).join("\n")}`);
  }

  if (sections.length === 0) return "";

  return `## Project Context\n\n${sections.join("\n")}`;
}

/**
 * Validate agent definition
 */
export function validateAgentDefinition(agent: AgentDefinition): string[] {
  const errors: string[] = [];

  if (!agent.name) {
    errors.push("Agent name is required");
  }

  if (!agent.description) {
    errors.push("Agent description is required");
  }

  if (!agent.metadata) {
    errors.push("Agent metadata is required");
  } else {
    if (!agent.metadata.category) {
      errors.push("Agent category is required");
    }
    if (!agent.metadata.cost) {
      errors.push("Agent cost is required");
    }
    if (!agent.metadata.triggers || agent.metadata.triggers.length === 0) {
      errors.push("Agent must have at least one trigger");
    }
  }

  if (!agent.createConfig) {
    errors.push("Agent createConfig function is required");
  }

  return errors;
}

/**
 * Sort agents by cost (expensive first for delegation priority)
 */
export function sortAgentsByCost(agents: AvailableAgent[]): AvailableAgent[] {
  const costOrder = { EXPENSIVE: 0, CHEAP: 1, FREE: 2 };
  return [...agents].sort(
    (a, b) => costOrder[a.metadata.cost] - costOrder[b.metadata.cost]
  );
}

/**
 * Filter agents by category
 */
export function filterAgentsByCategory(
  agents: AvailableAgent[],
  category: string
): AvailableAgent[] {
  return agents.filter((a) => a.metadata.category === category);
}

/**
 * Get agents with dedicated sections
 */
export function getAgentsWithDedicatedSections(
  agents: AvailableAgent[]
): AvailableAgent[] {
  return agents.filter((a) => a.metadata.dedicatedSection);
}

/**
 * Build agent list for prompt
 */
export function buildAgentListForPrompt(agents: AvailableAgent[]): string {
  const lines: string[] = [];

  for (const agent of agents) {
    lines.push(`### ${agent.name}`);
    lines.push(`**Category**: ${agent.metadata.category}`);
    lines.push(`**Cost**: ${agent.metadata.cost}`);
    lines.push(`**Description**: ${agent.description}`);

    if (agent.metadata.keyTrigger) {
      lines.push(`**Key Trigger**: ${agent.metadata.keyTrigger}`);
    }

    if (agent.metadata.useWhen && agent.metadata.useWhen.length > 0) {
      lines.push(`**Use When**:`);
      lines.push(formatUseWhen(agent.metadata.useWhen));
    }

    if (agent.metadata.avoidWhen && agent.metadata.avoidWhen.length > 0) {
      lines.push(`**Avoid When**:`);
      lines.push(formatAvoidWhen(agent.metadata.avoidWhen));
    }

    lines.push("");
  }

  return lines.join("\n");
}
