/**
 * Cent Agent Prompt Builder
 * Dynamic prompt generation for 6-phase orchestrator workflow.
 */

import type { AvailableAgent, ToolSelectionEntry, ProjectContext } from "../types";
import type { CentPhaseDefinition, CentPromptBuilderOptions, MultiAgentConfig } from "./types";
import {
  sortAgentsByCost,
  filterAgentsByCategory,
  buildProjectContextSection,
} from "../utils";
import {
  CENT_PHASES,
  CENT_TOOL_SELECTION,
  COST_GUIDELINES,
  MULTI_AGENT_GUIDELINES,
  RALPH_LOOP_SECTION,
  VERIFICATION_CHECKLIST,
  AGENT_NAME,
  AGENT_DISPLAY_NAME,
} from "./constants";

/**
 * Build core identity section
 */
export function buildCoreIdentity(): string {
  return `# ${AGENT_DISPLAY_NAME} - Enhanced Orchestrator Agent

You are ${AGENT_DISPLAY_NAME} (센트), an evolved orchestrator agent for SuperCode. Named after the concept of "centurion" - a commander who coordinates and leads - you orchestrate complex tasks through a structured 6-phase workflow.

## Core Responsibilities

1. **Intent Classification**: Parse and validate user requests
2. **Context Gathering**: Assess codebase and gather necessary context
3. **Task Decomposition**: Break complex tasks into manageable steps
4. **Agent Delegation**: Route tasks to appropriate specialist agents
5. **Task Execution**: Monitor and execute with error recovery
6. **Verification**: Ensure quality and completeness

## Key Principles

- **Efficiency First**: Use the right tool/agent for each task
- **Quality Over Speed**: Understand before changing
- **Proactive Communication**: Keep user informed
- **Graceful Recovery**: Handle errors without stopping
- **Cost Awareness**: Prefer FREE/CHEAP over EXPENSIVE`;
}

/**
 * Build phase workflow section
 */
export function buildPhaseWorkflow(phases: CentPhaseDefinition[] = CENT_PHASES): string {
  const sections: string[] = ["## 6-Phase Workflow", ""];

  for (const phase of phases) {
    sections.push(`### Phase ${phase.number}: ${phase.name}`);
    sections.push(`**Description**: ${phase.description}`);
    sections.push("");
    sections.push("**Actions**:");
    for (const action of phase.actions) {
      sections.push(`- ${action}`);
    }
    sections.push("");

    if (phase.transitions && phase.transitions.length > 0) {
      sections.push("**Transitions**:");
      for (const transition of phase.transitions) {
        sections.push(`- → ${transition.target}: ${transition.condition}`);
      }
      sections.push("");
    }

    if (phase.suggestedAgents && phase.suggestedAgents.length > 0) {
      sections.push(`**Suggested Agents**: ${phase.suggestedAgents.map(a => `\`${a}\``).join(", ")}`);
    }

    if (phase.suggestedTools && phase.suggestedTools.length > 0) {
      sections.push(`**Suggested Tools**: ${phase.suggestedTools.map(t => `\`${t}\``).join(", ")}`);
    }

    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Build delegation table
 */
export function buildDelegationTable(agents: AvailableAgent[]): string {
  if (agents.length === 0) return "";

  const rows: string[] = [
    "## Delegation Table",
    "",
    "| Domain | Delegate To | Trigger | Cost |",
    "|--------|-------------|---------|------|",
  ];

  const sorted = sortAgentsByCost(agents);

  for (const agent of sorted) {
    for (const trigger of agent.metadata.triggers) {
      rows.push(`| ${trigger.domain} | \`${agent.name}\` | ${trigger.trigger} | ${agent.metadata.cost} |`);
    }
  }

  return rows.join("\n");
}

/**
 * Build tool selection table
 */
export function buildToolSelectionTable(
  entries: ToolSelectionEntry[] = CENT_TOOL_SELECTION
): string {
  if (entries.length === 0) return "";

  const rows: string[] = [
    "## Tool Selection Guide",
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
 * Build multi-agent section
 */
export function buildMultiAgentSection(config?: MultiAgentConfig): string {
  if (!config) return MULTI_AGENT_GUIDELINES;

  const sections: string[] = ["## Multi-Agent Workflow", ""];

  // Table header
  sections.push("| Agent | Role | MCP Tool | Status |");
  sections.push("|-------|------|----------|--------|");

  // Claude (always present)
  if (config.claude) {
    sections.push(`| Claude Code | ${config.claude.role} | Built-in | ${config.claude.enabled ? "Enabled" : "Disabled"} |`);
  }

  // Gemini
  if (config.gemini) {
    sections.push(`| Gemini-CLI | ${config.gemini.role} | ${config.gemini.mcpTool || "ask-gemini"} | ${config.gemini.enabled ? "Enabled" : "Disabled"} |`);
  }

  // Codex
  if (config.codex) {
    sections.push(`| Codex-CLI | ${config.codex.role} | ${config.codex.mcpTool || "shell"} | ${config.codex.enabled ? "Enabled" : "Disabled"} |`);
  }

  sections.push("");
  sections.push("### Agent Selection");
  sections.push("");
  sections.push("**Claude Code (Default)**:");
  sections.push("- Code writing and modification");
  sections.push("- File operations and skill-based tasks");
  sections.push("");

  if (config.gemini?.enabled) {
    sections.push("**Gemini-CLI**:");
    sections.push("- Large codebase analysis (1M+ tokens)");
    sections.push("- Architecture research and code reviews");
    sections.push("");
  }

  if (config.codex?.enabled) {
    sections.push("**Codex-CLI**:");
    sections.push("- Long-running build commands");
    sections.push("- Docker/Kubernetes operations");
    sections.push("");
  }

  return sections.join("\n");
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
      sections.push("**Triggers**:");
      for (const trigger of agent.metadata.triggers) {
        sections.push(`- ${trigger.domain}: ${trigger.trigger}`);
      }
    }

    if (agent.metadata.useWhen && agent.metadata.useWhen.length > 0) {
      sections.push("**Use When**:");
      for (const when of agent.metadata.useWhen) {
        sections.push(`- ${when}`);
      }
    }

    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Build exploration agent section
 */
export function buildExploreAgentSection(agents: AvailableAgent[]): string {
  const exploreAgent = agents.find((a) => a.name === "explore");
  if (!exploreAgent) return "";

  return `## Explore Agent

**Purpose**: Rapid codebase exploration and pattern discovery

**Delegation Triggers**:
${exploreAgent.metadata.triggers.map((t) => `- ${t.domain}: ${t.trigger}`).join("\n")}

**Key Points**:
- Use for initial codebase assessment (Phase 1)
- Efficient for finding files, patterns, architecture
- Read-only operations only
- Returns structured findings for decision-making`;
}

/**
 * Build oracle agent section
 */
export function buildOracleAgentSection(agents: AvailableAgent[]): string {
  const oracleAgent = agents.find((a) => a.name === "oracle");
  if (!oracleAgent) return "";

  return `## Oracle Agent

**Purpose**: Expert consultation for complex decisions

**Delegation Triggers**:
${oracleAgent.metadata.triggers.map((t) => `- ${t.domain}: ${t.trigger}`).join("\n")}

**Key Points**:
- EXPENSIVE cost - use sparingly
- Extended thinking enabled for deep reasoning
- Best for architecture and design decisions
- Returns actionable recommendations`;
}

/**
 * Build complete Cent prompt
 */
export function buildCentPrompt(options: CentPromptBuilderOptions): string {
  const {
    availableAgents,
    projectContext,
    multiAgentConfig,
    includePhases = true,
    includeToolSelection = true,
    includeMultiAgent = true,
    includeRalphLoop = true,
    customSections = [],
  } = options;

  const sections: string[] = [];

  // Core identity
  sections.push(buildCoreIdentity());

  // Project context
  const contextSection = buildProjectContextSection(projectContext);
  if (contextSection) {
    sections.push(contextSection);
  }

  // Phase workflow
  if (includePhases) {
    sections.push(buildPhaseWorkflow());
  }

  // Delegation table
  const delegationTable = buildDelegationTable(availableAgents);
  if (delegationTable) {
    sections.push(delegationTable);
  }

  // Tool selection
  if (includeToolSelection) {
    sections.push(buildToolSelectionTable());
  }

  // Multi-agent section
  if (includeMultiAgent) {
    sections.push(buildMultiAgentSection(multiAgentConfig));
  }

  // Specialist agents
  const specialistSection = buildSpecialistSection(availableAgents);
  if (specialistSection) {
    sections.push(specialistSection);
  }

  // Explore agent
  const exploreSection = buildExploreAgentSection(availableAgents);
  if (exploreSection) {
    sections.push(exploreSection);
  }

  // Oracle agent
  const oracleSection = buildOracleAgentSection(availableAgents);
  if (oracleSection) {
    sections.push(oracleSection);
  }

  // Cost guidelines
  sections.push(COST_GUIDELINES);

  // Ralph Loop integration
  if (includeRalphLoop) {
    sections.push(RALPH_LOOP_SECTION);
  }

  // Verification checklist
  sections.push(VERIFICATION_CHECKLIST);

  // Custom sections
  for (const custom of customSections) {
    sections.push(custom);
  }

  return sections.join("\n\n");
}

/**
 * Get current phase prompt snippet
 */
export function getPhasePrompt(phase: string): string | null {
  const phaseDef = CENT_PHASES.find((p) => p.id === phase);
  if (!phaseDef) return null;

  const sections: string[] = [
    `[Current Phase: ${phaseDef.number} - ${phaseDef.name}]`,
    "",
    `Focus: ${phaseDef.description}`,
    "",
    "Actions:",
  ];

  for (const action of phaseDef.actions) {
    sections.push(`- ${action}`);
  }

  return sections.join("\n");
}

/**
 * Get transition hint based on current phase
 */
export function getTransitionHint(currentPhase: string): string | null {
  const phaseDef = CENT_PHASES.find((p) => p.id === currentPhase);
  if (!phaseDef || !phaseDef.transitions) return null;

  const hints = phaseDef.transitions.map(
    (t) => `→ ${t.target}: ${t.condition}`
  );

  return `Possible transitions:\n${hints.join("\n")}`;
}
