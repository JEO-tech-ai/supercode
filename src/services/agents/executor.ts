import type { Agent, AgentContext, AgentResult, AgentName } from "./types";
import { streamAIResponse } from "../models/ai-sdk";
import { Log } from "../../shared/logger";

export interface BackgroundAgentInput {
  agent: string;
  prompt: string;
  parentSessionId: string;
}

export async function executeBackgroundAgent(input: BackgroundAgentInput): Promise<string> {
  const { agent, prompt, parentSessionId } = input;
  
  Log.info(`[executeBackgroundAgent] Starting ${agent} for session ${parentSessionId}`);
  
  try {
    const agentPrompts: Record<string, string> = {
      explore: 'You are an expert codebase explorer. Search and analyze code to answer questions.',
      librarian: 'You are a research librarian. Find documentation, examples, and best practices from external sources.',
      oracle: 'You are a senior engineering advisor. Provide deep analysis and architectural guidance.',
      'frontend-ui-ux-engineer': 'You are a UI/UX specialist. Design and implement beautiful, functional interfaces.',
      'document-writer': 'You are a technical writer. Create clear, comprehensive documentation.',
      general: 'You are a helpful AI assistant.',
    };

    const systemPrompt = agentPrompts[agent] || agentPrompts.general;

    const result = await streamAIResponse({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: prompt }],
      systemPrompt,
      temperature: 0.7,
      maxTokens: 8192,
    });

    Log.info(`[executeBackgroundAgent] Completed ${agent}`);
    return result.text;
  } catch (error) {
    Log.error(`[executeBackgroundAgent] Failed ${agent}:`, error);
    throw error;
  }
}

export class ExecutorAgent implements Agent {
  readonly name = "executor" as const;
  readonly displayName = "Executor";
  readonly model = "ollama/llama3:latest";

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
