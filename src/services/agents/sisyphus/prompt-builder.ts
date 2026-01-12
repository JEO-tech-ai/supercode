/**
 * Sisyphus Prompt Builder
 * Dynamically generates orchestrator prompts based on available agents.
 * Adapted from Oh-My-OpenCode for SuperCode integration.
 */

import type { Agent, AgentPromptMetadata, DelegationTrigger } from "../types";

/**
 * Collected agent metadata for prompt generation
 */
export interface CollectedAgentMetadata {
  name: string;
  displayName: string;
  metadata: AgentPromptMetadata;
}

/**
 * Build the key triggers section from agent metadata
 */
export function buildKeyTriggersSection(agents: CollectedAgentMetadata[]): string {
  const triggers: string[] = [];

  for (const agent of agents) {
    if (agent.metadata.keyTrigger) {
      triggers.push(`- **${agent.displayName}**: ${agent.metadata.keyTrigger}`);
    }
  }

  if (triggers.length === 0) {
    return "";
  }

  return `
### Key Triggers (Phase 0 Blocking)

Before any action, check these triggers:

${triggers.join("\n")}
`;
}

/**
 * Build the tool selection table
 */
export function buildToolSelectionTable(agents: CollectedAgentMetadata[]): string {
  const explorationAgents = agents.filter((a) => a.metadata.category === "exploration");
  const specialistAgents = agents.filter((a) => a.metadata.category === "specialist");
  const advisorAgents = agents.filter((a) => a.metadata.category === "advisor");
  const utilityAgents = agents.filter((a) => a.metadata.category === "utility");

  return `
### Tool & Agent Selection Priority

| Priority | Type | When to Use |
|----------|------|-------------|
| 1 | **Skills** | Always check skills FIRST for matching commands |
| 2 | **Direct Tools** | grep, glob, read, write, edit, bash |
| 3 | **Exploration Agents** | ${explorationAgents.map((a) => a.displayName).join(", ") || "N/A"} |
| 4 | **Specialist Agents** | ${specialistAgents.map((a) => a.displayName).join(", ") || "N/A"} |
| 5 | **Advisor Agents** | ${advisorAgents.map((a) => a.displayName).join(", ") || "N/A"} |
| 6 | **Utility Agents** | ${utilityAgents.map((a) => a.displayName).join(", ") || "N/A"} |
`;
}

/**
 * Build the delegation table from agent triggers
 */
export function buildDelegationTable(agents: CollectedAgentMetadata[]): string {
  const rows: string[] = [];

  for (const agent of agents) {
    for (const trigger of agent.metadata.triggers) {
      rows.push(`| ${trigger.domain} | ${agent.displayName} | ${trigger.trigger} |`);
    }
  }

  if (rows.length === 0) {
    return "";
  }

  return `
### Delegation Table

| Domain | Agent | Trigger |
|--------|-------|---------|
${rows.join("\n")}
`;
}

/**
 * Build agent-specific section
 */
export function buildAgentSection(agent: CollectedAgentMetadata): string {
  const lines: string[] = [`### ${agent.displayName} Agent`];

  if (agent.metadata.dedicatedSection) {
    lines.push("", agent.metadata.dedicatedSection);
  }

  if (agent.metadata.useWhen && agent.metadata.useWhen.length > 0) {
    lines.push("", "**Use When:**");
    for (const item of agent.metadata.useWhen) {
      lines.push(`- ${item}`);
    }
  }

  if (agent.metadata.avoidWhen && agent.metadata.avoidWhen.length > 0) {
    lines.push("", "**Avoid When:**");
    for (const item of agent.metadata.avoidWhen) {
      lines.push(`- ${item}`);
    }
  }

  lines.push("", `**Cost:** ${agent.metadata.cost}`);

  return lines.join("\n");
}

/**
 * Build the exploration agents section
 */
export function buildExplorationSection(agents: CollectedAgentMetadata[]): string {
  const explorationAgents = agents.filter((a) => a.metadata.category === "exploration");

  if (explorationAgents.length === 0) {
    return "";
  }

  const sections = explorationAgents.map((agent) => buildAgentSection(agent));

  return `
## Exploration Agents

Use exploration agents for codebase and external research. Launch in **background** for parallel execution.

${sections.join("\n\n")}
`;
}

/**
 * Build the specialist agents section
 */
export function buildSpecialistSection(agents: CollectedAgentMetadata[]): string {
  const specialistAgents = agents.filter((a) => a.metadata.category === "specialist");

  if (specialistAgents.length === 0) {
    return "";
  }

  const sections = specialistAgents.map((agent) => buildAgentSection(agent));

  return `
## Specialist Agents

Delegate domain-specific tasks to specialists. Provide detailed task descriptions.

${sections.join("\n\n")}
`;
}

/**
 * Build the advisor agents section
 */
export function buildAdvisorSection(agents: CollectedAgentMetadata[]): string {
  const advisorAgents = agents.filter((a) => a.metadata.category === "advisor");

  if (advisorAgents.length === 0) {
    return "";
  }

  const sections = advisorAgents.map((agent) => buildAgentSection(agent));

  return `
## Advisor Agents

Consult advisors for complex decisions and architecture. Use after 2+ failed attempts.

${sections.join("\n\n")}
`;
}

/**
 * Build hard blocks section
 */
export function buildHardBlocksSection(): string {
  return `
## Hard Blocks (Non-Negotiable)

1. **NEVER implement without explicit request** - Ask first if unclear
2. **NEVER suppress type errors** - Fix root cause
3. **NEVER skip tests** - Run tests before completion
4. **NEVER commit without permission** - Only commit when explicitly asked
5. **NEVER expose credentials** - Check for secrets before committing
6. **STOP after 3 consecutive failures** - Escalate to advisor or user
`;
}

/**
 * Build anti-patterns section
 */
export function buildAntiPatternsSection(): string {
  return `
## Anti-Patterns (Forbidden)

- Working alone when specialists are available
- Sequential execution when parallel is possible
- Guessing instead of searching
- Over-engineering simple tasks
- Adding features not requested
- Premature optimization
- Changing code style without request
`;
}

/**
 * Build the delegation prompt structure
 */
export function buildDelegationPromptStructure(): string {
  return `
## Delegation Prompt Structure (MANDATORY)

When delegating to an agent, include ALL of these:

1. **TASK** - Atomic, specific goal
2. **EXPECTED OUTCOME** - Concrete deliverables
3. **REQUIRED TOOLS** - Explicit tool whitelist
4. **MUST DO** - Exhaustive requirements
5. **MUST NOT DO** - Forbidden actions
6. **CONTEXT** - File paths, patterns, constraints

Example:
\`\`\`
TASK: Find all usages of the deprecated \`oldFunction\` in the codebase
EXPECTED OUTCOME: List of file paths with line numbers
REQUIRED TOOLS: grep, glob
MUST DO: Search all .ts and .tsx files, include test files
MUST NOT DO: Modify any files
CONTEXT: We're migrating from oldFunction to newFunction
\`\`\`
`;
}

/**
 * Build the complete orchestrator prompt
 */
export function buildOrchestratorPrompt(agents: CollectedAgentMetadata[]): string {
  const sections: string[] = [];

  // Header
  sections.push(`# Coin: Primary Orchestrator

You are Coin, the master orchestrator for SuperCode. Your role is to:
- **Assess** requests and classify intent
- **Plan** execution strategy with todos
- **Delegate** to specialized agents
- **Verify** results and ensure quality
- **Deliver** complete, tested solutions
`);

  // Phase 0: Key triggers
  const keyTriggers = buildKeyTriggersSection(agents);
  if (keyTriggers) {
    sections.push(keyTriggers);
  }

  // Tool selection table
  sections.push(buildToolSelectionTable(agents));

  // Delegation table
  const delegationTable = buildDelegationTable(agents);
  if (delegationTable) {
    sections.push(delegationTable);
  }

  // Agent sections by category
  sections.push(buildExplorationSection(agents));
  sections.push(buildSpecialistSection(agents));
  sections.push(buildAdvisorSection(agents));

  // Delegation structure
  sections.push(buildDelegationPromptStructure());

  // Hard blocks and anti-patterns
  sections.push(buildHardBlocksSection());
  sections.push(buildAntiPatternsSection());

  // Final instructions
  sections.push(`
## Completion Checklist

Before marking a task complete:
- [ ] All todo items marked done
- [ ] No TypeScript errors (run typecheck)
- [ ] Tests pass (if applicable)
- [ ] Code follows existing patterns
- [ ] No secrets or credentials exposed
- [ ] Background tasks cancelled
`);

  return sections.filter(Boolean).join("\n");
}

/**
 * Collect metadata from agents
 */
export function collectAgentMetadata(agents: Agent[]): CollectedAgentMetadata[] {
  return agents
    .filter((agent) => agent.metadata)
    .map((agent) => ({
      name: agent.name,
      displayName: agent.displayName,
      metadata: agent.metadata!,
    }));
}
