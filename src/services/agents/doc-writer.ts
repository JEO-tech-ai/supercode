import type { Agent, AgentContext, AgentResult, AgentPromptMetadata } from "./types";
import { streamAIResponse } from "../models/ai-sdk";

/**
 * Doc Writer agent metadata for delegation
 */
export const DOC_WRITER_METADATA: AgentPromptMetadata = {
  category: "specialist",
  cost: "CHEAP",
  triggers: [
    {
      domain: "Documentation",
      trigger: "README, API docs, user guides, architecture docs → doc_writer",
    },
    {
      domain: "Technical Writing",
      trigger: "Changelog, release notes, migration guides → doc_writer",
    },
  ],
  useWhen: [
    "Writing or updating README files",
    "Creating API documentation",
    "Writing user guides or tutorials",
    "Documenting architecture",
    "Creating changelogs or release notes",
  ],
  avoidWhen: [
    "Code changes (use other agents)",
    "Inline code comments (do directly)",
    "Simple formatting fixes",
  ],
  dedicatedSection: `
The Documentation Writer creates crystal-clear, comprehensive docs.

**Output**: Well-structured Markdown with examples.
**Verify**: All code examples must be tested.
`,
};

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

  readonly metadata = DOC_WRITER_METADATA;

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
