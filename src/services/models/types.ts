export type ProviderName =
  | "anthropic"
  | "openai"
  | "google"
  | "ollama"
  | "lmstudio"
  | "llamacpp"
  | "supercent"
  | "amazon-bedrock"
  | "azure"
  | "google-vertex"
  | "deepinfra"
  | "local";
export type AISDKProviderName = Exclude<ProviderName, "local">;
export type ModelCapability = "chat" | "vision" | "function_calling" | "reasoning" | "coding" | "long_context";

export interface ModelPricing {
  input: number;
  output: number;
}

export interface ModelDefinition {
  id: string;
  name: string;
  contextWindow: number;
  capabilities: ModelCapability[];
  pricing: ModelPricing;
}

export interface ModelInfo extends ModelDefinition {
  provider: ProviderName;
}

export interface ModelConfig {
  provider: ProviderName;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIRequest {
  messages: Message[];
  systemPrompt?: string;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: "stop" | "tool_calls" | "length" | "error";
}

export interface Provider {
  name: ProviderName;
  isValidModel(model: string): boolean;
  listModels(): ModelDefinition[];
  getModelInfo(model: string): ModelDefinition | null;
  complete(request: AIRequest, config: ModelConfig, token: string): Promise<AIResponse>;
}

export interface RouterConfig {
  defaultModel: string;
  fallbackModels: string[];
}
