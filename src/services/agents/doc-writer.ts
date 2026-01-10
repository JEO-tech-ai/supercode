import type { Agent, AgentContext, AgentResult } from "./types";
import { streamAIResponse } from "../models/ai-sdk";

export class DocWriterAgent implements Agent {
  readonly name = "doc_writer" as const;
  readonly displayName = "Documentation Writer";
  readonly model = "ollama/llama3:latest";

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
    try {
      const result = await streamAIResponse({
        provider: "ollama",
        model: "llama3:latest",
        messages: [{ role: "user", content: prompt }],
        systemPrompt: this.systemPrompt,
        temperature: 0.5,
        maxTokens: 8192,
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
