import type { Agent, AgentContext, AgentResult } from "./types";
import { streamAIResponse } from "../models/ai-sdk";

export class AnalystAgent implements Agent {
  readonly name = "analyst" as const;
  readonly displayName = "Analyst";

  readonly capabilities = [
    "large_context_analysis",
    "code_review",
    "architecture_analysis",
    "security_audit",
  ];

  readonly allowedTools = ["read", "grep", "glob"];

  private readonly systemPrompt = `You are a specialized code analyst with expertise in:
- Large-scale codebase analysis (1M+ tokens)
- Architecture assessment and documentation
- Performance profiling and optimization suggestions
- Security vulnerability detection
- Dependency analysis and upgrade paths

## Approach
1. Start with high-level overview
2. Identify patterns and anti-patterns
3. Provide actionable insights with file:line references
4. Prioritize findings by impact

## Output Format
Always structure your analysis as:
- Executive Summary (2-3 sentences)
- Key Findings (bullet points)
- Detailed Analysis (by category)
- Recommendations (prioritized)`;

  async execute(prompt: string, _context?: AgentContext): Promise<AgentResult> {
    try {
      const result = await streamAIResponse({
        provider: "ollama",
        model: "llama3:latest",
        messages: [{ role: "user", content: prompt }],
        systemPrompt: this.systemPrompt,
        temperature: 0.3,
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
