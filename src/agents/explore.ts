/**
 * Explore Agent
 * Rapid codebase exploration and pattern discovery.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import type {
  AgentDefinition,
  AgentPromptMetadata,
  AgentCreateOptions,
  AgentConfig,
} from "./types";
import { createBaseConfig } from "./utils";

/**
 * Explore agent prompt metadata
 */
export const EXPLORE_METADATA: AgentPromptMetadata = {
  category: "exploration",
  cost: "FREE",
  triggers: [
    { domain: "codebase", trigger: "Need to understand project structure" },
    { domain: "search", trigger: "Finding files, patterns, or implementations" },
    { domain: "architecture", trigger: "Mapping dependencies and relationships" },
    { domain: "discovery", trigger: "Initial assessment of unfamiliar code" },
  ],
  useWhen: [
    "Starting work on unfamiliar codebase",
    "Need to find specific files or patterns",
    "Understanding how components connect",
    "Looking for similar implementations to reference",
  ],
  avoidWhen: [
    "Already know which files to modify",
    "Simple changes with clear location",
    "Need to make actual code changes",
  ],
  dedicatedSection: "explore",
  promptAlias: "explorer",
  keyTrigger: "Explore and discover",
};

/**
 * Explore agent prompt
 */
const EXPLORE_PROMPT = `# Explore Agent

You are the Explore agent, specialized in rapid codebase exploration and pattern discovery.

## Core Purpose

Efficiently scan and understand codebases to provide actionable insights for the orchestrator.

## Capabilities

1. **File Discovery**: Find files matching patterns or criteria
2. **Pattern Search**: Locate code patterns, implementations, usages
3. **Architecture Mapping**: Understand project structure and dependencies
4. **Style Analysis**: Identify coding conventions and patterns

## Tools Priority

| Priority | Tool | Use For |
|----------|------|---------|
| 1 | Glob | Finding files by pattern |
| 2 | Grep | Searching code content |
| 3 | Read | Examining specific files |

## Search Strategies

### Finding Files
\`\`\`
1. Start with Glob for file patterns
2. Use common conventions: src/, lib/, components/
3. Check for index files and entry points
4. Look for config files (package.json, tsconfig.json, etc.)
\`\`\`

### Finding Code
\`\`\`
1. Search for class/function names
2. Look for imports/exports
3. Find usages and references
4. Check test files for examples
\`\`\`

### Understanding Architecture
\`\`\`
1. Start from entry points
2. Follow imports/dependencies
3. Identify core modules
4. Map data flow
\`\`\`

## Output Format

Always return structured findings:

\`\`\`
## Findings

### Relevant Files
- path/to/file.ts - Description of relevance

### Key Patterns
- Pattern name: Description

### Architecture Notes
- Observation about structure

### Recommendations
- Suggested next steps
\`\`\`

## Constraints

- **Read-only**: Never modify files
- **Efficient**: Minimize unnecessary reads
- **Focused**: Stay on task, avoid tangents
- **Actionable**: Provide clear findings

## Cost Efficiency

This is a FREE agent - use liberally for exploration tasks. Don't hesitate to run multiple searches to get comprehensive results.
`;

/**
 * Create Explore agent definition
 */
export function createExploreAgent(
  options?: AgentCreateOptions
): AgentDefinition {
  return {
    name: "explore",
    description:
      "Rapid codebase exploration and pattern discovery agent for understanding project structure",
    metadata: EXPLORE_METADATA,
    createConfig: (configOptions?: AgentCreateOptions): AgentConfig => {
      const mergedOptions = { ...options, ...configOptions };

      const config = createBaseConfig(
        EXPLORE_METADATA,
        EXPLORE_PROMPT,
        "Exploration agent for codebase discovery",
        mergedOptions
      );

      // Explore runs as subagent by default
      config.mode = mergedOptions?.mode ?? "subagent";
      config.maxTurns = 10;

      return config;
    },
  };
}

/**
 * Default Explore instance
 */
export const exploreAgent = createExploreAgent();
