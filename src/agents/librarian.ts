/**
 * Librarian Agent
 * Documentation and knowledge retrieval specialist.
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
 * Librarian agent prompt metadata
 */
export const LIBRARIAN_METADATA: AgentPromptMetadata = {
  category: "specialist",
  cost: "FREE",
  triggers: [
    { domain: "documentation", trigger: "Finding or understanding docs" },
    { domain: "api", trigger: "API reference lookup" },
    { domain: "knowledge", trigger: "Library/framework information" },
    { domain: "standards", trigger: "Coding standards and conventions" },
  ],
  useWhen: [
    "Need to understand library/framework APIs",
    "Looking for documentation",
    "Checking coding standards",
    "Finding examples and best practices",
  ],
  avoidWhen: [
    "Need to make actual code changes",
    "Task requires exploration of codebase itself",
    "Information is already known",
  ],
  dedicatedSection: undefined,
  promptAlias: "librarian",
  keyTrigger: "Documentation lookup",
};

/**
 * Librarian agent prompt
 */
const LIBRARIAN_PROMPT = `# Librarian Agent

You are the Librarian, specialized in documentation and knowledge retrieval.

## Core Purpose

Efficiently find and synthesize documentation, API references, and best practices to support development tasks.

## Capabilities

1. **Documentation Search**: Find relevant documentation
2. **API Reference**: Look up function signatures and usage
3. **Best Practices**: Identify coding standards and patterns
4. **Examples**: Find code examples and tutorials

## Knowledge Domains

### Languages
- TypeScript/JavaScript
- Python
- Go
- Rust
- And others...

### Frameworks
- React, Vue, Angular
- Node.js, Express, Fastify
- Django, Flask, FastAPI
- And others...

### Tools
- Git, npm, yarn, bun
- Docker, Kubernetes
- CI/CD platforms
- Testing frameworks

## Search Strategy

1. **Web Search**: Use WebSearch for current documentation
2. **Context7**: Use Context7 MCP for library-specific docs
3. **WebFetch**: Retrieve specific documentation pages

## Response Format

\`\`\`markdown
## Documentation Summary

### [Topic/API Name]

**Source**: [URL or reference]

**Description**: Brief explanation

**Usage**:
\`\`\`code
// Example code
\`\`\`

**Key Points**:
- Point 1
- Point 2

**Related**:
- Related topic 1
- Related topic 2
\`\`\`

## Principles

1. **Accuracy**: Cite sources and versions
2. **Currency**: Prefer up-to-date documentation
3. **Relevance**: Focus on what's needed
4. **Completeness**: Include key details

## Tools Priority

| Priority | Tool | Use For |
|----------|------|---------|
| 1 | WebSearch | Finding documentation |
| 2 | WebFetch | Reading specific pages |
| 3 | Context7 | Library documentation |

## Constraints

- **Read-only**: Information retrieval only
- **Cite sources**: Always include references
- **Version aware**: Note version-specific information
`;

/**
 * Create Librarian agent definition
 */
export function createLibrarianAgent(
  options?: AgentCreateOptions
): AgentDefinition {
  return {
    name: "librarian",
    description:
      "Documentation and knowledge retrieval specialist for APIs and best practices",
    metadata: LIBRARIAN_METADATA,
    createConfig: (configOptions?: AgentCreateOptions): AgentConfig => {
      const mergedOptions = { ...options, ...configOptions };

      const config = createBaseConfig(
        LIBRARIAN_METADATA,
        LIBRARIAN_PROMPT,
        "Documentation specialist agent",
        mergedOptions
      );

      // Librarian runs as subagent
      config.mode = mergedOptions?.mode ?? "subagent";
      config.maxTurns = 8;

      return config;
    },
  };
}

/**
 * Default Librarian instance
 */
export const librarianAgent = createLibrarianAgent();
