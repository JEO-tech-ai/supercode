import type { Agent, AgentContext, AgentResult, AgentPromptMetadata } from "./types";
import { streamAIResponse } from "../models/ai-sdk";

/**
 * Explorer agent metadata for delegation
 */
export const EXPLORER_METADATA: AgentPromptMetadata = {
  category: "exploration",
  cost: "FREE",
  triggers: [
    {
      domain: "Internal Codebase",
      trigger: "Where is X?, Find code that does Y, Which file has Z → explorer",
    },
    {
      domain: "Code Search",
      trigger: "2+ modules involved or broad search needed → fire explorer in background",
    },
  ],
  useWhen: [
    "Searching internal codebase",
    "Finding file locations",
    "Locating function definitions",
    "Understanding code structure",
    "Broad searches across multiple files",
  ],
  avoidWhen: [
    "External library research (use librarian)",
    "Single known file (use read directly)",
    "Simple grep with known pattern (use grep directly)",
  ],
  keyTrigger: "2+ modules involved → fire explorer background",
  dedicatedSection: `
The Explorer is a fast codebase grep specialist for internal searches.

**Fire 1-3 times in parallel** for broad searches.
Always run in **background** to not block the main flow.

**Success Criteria**:
- Absolute file paths
- Complete results
- Actionable information
`,
};

export class ExplorerAgent implements Agent {
  readonly name = "explorer" as const;
  readonly displayName = "Explorer";
  readonly model = "ollama/llama3:latest";

  readonly capabilities = ["exploration", "search", "navigation"];

  readonly allowedTools = [
    "grep",
    "glob",
    "read",
    "lsp_find_references",
    "lsp_goto_definition",
    "lsp_workspace_symbols",
  ];

  readonly metadata = EXPLORER_METADATA;

  private readonly systemPrompt = `You are a fast codebase explorer. Your job is to quickly find information.

## Approach
1. Use grep for text search
2. Use glob for file patterns
3. Use lsp_* tools for semantic search
4. Return results concisely

## Output Format
Found X results:
1. file:line - brief description
2. file:line - brief description
...`;

  async execute(prompt: string, _context?: AgentContext): Promise<AgentResult> {
    try {
      const result = await streamAIResponse({
        provider: "ollama",
        model: "llama3:latest",
        messages: [{ role: "user", content: prompt }],
        systemPrompt: this.systemPrompt,
        temperature: 0.1,
        maxTokens: 4096,
      });

      return {
        success: true,
        content: result.text,
        usage: result.usage,
        model: "ollama/llama3:latest",
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
