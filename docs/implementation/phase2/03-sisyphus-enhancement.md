# Phase 2.3: Enhanced Sisyphus Prompt Builder

> Priority: P1 (High)
> Effort: 3-4 days
> Dependencies: Agent registry

## Overview

The Sisyphus prompt builder dynamically generates the orchestrator prompt based on available agents, tools, and skills. This ensures the agent knows exactly what capabilities are available and how to use them.

## Current State in SuperCode

### Existing Files
```
src/agents/sisyphus.ts                    # Basic Sisyphus agent
src/agents/sisyphus-prompt-builder.ts     # Current prompt builder
src/services/agents/sisyphus/index.ts     # Service layer
src/services/agents/sisyphus/prompt-builder.ts  # Service prompt builder
```

### What Exists
- Basic Sisyphus agent definition
- Static prompt with phase descriptions
- Simple prompt builder

### What's Missing
- Dynamic agent availability sections
- Tool categorization by cost
- Skill trigger detection
- Key triggers from available agents
- Frontend delegation rules
- GitHub workflow section

## Reference Implementation (Oh-My-OpenCode)

```typescript
// Dynamic sections built from available agents
function buildKeyTriggersSection(agents: AvailableAgent[]): string;
function buildToolSelectionTable(agents: AvailableAgent[], tools: AvailableTool[]): string;
function buildExploreSection(agents: AvailableAgent[]): string;
function buildLibrarianSection(agents: AvailableAgent[]): string;
function buildFrontendSection(agents: AvailableAgent[]): string;
function buildDelegationTable(agents: AvailableAgent[]): string;
function buildOracleSection(agents: AvailableAgent[]): string;
function buildHardBlocksSection(agents: AvailableAgent[]): string;
```

## Implementation Plan

### File Structure
```
src/agents/sisyphus/
├── index.ts              # Main agent export
├── prompt-builder.ts     # Dynamic prompt construction
├── sections/
│   ├── role.ts           # Role and identity section
│   ├── phases.ts         # Phase 0-3 sections
│   ├── agents.ts         # Agent-specific sections
│   ├── tools.ts          # Tool selection sections
│   ├── constraints.ts    # Hard blocks and anti-patterns
│   └── style.ts          # Communication style
└── types.ts              # Type definitions
```

### 1. Types (`types.ts`)

```typescript
export interface AvailableAgent {
  name: string;
  description: string;
  cost: 'FREE' | 'CHEAP' | 'EXPENSIVE';
  triggers: string[];
  capabilities: string[];
  mode?: 'primary' | 'subagent' | 'background';
}

export interface AvailableTool {
  name: string;
  description: string;
  category: 'search' | 'edit' | 'execute' | 'analyze' | 'mcp';
}

export interface AvailableSkill {
  name: string;
  description: string;
  triggers: string[];
}

export interface PromptContext {
  availableAgents: AvailableAgent[];
  availableTools: AvailableTool[];
  availableSkills: AvailableSkill[];
  projectContext?: {
    name?: string;
    type?: string;
    language?: string;
  };
}

export interface PromptSection {
  id: string;
  content: string;
  priority: number;
}
```

### 2. Role Section (`sections/role.ts`)

```typescript
export const ROLE_SECTION = `<Role>
You are "Sisyphus" - Powerful AI Agent with orchestration capabilities.

**Why Sisyphus?**: Humans roll their boulder every day. So do you. We're not so different—your code should be indistinguishable from a senior engineer's.

**Identity**: SF Bay Area engineer. Work, delegate, verify, ship. No AI slop.

**Core Competencies**:
- Parsing implicit requirements from explicit requests
- Adapting to codebase maturity (disciplined vs chaotic)
- Delegating specialized work to the right subagents
- Parallel execution for maximum throughput
- Follows user instructions. NEVER START IMPLEMENTING, UNLESS USER WANTS YOU TO IMPLEMENT SOMETHING EXPLICITLY.

**Operating Mode**: You NEVER work alone when specialists are available. Frontend work → delegate. Deep research → parallel background agents. Complex architecture → consult Oracle.

</Role>`;
```

### 3. Agent Sections (`sections/agents.ts`)

```typescript
import type { AvailableAgent } from '../types';

export function buildKeyTriggersSection(
  agents: AvailableAgent[],
  skills: { name: string; triggers: string[] }[]
): string {
  const triggers: string[] = [];

  // Add agent triggers
  for (const agent of agents) {
    for (const trigger of agent.triggers) {
      triggers.push(`- ${trigger} → fire \`${agent.name}\` ${agent.mode === 'background' ? 'background' : ''}`);
    }
  }

  // Add skill triggers
  for (const skill of skills) {
    for (const trigger of skill.triggers) {
      triggers.push(`- ${trigger} → invoke \`${skill.name}\` skill`);
    }
  }

  return `### Key Triggers (check BEFORE classification):

**BLOCKING: Check skills FIRST before any action.**
If a skill matches, invoke it IMMEDIATELY via \`skill\` tool.

${triggers.join('\n')}`;
}

export function buildExploreSection(agents: AvailableAgent[]): string {
  const hasExplore = agents.some(a => a.name === 'explore');
  if (!hasExplore) return '';

  return `### Explore Agent = Contextual Grep

Use it as a **peer tool**, not a fallback. Fire liberally.

| Use Direct Tools | Use Explore Agent |
|------------------|-------------------|
| You know exactly what to search |  |
| Single keyword/pattern suffices |  |
| Known file location |  |
|  | Multiple search angles needed |
|  | Unfamiliar module structure |
|  | Cross-layer pattern discovery |`;
}

export function buildLibrarianSection(agents: AvailableAgent[]): string {
  const hasLibrarian = agents.some(a => a.name === 'librarian');
  if (!hasLibrarian) return '';

  return `### Librarian Agent = Reference Grep

Search **external references** (docs, OSS, web). Fire proactively when unfamiliar libraries are involved.

| Contextual Grep (Internal) | Reference Grep (External) |
|----------------------------|---------------------------|
| Search OUR codebase | Search EXTERNAL resources |
| Find patterns in THIS repo | Find examples in OTHER repos |
| How does our code work? | How does this library work? |
| Project-specific logic | Official API documentation |
| | Library best practices & quirks |

**Trigger phrases** (fire librarian immediately):
- "How do I use [library]?"
- "What's the best practice for [framework feature]?"
- "Why does [external dependency] behave this way?"`;
}

export function buildFrontendSection(agents: AvailableAgent[]): string {
  const hasFrontend = agents.some(a => a.name === 'frontend-ui-ux-engineer');
  if (!hasFrontend) return '';

  return `### Frontend Files: Decision Gate

Frontend files (.tsx, .jsx, .vue, .svelte, .css) require **classification before action**.

#### Step 1: Classify the Change Type

| Change Type | Examples | Action |
|-------------|----------|--------|
| **Visual/UI/UX** | Color, spacing, layout, typography, animation | **DELEGATE** to \`frontend-ui-ux-engineer\` |
| **Pure Logic** | API calls, data fetching, state management | **CAN handle directly** |
| **Mixed** | Component changes both visual AND logic | **Split**: handle logic yourself, delegate visual |

#### When in Doubt → DELEGATE if ANY of these keywords involved:
style, className, tailwind, color, background, border, shadow, margin, padding, width, height, flex, grid, animation, transition, hover, responsive, font-size, icon, svg`;
}

export function buildOracleSection(agents: AvailableAgent[]): string {
  const hasOracle = agents.some(a => a.name === 'oracle');
  if (!hasOracle) return '';

  return `<Oracle_Usage>
## Oracle — Your Senior Engineering Advisor

Oracle is an expensive, high-quality reasoning model. Use it wisely.

### WHEN to Consult:

| Trigger | Action |
|---------|--------|
| Complex architecture design | Oracle FIRST, then implement |
| After completing significant work | Oracle for review |
| 2+ failed fix attempts | Oracle for debugging |
| Unfamiliar code patterns | Oracle for understanding |
| Security/performance concerns | Oracle for analysis |

### WHEN NOT to Consult:

- Simple file operations
- First attempt at any fix
- Questions answerable from code you've read
- Trivial decisions

**Exception**: Announce "Consulting Oracle for [reason]" before invocation.
</Oracle_Usage>`;
}

export function buildDelegationTable(agents: AvailableAgent[]): string {
  const rows: string[] = [];

  for (const agent of agents) {
    if (agent.mode === 'primary') continue; // Skip self
    
    const triggers = agent.triggers.join(', ');
    rows.push(`| ${agent.capabilities[0] || 'General'} | \`${agent.name}\` | ${triggers} |`);
  }

  if (rows.length === 0) return '';

  return `### Delegation Table:

| Domain | Delegate To | Trigger |
|--------|-------------|---------|
${rows.join('\n')}`;
}
```

### 4. Tool Sections (`sections/tools.ts`)

```typescript
import type { AvailableAgent, AvailableTool } from '../types';

export function categorizeTools(toolNames: string[]): AvailableTool[] {
  const tools: AvailableTool[] = [];
  
  const categories: Record<string, string[]> = {
    search: ['glob', 'grep', 'ast_grep_search', 'lsp_find_references', 'lsp_workspace_symbols'],
    edit: ['edit', 'write', 'ast_grep_replace', 'lsp_rename'],
    execute: ['bash', 'background_task', 'interactive_bash'],
    analyze: ['read', 'lsp_hover', 'lsp_diagnostics', 'lsp_document_symbols'],
    mcp: ['skill_mcp', 'mcp_tool'],
  };

  for (const name of toolNames) {
    let category: AvailableTool['category'] = 'analyze';
    
    for (const [cat, patterns] of Object.entries(categories)) {
      if (patterns.some(p => name.includes(p))) {
        category = cat as AvailableTool['category'];
        break;
      }
    }

    tools.push({ name, description: '', category });
  }

  return tools;
}

export function buildToolSelectionTable(
  agents: AvailableAgent[],
  tools: AvailableTool[]
): string {
  const agentRows = agents.map(a => 
    `| \`${a.name}\` agent | ${a.cost} | ${a.description} |`
  );

  return `### Tool & Agent Selection:

**Priority Order**: Skills → Direct Tools → Agents

#### Agents

| Resource | Cost | When to Use |
|----------|------|-------------|
${agentRows.join('\n')}

**Default flow**: skill (if match) → explore/librarian (background) + tools → oracle (if required)`;
}
```

### 5. Main Prompt Builder (`prompt-builder.ts`)

```typescript
import type { PromptContext, PromptSection } from './types';
import { ROLE_SECTION } from './sections/role';
import { 
  buildKeyTriggersSection,
  buildExploreSection,
  buildLibrarianSection,
  buildFrontendSection,
  buildOracleSection,
  buildDelegationTable,
} from './sections/agents';
import { buildToolSelectionTable, categorizeTools } from './sections/tools';

// Phase sections (static content)
const PHASE_0_SECTION = `## Phase 0 - Intent Gate (EVERY message)
...`; // Full content from reference

const PHASE_1_SECTION = `## Phase 1 - Codebase Assessment (for Open-ended tasks)
...`;

const PHASE_2A_SECTION = `## Phase 2A - Exploration & Research
...`;

const PHASE_2B_SECTION = `## Phase 2B - Implementation
...`;

const PHASE_2C_SECTION = `## Phase 2C - Failure Recovery
...`;

const PHASE_3_SECTION = `## Phase 3 - Completion
...`;

const TASK_MANAGEMENT_SECTION = `<Task_Management>
## Todo Management (CRITICAL)
...
</Task_Management>`;

const TONE_STYLE_SECTION = `<Tone_and_Style>
## Communication Style
...
</Tone_and_Style>`;

const CONSTRAINTS_SECTION = `<Constraints>
## Hard Blocks (NEVER violate)
...
</Constraints>`;

export function buildSisyphusPrompt(context: PromptContext): string {
  const { availableAgents, availableTools, availableSkills } = context;
  
  const tools = availableTools.length > 0 
    ? availableTools 
    : categorizeTools(availableTools.map(t => t.name));

  const sections: PromptSection[] = [
    { id: 'role', content: ROLE_SECTION, priority: 100 },
    { id: 'behavior-start', content: '<Behavior_Instructions>', priority: 99 },
    { id: 'phase0', content: PHASE_0_SECTION, priority: 98 },
    { id: 'key-triggers', content: buildKeyTriggersSection(availableAgents, availableSkills), priority: 97 },
    { id: 'phase1', content: PHASE_1_SECTION, priority: 90 },
    { id: 'phase2a', content: PHASE_2A_SECTION, priority: 85 },
    { id: 'tool-selection', content: buildToolSelectionTable(availableAgents, tools), priority: 84 },
    { id: 'explore', content: buildExploreSection(availableAgents), priority: 83 },
    { id: 'librarian', content: buildLibrarianSection(availableAgents), priority: 82 },
    { id: 'phase2b', content: PHASE_2B_SECTION, priority: 80 },
    { id: 'frontend', content: buildFrontendSection(availableAgents), priority: 79 },
    { id: 'delegation', content: buildDelegationTable(availableAgents), priority: 78 },
    { id: 'phase2c', content: PHASE_2C_SECTION, priority: 70 },
    { id: 'phase3', content: PHASE_3_SECTION, priority: 60 },
    { id: 'behavior-end', content: '</Behavior_Instructions>', priority: 55 },
    { id: 'oracle', content: buildOracleSection(availableAgents), priority: 50 },
    { id: 'task-mgmt', content: TASK_MANAGEMENT_SECTION, priority: 40 },
    { id: 'tone', content: TONE_STYLE_SECTION, priority: 30 },
    { id: 'constraints', content: CONSTRAINTS_SECTION, priority: 20 },
  ];

  // Sort by priority and filter empty
  const sortedSections = sections
    .filter(s => s.content.trim().length > 0)
    .sort((a, b) => b.priority - a.priority);

  return sortedSections.map(s => s.content).join('\n\n');
}

export function createDynamicSisyphusPrompt(
  availableAgents: AvailableAgent[],
  availableToolNames: string[] = [],
  availableSkills: { name: string; triggers: string[] }[] = []
): string {
  const tools = categorizeTools(availableToolNames);
  
  return buildSisyphusPrompt({
    availableAgents,
    availableTools: tools,
    availableSkills,
  });
}
```

### 6. Main Index (`index.ts`)

```typescript
import type { AgentDefinition, AgentConfig } from '../types';
import { buildSisyphusPrompt, createDynamicSisyphusPrompt } from './prompt-builder';
import type { AvailableAgent } from './types';

export const SISYPHUS_METADATA = {
  category: 'orchestrator',
  cost: 'CHEAP' as const,
  triggers: [
    { domain: 'orchestration', trigger: 'Complex multi-step tasks' },
    { domain: 'coordination', trigger: 'Tasks requiring multiple agents' },
  ],
};

const DEFAULT_MODEL = 'anthropic/claude-opus-4-5';

export function createSisyphusAgent(
  model: string = DEFAULT_MODEL,
  availableAgents?: AvailableAgent[],
  availableToolNames?: string[],
  availableSkills?: { name: string; triggers: string[] }[]
): AgentDefinition {
  const prompt = availableAgents
    ? createDynamicSisyphusPrompt(availableAgents, availableToolNames, availableSkills)
    : createDynamicSisyphusPrompt([], availableToolNames, availableSkills);

  return {
    name: 'sisyphus',
    description: 'Orchestrator agent that coordinates complex tasks',
    metadata: SISYPHUS_METADATA,
    createConfig: (): AgentConfig => ({
      mode: 'primary',
      model,
      maxTokens: 64000,
      prompt,
      thinking: { type: 'enabled', budgetTokens: 32000 },
    }),
  };
}

export * from './types';
export { buildSisyphusPrompt, createDynamicSisyphusPrompt } from './prompt-builder';
```

## Testing

```typescript
describe('buildSisyphusPrompt', () => {
  it('should include role section');
  it('should include phase sections');
  it('should build key triggers from agents');
  it('should include explore section when available');
  it('should include frontend section when available');
  it('should build delegation table');
});
```

## Success Criteria

- [ ] Dynamic prompt based on available agents
- [ ] Tool categorization works
- [ ] Skill triggers included
- [ ] All phase sections present
- [ ] Frontend delegation rules when agent available
- [ ] Oracle section when agent available
