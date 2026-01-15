/**
 * AI SDK Provider Types
 * 
 * Extends existing model types to support AI SDK integration
 * with localhost models (Ollama, LM Studio, llama.cpp)
 */

import type { LanguageModel } from "ai";
import type { AISDKProviderName } from "../types";
export type { AISDKProviderName } from "../types";

/**
 * Provider configuration for AI SDK
 */
export interface AISDKProviderConfig {
  /** Display name for the provider */
  name: string;
  /** Whether the provider requires authentication */
  requiresAuth: boolean;
  /** Whether the provider supports streaming */
  supportsStreaming: boolean;
  /** Default base URL for the provider (localhost providers) */
  defaultBaseURL?: string;
  /** Default model ID for this provider */
  defaultModel: string;
}

/**
 * Configuration for creating a model instance
 */
export interface AISDKModelConfig {
  /** Provider name */
  provider: AISDKProviderName;
  /** Model ID */
  model: string;
  /** API key (for API providers) */
  apiKey?: string;
  /** Base URL (for localhost providers or custom endpoints) */
  baseURL?: string;
  /** Temperature (0-2) */
  temperature?: number;
  /** Max tokens for response */
  maxTokens?: number;
  /** Top P sampling */
  topP?: number;
}

/**
 * Result from creating a model
 */
export interface AISDKModelResult {
  /** The language model instance */
  model: LanguageModel;
  /** Provider configuration */
  config: AISDKProviderConfig;
}

/**
 * Options for streaming responses
 */
export type ImagePart = {
  type: "image";
  image: string;
  mimeType?: string;
};

export type TextPart = {
  type: "text";
  text: string;
};

export type ContentPart = TextPart | ImagePart;

export type MessageContent = string | ContentPart[];

export interface StreamMessage {
  role: "user" | "assistant" | "system";
  content: MessageContent;
}

export interface StreamOptions {
  provider: AISDKProviderName;
  model?: string;
  messages: StreamMessage[];
  systemPrompt?: string;
  accountId?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
  onChunk?: (text: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Result from streaming
 */
export interface StreamResult {
  /** Full response text */
  text: string;
  /** Token usage (if available) */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Finish reason */
  finishReason: "stop" | "length" | "tool-calls" | "error" | "other";
}

/**
 * Localhost model info for discovery
 */
export interface LocalhostModelInfo {
  /** Model ID */
  id: string;
  /** Display name */
  name: string;
  /** Size (e.g., "7B", "13B") */
  size?: string;
  /** Whether the model is currently running */
  running?: boolean;
}

/**
 * Provider registry type
 */
export type ProviderRegistry = Record<AISDKProviderName, AISDKProviderConfig>;
