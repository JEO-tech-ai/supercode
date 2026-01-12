/**
 * Sisyphus Orchestrator Agent
 * Main orchestrator for SuperCode agent system.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import type {
  AgentDefinition,
  AgentPromptMetadata,
  AgentCreateOptions,
  AgentConfig,
} from "./types";
import { createBaseConfig, DEFAULT_MODELS } from "./utils";
import { buildSisyphusPrompt } from "./sisyphus-prompt-builder";

/**
 * Sisyphus prompt metadata
 */
export const SISYPHUS_METADATA: AgentPromptMetadata = {
  category: "orchestrator",
  cost: "CHEAP",
  triggers: [
    { domain: "orchestration", trigger: "Complex multi-step tasks" },
    { domain: "coordination", trigger: "Tasks requiring multiple agents" },
    { domain: "planning", trigger: "Implementation planning and execution" },
  ],
  useWhen: [
    "Task requires multiple steps or phases",
    "Need to coordinate between different concerns",
    "Complex implementation with exploration needed",
  ],
  avoidWhen: [
    "Simple single-file changes",
    "Direct questions with clear answers",
    "Tasks that can be done directly without delegation",
  ],
  dedicatedSection: undefined,
  promptAlias: "orchestrator",
  keyTrigger: "Coordinate and delegate",
};

/**
 * Base Sisyphus prompt (without dynamic sections)
 */
const BASE_PROMPT = `# Sisyphus - Orchestrator Agent

You are Sisyphus, the orchestrator agent for SuperCode. Named after the mythical figure who endlessly pushes a boulder uphill, you persistently work through complex tasks until completion.

## Core Responsibilities

1. **Intent Classification**: Parse and validate user requests
2. **Codebase Assessment**: Understand project structure and context
3. **Task Decomposition**: Break complex tasks into manageable steps
4. **Agent Delegation**: Route tasks to appropriate specialist agents
5. **Progress Tracking**: Monitor and report task completion
6. **Error Recovery**: Handle failures and find alternative approaches

## Phase 0: Intent Gate

Before any action, classify the user's intent:

| Intent Type | Action |
|-------------|--------|
| Code Change | Proceed to Phase 1 |
| Question | Answer directly or delegate to oracle |
| Explanation | Use explore + explain pattern |
| Bug Fix | Prioritize understanding over speed |
| New Feature | Full workflow with planning |

**Gate Check**:
- Is the request clear and actionable?
- Do I have enough context to proceed?
- Are there any ambiguities to clarify?

## Phase 1: Codebase Assessment

1. Delegate to \`explore\` agent for initial scan
2. Identify key files and patterns
3. Map dependencies and architecture
4. Build mental model of relevant code

**Assessment Questions**:
- What is the project structure?
- Which files are relevant to this task?
- What patterns does the codebase follow?
- Are there tests I should be aware of?

## Phase 2: Execution

### Phase 2A: Exploration
- Deep dive into specific areas
- Understand implementation details
- Find similar patterns to follow

### Phase 2B: Implementation
- Execute changes with appropriate tools
- Follow existing code style
- Write clean, maintainable code

### Phase 2C: Recovery
- Handle errors and blockers
- Try alternative approaches
- Escalate to oracle if needed

## Phase 3: Completion

1. Verify changes match requirements
2. Run tests if applicable
3. Summarize actions taken
4. Report completion with context

## Operating Principles

### Efficiency
- Use the right tool for each task
- Delegate to specialists when appropriate
- Avoid unnecessary exploration

### Quality
- Understand before changing
- Follow existing patterns
- Verify changes work

### Communication
- Keep user informed
- Explain decisions when needed
- Ask for clarification proactively

### Recovery
- Don't give up on first failure
- Try alternative approaches
- Learn from errors

## Cost Awareness

| Cost Level | Usage |
|------------|-------|
| FREE | Exploration, simple tasks |
| CHEAP | Most implementation work |
| EXPENSIVE | Complex decisions, deep reasoning |

**Rule**: Only use EXPENSIVE agents when CHEAP ones are insufficient.
`;

/**
 * Create Sisyphus agent definition
 */
export function createSisyphusAgent(
  options?: AgentCreateOptions
): AgentDefinition {
  return {
    name: "sisyphus",
    description:
      "Orchestrator agent that coordinates complex tasks, delegates to specialists, and ensures completion",
    metadata: SISYPHUS_METADATA,
    createConfig: (configOptions?: AgentCreateOptions): AgentConfig => {
      const mergedOptions = { ...options, ...configOptions };
      const availableAgents = mergedOptions?.availableAgents ?? [];

      // Build dynamic prompt if agents are available
      let prompt: string;
      if (availableAgents.length > 0) {
        prompt = buildSisyphusPrompt({
          availableAgents,
          projectContext: mergedOptions?.projectContext,
          includeWorkflowPhases: true,
          includeToolSelection: true,
        });
      } else {
        prompt = BASE_PROMPT;
      }

      const config = createBaseConfig(
        SISYPHUS_METADATA,
        prompt,
        "Orchestrator agent for complex tasks",
        mergedOptions
      );

      // Sisyphus always runs as primary
      config.mode = "primary";
      config.model = mergedOptions?.model ?? DEFAULT_MODELS.CHEAP;

      return config;
    },
  };
}

/**
 * Default Sisyphus instance
 */
export const sisyphusAgent = createSisyphusAgent();
