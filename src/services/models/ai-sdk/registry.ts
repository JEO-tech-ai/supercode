import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type {
  AISDKProviderName,
  AISDKProviderConfig,
  AISDKModelConfig,
  AISDKModelResult,
  ProviderRegistry,
} from "./types";

const PROVIDER_REGISTRY: ProviderRegistry = {
  anthropic: {
    name: "Claude (Anthropic)",
    requiresAuth: true,
    supportsStreaming: true,
    defaultModel: "claude-sonnet-4-5",
  },
  openai: {
    name: "OpenAI",
    requiresAuth: true,
    supportsStreaming: true,
    defaultModel: "gpt-4o",
  },
  google: {
    name: "Gemini (Google)",
    requiresAuth: true,
    supportsStreaming: true,
    defaultModel: "gemini-2.0-flash",
  },
  ollama: {
    name: "Ollama (Localhost)",
    requiresAuth: false,
    supportsStreaming: true,
    defaultBaseURL: "http://localhost:11434/v1",
    defaultModel: "rnj-1",
  },
  lmstudio: {
    name: "LM Studio (Localhost)",
    requiresAuth: false,
    supportsStreaming: true,
    defaultBaseURL: "http://localhost:1234/v1",
    defaultModel: "local-model",
  },
  llamacpp: {
    name: "llama.cpp (Localhost)",
    requiresAuth: false,
    supportsStreaming: true,
    defaultBaseURL: "http://localhost:8080/v1",
    defaultModel: "local-model",
  },
  supercent: {
    name: "SuperCent (API)",
    requiresAuth: true,
    supportsStreaming: true,
    defaultBaseURL: "https://api.supercent.ai/v1",
    defaultModel: "cent-1",
  },
};

export function getProviderConfig(provider: AISDKProviderName): AISDKProviderConfig {
  const config = PROVIDER_REGISTRY[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return config;
}

export function isLocalhostProvider(provider: AISDKProviderName): boolean {
  return provider === "ollama" || provider === "lmstudio" || provider === "llamacpp";
}

export function createModel(config: AISDKModelConfig): AISDKModelResult {
  const providerConfig = getProviderConfig(config.provider);
  const model = config.model || providerConfig.defaultModel;

  let languageModel: LanguageModel;

  switch (config.provider) {
    case "anthropic": {
      if (!config.apiKey) {
        throw new Error("API key required for Anthropic");
      }
      const anthropic = createAnthropic({ apiKey: config.apiKey });
      languageModel = anthropic(model);
      break;
    }
    case "google": {
      if (!config.apiKey) {
        throw new Error("API key required for Google");
      }
      const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
      languageModel = google(model);
      break;
    }
    case "openai": {
      if (!config.apiKey) {
        throw new Error("API key required for OpenAI");
      }
      const openai = createOpenAI({ apiKey: config.apiKey });
      languageModel = openai(model);
      break;
    }
    case "ollama": {
      const baseURL = config.baseURL || providerConfig.defaultBaseURL;
      const ollama = createOpenAI({ baseURL, apiKey: "ollama" });
      languageModel = ollama.chat(model);
      break;
    }
    case "lmstudio": {
      const baseURL = config.baseURL || providerConfig.defaultBaseURL;
      const lmstudio = createOpenAI({ baseURL, apiKey: "lm-studio" });
      languageModel = lmstudio.chat(model);
      break;
    }
    case "llamacpp": {
      const baseURL = config.baseURL || providerConfig.defaultBaseURL;
      const llamacpp = createOpenAI({ baseURL, apiKey: "llamacpp" });
      languageModel = llamacpp.chat(model);
      break;
    }
    case "supercent": {
      const baseURL = config.baseURL || providerConfig.defaultBaseURL;
      const supercent = createOpenAI({ 
        baseURL, 
        apiKey: config.apiKey || process.env.SUPERCENT_API_KEY || "supercent"
      });
      languageModel = supercent.chat(model);
      break;
    }
    default: {
      const _exhaustive: never = config.provider;
      throw new Error(`Unhandled provider: ${_exhaustive}`);
    }
  }

  return {
    model: languageModel,
    config: providerConfig,
  };
}

export function listProviders(): AISDKProviderConfig[] {
  return Object.values(PROVIDER_REGISTRY);
}

export function listLocalhostProviders(): AISDKProviderConfig[] {
  return Object.entries(PROVIDER_REGISTRY)
    .filter(([key]) => isLocalhostProvider(key as AISDKProviderName))
    .map(([, config]) => config);
}

export { PROVIDER_REGISTRY };
