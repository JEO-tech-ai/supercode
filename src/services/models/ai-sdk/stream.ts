import { streamText } from "ai";
import { createModel, isLocalhostProvider, getProviderConfig } from "./registry";
import { TokenStore } from "../../../server/store/token-store";
import type { AISDKProviderName, StreamOptions, StreamResult } from "./types";
import type { AuthProviderName } from "../../auth/types";

const AUTH_PROVIDER_MAP: Record<AISDKProviderName, AuthProviderName | null> = {
  anthropic: "claude",
  openai: "codex",
  google: "gemini",
  ollama: null,
  lmstudio: null,
  llamacpp: null,
};

function mapToAuthProvider(provider: AISDKProviderName): AuthProviderName | null {
  return AUTH_PROVIDER_MAP[provider];
}

async function getApiKey(
  provider: AISDKProviderName,
  accountId?: string
): Promise<string | undefined> {
  if (isLocalhostProvider(provider)) {
    return undefined;
  }

  const authProvider = mapToAuthProvider(provider);
  if (!authProvider) {
    return undefined;
  }

  const tokenStore = new TokenStore();
  const token = await tokenStore.retrieve(authProvider, accountId);
  
  if (!token) {
    throw new Error(
      `No authentication found for ${provider}. Run: supercoin auth login ${authProvider}`
    );
  }

  return token.accessToken;
}

type MessageRole = "user" | "assistant" | "system";

interface SimpleMessage {
  role: MessageRole;
  content: string;
}

function convertMessages(
  messages: StreamOptions["messages"],
  systemPrompt?: string
): SimpleMessage[] {
  const result: SimpleMessage[] = [];

  if (systemPrompt) {
    result.push({ role: "system", content: systemPrompt });
  }

  for (const msg of messages) {
    result.push({
      role: msg.role,
      content: msg.content,
    });
  }

  return result;
}

function mapFinishReason(reason: string | null | undefined): StreamResult["finishReason"] {
  switch (reason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "tool-calls":
      return "tool-calls";
    case "error":
      return "error";
    default:
      return "other";
  }
}

export async function streamAIResponse(options: StreamOptions): Promise<StreamResult> {
  const {
    provider,
    model,
    messages,
    systemPrompt,
    accountId,
    baseURL,
    temperature = 0.7,
    maxTokens = 4096,
    onChunk,
    onComplete,
    onError,
  } = options;

  try {
    const providerConfig = getProviderConfig(provider);
    const apiKey = await getApiKey(provider, accountId);

    const { model: languageModel } = createModel({
      provider,
      model: model || providerConfig.defaultModel,
      apiKey,
      baseURL,
    });

    const convertedMessages = convertMessages(messages, systemPrompt);

    const result = await streamText({
      model: languageModel,
      messages: convertedMessages,
      temperature,
      maxOutputTokens: maxTokens,
    });

    let fullText = "";

    for await (const chunk of result.textStream) {
      fullText += chunk;
      onChunk?.(chunk);
    }

    onComplete?.(fullText);

    const usage = await result.usage;
    const finishReason = await result.finishReason;

    return {
      text: fullText,
      usage: usage
        ? {
            promptTokens: (usage as { promptTokens?: number }).promptTokens ?? 0,
            completionTokens: (usage as { completionTokens?: number }).completionTokens ?? 0,
            totalTokens: ((usage as { promptTokens?: number }).promptTokens ?? 0) + 
                         ((usage as { completionTokens?: number }).completionTokens ?? 0),
          }
        : undefined,
      finishReason: mapFinishReason(finishReason),
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    throw err;
  }
}

export async function generateAIResponse(
  options: Omit<StreamOptions, "onChunk" | "onComplete" | "onError">
): Promise<StreamResult> {
  return streamAIResponse({
    ...options,
    onChunk: undefined,
    onComplete: undefined,
    onError: undefined,
  });
}

export async function checkLocalhostAvailability(
  provider: "ollama" | "lmstudio" | "llamacpp",
  baseURL?: string
): Promise<boolean> {
  const config = getProviderConfig(provider);
  const url = baseURL || config.defaultBaseURL;

  if (!url) {
    return false;
  }

  try {
    const response = await fetch(`${url}/models`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function listLocalhostModels(
  provider: "ollama" | "lmstudio" | "llamacpp",
  baseURL?: string
): Promise<Array<{ id: string; name: string }>> {
  const config = getProviderConfig(provider);
  const url = baseURL || config.defaultBaseURL;

  if (!url) {
    return [];
  }

  try {
    const response = await fetch(`${url}/models`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as { data?: Array<{ id: string }> };

    return (data.data || []).map((model) => ({
      id: model.id,
      name: model.id,
    }));
  } catch {
    return [];
  }
}

/**
 * Get available Ollama models using native API
 */
export async function getAvailableOllamaModels(baseURL?: string): Promise<string[]> {
  const url = baseURL || "http://localhost:11434";

  try {
    const response = await fetch(`${url}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as { models?: Array<{ name: string }> };
    return data.models?.map((m) => m.name) || [];
  } catch {
    return [];
  }
}

/**
 * Check if a specific Ollama model is available
 */
export async function checkOllamaModel(model: string, baseURL?: string): Promise<boolean> {
  const models = await getAvailableOllamaModels(baseURL);
  return models.some((m) => m === model || m.startsWith(`${model}:`) || m === `${model}:latest`);
}

/**
 * Get the first available Ollama model as fallback
 */
export async function getDefaultOllamaModel(baseURL?: string): Promise<string | null> {
  const models = await getAvailableOllamaModels(baseURL);
  return models.length > 0 ? models[0] : null;
}
