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

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: "text" | "tool_use";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  stop_reason: string;
}

export class AnthropicProvider implements Provider {
  readonly name = "anthropic" as const;
  private readonly baseUrl = "https://api.anthropic.com/v1";

  private readonly models: ModelDefinition[] = [
    {
      id: "claude-opus-4-5",
      name: "Claude Opus 4.5",
      contextWindow: 200000,
      capabilities: ["chat", "vision", "function_calling"],
      pricing: { input: 15.0, output: 75.0 },
    },
    {
      id: "claude-sonnet-4",
      name: "Claude Sonnet 4",
      contextWindow: 200000,
      capabilities: ["chat", "vision", "function_calling"],
      pricing: { input: 3.0, output: 15.0 },
    },
    {
      id: "claude-haiku-3-5",
      name: "Claude Haiku 3.5",
      contextWindow: 200000,
      capabilities: ["chat", "vision", "function_calling"],
      pricing: { input: 0.8, output: 4.0 },
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
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": token,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens || 4096,
        temperature: config.temperature ?? 0.7,
        system: request.systemPrompt,
        messages: this.convertMessages(request.messages),
        tools: request.tools ? this.convertTools(request.tools) : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { message?: string } };
      const message = error.error?.message || response.statusText;
      logger.error(`Anthropic API request failed`, new Error(message));
      throw new NetworkError(`Anthropic API error: ${message}`, "https://api.anthropic.com");
    }

    const data = await response.json() as AnthropicResponse;
    return this.convertResponse(data, config.model);
  }

  private convertMessages(messages: Message[]): AnthropicMessage[] {
    return messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
  }

  private convertTools(tools: ToolDefinition[]): AnthropicTool[] {
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));
  }

  private convertResponse(data: AnthropicResponse, model: string): AIResponse {
    const textContent = data.content.find((c) => c.type === "text");
    const toolUseContent = data.content.filter((c) => c.type === "tool_use");

    return {
      content: textContent?.text || "",
      toolCalls: toolUseContent.map((t) => ({
        id: t.id || "",
        name: t.name || "",
        arguments: t.input || {},
      })),
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      model,
      finishReason: data.stop_reason === "end_turn" ? "stop" : "tool_calls",
    };
  }
}
