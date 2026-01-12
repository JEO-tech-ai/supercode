/**
 * Model Configuration System
 * oh-my-opencode level model registry and routing
 *
 * Features:
 * - Model registry with metadata
 * - Provider routing
 * - Token limit tracking
 * - Cost estimation
 * - Capability flags
 */

export type ModelProvider =
  | "anthropic"
  | "openai"
  | "google"
  | "gemini"
  | "antigravity"
  | "ollama"
  | "local";

export type ModelCapability =
  | "chat"
  | "completion"
  | "vision"
  | "tools"
  | "thinking"
  | "streaming"
  | "json_mode"
  | "code";

export interface ModelConfig {
  id: string;
  provider: ModelProvider;
  displayName: string;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelCapability[];
  inputCostPer1M: number; // USD per 1M tokens
  outputCostPer1M: number;
  aliases?: string[];
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsThinking?: boolean;
  deprecated?: boolean;
  deprecationDate?: string;
  replacedBy?: string;
}

/**
 * Model Registry - Comprehensive model database
 */
export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  // ============================================================
  // Anthropic Models
  // ============================================================
  "claude-opus-4-20250514": {
    id: "claude-opus-4-20250514",
    provider: "anthropic",
    displayName: "Claude Opus 4.5",
    contextWindow: 200000,
    maxOutputTokens: 32000,
    capabilities: ["chat", "vision", "tools", "thinking", "streaming", "code"],
    inputCostPer1M: 15.0,
    outputCostPer1M: 75.0,
    aliases: ["claude-opus-4-5", "opus-4.5", "opus"],
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsThinking: true,
  },
  "claude-sonnet-4-20250514": {
    id: "claude-sonnet-4-20250514",
    provider: "anthropic",
    displayName: "Claude Sonnet 4",
    contextWindow: 200000,
    maxOutputTokens: 64000,
    capabilities: ["chat", "vision", "tools", "thinking", "streaming", "code"],
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
    aliases: ["claude-sonnet-4", "sonnet-4", "sonnet"],
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsThinking: true,
  },
  "claude-3-5-sonnet-20241022": {
    id: "claude-3-5-sonnet-20241022",
    provider: "anthropic",
    displayName: "Claude 3.5 Sonnet",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: ["chat", "vision", "tools", "streaming", "code"],
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
    aliases: ["claude-3.5-sonnet", "claude-3-5-sonnet"],
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },
  "claude-3-5-haiku-latest": {
    id: "claude-3-5-haiku-latest",
    provider: "anthropic",
    displayName: "Claude 3.5 Haiku",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: ["chat", "tools", "streaming", "code"],
    inputCostPer1M: 0.8,
    outputCostPer1M: 4.0,
    aliases: ["haiku", "claude-haiku"],
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
  },

  // ============================================================
  // OpenAI Models
  // ============================================================
  "gpt-4o": {
    id: "gpt-4o",
    provider: "openai",
    displayName: "GPT-4o",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    capabilities: ["chat", "vision", "tools", "streaming", "json_mode", "code"],
    inputCostPer1M: 2.5,
    outputCostPer1M: 10.0,
    aliases: ["gpt4o"],
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    provider: "openai",
    displayName: "GPT-4o Mini",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    capabilities: ["chat", "vision", "tools", "streaming", "json_mode", "code"],
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    aliases: ["gpt4o-mini", "4o-mini"],
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },
  "o1": {
    id: "o1",
    provider: "openai",
    displayName: "O1 (Reasoning)",
    contextWindow: 200000,
    maxOutputTokens: 100000,
    capabilities: ["chat", "vision", "tools", "thinking", "code"],
    inputCostPer1M: 15.0,
    outputCostPer1M: 60.0,
    aliases: ["o1-preview"],
    supportsStreaming: false, // O1 doesn't support streaming
    supportsTools: true,
    supportsVision: true,
    supportsThinking: true,
  },
  "o3-mini": {
    id: "o3-mini",
    provider: "openai",
    displayName: "O3 Mini (Fast Reasoning)",
    contextWindow: 200000,
    maxOutputTokens: 100000,
    capabilities: ["chat", "tools", "thinking", "code"],
    inputCostPer1M: 1.1,
    outputCostPer1M: 4.4,
    aliases: ["o3"],
    supportsStreaming: false,
    supportsTools: true,
    supportsVision: false,
    supportsThinking: true,
  },

  // ============================================================
  // Google/Gemini Models
  // ============================================================
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    provider: "google",
    displayName: "Gemini 2.5 Pro",
    contextWindow: 2000000, // 2M context
    maxOutputTokens: 65536,
    capabilities: ["chat", "vision", "tools", "thinking", "streaming", "code"],
    inputCostPer1M: 1.25,
    outputCostPer1M: 10.0,
    aliases: ["gemini-pro", "gemini-2.5"],
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsThinking: true,
  },
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    provider: "google",
    displayName: "Gemini 2.5 Flash",
    contextWindow: 1000000, // 1M context
    maxOutputTokens: 65536,
    capabilities: ["chat", "vision", "tools", "thinking", "streaming", "code"],
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.30,
    aliases: ["gemini-flash", "flash"],
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsThinking: true,
  },
  "gemini-2.0-flash-thinking-exp": {
    id: "gemini-2.0-flash-thinking-exp",
    provider: "google",
    displayName: "Gemini 2.0 Flash Thinking",
    contextWindow: 1000000,
    maxOutputTokens: 65536,
    capabilities: ["chat", "vision", "tools", "thinking", "streaming", "code"],
    inputCostPer1M: 0.0, // Free during preview
    outputCostPer1M: 0.0,
    aliases: ["gemini-thinking", "flash-thinking"],
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsThinking: true,
  },

  // ============================================================
  // Antigravity Models (via Google OAuth)
  // ============================================================
  "antigravity/gemini-2.5-pro": {
    id: "antigravity/gemini-2.5-pro",
    provider: "antigravity",
    displayName: "Gemini 2.5 Pro (Antigravity)",
    contextWindow: 2000000,
    maxOutputTokens: 65536,
    capabilities: ["chat", "vision", "tools", "thinking", "streaming", "code"],
    inputCostPer1M: 0.0, // Free with Google account quota
    outputCostPer1M: 0.0,
    aliases: ["ag-pro"],
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsThinking: true,
  },
  "antigravity/gemini-2.5-flash": {
    id: "antigravity/gemini-2.5-flash",
    provider: "antigravity",
    displayName: "Gemini 2.5 Flash (Antigravity)",
    contextWindow: 1000000,
    maxOutputTokens: 65536,
    capabilities: ["chat", "vision", "tools", "thinking", "streaming", "code"],
    inputCostPer1M: 0.0,
    outputCostPer1M: 0.0,
    aliases: ["ag-flash"],
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsThinking: true,
  },

  // ============================================================
  // Local Models (Ollama/LMStudio)
  // ============================================================
  "llama3.3:latest": {
    id: "llama3.3:latest",
    provider: "ollama",
    displayName: "Llama 3.3 70B",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    capabilities: ["chat", "tools", "streaming", "code"],
    inputCostPer1M: 0.0,
    outputCostPer1M: 0.0,
    aliases: ["llama3.3", "llama-3.3"],
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
  },
  "qwen2.5-coder:32b": {
    id: "qwen2.5-coder:32b",
    provider: "ollama",
    displayName: "Qwen 2.5 Coder 32B",
    contextWindow: 32768,
    maxOutputTokens: 8192,
    capabilities: ["chat", "tools", "streaming", "code"],
    inputCostPer1M: 0.0,
    outputCostPer1M: 0.0,
    aliases: ["qwen-coder", "qwen2.5-coder"],
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
  },
  "deepseek-coder-v2:latest": {
    id: "deepseek-coder-v2:latest",
    provider: "ollama",
    displayName: "DeepSeek Coder V2",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    capabilities: ["chat", "tools", "streaming", "code"],
    inputCostPer1M: 0.0,
    outputCostPer1M: 0.0,
    aliases: ["deepseek-coder", "deepseek"],
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
  },
};

/**
 * Get model config by ID or alias
 */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  // Direct lookup
  if (MODEL_REGISTRY[modelId]) {
    return MODEL_REGISTRY[modelId];
  }

  // Alias lookup
  for (const config of Object.values(MODEL_REGISTRY)) {
    if (config.aliases?.includes(modelId)) {
      return config;
    }
  }

  return undefined;
}

/**
 * Get provider for a model
 */
export function getModelProvider(modelId: string): ModelProvider | undefined {
  const config = getModelConfig(modelId);
  return config?.provider;
}

/**
 * Map model provider to auth provider
 */
export function mapModelProviderToAuth(
  modelProvider: ModelProvider
): "claude" | "codex" | "gemini" | "antigravity" | null {
  switch (modelProvider) {
    case "anthropic":
      return "claude";
    case "openai":
      return "codex";
    case "google":
    case "gemini":
      return "gemini";
    case "antigravity":
      return "antigravity";
    case "ollama":
    case "local":
      return null; // No auth needed
    default:
      return null;
  }
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: ModelProvider): ModelConfig[] {
  return Object.values(MODEL_REGISTRY).filter(
    (config) => config.provider === provider
  );
}

/**
 * Get models by capability
 */
export function getModelsByCapability(capability: ModelCapability): ModelConfig[] {
  return Object.values(MODEL_REGISTRY).filter((config) =>
    config.capabilities.includes(capability)
  );
}

/**
 * Get thinking-capable models
 */
export function getThinkingModels(): ModelConfig[] {
  return Object.values(MODEL_REGISTRY).filter(
    (config) => config.supportsThinking === true
  );
}

/**
 * Get free models (zero cost)
 */
export function getFreeModels(): ModelConfig[] {
  return Object.values(MODEL_REGISTRY).filter(
    (config) => config.inputCostPer1M === 0 && config.outputCostPer1M === 0
  );
}

/**
 * Estimate cost for a request
 */
export function estimateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): { input: number; output: number; total: number } | null {
  const config = getModelConfig(modelId);
  if (!config) return null;

  const input = (inputTokens / 1_000_000) * config.inputCostPer1M;
  const output = (outputTokens / 1_000_000) * config.outputCostPer1M;

  return {
    input,
    output,
    total: input + output,
  };
}

/**
 * Model tier classification for cost-aware routing
 */
export type ModelTier = "free" | "cheap" | "standard" | "expensive";

export function getModelTier(modelId: string): ModelTier {
  const config = getModelConfig(modelId);
  if (!config) return "standard";

  const avgCost = (config.inputCostPer1M + config.outputCostPer1M) / 2;

  if (avgCost === 0) return "free";
  if (avgCost < 1) return "cheap";
  if (avgCost < 10) return "standard";
  return "expensive";
}

/**
 * Get default model for a tier
 */
export function getDefaultModelForTier(tier: ModelTier): string {
  switch (tier) {
    case "free":
      return "antigravity/gemini-2.5-flash";
    case "cheap":
      return "claude-3-5-haiku-latest";
    case "standard":
      return "claude-sonnet-4-20250514";
    case "expensive":
      return "claude-opus-4-20250514";
    default:
      return "claude-sonnet-4-20250514";
  }
}

/**
 * Recommended models for specific use cases
 */
export const RECOMMENDED_MODELS = {
  // Code-related tasks
  coding: ["claude-sonnet-4-20250514", "gemini-2.5-pro", "gpt-4o"],
  // Long context analysis
  longContext: ["gemini-2.5-pro", "claude-opus-4-20250514", "o1"],
  // Fast responses
  fast: ["claude-3-5-haiku-latest", "gemini-2.5-flash", "gpt-4o-mini"],
  // Deep reasoning
  reasoning: ["claude-opus-4-20250514", "o1", "gemini-2.5-pro"],
  // Vision tasks
  vision: ["claude-sonnet-4-20250514", "gemini-2.5-pro", "gpt-4o"],
  // Budget-friendly
  budget: ["antigravity/gemini-2.5-flash", "claude-3-5-haiku-latest", "gpt-4o-mini"],
} as const;
