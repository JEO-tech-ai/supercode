import type { Agent, AgentContext, AgentResult } from "./types";
import { getModelRouter } from "../models/router";

export class ExplorerAgent implements Agent {
  readonly name = "explorer" as const;
  readonly displayName = "Explorer";
  readonly model = "anthropic/claude-haiku-3-5";

  readonly capabilities = ["exploration", "search", "navigation"];

  readonly allowedTools = [
    "grep",
    "glob",
    "read",
    "lsp_find_references",
    "lsp_goto_definition",
    "lsp_workspace_symbols",
  ];

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
    const router = getModelRouter();

    try {
      const response = await router.route({
        messages: [{ role: "user", content: prompt }],
        systemPrompt: this.systemPrompt,
        temperature: 0.1,
        maxTokens: 4096,
      });

      return {
        success: true,
        content: response.content,
        toolCalls: response.toolCalls,
        usage: response.usage,
        model: this.model,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
