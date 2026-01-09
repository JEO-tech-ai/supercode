import type { Agent, AgentContext, AgentResult } from "./types";
import { getModelRouter } from "../models/router";

export class DocWriterAgent implements Agent {
  readonly name = "doc_writer" as const;
  readonly displayName = "Documentation Writer";
  readonly model = "google/gemini-2.0-pro";

  readonly capabilities = [
    "documentation",
    "api_docs",
    "readme",
    "guides",
  ];

  readonly allowedTools = ["read", "write", "grep", "glob"];

  private readonly systemPrompt = `You are a technical documentation specialist with expertise in:
- API documentation (OpenAPI, JSDoc, TSDoc)
- README files and project documentation
- User guides and tutorials
- Architecture documentation
- Changelog and release notes

## Approach
1. Analyze the codebase structure
2. Identify documentation gaps
3. Write clear, concise documentation
4. Include code examples where appropriate

## Documentation Standards
- Use clear, simple language
- Include examples for complex concepts
- Structure content with headings and lists
- Add cross-references where helpful

## Output Format
Provide documentation in Markdown format with proper headings, code blocks, and formatting.`;

  async execute(prompt: string, _context?: AgentContext): Promise<AgentResult> {
    const router = getModelRouter();

    try {
      const response = await router.route({
        messages: [{ role: "user", content: prompt }],
        systemPrompt: this.systemPrompt,
        temperature: 0.5,
        maxTokens: 8192,
      });

      return {
        success: true,
        content: response.content,
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
