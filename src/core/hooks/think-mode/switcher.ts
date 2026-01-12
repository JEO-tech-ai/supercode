/**
 * Think Mode Switcher
 * Handles model switching to thinking-capable variants.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 *
 * PROVIDER ALIASING:
 * GitHub Copilot acts as a proxy provider that routes to underlying providers
 * (Anthropic, Google, OpenAI). We resolve the proxy to the actual provider
 * based on model name patterns, allowing GitHub Copilot to inherit thinking
 * configurations without duplication.
 *
 * NORMALIZATION:
 * Model IDs are normalized (dots → hyphens in version numbers) to handle API
 * inconsistencies defensively while maintaining backwards compatibility.
 */

import type { ThinkingConfig, ThinkModeOptions } from "./types";

/**
 * Extract provider-specific prefix from model ID
 * @example
 * extractModelPrefix("vertex_ai/claude-sonnet-4-5") // { prefix: "vertex_ai/", base: "claude-sonnet-4-5" }
 * extractModelPrefix("claude-sonnet-4-5") // { prefix: "", base: "claude-sonnet-4-5" }
 */
function extractModelPrefix(modelID: string): { prefix: string; base: string } {
  const slashIndex = modelID.indexOf("/");
  if (slashIndex === -1) {
    return { prefix: "", base: modelID };
  }
  return {
    prefix: modelID.slice(0, slashIndex + 1),
    base: modelID.slice(slashIndex + 1),
  };
}

/**
 * Normalize model IDs to use consistent hyphen formatting
 * @example
 * normalizeModelID("claude-opus-4.5") // "claude-opus-4-5"
 * normalizeModelID("gemini-3.5-pro") // "gemini-3-5-pro"
 */
function normalizeModelID(modelID: string): string {
  return modelID.replace(/\.(\d+)/g, "-$1");
}

/**
 * Resolve proxy providers to underlying provider
 * @example
 * resolveProvider("github-copilot", "claude-opus-4-5") // "anthropic"
 * resolveProvider("github-copilot", "gemini-3-pro") // "google"
 */
function resolveProvider(providerID: string, modelID: string): string {
  if (providerID === "github-copilot") {
    const modelLower = modelID.toLowerCase();
    if (modelLower.includes("claude")) return "anthropic";
    if (modelLower.includes("gemini")) return "google";
    if (
      modelLower.includes("gpt") ||
      modelLower.includes("o1") ||
      modelLower.includes("o3")
    ) {
      return "openai";
    }
  }
  return providerID;
}

/**
 * Maps model IDs to their "high reasoning" variant
 */
const HIGH_VARIANT_MAP: Record<string, string> = {
  // Claude
  "claude-sonnet-4-5": "claude-sonnet-4-5-high",
  "claude-opus-4-5": "claude-opus-4-5-high",
  // Gemini
  "gemini-3-pro": "gemini-3-pro-high",
  "gemini-3-pro-low": "gemini-3-pro-high",
  "gemini-3-pro-preview": "gemini-3-pro-preview-high",
  "gemini-3-flash": "gemini-3-flash-high",
  "gemini-3-flash-preview": "gemini-3-flash-preview-high",
  // GPT-5
  "gpt-5": "gpt-5-high",
  "gpt-5-mini": "gpt-5-mini-high",
  "gpt-5-nano": "gpt-5-nano-high",
  "gpt-5-pro": "gpt-5-pro-high",
  "gpt-5-chat-latest": "gpt-5-chat-latest-high",
  // GPT-5.1
  "gpt-5-1": "gpt-5-1-high",
  "gpt-5-1-chat-latest": "gpt-5-1-chat-latest-high",
  "gpt-5-1-codex": "gpt-5-1-codex-high",
  "gpt-5-1-codex-mini": "gpt-5-1-codex-mini-high",
  "gpt-5-1-codex-max": "gpt-5-1-codex-max-high",
  // GPT-5.2
  "gpt-5-2": "gpt-5-2-high",
  "gpt-5-2-chat-latest": "gpt-5-2-chat-latest-high",
  "gpt-5-2-pro": "gpt-5-2-pro-high",
};

/**
 * Set of model IDs that are already high variants
 */
const ALREADY_HIGH: Set<string> = new Set(Object.values(HIGH_VARIANT_MAP));

/**
 * Default thinking configurations per provider
 */
const DEFAULT_THINKING_CONFIGS = {
  anthropic: {
    thinking: {
      type: "enabled",
      budgetTokens: 64000,
    },
    maxTokens: 128000,
  },
  "amazon-bedrock": {
    reasoningConfig: {
      type: "enabled",
      budgetTokens: 32000,
    },
    maxTokens: 64000,
  },
  google: {
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingLevel: "HIGH",
        },
      },
    },
  },
  "google-vertex": {
    providerOptions: {
      "google-vertex": {
        thinkingConfig: {
          thinkingLevel: "HIGH",
        },
      },
    },
  },
  openai: {
    reasoning_effort: "high",
  },
} as const satisfies Record<string, Record<string, unknown>>;

/**
 * Models capable of thinking per provider
 */
const THINKING_CAPABLE_MODELS = {
  anthropic: ["claude-sonnet-4", "claude-opus-4", "claude-3"],
  "amazon-bedrock": ["claude", "anthropic"],
  google: ["gemini-2", "gemini-3"],
  "google-vertex": ["gemini-2", "gemini-3"],
  openai: ["gpt-5", "o1", "o3"],
} as const satisfies Record<string, readonly string[]>;

type ThinkingProvider = keyof typeof DEFAULT_THINKING_CONFIGS;

function isThinkingProvider(provider: string): provider is ThinkingProvider {
  return provider in DEFAULT_THINKING_CONFIGS;
}

/**
 * Get high variant of a model
 * @param modelID - Model ID to get high variant for
 * @returns High variant model ID or null if not available
 */
export function getHighVariant(modelID: string): string | null {
  const normalized = normalizeModelID(modelID);
  const { prefix, base } = extractModelPrefix(normalized);

  // Already high variant
  if (ALREADY_HIGH.has(base) || base.endsWith("-high")) {
    return null;
  }

  const highBase = HIGH_VARIANT_MAP[base];
  if (!highBase) {
    return null;
  }

  // Preserve prefix in high variant
  return prefix + highBase;
}

/**
 * Check if model is already a high variant
 * @param modelID - Model ID to check
 * @returns true if already high variant
 */
export function isAlreadyHighVariant(modelID: string): boolean {
  const normalized = normalizeModelID(modelID);
  const { base } = extractModelPrefix(normalized);
  return ALREADY_HIGH.has(base) || base.endsWith("-high");
}

/**
 * Get thinking configuration for a provider/model
 * @param providerID - Provider ID
 * @param modelID - Model ID
 * @param options - Optional configuration overrides
 * @returns Thinking configuration or null if not applicable
 */
export function getThinkingConfig(
  providerID: string,
  modelID: string,
  options?: ThinkModeOptions
): ThinkingConfig | null {
  const normalized = normalizeModelID(modelID);
  const { base } = extractModelPrefix(normalized);

  if (isAlreadyHighVariant(normalized)) {
    return null;
  }

  const resolvedProvider = resolveProvider(providerID, modelID);

  if (!isThinkingProvider(resolvedProvider)) {
    return null;
  }

  const baseConfig = DEFAULT_THINKING_CONFIGS[resolvedProvider];
  const capablePatterns = THINKING_CAPABLE_MODELS[resolvedProvider];

  // Check capability using base model name
  const baseLower = base.toLowerCase();
  const isCapable = capablePatterns.some((pattern) =>
    baseLower.includes(pattern.toLowerCase())
  );

  if (!isCapable) {
    return null;
  }

  // Apply option overrides if provided
  if (options) {
    if (resolvedProvider === "anthropic") {
      return {
        thinking: {
          type: "enabled",
          budgetTokens: options.anthropicBudgetTokens ?? 64000,
        },
        maxTokens: options.anthropicMaxTokens ?? 128000,
      };
    }
    if (resolvedProvider === "amazon-bedrock") {
      return {
        reasoningConfig: {
          type: "enabled",
          budgetTokens: options.bedrockBudgetTokens ?? 32000,
        },
        maxTokens: options.bedrockMaxTokens ?? 64000,
      };
    }
  }

  return baseConfig;
}

/**
 * Get all supported high variant mappings
 */
export function getSupportedHighVariants(): Record<string, string> {
  return { ...HIGH_VARIANT_MAP };
}

/**
 * Get all thinking-capable model patterns
 */
export function getThinkingCapablePatterns(): Record<string, readonly string[]> {
  return { ...THINKING_CAPABLE_MODELS };
}
