/**
 * Librarian Agent
 * External research specialist for GitHub, documentation, and web search.
 * Adapted from Oh-My-OpenCode for SuperCode integration.
 */

import type {
  Agent,
  AgentContext,
  AgentResult,
  AgentPromptMetadata,
} from "./types";
import { streamAIResponse } from "../models";
import logger from "../../shared/logger";

/**
 * Librarian agent metadata for delegation
 */
export const LIBRARIAN_METADATA: AgentPromptMetadata = {
  category: "exploration",
  cost: "CHEAP",
  triggers: [
    {
      domain: "External Libraries",
      trigger: "Any mention of external library, package, or framework → fire librarian in background",
    },
    {
      domain: "Documentation",
      trigger: "Need official docs, API reference, or usage examples → librarian",
    },
    {
      domain: "GitHub Research",
      trigger: "Issues, PRs, release notes, or code examples from GitHub → librarian",
    },
    {
      domain: "Version Information",
      trigger: "Migration guides, breaking changes, version-specific info → librarian",
    },
  ],
  useWhen: [
    "Looking up external library documentation",
    "Searching for GitHub issues or PRs",
    "Finding official usage examples",
    "Comparing implementation patterns across repos",
    "Researching version-specific behavior",
    "Finding release notes or changelogs",
  ],
  avoidWhen: [
    "Searching internal codebase (use explorer)",
    "Simple code reading (use read tool)",
    "No external dependencies involved",
    "Question can be answered from local code",
  ],
  keyTrigger: "External library/source mentioned → fire librarian background",
  dedicatedSection: `
The Librarian specializes in external research:
- **GitHub Search**: Find code patterns, issues, PRs across public repos
- **Documentation**: Look up official docs via Context7 or web search
- **Comparison**: Compare implementations across repositories
- **Evidence**: Every claim must include source links

**Output Format**: Always include permalinks or source URLs for verification.
`,
};

/**
 * Librarian system prompt
 */
const LIBRARIAN_PROMPT = `You are the Librarian, an external research specialist.

## Primary Responsibilities

1. **Documentation Lookup**
   - Search official documentation
   - Find API references and usage examples
   - Locate migration guides and breaking changes

2. **GitHub Research**
   - Search code patterns across repositories
   - Find related issues and PRs
   - Extract implementation examples

3. **Web Research**
   - Find tutorials and guides
   - Compare approaches and patterns
   - Verify version-specific behavior

## Research Protocol

### Phase 1: Assess Before Search
- Understand what information is needed
- Identify the best source (docs, GitHub, web)
- Plan search strategy

### Phase 2: Execute Search
- Use appropriate tools for the source
- Gather relevant information
- Note source URLs for every claim

### Phase 3: Synthesize
- Compile findings with citations
- Highlight key insights
- Note any uncertainties or limitations

## Output Requirements

- **Every claim must have a source link**
- Include version numbers when relevant
- Note any caveats or edge cases
- Provide actionable recommendations

## Allowed Tools

- web_search: Search the web
- web_fetch: Fetch web pages
- context7: Query documentation

## Code of Conduct

1. **Evidence-Based**: No claims without sources
2. **Current**: Prefer recent documentation
3. **Complete**: Include relevant context
4. **Honest**: Acknowledge limitations
`;

/**
 * Create librarian agent
 */
export function createLibrarian(): Agent {
  return {
    name: "librarian",
    displayName: "Librarian",
    model: "gemini-2.5-flash",
    capabilities: [
      "External documentation lookup",
      "GitHub code search",
      "Web research",
      "Version-specific research",
    ],
    allowedTools: ["web_search", "web_fetch"],
    metadata: LIBRARIAN_METADATA,

    async execute(prompt: string, context?: AgentContext): Promise<AgentResult> {
      logger.info(`[Librarian] Starting research: ${prompt.slice(0, 100)}...`);

      try {
        const response = await streamAIResponse({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: LIBRARIAN_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          maxTokens: 8192,
        });

        // Collect full response
        let content = "";
        for await (const chunk of response) {
          if (chunk.type === "text") {
            content += chunk.content;
          }
        }

        logger.info(`[Librarian] Research complete`);

        return {
          success: true,
          content,
          model: "gemini-2.5-flash",
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[Librarian] Error: ${errorMessage}`);

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
  };
}

export const librarian = createLibrarian();
