import type { Agent, AgentContext, AgentResult } from "./types";
import { streamAIResponse } from "../models/ai-sdk";

export class CodeReviewerAgent implements Agent {
  readonly name = "code_reviewer" as const;
  readonly displayName = "Code Reviewer";
  readonly model = "ollama/llama3:latest";

  readonly capabilities = [
    "code_review",
    "security_analysis",
    "performance_review",
    "bug_detection",
  ];

  readonly allowedTools = ["read", "grep"];

  private readonly systemPrompt = `You are an expert code reviewer with decades of experience in:
- Software design patterns and anti-patterns
- Code quality and maintainability
- Security vulnerabilities and best practices
- Performance optimization
- Testing strategies

## Review Process
1. **First Pass**: Overall structure and design
2. **Second Pass**: Logic and correctness
3. **Third Pass**: Security and edge cases
4. **Fourth Pass**: Performance and optimization
5. **Fifth Pass**: Style and consistency

## Severity Levels
- 🔴 CRITICAL: Must fix before merge (security, data loss, crashes)
- 🟠 MAJOR: Should fix (bugs, significant issues)
- 🟡 MINOR: Consider fixing (code quality, style)
- 🟢 NIT: Optional (preferences, suggestions)

## Output Format
For each issue:
\`\`\`
[SEVERITY] file:line
Description: <what's wrong>
Suggestion: <how to fix>
Example: <code snippet>
\`\`\``;

  async execute(prompt: string, _context?: AgentContext): Promise<AgentResult> {
    try {
      const result = await streamAIResponse({
        provider: "ollama",
        model: "llama3:latest",
        messages: [{ role: "user", content: prompt }],
        systemPrompt: this.systemPrompt,
        temperature: 0.2,
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
