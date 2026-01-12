/**
 * Local Provider
 * OpenAI-compatible API provider for local LLM services.
 * Supports Ollama, LM Studio, llama.cpp, and other OpenAI-compatible servers.
 */

import type {
  Provider,
  ModelDefinition,
  AIRequest,
  AIResponse,
  ModelConfig,
  Message,
  ToolDefinition,
} from "../types";
import { NetworkError } from "../../../shared/errors";
import logger from "../../../shared/logger";

interface OpenAIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface OpenAIToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface LocalModelInfo {
  name: string;
  modified_at?: string;
  size?: number;
  details?: {
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

interface OllamaModelsResponse {
  models: LocalModelInfo[];
}

interface OpenAIModelsResponse {
  data: Array<{
    id: string;
    object: string;
    owned_by?: string;
  }>;
}

/**
 * Local provider configuration
 */
export interface LocalProviderConfig {
  /** Base URL for the local API (default: http://localhost:11434/v1) */
  baseUrl?: string;
  /** API type: 'ollama' | 'openai-compatible' (default: 'ollama') */
  apiType?: "ollama" | "openai-compatible";
  /** Skip authentication (default: true for local) */
  skipAuth?: boolean;
  /** Default context window for models without metadata */
  defaultContextWindow?: number;
}

const DEFAULT_CONFIG: Required<LocalProviderConfig> = {
  baseUrl: "http://localhost:11434/v1",
  apiType: "ollama",
  skipAuth: true,
  defaultContextWindow: 8192,
};

export class LocalProvider implements Provider {
  readonly name = "local" as const;
  private config: Required<LocalProviderConfig>;
  private cachedModels: ModelDefinition[] | null = null;
  private lastModelFetch: number = 0;
  private readonly MODEL_CACHE_TTL = 60000; // 1 minute

  constructor(config?: LocalProviderConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the base URL (without /v1 suffix for Ollama API)
   */
  private getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Get the Ollama-native API base URL
   */
  private getOllamaBaseUrl(): string {
    // Strip /v1 suffix if present for native Ollama API calls
    return this.config.baseUrl.replace(/\/v1\/?$/, "");
  }

  isValidModel(model: string): boolean {
    // For local models, we accept any model name since the user
    // can have custom models installed
    return model.length > 0;
  }

  listModels(): ModelDefinition[] {
    // Return cached models if available and fresh
    if (this.cachedModels && Date.now() - this.lastModelFetch < this.MODEL_CACHE_TTL) {
      return this.cachedModels;
    }

    // Return default models if cache is empty (async fetch will update)
    return this.getDefaultModels();
  }

  /**
   * Fetch models from the local server (async)
   */
  async fetchModels(): Promise<ModelDefinition[]> {
    try {
      let models: ModelDefinition[];

      if (this.config.apiType === "ollama") {
        models = await this.fetchOllamaModels();
      } else {
        models = await this.fetchOpenAIModels();
      }

      this.cachedModels = models;
      this.lastModelFetch = Date.now();

      return models;
    } catch (error) {
      logger.warn("Failed to fetch local models, using defaults", error as Error);
      return this.getDefaultModels();
    }
  }

  /**
   * Fetch models from Ollama API
   */
  private async fetchOllamaModels(): Promise<ModelDefinition[]> {
    const response = await fetch(`${this.getOllamaBaseUrl()}/api/tags`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaModelsResponse;
    return data.models.map((m) => this.convertOllamaModel(m));
  }

  /**
   * Fetch models from OpenAI-compatible API
   */
  private async fetchOpenAIModels(): Promise<ModelDefinition[]> {
    const response = await fetch(`${this.getBaseUrl()}/models`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Local API error: ${response.statusText}`);
    }

    const data = (await response.json()) as OpenAIModelsResponse;
    return data.data.map((m) => this.convertOpenAIModel(m));
  }

  /**
   * Convert Ollama model info to ModelDefinition
   */
  private convertOllamaModel(model: LocalModelInfo): ModelDefinition {
    const contextWindow = this.inferContextWindow(model.name, model.details);

    return {
      id: model.name,
      name: this.formatModelName(model.name),
      contextWindow,
      capabilities: this.inferCapabilities(model.name),
      pricing: { input: 0, output: 0 }, // Local models are free
    };
  }

  /**
   * Convert OpenAI-compatible model to ModelDefinition
   */
  private convertOpenAIModel(model: { id: string; owned_by?: string }): ModelDefinition {
    return {
      id: model.id,
      name: this.formatModelName(model.id),
      contextWindow: this.config.defaultContextWindow,
      capabilities: this.inferCapabilities(model.id),
      pricing: { input: 0, output: 0 }, // Local models are free
    };
  }

  /**
   * Infer context window from model name/details
   */
  private inferContextWindow(modelName: string, details?: LocalModelInfo["details"]): number {
    const name = modelName.toLowerCase();

    // Check for explicit context size in model name
    const contextMatch = name.match(/(\d+)k/i);
    if (contextMatch) {
      return parseInt(contextMatch[1], 10) * 1024;
    }

    // Known model families
    if (name.includes("llama-3") || name.includes("llama3")) {
      return 128000;
    }
    if (name.includes("mistral") || name.includes("mixtral")) {
      return 32768;
    }
    if (name.includes("qwen")) {
      return 32768;
    }
    if (name.includes("deepseek")) {
      return 64000;
    }
    if (name.includes("codellama") || name.includes("code-llama")) {
      return 16384;
    }
    if (name.includes("phi")) {
      return 4096;
    }

    return this.config.defaultContextWindow;
  }

  /**
   * Infer capabilities from model name
   */
  private inferCapabilities(modelName: string): ModelDefinition["capabilities"] {
    const name = modelName.toLowerCase();
    const caps: ModelDefinition["capabilities"] = ["chat"];

    if (name.includes("code") || name.includes("coder") || name.includes("deepseek-coder")) {
      caps.push("coding");
    }
    if (name.includes("vision") || name.includes("llava") || name.includes("bakllava")) {
      caps.push("vision");
    }
    if (name.includes("128k") || name.includes("200k") || name.includes("long")) {
      caps.push("long_context");
    }

    return caps;
  }

  /**
   * Format model name for display
   */
  private formatModelName(id: string): string {
    return id
      .replace(/:latest$/, "")
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  /**
   * Get default models when server is not reachable
   */
  private getDefaultModels(): ModelDefinition[] {
    return [
      {
        id: "llama3.3:latest",
        name: "Llama 3.3",
        contextWindow: 128000,
        capabilities: ["chat", "coding"],
        pricing: { input: 0, output: 0 },
      },
      {
        id: "qwen2.5-coder:latest",
        name: "Qwen 2.5 Coder",
        contextWindow: 32768,
        capabilities: ["chat", "coding"],
        pricing: { input: 0, output: 0 },
      },
      {
        id: "deepseek-coder-v2:latest",
        name: "DeepSeek Coder V2",
        contextWindow: 64000,
        capabilities: ["chat", "coding"],
        pricing: { input: 0, output: 0 },
      },
      {
        id: "mistral:latest",
        name: "Mistral",
        contextWindow: 32768,
        capabilities: ["chat"],
        pricing: { input: 0, output: 0 },
      },
    ];
  }

  getModelInfo(model: string): ModelDefinition | null {
    const models = this.listModels();
    const found = models.find((m) => m.id === model);

    if (found) return found;

    // Return a generic definition for unknown models
    return {
      id: model,
      name: this.formatModelName(model),
      contextWindow: this.config.defaultContextWindow,
      capabilities: ["chat"],
      pricing: { input: 0, output: 0 },
    };
  }

  async complete(
    request: AIRequest,
    config: ModelConfig,
    token: string
  ): Promise<AIResponse> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add auth header if token provided and skipAuth is false
    if (token && !this.config.skipAuth) {
      headers.Authorization = `Bearer ${token}`;
    }

    const body: Record<string, unknown> = {
      model: config.model,
      messages: this.convertMessages(request.messages, request.systemPrompt),
      stream: false,
    };

    // Add optional parameters
    if (config.maxTokens) {
      body.max_tokens = config.maxTokens;
    }
    if (config.temperature !== undefined) {
      body.temperature = config.temperature;
    }
    if (request.tools && request.tools.length > 0) {
      body.tools = this.convertTools(request.tools);
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = response.statusText;
        try {
          const errorJson = JSON.parse(errorText) as { error?: { message?: string } };
          errorMessage = errorJson.error?.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        logger.error(`Local API request failed`, new Error(errorMessage));
        throw new NetworkError(`Local API error: ${errorMessage}`, this.getBaseUrl());
      }

      const data = (await response.json()) as OpenAIResponse;
      return this.convertResponse(data, config.model);
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Local API request failed`, new Error(message));
      throw new NetworkError(
        `Failed to connect to local LLM server at ${this.getBaseUrl()}: ${message}`,
        this.getBaseUrl()
      );
    }
  }

  private convertMessages(messages: Message[], systemPrompt?: string): OpenAIMessage[] {
    const converted: OpenAIMessage[] = [];

    if (systemPrompt) {
      converted.push({ role: "system", content: systemPrompt });
    }

    for (const m of messages) {
      converted.push({ role: m.role, content: m.content });
    }

    return converted;
  }

  private convertTools(tools: ToolDefinition[]): OpenAITool[] {
    return tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  private convertResponse(data: OpenAIResponse, model: string): AIResponse {
    const choice = data.choices[0];
    const message = choice?.message;

    // Handle missing or empty response
    if (!message) {
      return {
        content: "",
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        model,
        finishReason: "error",
      };
    }

    // Parse tool calls if present
    let toolCalls: AIResponse["toolCalls"];
    if (message.tool_calls && message.tool_calls.length > 0) {
      toolCalls = message.tool_calls.map((t) => {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(t.function.arguments);
        } catch {
          logger.warn(`Failed to parse tool call arguments: ${t.function.arguments}`);
        }
        return {
          id: t.id,
          name: t.function.name,
          arguments: args,
        };
      });
    }

    return {
      content: message.content || "",
      toolCalls,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      model,
      finishReason: choice.finish_reason === "stop" ? "stop" : "tool_calls",
    };
  }

  /**
   * Check if the local server is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getOllamaBaseUrl()}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      // Try OpenAI-compatible endpoint
      try {
        const response = await fetch(`${this.getBaseUrl()}/models`, {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        });
        return response.ok;
      } catch {
        return false;
      }
    }
  }

  /**
   * Update provider configuration
   */
  updateConfig(config: Partial<LocalProviderConfig>): void {
    this.config = { ...this.config, ...config };
    // Clear cache when config changes
    this.cachedModels = null;
  }
}
