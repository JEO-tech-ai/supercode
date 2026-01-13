import {
  RequestType,
  type Agent,
  type AgentContext,
  type AgentResult,
  type Task,
  type ExecutionPlan,
  type ExecutionResult,
} from "./types";
import { getAgentRegistry } from "./registry";
import { streamAIResponse } from "../models/ai-sdk";
import { resolveProviderFromConfig } from "../../config/project";
import type { AISDKProviderName } from "../models/ai-sdk/types";
import { getTodoManager } from "./todo-manager";
import { getBackgroundManager } from "./background";
import { getSessionManager } from "../../core/session";
import { getHookRegistry } from "../../core/hooks";
import logger from "../../shared/logger";
import { buildOrchestratorPrompt, collectAgentMetadata } from "./sisyphus/prompt-builder";

export function classifyRequest(request: string): RequestType {
  if (/ultrawork|ulw|울트라워크/i.test(request)) {
    return RequestType.COMPLEX;
  }
  if (/\s+and\s+(then\s+)?/i.test(request) || /\s+then\s+/i.test(request)) {
    return RequestType.COMPLEX;
  }

  const exploratoryPatterns = [
    /how\s+(does|do|is|are)\s+the\s+\w+\s*(module|component|service|class|function|method|handler|controller|router|manager|provider)?\s*(work|implemented|function)/i,
    /where\s+(is|are)\s+(the\s+)?\w+\s*(defined|located|used|found)/i,
    /find\s+(all|every|the)\s+/i,
    /what\s+(files?|modules?|functions?)\s+(handle|contain|have)/i,
  ];

  for (const pattern of exploratoryPatterns) {
    if (pattern.test(request)) return RequestType.EXPLORATORY;
  }

  const openEndedPatterns = [
    /^(improve|optimize|refactor|enhance)/i,
    /^(review|analyze|assess|evaluate)/i,
    /make\s+(it|this)\s+(better|faster|cleaner)/i,
  ];

  for (const pattern of openEndedPatterns) {
    if (pattern.test(request)) return RequestType.OPEN_ENDED;
  }

  const explicitPatterns = [
    /^(run|execute|start|stop|build|test|deploy)/i,
    /^(create|add|remove|delete|update)\s+/i,
    /^(install|uninstall)/i,
    /^npm\s+/i,
    /^bun\s+/i,
  ];

  for (const pattern of explicitPatterns) {
    if (pattern.test(request)) return RequestType.EXPLICIT;
  }

  const trivialPatterns = [
    /^(what|why|when)\s+(is|are|do|does)/i,
    /^(explain|describe|tell me about)/i,
    /^(fix|correct)\s+(this|the)\s+(typo|error)/i,
  ];

  for (const pattern of trivialPatterns) {
    if (pattern.test(request)) return RequestType.TRIVIAL;
  }

  return RequestType.TRIVIAL;
}

export class Cent implements Agent {
  readonly name = "cent" as const;
  readonly displayName = "Cent";
  readonly model = "anthropic/claude-sonnet-4";

  readonly capabilities = [
    "planning",
    "delegation",
    "verification",
    "coordination",
    "orchestration",
  ];

  private buildSystemPrompt(): string {
    const registry = getAgentRegistry();
    const allAgents = registry.list();
    const metadata = collectAgentMetadata(allAgents);
    return buildOrchestratorPrompt(metadata);
  }

  async execute(prompt: string, context?: AgentContext): Promise<AgentResult> {
    const sessionId = context?.sessionId || "default";
    const workdir = context?.workdir || process.cwd();
    const todoManager = getTodoManager();
    const sessionManager = getSessionManager();
    const hookRegistry = getHookRegistry();
    const classification = classifyRequest(prompt);

    const isUltraWork = /ultrawork|ulw|울트라워크/i.test(prompt);
    const session = sessionManager.get(sessionId);
    if (session) {
      session.mode = isUltraWork ? "ultrawork" : "normal";
      session.loop = {
        iteration: 0,
        maxIterations: isUltraWork ? 50 : 10,
        stagnantCount: 0,
      };
    }

    logger.debug(`[Cent] Request classified as: ${classification} (ULW: ${isUltraWork})`);

    try {
      const mode = session?.mode || "normal";
      const systemPrompt = this.buildSystemPrompt();

      if (mode === "normal" && (classification === RequestType.TRIVIAL || classification === RequestType.EXPLICIT)) {
        const config = await resolveProviderFromConfig(workdir, mode);
        const result = await streamAIResponse({
          provider: config.provider as AISDKProviderName,
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          messages: [{ role: "user", content: prompt }],
          systemPrompt,
        });

        return {
          success: true,
          content: result.text,
          usage: result.usage,
          model: `${config.provider}/${config.model}`,
        };
      }

      const plan = await this.createPlan(prompt, classification);

      for (const task of plan.tasks) {
        await todoManager.create({
          sessionId,
          content: task.description,
          priority: task.critical ? "high" : "medium",
        });
      }

      let currentPrompt = prompt;
      let finalContent = "";
      let iterations = 0;
      const maxIterations = session?.loop?.maxIterations || 10;

      while (iterations < maxIterations) {
        iterations++;
        if (session?.loop) session.loop.iteration = iterations;

        const results = await this.executePlan(plan, context);
        finalContent += this.formatResults(plan, results) + "\n";

        const continuation = await hookRegistry.trigger("session.idle", {
          sessionId,
          workdir,
          event: "session.idle",
          data: { iterations, classification, isUltraWork },
        });

        const result = continuation as any;
        if (!result?.continue) {
          break;
        }

        currentPrompt = result.prompt || currentPrompt;
        logger.info(`[Cent] Looping: iteration ${iterations}/${maxIterations}`);
      }

      return {
        success: true,
        content: finalContent || "Tasks completed",
        model: "cent/dynamic",
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private async createPlan(prompt: string, classification: RequestType): Promise<ExecutionPlan> {
    const tasks: Task[] = [];

    if (classification === RequestType.EXPLORATORY) {
      tasks.push({
        id: crypto.randomUUID(),
        description: `Explore codebase for: ${prompt}`,
        type: "exploration",
        expectedOutcome: "Search results with file locations",
        agent: "explorer",
      });
    } else if (classification === RequestType.OPEN_ENDED) {
      tasks.push({
        id: crypto.randomUUID(),
        description: `Analyze and plan: ${prompt}`,
        type: "analysis",
        expectedOutcome: "Analysis with recommendations",
        agent: "analyst",
        runInBackground: true,
      });
    } else if (classification === RequestType.COMPLEX) {
      tasks.push(
        {
          id: crypto.randomUUID(),
          description: `Analyze requirements: ${prompt}`,
          type: "analysis",
          expectedOutcome: "Detailed analysis",
          agent: "analyst",
        },
        {
          id: crypto.randomUUID(),
          description: `Execute implementation: ${prompt}`,
          type: "execution",
          expectedOutcome: "Implementation complete",
          agent: "executor",
          critical: true,
        }
      );
    }

    return { tasks, parallel: false };
  }

  private async executePlan(plan: ExecutionPlan, context?: AgentContext): Promise<ExecutionResult[]> {
    const registry = getAgentRegistry();
    const sessionId = context?.sessionId || "default";
    const todoManager = getTodoManager();
    const backgroundManager = getBackgroundManager();
    const results: ExecutionResult[] = [];

    for (const task of plan.tasks) {
      const todos = todoManager.list(sessionId);
      const todo = todos.find((t) => t.content === task.description);
      if (todo) {
        await todoManager.updateStatus(todo.id, "in_progress");
      }

      const agent = task.agent ? registry.get(task.agent) : undefined;

      if (!agent) {
        results.push({ success: false, error: `Agent not found: ${task.agent}` });
        if (todo) {
          await todoManager.updateStatus(todo.id, "failed");
        }
        continue;
      }

      if (task.runInBackground) {
        const taskId = await backgroundManager.spawn({
          sessionId: context?.sessionId || "default",
          agent: task.agent!,
          prompt: task.description,
          description: task.description,
        });
        results.push({ success: true, taskId, pending: true });
      } else {
        const result = await agent.execute(task.description, context);
        results.push({ success: result.success, error: result.error });

        if (todo) {
          await todoManager.updateStatus(todo.id, result.success ? "completed" : "failed");
        }
      }
    }

    return results;
  }

  private formatResults(plan: ExecutionPlan, results: ExecutionResult[]): string {
    const lines: string[] = ["## Execution Summary\n"];

    for (let i = 0; i < plan.tasks.length; i++) {
      const task = plan.tasks[i];
      const result = results[i];

      const status = result.success ? "✓" : "✗";
      const pending = result.pending ? " (background)" : "";

      lines.push(`${status} ${task.description}${pending}`);

      if (result.error) {
        lines.push(`  Error: ${result.error}`);
      }
    }

    return lines.join("\n");
  }
}
