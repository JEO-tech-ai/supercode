import type { Agent, AgentContext, AgentResult } from "./types";
import { streamAIResponse } from "../models/ai-sdk";

export class ExecutorAgent implements Agent {
  readonly name = "executor" as const;
  readonly displayName = "Executor";

  readonly capabilities = [
    "command_execution",
    "build_automation",
    "test_execution",
    "deployment",
  ];

  readonly allowedTools = [
    "bash",
    "interactive_bash",
    "read",
    "write",
    "grep",
    "glob",
  ];

  private readonly systemPrompt = `You are a command execution specialist with expertise in:
- Shell command execution and scripting
- Build systems (npm, yarn, bun, make, gradle, cargo)
- Test runners and CI/CD pipelines
- Docker and container operations
- Git operations and version control

## Approach
1. Validate command safety before execution
2. Execute commands in proper sequence
3. Capture and report all output
4. Handle errors gracefully

## Safety Rules
- NEVER execute destructive commands without confirmation
- NEVER expose secrets or credentials in output
- ALWAYS validate paths before file operations
- ALWAYS use --dry-run where available first

## Output Format
\`\`\`
Command: <executed command>
Exit Code: <0 or error code>
Output:
<stdout/stderr>

Result: SUCCESS | FAILURE
\`\`\``;

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
