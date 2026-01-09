import {
  RequestType,
  type Agent,
  type AgentContext,
  type AgentResult,
  type AgentName,
  type Task,
  type ExecutionPlan,
  type ExecutionResult,
} from "./types";
import { getAgentRegistry } from "./registry";
import { getModelRouter } from "../models/router";
import { getTodoManager } from "./todo-manager";
import { getBackgroundManager } from "./background";
import logger from "../../shared/logger";

export function classifyRequest(request: string): RequestType {
  // Complex patterns: multi-step tasks with "and" or "then"
  // Check FIRST because they may contain other pattern keywords
  if (/\s+and\s+(then\s+)?/i.test(request) || /\s+then\s+/i.test(request)) {
    return RequestType.COMPLEX;
  }

  // Exploratory patterns: questions about specific codebase elements
  // Check BEFORE trivial, but be specific about codebase-related terms
  const exploratoryPatterns = [
    // "How does the X module/component/service work?" - codebase specific
    /how\s+(does|do|is|are)\s+the\s+\w+\s*(module|component|service|class|function|method|handler|controller|router|manager|provider)?\s*(work|implemented|function)/i,
    // "Where is the X defined/located?"
    /where\s+(is|are)\s+(the\s+)?\w+\s*(defined|located|used|found)/i,
    // "Find all X"
    /find\s+(all|every|the)\s+/i,
    // "What files/modules handle X?"
    /what\s+(files?|modules?|functions?)\s+(handle|contain|have)/i,
  ];

  for (const pattern of exploratoryPatterns) {
    if (pattern.test(request)) return RequestType.EXPLORATORY;
  }

  // Open-ended patterns: improvement, refactoring, review tasks
  const openEndedPatterns = [
    /^(improve|optimize|refactor|enhance)/i,
    /^(review|analyze|assess|evaluate)/i,
    /make\s+(it|this)\s+(better|faster|cleaner)/i,
  ];

  for (const pattern of openEndedPatterns) {
    if (pattern.test(request)) return RequestType.OPEN_ENDED;
  }

  // Explicit patterns: direct commands to run, build, create, etc.
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

  // Trivial patterns: simple questions, explanations
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

export class Orchestrator implements Agent {
  readonly name = "orchestrator" as const;
  readonly displayName = "Orchestrator";
  readonly model = "anthropic/claude-sonnet-4";

  readonly capabilities = [
    "planning",
    "delegation",
    "verification",
    "coordination",
  ];

  private readonly systemPrompt = `You are an AI orchestrator that coordinates multiple specialized agents to complete complex tasks.

## Your Responsibilities
1. Analyze user requests and classify their type
2. Create execution plans with clear task breakdown
3. Delegate tasks to appropriate specialized agents
4. Monitor execution progress
5. Verify results meet requirements
6. Report final outcomes

## Agent Catalog
- analyst: Large codebase analysis, architecture review (Gemini - CHEAP)
- executor: Command execution, build, deploy (GPT-4o - MEDIUM)
- code_reviewer: Deep code review, security audit (Claude Opus - EXPENSIVE)
- doc_writer: Documentation writing (Gemini Pro - CHEAP)
- explorer: Codebase navigation, search (Haiku - FREE)

## Delegation Rules
- Use the cheapest agent that can handle the task
- Use explorer for simple searches
- Use analyst for large context analysis
- Use code_reviewer only for critical reviews
- Run independent tasks in parallel

## Output Format
Provide clear status updates and final summaries.`;

  async execute(prompt: string, context?: AgentContext): Promise<AgentResult> {
    const router = getModelRouter();
    const todoManager = getTodoManager();
    const classification = classifyRequest(prompt);

    logger.debug(`Request classified as: ${classification}`);

    try {
      if (classification === RequestType.TRIVIAL || classification === RequestType.EXPLICIT) {
        const response = await router.route({
          messages: [{ role: "user", content: prompt }],
          systemPrompt: this.systemPrompt,
          temperature: 0.7,
          maxTokens: 4096,
        });

        return {
          success: true,
          content: response.content,
          usage: response.usage,
          model: this.model,
        };
      }

      const plan = await this.createPlan(prompt, classification);

      for (const task of plan.tasks) {
        await todoManager.create({
          content: task.description,
          priority: task.critical ? "high" : "medium",
        });
      }

      const results = await this.executePlan(plan, context);

      const allSuccessful = results.every((r) => r.success);

      return {
        success: allSuccessful,
        content: this.formatResults(plan, results),
        model: this.model,
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
    const todoManager = getTodoManager();
    const backgroundManager = getBackgroundManager();
    const results: ExecutionResult[] = [];

    for (const task of plan.tasks) {
      const todos = todoManager.list();
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
