const CHARS_PER_TOKEN = 4;

export function estimateTokens(input: string): number {
  return Math.max(0, Math.round((input || "").length / CHARS_PER_TOKEN));
}

export function estimateMessagesTokens(messages: Array<{ content: string }>): number {
  return messages.reduce((total, msg) => total + estimateTokens(msg.content), 0);
}

export interface ModelLimits {
  contextWindow: number;
  maxOutput: number;
}

export const MODEL_LIMITS: Record<string, ModelLimits> = {
  "gpt-4": { contextWindow: 8192, maxOutput: 4096 },
  "gpt-4-turbo": { contextWindow: 128000, maxOutput: 4096 },
  "gpt-4o": { contextWindow: 128000, maxOutput: 16384 },
  "gpt-4o-mini": { contextWindow: 128000, maxOutput: 16384 },
  "gpt-3.5-turbo": { contextWindow: 16385, maxOutput: 4096 },
  "claude-3-opus": { contextWindow: 200000, maxOutput: 4096 },
  "claude-3-sonnet": { contextWindow: 200000, maxOutput: 4096 },
  "claude-3-haiku": { contextWindow: 200000, maxOutput: 4096 },
  "claude-3-5-sonnet": { contextWindow: 200000, maxOutput: 8192 },
  "claude-opus-4": { contextWindow: 200000, maxOutput: 32000 },
  "gemini-pro": { contextWindow: 32000, maxOutput: 8192 },
  "gemini-1.5-pro": { contextWindow: 1000000, maxOutput: 8192 },
  "gemini-1.5-flash": { contextWindow: 1000000, maxOutput: 8192 },
  "llama-3": { contextWindow: 8192, maxOutput: 4096 },
  "llama-3.1": { contextWindow: 128000, maxOutput: 4096 },
  "mistral-7b": { contextWindow: 8192, maxOutput: 4096 },
  "mixtral-8x7b": { contextWindow: 32768, maxOutput: 4096 },
  "codellama": { contextWindow: 16384, maxOutput: 4096 },
  "rnj-1": { contextWindow: 128000, maxOutput: 8192 },
};

export const DEFAULT_LIMITS: ModelLimits = {
  contextWindow: 128000,
  maxOutput: 4096,
};

export function getModelLimits(model: string): ModelLimits {
  const normalizedModel = model.toLowerCase().split("/").pop() || model;
  
  if (MODEL_LIMITS[normalizedModel]) {
    return MODEL_LIMITS[normalizedModel];
  }
  
  const sortedKeys = Object.keys(MODEL_LIMITS).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    if (normalizedModel.includes(key.toLowerCase())) {
      return MODEL_LIMITS[key];
    }
  }
  
  return DEFAULT_LIMITS;
}

export function isContextOverflowing(
  currentTokens: number,
  model: string,
  reserveOutputTokens?: number
): boolean {
  const limits = getModelLimits(model);
  const outputReserve = reserveOutputTokens ?? limits.maxOutput;
  const usableContext = limits.contextWindow - outputReserve;
  
  return currentTokens > usableContext;
}
