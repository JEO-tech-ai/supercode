/**
 * Sisyphus Prompt Builder
 * Dynamic prompt generation for orchestrator agent.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import type {
  AvailableAgent,
  ToolSelectionEntry,
  WorkflowPhase,
  ProjectContext,
} from "./types";
import {
  sortAgentsByCost,
  filterAgentsByCategory,
  getAgentsWithDedicatedSections,
  buildProjectContextSection,
} from "./utils";

/**
 * Build delegation table from available agents
 */
export function buildDelegationTable(agents: AvailableAgent[]): string {
  if (agents.length === 0) return "";

  const rows: string[] = [
    "### Delegation Table",
    "",
    "| Domain | Delegate To | Trigger |",
    "|--------|-------------|---------|",
  ];

  // Sort by cost (expensive first for priority)
  const sorted = sortAgentsByCost(agents);

  for (const agent of sorted) {
    for (const trigger of agent.metadata.triggers) {
      rows.push(`| ${trigger.domain} | \`${agent.name}\` | ${trigger.trigger} |`);
    }
  }

  return rows.join("\n");
}

/**
 * Build tool selection table
 */
export function buildToolSelectionTable(entries: ToolSelectionEntry[]): string {
  if (entries.length === 0) return "";

  const rows: string[] = [
    "### Tool Selection Guide",
    "",
    "| Tool | When | Why |",
    "|------|------|-----|",
  ];

  for (const entry of entries) {
    rows.push(`| ${entry.tool} | ${entry.when} | ${entry.why} |`);
  }

  return rows.join("\n");
}

/**
 * Build explore agent section
 */
export function buildExploreSection(agents: AvailableAgent[]): string {
  const exploreAgent = agents.find((a) => a.name === "explore");
  if (!exploreAgent) return "";

  return `## Explore Agent

**Purpose**: Rapid codebase exploration and pattern discovery

**Delegation Triggers**:
${exploreAgent.metadata.triggers.map((t) => `- ${t.domain}: ${t.trigger}`).join("\n")}

**Key Points**:
- Use for initial codebase assessment
- Efficient for finding files, patterns, and architecture
- Read-only operations only
- Returns structured findings for decision-making`;
}

/**
 * Build oracle agent section
 */
export function buildOracleSection(agents: AvailableAgent[]): string {
  const oracleAgent = agents.find((a) => a.name === "oracle");
  if (!oracleAgent) return "";

  return `## Oracle Agent

**Purpose**: Expert consultation for complex decisions

**Delegation Triggers**:
${oracleAgent.metadata.triggers.map((t) => `- ${t.domain}: ${t.trigger}`).join("\n")}

**Use When**:
${oracleAgent.metadata.useWhen?.map((w) => `- ${w}`).join("\n") || "- Complex architectural decisions needed"}

**Key Points**:
- EXPENSIVE cost - use sparingly
- Extended thinking enabled for deep reasoning
- Returns actionable recommendations
- Best for architecture and design decisions`;
}

/**
 * Build specialist agents section
 */
export function buildSpecialistSection(agents: AvailableAgent[]): string {
  const specialists = filterAgentsByCategory(agents, "specialist");
  if (specialists.length === 0) return "";

  const sections: string[] = ["## Specialist Agents", ""];

  for (const agent of specialists) {
    sections.push(`### ${agent.name}`);
    sections.push(`**Description**: ${agent.description}`);
    sections.push(`**Cost**: ${agent.metadata.cost}`);

    if (agent.metadata.triggers.length > 0) {
      sections.push(`**Triggers**:`);
      for (const trigger of agent.metadata.triggers) {
        sections.push(`- ${trigger.domain}: ${trigger.trigger}`);
      }
    }

    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Build workflow phases section
 */
export function buildWorkflowPhasesSection(phases: WorkflowPhase[]): string {
  if (phases.length === 0) return "";

  const sections: string[] = ["## Workflow Phases", ""];

  for (const phase of phases) {
    sections.push(`### Phase ${phase.number}: ${phase.name}`);
    sections.push(`**Description**: ${phase.description}`);
    sections.push(`**Actions**:`);
    for (const action of phase.actions) {
      sections.push(`- ${action}`);
    }

    if (phase.transitions && phase.transitions.length > 0) {
      sections.push(`**Transitions**:`);
      for (const transition of phase.transitions) {
        if (transition.next && transition.condition) {
          sections.push(`- → ${transition.next}: ${transition.condition}`);
        }
      }
    }

    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Build dedicated agent sections
 */
export function buildDedicatedAgentSections(agents: AvailableAgent[]): string {
  const withDedicated = getAgentsWithDedicatedSections(agents);
  if (withDedicated.length === 0) return "";

  const sections: string[] = [];

  for (const agent of withDedicated) {
    if (agent.name === "explore") {
      sections.push(buildExploreSection(agents));
    } else if (agent.name === "oracle") {
      sections.push(buildOracleSection(agents));
    }
  }

  return sections.join("\n\n");
}

/**
 * Default workflow phases for Sisyphus
 */
export const DEFAULT_WORKFLOW_PHASES: WorkflowPhase[] = [
  {
    number: 0,
    name: "Intent Gate",
    description: "Classify and validate user intent",
    actions: [
      "Parse user request",
      "Identify task type (code, explain, fix, create)",
      "Determine scope and complexity",
      "Check if clarification needed",
    ],
    transitions: [
      { next: "Phase 1", condition: "Intent is clear and actionable" },
      { next: "Ask User", condition: "Ambiguous or conflicting requirements" },
    ],
  },
  {
    number: 1,
    name: "Codebase Assessment",
    description: "Understand project structure and context",
    actions: [
      "Delegate to explore agent for initial scan",
      "Identify relevant files and patterns",
      "Map dependencies and architecture",
      "Build mental model of codebase",
    ],
    transitions: [
      { next: "Phase 2A", condition: "Need more exploration" },
      { next: "Phase 2B", condition: "Ready for implementation" },
    ],
  },
  {
    number: 2,
    name: "Execution",
    description: "Execute task with appropriate agents",
    actions: [
      "2A: Deep exploration with explore agent",
      "2B: Implementation with specialist agents",
      "2C: Recovery from errors or blockers",
    ],
    transitions: [
      { next: "Phase 3", condition: "Task completed successfully" },
      { next: "Phase 2C", condition: "Error or blocker encountered" },
    ],
  },
  {
    number: 3,
    name: "Completion",
    description: "Verify and finalize task",
    actions: [
      "Verify changes against requirements",
      "Run relevant tests if applicable",
      "Summarize actions taken",
      "Report completion to user",
    ],
  },
];

/**
 * Default tool selection entries
 */
export const DEFAULT_TOOL_SELECTION: ToolSelectionEntry[] = [
  {
    tool: "Read",
    when: "Need to examine file contents",
    why: "Precise file reading with line numbers",
  },
  {
    tool: "Glob",
    when: "Finding files by pattern",
    why: "Fast pattern-based file discovery",
  },
  {
    tool: "Grep",
    when: "Searching code content",
    why: "Regex-powered content search",
  },
  {
    tool: "Edit",
    when: "Modifying existing code",
    why: "Safe, targeted code modifications",
  },
  {
    tool: "Write",
    when: "Creating new files",
    why: "Full file creation when needed",
  },
  {
    tool: "Bash",
    when: "Running commands",
    why: "Git, npm, build tools, tests",
  },
  {
    tool: "Task",
    when: "Delegating to specialist",
    why: "Parallel agent execution",
  },
];

/**
 * Build complete Sisyphus prompt
 */
export function buildSisyphusPrompt(options: {
  availableAgents: AvailableAgent[];
  projectContext?: ProjectContext;
  customSections?: string[];
  includeWorkflowPhases?: boolean;
  includeToolSelection?: boolean;
}): string {
  const {
    availableAgents,
    projectContext,
    customSections = [],
    includeWorkflowPhases = true,
    includeToolSelection = true,
  } = options;

  const sections: string[] = [];

  // Core identity
  sections.push(`# Sisyphus - Orchestrator Agent

You are Sisyphus, the orchestrator agent for SuperCode. Your role is to:
1. Understand user intent and requirements
2. Assess the codebase and gather context
3. Delegate to specialist agents when appropriate
4. Execute tasks efficiently and accurately
5. Ensure quality and completeness`);

  // Project context
  const contextSection = buildProjectContextSection(projectContext);
  if (contextSection) {
    sections.push(contextSection);
  }

  // Delegation table
  const delegationTable = buildDelegationTable(availableAgents);
  if (delegationTable) {
    sections.push(delegationTable);
  }

  // Tool selection
  if (includeToolSelection) {
    sections.push(buildToolSelectionTable(DEFAULT_TOOL_SELECTION));
  }

  // Workflow phases
  if (includeWorkflowPhases) {
    sections.push(buildWorkflowPhasesSection(DEFAULT_WORKFLOW_PHASES));
  }

  // Dedicated agent sections
  const dedicatedSections = buildDedicatedAgentSections(availableAgents);
  if (dedicatedSections) {
    sections.push(dedicatedSections);
  }

  // Specialist agents
  const specialistSection = buildSpecialistSection(availableAgents);
  if (specialistSection) {
    sections.push(specialistSection);
  }

  // Custom sections
  for (const custom of customSections) {
    sections.push(custom);
  }

  // Principles
  sections.push(`## Operating Principles

1. **Efficiency First**: Use the right tool/agent for each task
2. **Delegate Appropriately**: Specialist agents exist for a reason
3. **Verify Before Commit**: Always validate changes
4. **Communicate Clearly**: Keep user informed of progress
5. **Recover Gracefully**: Handle errors and blockers

## Cost Awareness

- FREE agents: Use liberally for exploration and simple tasks
- CHEAP agents: Default choice for most implementation work
- EXPENSIVE agents: Reserve for complex decisions requiring deep reasoning`);

  return sections.join("\n\n");
}
