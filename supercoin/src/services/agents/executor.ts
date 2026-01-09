import type { Agent, AgentContext, AgentResult } from "./types";
import { getModelRouter } from "../models/router";

export class ExecutorAgent implements Agent {
  readonly name = "executor" as const;
  readonly displayName = "Executor";
  readonly model = "openai/gpt-4o";

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
