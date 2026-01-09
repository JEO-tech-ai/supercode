import { getAuthHub } from "../auth/hub";
import type { AuthProviderName } from "../auth/types";
import { AnthropicProvider, OpenAIProvider, GoogleProvider } from "./providers";
import type {
  Provider,
  ProviderName,
  ModelConfig,
  ModelInfo,
  AIRequest,
  AIResponse,
  RouterConfig,
} from "./types";
import logger from "../../shared/logger";

export class ModelRouter {
  private providers: Map<ProviderName, Provider>;
  private currentModel: ModelConfig;
  private fallbackChain: string[];
  private modelAliases: Map<string, string>;

  constructor(config: RouterConfig) {
    this.providers = new Map<ProviderName, Provider>([
      ["anthropic", new AnthropicProvider()],
      ["openai", new OpenAIProvider()],
      ["google", new GoogleProvider()],
    ]);
    this.fallbackChain = config.fallbackModels || [];
    this.currentModel = this.parseModelId(config.defaultModel);
    this.modelAliases = this.buildAliasMap();
  }

  async route(
    request: AIRequest,
    options?: { fallback?: boolean; retries?: number; timeout?: number }
  ): Promise<AIResponse> {
    const authHub = getAuthHub();
    const modelConfig = this.currentModel;
    const provider = this.providers.get(modelConfig.provider);

    if (!provider) {
      throw new Error(`Unknown provider: ${modelConfig.provider}`);
    }

    const authName = this.mapProviderToAuth(modelConfig.provider);
    const isAuthenticated = await authHub.isAuthenticated(authName);
    if (!isAuthenticated) {
      throw new Error(
        `Not authenticated with ${modelConfig.provider}. ` +
        `Run: supercoin auth login --${authName}`
      );
    }

    const token = await authHub.getToken(authName);
    if (!token) {
      throw new Error(`No token available for ${modelConfig.provider}`);
    }

    try {
      return await this.executeWithRetry(
        () => provider.complete(request, modelConfig, token),
        options?.retries || 3,
        options?.timeout || 60000
      );
    } catch (error) {
      if (options?.fallback !== false && this.shouldFallback(error as Error)) {
        return await this.fallbackRoute(request, options);
      }
      throw error;
    }
  }

  async setModel(modelId: string): Promise<void> {
    const authHub = getAuthHub();
    const resolvedId = this.resolveAlias(modelId);
    const modelConfig = this.parseModelId(resolvedId);

    const provider = this.providers.get(modelConfig.provider);
    if (!provider) {
      throw new Error(`Unknown provider: ${modelConfig.provider}`);
    }

    const isValidModel = provider.isValidModel(modelConfig.model);
    if (!isValidModel) {
      const models = provider.listModels().map((m) => m.id);
      throw new Error(
        `Unknown model: ${modelConfig.model}. ` +
        `Available models for ${modelConfig.provider}: ${models.join(", ")}`
      );
    }

    const authName = this.mapProviderToAuth(modelConfig.provider);
    const isAuthenticated = await authHub.isAuthenticated(authName);
    if (!isAuthenticated) {
      throw new Error(
        `Not authenticated with ${modelConfig.provider}. ` +
        `Run: supercoin auth login --${authName}`
      );
    }

    this.currentModel = modelConfig;
  }

  getCurrentModel(): ModelConfig {
    return { ...this.currentModel };
  }

  listModels(): ModelInfo[] {
    const models: ModelInfo[] = [];

    for (const [providerName, provider] of this.providers) {
      for (const model of provider.listModels()) {
        models.push({
          ...model,
          id: `${providerName}/${model.id}`,
          provider: providerName,
        });
      }
    }

    return models;
  }

  getModelInfo(modelId: string): ModelInfo | null {
    try {
      const resolvedId = this.resolveAlias(modelId);
      const parsed = this.tryParseModelId(resolvedId);
      if (!parsed) return null;

      const { provider: providerName, model } = parsed;
      const provider = this.providers.get(providerName);

      if (!provider) return null;

      const modelInfo = provider.getModelInfo(model);
      if (!modelInfo) return null;

      return {
        ...modelInfo,
        id: `${providerName}/${model}`,
        provider: providerName,
      };
    } catch {
      return null;
    }
  }

  private tryParseModelId(modelId: string): ModelConfig | null {
    const parts = modelId.split("/");
    if (parts.length !== 2) {
      return null;
    }
    return { provider: parts[0] as ProviderName, model: parts[1] };
  }

  private async fallbackRoute(
    request: AIRequest,
    options?: { fallback?: boolean; retries?: number; timeout?: number }
  ): Promise<AIResponse> {
    const authHub = getAuthHub();

    for (const modelId of this.fallbackChain) {
      const modelConfig = this.parseModelId(modelId);
      const provider = this.providers.get(modelConfig.provider);

      if (!provider) continue;

      const authName = this.mapProviderToAuth(modelConfig.provider);
      const isAuthenticated = await authHub.isAuthenticated(authName);
      if (!isAuthenticated) continue;

      try {
        const token = await authHub.getToken(authName);
        if (!token) continue;

        logger.info(`Falling back to ${modelId}...`);
        return await provider.complete(request, modelConfig, token);
      } catch {
        continue;
      }
    }

    throw new Error("All fallback models failed");
  }

  private parseModelId(modelId: string): ModelConfig {
    const parts = modelId.split("/");
    if (parts.length !== 2) {
      throw new Error(`Invalid model ID format: ${modelId}. Expected: provider/model`);
    }
    return { provider: parts[0] as ProviderName, model: parts[1] };
  }

  private resolveAlias(modelId: string): string {
    if (this.modelAliases.has(modelId)) {
      return this.modelAliases.get(modelId)!;
    }
    return modelId;
  }

  private buildAliasMap(): Map<string, string> {
    return new Map([
      ["claude-opus", "anthropic/claude-opus-4-5"],
      ["opus", "anthropic/claude-opus-4-5"],
      ["claude-sonnet", "anthropic/claude-sonnet-4-5"],
      ["sonnet", "anthropic/claude-sonnet-4-5"],
      ["claude-haiku", "anthropic/claude-haiku-4-5"],
      ["haiku", "anthropic/claude-haiku-4-5"],
      ["claude", "anthropic/claude-sonnet-4-5"],

      ["gpt-5.2", "openai/gpt-5.2"],
      ["gpt-5", "openai/gpt-5.2"],
      ["gpt-4o", "openai/gpt-4o"],
      ["4o", "openai/gpt-4o"],
      ["gpt", "openai/gpt-5.2"],
      ["o1", "openai/o1"],
      ["o1-mini", "openai/o1-mini"],
      ["o3", "openai/o3"],

      ["gemini-flash", "google/gemini-3-flash"],
      ["flash", "google/gemini-3-flash"],
      ["gemini-pro", "google/gemini-3-pro"],
      ["gemini", "google/gemini-3-flash"],
    ]);
  }

  private mapProviderToAuth(provider: ProviderName): AuthProviderName {
    const map: Record<ProviderName, AuthProviderName> = {
      anthropic: "claude",
      openai: "codex",
      google: "gemini",
    };
    return map[provider];
  }

  private shouldFallback(error: Error): boolean {
    const fallbackErrors = [
      "rate_limit_exceeded",
      "model_overloaded",
      "server_error",
      "timeout",
    ];
    return fallbackErrors.some((e) => error.message?.includes(e));
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retries: number,
    timeout: number
  ): Promise<T> {
    let lastError: Error = new Error("Unknown error");

    for (let i = 0; i < retries; i++) {
      try {
        return await Promise.race([
          fn(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), timeout)
          ),
        ]);
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          await this.delay(Math.pow(2, i) * 1000);
        }
      }
    }

    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

let routerInstance: ModelRouter | null = null;

export function getModelRouter(config?: RouterConfig): ModelRouter {
  if (!routerInstance) {
    const defaultConfig: RouterConfig = config || {
      defaultModel: "anthropic/claude-sonnet-4-5",
      fallbackModels: ["openai/gpt-5.2", "google/gemini-3-flash"],
    };
    routerInstance = new ModelRouter(defaultConfig);
  }
  return routerInstance;
}
