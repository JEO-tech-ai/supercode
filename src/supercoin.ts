import { getAuthHub, AuthHub } from "./services/auth/hub";
import { getModelRouter, ModelRouter } from "./services/models/router";
import {
  initializeAgents,
  getAgentRegistry,
  getTodoManager,
  getBackgroundManager,
} from "./services/agents";
import type { IAgentRegistry, ITodoManager, IBackgroundManager, ISpawnInput } from "./services/agents";
import { initializeCore, getSessionManager, getHookRegistry, getToolRegistry } from "./core";
import type { ISessionManager, IHookRegistry, IToolRegistry } from "./core";
import type { SuperCoinConfig } from "./config/schema";
import logger from "./shared/logger";

export interface SuperCoinOptions {
  config: SuperCoinConfig;
  workdir?: string;
}

export class SuperCoin {
  private config: SuperCoinConfig;
  private workdir: string;
  private initialized = false;

  private _auth: AuthHub | null = null;
  private _models: ModelRouter | null = null;

  constructor(options: SuperCoinOptions) {
    this.config = options.config;
    this.workdir = options.workdir || process.cwd();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    initializeCore();
    initializeAgents();

    this.initialized = true;
    logger.debug("SuperCoin initialized");
  }

  get auth(): AuthHub {
    if (!this._auth) {
      this._auth = getAuthHub();
    }
    return this._auth;
  }

  get models(): ModelRouter {
    if (!this._models) {
      this._models = getModelRouter({
        defaultModel: this.config.default_model,
        fallbackModels: this.config.fallback_models,
      });
    }
    return this._models;
  }

  getAgents(): IAgentRegistry {
    return getAgentRegistry();
  }

  getTodos(): ITodoManager {
    return getTodoManager();
  }

  getBackground(): IBackgroundManager {
    return getBackgroundManager();
  }

  getSessions(): ISessionManager {
    return getSessionManager();
  }

  getHooks(): IHookRegistry {
    return getHookRegistry();
  }

  getTools(): IToolRegistry {
    return getToolRegistry();
  }

  get agents() {
    return this.getAgents();
  }

  get todos() {
    return this.getTodos();
  }

  get background() {
    return this.getBackground();
  }

  get sessions() {
    return this.getSessions();
  }

  get hooks() {
    return this.getHooks();
  }

  get tools() {
    return this.getTools();
  }

  async chat(message: string, options?: { model?: string }): Promise<string> {
    await this.initialize();

    const router = this.models;

    if (options?.model) {
      await router.setModel(options.model);
    }

    const response = await router.route({
      messages: [{ role: "user", content: message }],
    });

    return response.content;
  }

  async runAgent(
    agentName: "coin" | "explorer" | "analyst" | "executor" | "code_reviewer" | "doc_writer",
    prompt: string
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    await this.initialize();

    const agent = this.getAgents().get(agentName);
    if (!agent) {
      return { success: false, error: `Agent not found: ${agentName}` };
    }

    const result = await agent.execute(prompt, {
      sessionId: "default",
      workdir: this.workdir,
    });

    return {
      success: result.success,
      content: result.content,
      error: result.error,
    };
  }

  async spawnBackground(
    agentName: "explorer" | "analyst" | "executor" | "code_reviewer" | "doc_writer",
    prompt: string,
    description: string
  ): Promise<string> {
    await this.initialize();

    const sessions = this.getSessions();
    const session = sessions.getCurrent() || sessions.create(this.workdir, this.config.default_model);

    const taskId = await this.getBackground().spawn({
      sessionId: session.id,
      agent: agentName,
      prompt,
      description,
    });

    return taskId;
  }

  async getBackgroundResult(taskId: string, wait = true): Promise<unknown> {
    return this.getBackground().getOutput(taskId, wait);
  }

  createSession(): string {
    const session = this.getSessions().create(this.workdir, this.config.default_model);
    return session.id;
  }

  async executeTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    await this.initialize();

    const sessions = this.getSessions();
    const session = sessions.getCurrent() || sessions.create(this.workdir, this.config.default_model);

    const result = await this.getTools().execute(toolName, args, {
      sessionId: session.id,
      workdir: this.workdir,
    });

    return result;
  }
}

export function createSuperCoin(config: SuperCoinConfig, workdir?: string): SuperCoin {
  return new SuperCoin({ config, workdir });
}
