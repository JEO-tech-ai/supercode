import { getAuthHub } from "../auth/hub";
import type { AuthProviderName } from "../auth/types";
import { AnthropicProvider, OpenAIProvider, GoogleProvider, LocalProvider } from "./providers";
import { getProviderConfig } from "./ai-sdk/registry";
import { streamAIResponse } from "./ai-sdk/stream";
import type {
  AISDKProviderName,
  ProviderName,
  ModelConfig,
  ModelDefinition,
  ModelInfo,
  AIRequest,
  AIResponse,
  RouterConfig,
} from "./types";
import logger from "../../shared/logger";

interface ModelCatalog {
  isValidModel(model: string): boolean;
  listModels(): ModelDefinition[];
  getModelInfo(model: string): ModelDefinition | null;
}

export class ModelRouter {
  private catalogs: Map<ProviderName, ModelCatalog>;
  private currentModel: ModelConfig;
  private fallbackChain: string[];
  private modelAliases: Map<string, string>;

  constructor(config: RouterConfig) {
    this.catalogs = this.buildCatalogs();
    this.fallbackChain = config.fallbackModels || [];
    this.currentModel = this.parseModelId(config.defaultModel);
    this.modelAliases = this.buildAliasMap();
  }

  async route(
    request: AIRequest,
    options?: { fallback?: boolean; retries?: number; timeout?: number }
  ): Promise<AIResponse> {
    const modelConfig = this.currentModel;

    try {
      return await this.executeWithRetry(
        () => this.requestCompletion(request, modelConfig),
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

    const catalog = this.catalogs.get(modelConfig.provider);
    if (!catalog) {
      throw new Error(`Unknown provider: ${modelConfig.provider}`);
    }

    const isValidModel = catalog.isValidModel(modelConfig.model);
    if (!isValidModel) {
      const models = catalog.listModels().map((m) => m.id);
      throw new Error(
        `Unknown model: ${modelConfig.model}. ` +
        `Available models for ${modelConfig.provider}: ${models.join(", ")}`
      );
    }

    const authName = this.mapProviderToAuth(modelConfig.provider);
    if (authName) {
      const isAuthenticated = await authHub.isAuthenticated(authName);
      if (!isAuthenticated) {
        throw new Error(
          `Not authenticated with ${modelConfig.provider}. ` +
          `Run: supercoin auth login --${authName}`
        );
      }
    }

    this.currentModel = modelConfig;
  }

  getCurrentModel(): ModelConfig {
    return { ...this.currentModel };
  }

  listModels(): ModelInfo[] {
    const models: ModelInfo[] = [];

    for (const [providerName, catalog] of this.catalogs) {
      for (const model of catalog.listModels()) {
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
      const catalog = this.catalogs.get(providerName);

      if (!catalog) return null;

      const modelInfo = catalog.getModelInfo(model);
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

  private async requestCompletion(request: AIRequest, modelConfig: ModelConfig): Promise<AIResponse> {
    const provider = this.resolveProvider(modelConfig.provider);
    const providerConfig = getProviderConfig(provider);
    const result = await streamAIResponse({
      provider,
      model: modelConfig.model || providerConfig.defaultModel,
      messages: request.messages,
      systemPrompt: request.systemPrompt,
      baseURL: providerConfig.defaultBaseURL,
      temperature: request.temperature ?? modelConfig.temperature ?? 0.7,
      maxTokens: request.maxTokens ?? modelConfig.maxTokens ?? 4096,
    });

    const usage = result.usage ?? {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    return {
      content: result.text,
      toolCalls: undefined,
      usage,
      model: modelConfig.model,
      finishReason: this.mapFinishReason(result.finishReason),
    };
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
      const catalog = this.catalogs.get(modelConfig.provider);

      if (!catalog) continue;

      try {
        const authName = this.mapProviderToAuth(modelConfig.provider);
        if (authName) {
          const isAuthenticated = await authHub.isAuthenticated(authName);
          if (!isAuthenticated) continue;
        }

        logger.info(`Falling back to ${modelId}...`);
        return await this.requestCompletion(request, modelConfig);
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

  private buildCatalogs(): Map<ProviderName, ModelCatalog> {
    const catalogs = new Map<ProviderName, ModelCatalog>();

    catalogs.set("anthropic", new AnthropicProvider());
    catalogs.set("openai", new OpenAIProvider());
    catalogs.set("google", new GoogleProvider());
    catalogs.set("local", new LocalProvider());

    const ollamaConfig = getProviderConfig("ollama");
    catalogs.set("ollama", new LocalProvider({
      baseUrl: ollamaConfig.defaultBaseURL,
      apiType: "ollama",
    }));

    const lmstudioConfig = getProviderConfig("lmstudio");
    catalogs.set("lmstudio", new LocalProvider({
      baseUrl: lmstudioConfig.defaultBaseURL,
      apiType: "openai-compatible",
    }));

    const llamacppConfig = getProviderConfig("llamacpp");
    catalogs.set("llamacpp", new LocalProvider({
      baseUrl: llamacppConfig.defaultBaseURL,
      apiType: "openai-compatible",
    }));

    const supercentConfig = getProviderConfig("supercent");
    catalogs.set("supercent", this.createFallbackCatalog(supercentConfig.defaultModel));

    const bedrockConfig = getProviderConfig("amazon-bedrock");
    catalogs.set("amazon-bedrock", this.createFallbackCatalog(bedrockConfig.defaultModel));

    const azureConfig = getProviderConfig("azure");
    catalogs.set("azure", this.createFallbackCatalog(azureConfig.defaultModel));

    const vertexConfig = getProviderConfig("google-vertex");
    catalogs.set("google-vertex", this.createFallbackCatalog(vertexConfig.defaultModel));

    const deepinfraConfig = getProviderConfig("deepinfra");
    catalogs.set("deepinfra", this.createFallbackCatalog(deepinfraConfig.defaultModel));

    return catalogs;
  }

  private createFallbackCatalog(defaultModel: string): ModelCatalog {
    const modelInfo: ModelDefinition = {
      id: defaultModel,
      name: defaultModel,
      contextWindow: 128000, // Default context window for fallback models
      capabilities: ["chat"],
      pricing: { input: 0, output: 0 },
    };

    return {
      isValidModel: (model) => model.length > 0,
      listModels: () => [modelInfo],
      getModelInfo: (model) => (model === defaultModel ? modelInfo : null),
    };
  }

  private resolveProvider(provider: ProviderName): AISDKProviderName {
    if (provider === "local") {
      return "ollama";
    }
    return provider;
  }

  private mapFinishReason(reason: string): AIResponse["finishReason"] {
    if (reason === "tool-calls") return "tool_calls";
    if (reason === "stop" || reason === "length" || reason === "error") return reason;
    return "stop";
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

      // Local model aliases
      ["llama", "local/llama3.3:latest"],
      ["llama3", "local/llama3.3:latest"],
      ["llama3.3", "local/llama3.3:latest"],
      ["qwen", "local/qwen2.5-coder:latest"],
      ["qwen-coder", "local/qwen2.5-coder:latest"],
      ["deepseek", "local/deepseek-coder-v2:latest"],
      ["deepseek-coder", "local/deepseek-coder-v2:latest"],
      ["mistral", "local/mistral:latest"],
      ["local", "local/llama3.3:latest"],
    ]);
  }

  private mapProviderToAuth(provider: ProviderName): AuthProviderName | null {
    const map: Partial<Record<ProviderName, AuthProviderName>> = {
      anthropic: "claude",
      openai: "codex",
      google: "gemini",
    };
    return map[provider] ?? null;
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
  if (!routerInstance || config) {
    const defaultConfig: RouterConfig = config || {
      defaultModel: "anthropic/claude-sonnet-4-5",
      fallbackModels: ["openai/gpt-5.2", "google/gemini-3-flash"],
    };
    routerInstance = new ModelRouter(defaultConfig);
  }
  return routerInstance;
}

export function resetModelRouter(): void {
  routerInstance = null;
}
