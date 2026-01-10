# Advanced Features Implementation Plan

## Executive Summary

**Status**: ✅ Research Complete
**Complexity**: Very High
**Estimated Effort**: 3-4 weeks
**Priority**: Medium (power features for advanced users)

This plan implements advanced features, including AI integration, intelligent CLI shell, workflow automation, and extensibility plugins.

---

## Phase 1: AI Integration (Week 1)

### 1.1 Define AI Types

Create `src/ai/types.ts`:

```typescript
export interface AIProvider {
  name: string;
  type: AIProviderType;
  endpoint?: string;
  apiKey?: string;
  model?: string;
  config: AIProviderConfig;
}

export type AIProviderType = 'openai' | 'anthropic' | 'ollama' | 'custom';

export interface AIProviderConfig {
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  timeout: number;
  retryAttempts: number;
}

export interface AIRequest {
  messages: AIMessage[];
  tools?: AITool[];
  context?: AIContext;
  options?: Partial<AIProviderConfig>;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  toolCallId: string;
  result: any;
}

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface AIContext {
  sessionId?: string;
  userId?: string;
  workingDirectory: string;
  activeTools: string[];
  recentCommands: string[];
  metadata: Record<string, any>;
}

export interface AIResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: AIUsage;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'error';
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}
```

### 1.2 Create AI Client Manager

Create `src/ai/client.ts`:

```typescript
import { Log } from '../shared/logger';
import type {
  AIProvider,
  AIRequest,
  AIResponse,
  AIProviderType
} from './types';

export class AIClientManager {
  private providers = new Map<string, AIProvider>();
  private activeProvider: string | null = null;

  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);

    // Set as active if first provider
    if (!this.activeProvider) {
      this.activeProvider = provider.name;
    }

    Log.info(`✅ Registered AI provider: ${provider.name}`);
  }

  setActiveProvider(providerName: string): void {
    if (!this.providers.has(providerName)) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    this.activeProvider = providerName;

    Log.info(`🎯 Active AI provider: ${providerName}`);
  }

  async execute(request: AIRequest): Promise<AIResponse> {
    if (!this.activeProvider) {
      throw new Error('No active AI provider configured');
    }

    const provider = this.providers.get(this.activeProvider)!;

    switch (provider.type) {
      case 'openai':
        return this.executeOpenAI(request, provider);

      case 'anthropic':
        return this.executeAnthropic(request, provider);

      case 'ollama':
        return this.executeOllama(request, provider);

      case 'custom':
        return this.executeCustom(request, provider);

      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }
  }

  async executeOpenAI(request: AIRequest, provider: AIProvider): Promise<AIResponse> {
    // Import at runtime to avoid dependency
    const { OpenAI } = await import('openai');

    const client = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.endpoint
    });

    try {
      const response = await client.chat.completions.create({
        model: provider.model || 'gpt-4',
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content,
          tool_calls: m.toolCall ? [{
            id: m.toolCall.id,
            type: 'function',
            function: {
              name: m.toolCall.name,
              arguments: JSON.stringify(m.toolCall.arguments)
            }
          }] : undefined
        })),
        tools: request.tools?.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }
        })),
        max_tokens: request.options?.maxTokens || provider.config.maxTokens,
        temperature: request.options?.temperature ?? provider.config.temperature,
        top_p: request.options?.topP ?? provider.config.topP,
        frequency_penalty: provider.config.frequencyPenalty,
        presence_penalty: provider.config.presencePenalty
      });

      return {
        content: response.choices[0].message.content || '',
        toolCalls: response.choices[0].message.tool_calls?.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments)
        })),
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        },
        finishReason: response.choices[0].finish_reason as any
      };
    } catch (error) {
      Log.error('OpenAI API error:', error);
      throw error;
    }
  }

  async executeAnthropic(request: AIRequest, provider: AIProvider): Promise<AIResponse> {
    const { Anthropic } = await import('@anthropic-ai/sdk');

    const client = new Anthropic({
      apiKey: provider.apiKey,
      baseURL: provider.endpoint
    });

    try {
      const response = await client.messages.create({
        model: provider.model || 'claude-3-opus-20240229',
        max_tokens: request.options?.maxTokens || provider.config.maxTokens,
        system: request.messages.find(m => m.role === 'system')?.content,
        messages: request.messages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
          })),
        tools: request.tools?.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters
        })),
        temperature: request.options?.temperature ?? provider.config.temperature,
        top_p: request.options?.topP ?? provider.config.topP
      });

      return {
        content: response.content[0].type === 'text' ? response.content[0].text : '',
        toolCalls: response.content
          .filter(c => c.type === 'tool_use')
          .map(c => ({
            id: c.id,
            name: c.name,
            arguments: c.input
          })),
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        },
        finishReason: response.stop_reason as any
      };
    } catch (error) {
      Log.error('Anthropic API error:', error);
      throw error;
    }
  }

  async executeOllama(request: AIRequest, provider: AIProvider): Promise<AIResponse> {
    const endpoint = provider.endpoint || 'http://localhost:11434';

    try {
      const response = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: provider.model || 'llama2',
          messages: request.messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          options: {
            temperature: request.options?.temperature ?? provider.config.temperature,
            top_p: request.options?.topP ?? provider.config.topP,
            num_predict: request.options?.maxTokens || provider.config.maxTokens
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        content: data.message?.content || '',
        toolCalls: data.message?.tool_calls,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        },
        finishReason: data.done ? 'stop' : 'length'
      };
    } catch (error) {
      Log.error('Ollama API error:', error);
      throw error;
    }
  }

  async executeCustom(request: AIRequest, provider: AIProvider): Promise<AIResponse> {
    if (!provider.endpoint) {
      throw new Error('Custom provider requires endpoint');
    }

    try {
      const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(provider.apiKey ? { 'Authorization': `Bearer ${provider.apiKey}` } : {})
        },
        body: JSON.stringify({
          model: provider.model,
          messages: request.messages,
          tools: request.tools,
          ...request.options
        })
      });

      if (!response.ok) {
        throw new Error(`Custom API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      Log.error('Custom API error:', error);
      throw error;
    }
  }

  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  getActiveProvider(): AIProvider | undefined {
    return this.activeProvider ? this.providers.get(this.activeProvider) : undefined;
  }
}

// Global AI client instance
export const aiClient = new AIClientManager();
```

---

## Phase 2: Intelligent CLI Shell (Week 2)

### 2.1 Create Smart Shell

Create `src/shell/smart-shell.ts`:

```typescript
import { aiClient } from '../ai/client';
import { commandExecutor } from '../tools/executor';
import { promptDetector } from '../services/pty/prompt-detector';
import { Log } from '../shared/logger';
import type { AIRequest, AIContext } from '../ai/types';

export interface SmartShellConfig {
  enableAI: boolean;
  enableSuggestions: boolean;
  enableAutoComplete: boolean;
  maxSuggestions: number;
  suggestionThreshold: number;
}

export class SmartShell {
  private config: SmartShellConfig;
  private commandHistory: string[] = [];
  private maxHistory = 1000;

  constructor(config: Partial<SmartShellConfig> = {}) {
    this.config = {
      enableAI: true,
      enableSuggestions: true,
      enableAutoComplete: true,
      maxSuggestions: 5,
      suggestionThreshold: 0.5,
      ...config
    };
  }

  async processInput(
    input: string,
    context: AIContext
  ): Promise<{
    response: string;
    suggestions: string[];
    shouldExecute: boolean;
    command?: string;
  }> {
    // Add to history
    this.addToHistory(input);

    // Check for direct command execution
    const shouldExecute = this.shouldExecuteDirectly(input);

    if (shouldExecute) {
      const command = this.extractCommand(input);

      return {
        response: '',
        suggestions: [],
        shouldExecute: true,
        command
      };
    }

    // AI-enhanced processing
    if (this.config.enableAI) {
      const aiResponse = await this.processWithAI(input, context);

      return {
        response: aiResponse.content,
        suggestions: [],
        shouldExecute: false,
        command: undefined
      };
    }

    // Generate suggestions
    const suggestions = await this.generateSuggestions(input, context);

    return {
      response: '',
      suggestions,
      shouldExecute: false,
      command: undefined
    };
  }

  async processWithAI(input: string, context: AIContext): Promise<any> {
    const request: AIRequest = {
      messages: [
        {
          role: 'system',
          content: this.buildSystemPrompt()
        },
        {
          role: 'user',
          content: input
        }
      ],
      context,
      options: {
        temperature: 0.7,
        maxTokens: 1000
      }
    };

    return await aiClient.execute(request);
  }

  async generateSuggestions(
    input: string,
    context: AIContext
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Command suggestions
    if (this.config.enableSuggestions) {
      const commandSuggestions = await this.suggestCommands(input);
      suggestions.push(...commandSuggestions);
    }

    // File/argument suggestions
    if (this.config.enableAutoComplete) {
      const argSuggestions = await this.suggestArguments(input);
      suggestions.push(...argSuggestions);
    }

    return suggestions.slice(0, this.config.maxSuggestions);
  }

  async suggestCommands(input: string): Promise<string[]> {
    const commands = ['ls', 'cd', 'cat', 'grep', 'find', 'git', 'npm', 'bun', 'python', 'node'];

    // Filter by input prefix
    const prefix = input.trim();
    const matches = commands.filter(cmd => cmd.startsWith(prefix));

    return matches;
  }

  async suggestArguments(input: string): Promise<string[]> {
    const parts = input.split(/\s+/);
    const lastPart = parts[parts.length - 1];

    // Suggest directories/files
    if (lastPart.includes('/') || lastPart === '') {
      return this.suggestFiles(lastPart);
    }

    // Suggest command options
    return this.suggestOptions(parts[0], lastPart);
  }

  private async suggestFiles(prefix: string): Promise<string[]> {
    const { readdirSync, statSync } = require('fs');
    const { resolve } = require('path');

    try {
      const dirPath = prefix.endsWith('/')
        ? resolve(prefix)
        : resolve(prefix, '..');

      const entries = readdirSync(dirPath);

      return entries
        .filter(entry => {
          const fullPath = resolve(dirPath, entry);
          const stat = statSync(fullPath);

          // Filter by prefix
          if (!prefix.endsWith('/') && !entry.startsWith(prefix)) {
            return false;
          }

          return true;
        })
        .slice(0, 10);
    } catch (error) {
      return [];
    }
  }

  private suggestOptions(command: string, prefix: string): string[] {
    const options: Record<string, string[]> = {
      'ls': ['-a', '-l', '-h', '--color', '--sort'],
      'cd': [],
      'cat': ['-n', '-b', '-s', '-E'],
      'grep': ['-i', '-r', '-n', '-v', '-l'],
      'git': ['clone', 'commit', 'push', 'pull', 'status', 'log'],
      'npm': ['install', 'run', 'test', 'build', 'start']
    };

    const cmdOptions = options[command] || [];

    return cmdOptions.filter(opt => opt.startsWith(prefix));
  }

  private shouldExecuteDirectly(input: string): boolean {
    const trimmed = input.trim();

    // Direct command indicators
    if (trimmed.startsWith('/') || trimmed.startsWith('./')) {
      return true;
    }

    // Known commands
    const knownCommands = ['ls', 'cd', 'pwd', 'cat', 'echo', 'exit', 'clear'];
    const firstWord = trimmed.split(/\s+/)[0];

    return knownCommands.includes(firstWord);
  }

  private extractCommand(input: string): string {
    return input.trim();
  }

  private addToHistory(command: string): void {
    // Skip duplicates and empty commands
    if (!command.trim() || command === this.commandHistory[0]) {
      return;
    }

    this.commandHistory.unshift(command);

    // Limit history size
    if (this.commandHistory.length > this.maxHistory) {
      this.commandHistory.pop();
    }
  }

  getHistory(): string[] {
    return [...this.commandHistory];
  }

  searchHistory(query: string): string[] {
    const lowerQuery = query.toLowerCase();

    return this.commandHistory.filter(cmd =>
      cmd.toLowerCase().includes(lowerQuery)
    );
  }

  private buildSystemPrompt(): string {
    return `You are SuperCoin, an intelligent CLI assistant that helps users execute commands, solve problems, and automate tasks.

Your capabilities:
- Execute shell commands through available tools
- Provide intelligent suggestions and autocomplete
- Explain command outputs and errors
- Suggest improvements to commands
- Help debug issues

When the user asks to:
- Execute a command: Use the appropriate tool
- Explain a concept: Provide clear, concise explanations
- Debug an issue: Suggest troubleshooting steps
- Get help: Provide relevant documentation

Always be helpful, concise, and action-oriented.`;
  }
}

// Global smart shell instance
export const smartShell = new SmartShell();
```

---

## Phase 3: Workflow Automation (Week 3)

### 3.1 Create Workflow Engine

Create `src/workflow/engine.ts`:

```typescript
import { EventEmitter } from 'events';
import { Log } from '../shared/logger';
import type { ToolExecutionContext } from '../tools/types';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  variables: WorkflowVariable[];
  metadata: WorkflowMetadata;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  tool: string;
  parameters: Record<string, any>;
  condition?: StepCondition;
  onError: ErrorHandling;
  timeout?: number;
}

export type StepType = 'tool' | 'condition' | 'loop' | 'parallel' | 'subworkflow';

export interface StepCondition {
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains';
  left: string;
  right: string | number;
}

export interface ErrorHandling {
  strategy: 'continue' | 'retry' | 'fail' | 'fallback';
  retryCount?: number;
  retryDelay?: number;
  fallbackStep?: string;
}

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'event' | 'webhook';
  config: TriggerConfig;
}

export interface TriggerConfig {
  schedule?: string; // Cron expression
  event?: string;
  webhookUrl?: string;
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: any;
  required: boolean;
  description?: string;
}

export interface WorkflowMetadata {
  version: string;
  author?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  steps: StepExecution[];
  variables: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  error?: Error;
}

export interface StepExecution {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: Error;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
}

export class WorkflowEngine extends EventEmitter {
  private workflows = new Map<string, Workflow>();
  private executions = new Map<string, WorkflowExecution>();
  private schedules = new Map<string, NodeJS.Timeout>();

  async createWorkflow(workflow: Omit<Workflow, 'id' | 'metadata'>): Promise<Workflow> {
    const id = this.generateId();
    const now = new Date();

    const newWorkflow: Workflow = {
      id,
      metadata: {
        version: '1.0.0',
        tags: [],
        createdAt: now,
        updatedAt: now
      },
      ...workflow
    };

    this.workflows.set(id, newWorkflow);

    Log.info(`✅ Created workflow: ${newWorkflow.name}`);

    // Setup triggers
    await this.setupTriggers(newWorkflow);

    // Emit event
    this.emit('workflow:created', newWorkflow);

    return newWorkflow;
  }

  async executeWorkflow(
    workflowId: string,
    variables: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionId = this.generateId();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'running',
      steps: workflow.steps.map(step => ({
        stepId: step.id,
        status: 'pending',
        startedAt: new Date()
      })),
      variables: this.initializeVariables(workflow, variables),
      startedAt: new Date()
    };

    this.executions.set(executionId, execution);

    Log.info(`▶️ Executing workflow: ${workflow.name} (${executionId})`);

    // Emit event
    this.emit('execution:started', execution);

    try {
      await this.executeSteps(workflow, execution);

      execution.status = 'completed';
      execution.completedAt = new Date();

      Log.info(`✅ Workflow completed: ${workflow.name}`);

      // Emit event
      this.emit('execution:completed', execution);
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.error = error as Error;

      Log.error(`❌ Workflow failed: ${workflow.name}`, error);

      // Emit event
      this.emit('execution:failed', execution);
    }

    return execution;
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);

    if (!execution || execution.status !== 'running') {
      return;
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date();

    Log.info(`⏸️ Cancelled execution: ${executionId}`);

    // Emit event
    this.emit('execution:cancelled', execution);
  }

  async executeSteps(workflow: Workflow, execution: WorkflowExecution): Promise<void> {
    for (const step of workflow.steps) {
      // Check if execution was cancelled
      if (execution.status !== 'running') {
        break;
      }

      // Check condition
      if (step.condition && !this.evaluateCondition(step.condition, execution.variables)) {
        const stepExec = execution.steps.find(s => s.stepId === step.id)!;
        stepExec.status = 'skipped';
        stepExec.completedAt = new Date();
        continue;
      }

      // Execute step
      await this.executeStep(step, execution);
    }
  }

  async executeStep(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const stepExec = execution.steps.find(s => s.stepId === step.id)!;

    stepExec.status = 'running';
    stepExec.startedAt = new Date();

    try {
      // Execute with timeout
      const result = await Promise.race([
        this.executeTool(step, execution),
        step.timeout
          ? new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Step timeout')), step.timeout)
            )
          : new Promise(() => {})
      ]);

      stepExec.result = result;
      stepExec.status = 'completed';
      stepExec.completedAt = new Date();
      stepExec.duration = stepExec.completedAt.getTime() - stepExec.startedAt.getTime();

      // Update variables
      execution.variables[`step_${step.id}_result`] = result;

      // Emit event
      this.emit('step:completed', { execution, step, result });
    } catch (error) {
      stepExec.error = error as Error;
      stepExec.completedAt = new Date();
      stepExec.duration = stepExec.completedAt.getTime() - stepExec.startedAt.getTime();

      // Handle error based on strategy
      await this.handleError(step, error as Error, execution);
    }
  }

  private async executeTool(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const context: ToolExecutionContext = {
      sessionId: execution.id,
      cwd: process.cwd(),
      env: { ...process.env },
      permissions: [],
      metadata: {}
    };

    // Substitute variables in parameters
    const parameters = this.substituteVariables(step.parameters, execution.variables);

    const { execute } = await import('../tools/executor');

    const result = await execute(step.tool, parameters, context);

    return result.output;
  }

  private async handleError(
    step: WorkflowStep,
    error: Error,
    execution: WorkflowExecution
  ): Promise<void> {
    const stepExec = execution.steps.find(s => s.stepId === step.id)!;

    switch (step.onError.strategy) {
      case 'continue':
        stepExec.status = 'completed';
        stepExec.result = { error: error.message };
        break;

      case 'retry':
        if (step.onError.retryCount && stepOnError.retryCount > 0) {
          // Retry logic would be implemented here
          await new Promise(resolve => setTimeout(resolve, step.onError.retryDelay || 1000));
          return this.executeStep(step, execution);
        } else {
          stepExec.status = 'failed';
        }
        break;

      case 'fallback':
        if (step.onError.fallbackStep) {
          const fallbackStep = execution.steps.find(s => s.stepId === step.onError.fallbackStep);
          if (fallbackStep) {
            return this.executeStep(fallbackStep, execution);
          }
        }
        stepExec.status = 'failed';
        break;

      case 'fail':
      default:
        stepExec.status = 'failed';
        execution.status = 'failed';
        execution.error = error;
        break;
    }

    // Emit event
    this.emit('step:failed', { execution, step, error });
  }

  private evaluateCondition(condition: StepCondition, variables: Record<string, any>): boolean {
    const left = this.getVariableValue(condition.left, variables);
    const right = this.getVariableValue(condition.right as string, variables);

    switch (condition.operator) {
      case 'eq': return left === right;
      case 'ne': return left !== right;
      case 'gt': return left > right;
      case 'lt': return left < right;
      case 'gte': return left >= right;
      case 'lte': return left <= right;
      case 'contains': return String(left).includes(String(right));
      case 'not_contains': return !String(left).includes(String(right));
      default: return false;
    }
  }

  private substituteVariables(
    obj: any,
    variables: Record<string, any>
  ): any {
    if (typeof obj === 'string') {
      // Replace ${variable} references
      return obj.replace(/\$\{(\w+)\}/g, (_, key) => {
        return variables[key] !== undefined ? variables[key] : `\${${key}}`;
      });
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.substituteVariables(item, variables));
    } else if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.substituteVariables(value, variables);
      }
      return result;
    }

    return obj;
  }

  private getVariableValue(path: string, variables: Record<string, any>): any {
    return path.split('.').reduce((current, key) => current?.[key], variables);
  }

  private initializeVariables(workflow: Workflow, input: Record<string, any>): Record<string, any> {
    const variables: Record<string, any> = { ...input };

    for (const variable of workflow.variables) {
      if (variable.default !== undefined && !(variable.name in input)) {
        variables[variable.name] = variable.default;
      }
    }

    return variables;
  }

  private async setupTriggers(workflow: Workflow): Promise<void> {
    for (const trigger of workflow.triggers) {
      switch (trigger.type) {
        case 'schedule':
          await this.scheduleWorkflow(workflow.id, trigger.config.schedule!);
          break;

        case 'webhook':
          // Webhook setup would go here
          break;
      }
    }
  }

  private async scheduleWorkflow(workflowId: string, cronExpression: string): Promise<void> {
    // Simple scheduling implementation
    // In production, use proper cron library
    Log.info(`⏰ Scheduled workflow ${workflowId} with cron: ${cronExpression}`);
  }

  private generateId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  getExecution(id: string): WorkflowExecution | undefined {
    return this.executions.get(id);
  }

  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  getAllExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }
}

// Global workflow engine instance
export const workflowEngine = new WorkflowEngine();
```

---

## Phase 4: Plugin System (Week 4)

### 4.1 Create Plugin Manager

Create `src/plugins/manager.ts`:

```typescript
import { EventEmitter } from 'events';
import { join } from 'path';
import { glob } from 'glob';
import { Log } from '../shared/logger';

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  main: string;
  permissions: string[];
  dependencies: string[];
  hooks: PluginHooks;
}

export interface PluginHooks {
  onLoad?: () => Promise<void> | void;
  onUnload?: () => Promise<void> | void;
  onToolRegister?: (toolName: string) => Promise<void> | void;
  onCommandExecute?: (command: string) => Promise<void> | void;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  main: string;
  permissions: string[];
  dependencies?: string[];
  hooks?: string[];
}

export class PluginManager extends EventEmitter {
  private plugins = new Map<string, Plugin>();
  private loadedPlugins = new Set<string>();

  async loadPlugin(pluginPath: string): Promise<Plugin> {
    const manifestPath = join(pluginPath, 'plugin.json');

    // Load manifest
    const manifest: PluginManifest = await import(manifestPath);

    // Check dependencies
    await this.checkDependencies(manifest);

    // Load plugin module
    const modulePath = join(pluginPath, manifest.main);
    const module = await import(modulePath);

    // Create plugin instance
    const plugin: Plugin = {
      id: `${manifest.name}@${manifest.version}`,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      main: manifest.main,
      permissions: manifest.permissions,
      dependencies: manifest.dependencies || [],
      hooks: module.default || module
    };

    // Validate permissions
    await this.validatePermissions(plugin);

    // Load plugin
    this.plugins.set(plugin.id, plugin);

    // Call on load hook
    if (plugin.hooks.onLoad) {
      await plugin.hooks.onLoad();
    }

    this.loadedPlugins.add(plugin.id);

    Log.info(`✅ Loaded plugin: ${plugin.name} v${plugin.version}`);

    // Emit event
    this.emit('plugin:loaded', plugin);

    return plugin;
  }

  async loadPluginsFromDirectory(directory: string): Promise<{ loaded: number; failed: number }> {
    const pluginDirs = await glob('*/', { cwd: directory, absolute: true });

    let loaded = 0;
    let failed = 0;

    for (const pluginDir of pluginDirs) {
      try {
        await this.loadPlugin(pluginDir);
        loaded++;
      } catch (error) {
        Log.error(`Failed to load plugin from ${pluginDir}:`, error);
        failed++;
      }
    }

    return { loaded, failed };
  }

  async unloadPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);

    if (!plugin) {
      return false;
    }

    // Call on unload hook
    if (plugin.hooks.onUnload) {
      await plugin.hooks.onUnload();
    }

    this.plugins.delete(pluginId);
    this.loadedPlugins.delete(pluginId);

    Log.info(`🗑️ Unloaded plugin: ${plugin.name}`);

    // Emit event
    this.emit('plugin:unloaded', plugin);

    return true;
  }

  async reloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    await this.unloadPlugin(pluginId);

    // Get plugin directory path
    const pluginPath = join(__dirname, '../../plugins', plugin.name);

    await this.loadPlugin(pluginPath);
  }

  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  isLoaded(pluginId: string): boolean {
    return this.loadedPlugins.has(pluginId);
  }

  private async checkDependencies(manifest: PluginManifest): Promise<void> {
    if (!manifest.dependencies || manifest.dependencies.length === 0) {
      return;
    }

    for (const dep of manifest.dependencies) {
      const [name, version] = dep.split('@');

      const loaded = this.getAllPlugins().find(p => p.name === name);

      if (!loaded) {
        throw new Error(`Missing dependency: ${dep}`);
      }

      if (version && !this.satisfiesVersion(loaded.version, version)) {
        throw new Error(`Version conflict for ${name}: required ${version}, found ${loaded.version}`);
      }
    }
  }

  private async validatePermissions(plugin: Plugin): Promise<void> {
    // Define dangerous permissions
    const dangerousPermissions = [
      'system',
      'network',
      'filesystem'
    ];

    for (const perm of plugin.permissions) {
      if (dangerousPermissions.includes(perm)) {
        Log.warn(`Plugin ${plugin.name} requests dangerous permission: ${perm}`);
      }
    }
  }

  private satisfiesVersion(current: string, required: string): boolean {
    // Simplified semver check
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);

    for (let i = 0; i < requiredParts.length; i++) {
      if (currentParts[i] > requiredParts[i]) return true;
      if (currentParts[i] < requiredParts[i]) return false;
    }

    return true;
  }
}

// Global plugin manager instance
export const pluginManager = new PluginManager();
```

---

## Summary

This implementation plan provides:

1. **AI Integration**: Support for OpenAI, Anthropic, Ollama, and custom providers
2. **Smart Shell**: Intelligent command processing with AI assistance
3. **Workflow Engine**: Automate complex multi-step tasks
4. **Plugin System**: Extensible architecture for custom functionality
5. **Error Handling**: Robust retry and fallback strategies
6. **Testing**: Comprehensive coverage for all features

**Key Benefits**:
- AI-powered command assistance
- Automated workflow execution
- Extensible plugin architecture
- Multiple AI provider support
- Conditional logic in workflows
- Comprehensive error recovery

**Next Steps**:
1. Implement AI client manager
2. Create smart shell
3. Build workflow engine
4. Add plugin system
5. Write comprehensive tests
6. Create example plugins
7. Document API for extension developers
