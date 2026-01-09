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

interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

interface GeminiTool {
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}

interface GeminiFunctionCall {
  functionCall: {
    name: string;
    args: Record<string, unknown>;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }>;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GoogleProvider implements Provider {
  readonly name = "google" as const;
  private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  private readonly models: ModelDefinition[] = [
    {
      id: "gemini-3-pro",
      name: "Gemini 3 Pro",
      contextWindow: 2000000,
      capabilities: ["chat", "vision", "function_calling", "long_context"],
      pricing: { input: 1.25, output: 5.0 },
    },
    {
      id: "gemini-3-flash",
      name: "Gemini 3 Flash",
      contextWindow: 1000000,
      capabilities: ["chat", "vision", "function_calling", "long_context"],
      pricing: { input: 0.075, output: 0.3 },
    },
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      contextWindow: 1000000,
      capabilities: ["chat", "vision", "function_calling", "long_context"],
      pricing: { input: 0.075, output: 0.3 },
    },
    {
      id: "gemini-2.0-pro",
      name: "Gemini 2.0 Pro",
      contextWindow: 1000000,
      capabilities: ["chat", "vision", "function_calling", "long_context"],
      pricing: { input: 1.25, output: 5.0 },
    },
  ];

  isValidModel(model: string): boolean {
    return this.models.some((m) => m.id === model);
  }

  listModels(): ModelDefinition[] {
    return this.models;
  }

  getModelInfo(model: string): ModelDefinition | null {
    return this.models.find((m) => m.id === model) || null;
  }

  async complete(
    request: AIRequest,
    config: ModelConfig,
    token: string
  ): Promise<AIResponse> {
    const modelPath = `models/${config.model}`;
    const url = `${this.baseUrl}/${modelPath}:generateContent?key=${token}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: this.convertMessages(request.messages),
        systemInstruction: request.systemPrompt
          ? { parts: [{ text: request.systemPrompt }] }
          : undefined,
        generationConfig: {
          maxOutputTokens: config.maxTokens || 8192,
          temperature: config.temperature ?? 0.7,
        },
        tools: request.tools ? this.convertTools(request.tools) : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { message?: string } };
      const message = error.error?.message || response.statusText;
      logger.error(`Google AI API request failed`, new Error(message));
      throw new NetworkError(`Google AI API error: ${message}`, "https://generativelanguage.googleapis.com");
    }

    const data = await response.json() as GeminiResponse;
    return this.convertResponse(data, config.model);
  }

  private convertMessages(messages: Message[]): GeminiContent[] {
    return messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" as const : "user" as const,
        parts: [{ text: m.content }],
      }));
  }

  private convertTools(tools: ToolDefinition[]): GeminiTool[] {
    return [
      {
        functionDeclarations: tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      },
    ];
  }

  private convertResponse(data: GeminiResponse, model: string): AIResponse {
    const candidate = data.candidates[0];
    const content = candidate.content;
    const textPart = content.parts.find((p) => p.text);
    const functionCalls = content.parts.filter((p) => p.functionCall);

    return {
      content: textPart?.text || "",
      toolCalls: functionCalls.map((fc) => ({
        id: crypto.randomUUID(),
        name: fc.functionCall!.name,
        arguments: fc.functionCall!.args,
      })),
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
      model,
      finishReason:
        candidate.finishReason === "STOP"
          ? "stop"
          : candidate.finishReason === "FUNCTION_CALL"
          ? "tool_calls"
          : "stop",
    };
  }
}
