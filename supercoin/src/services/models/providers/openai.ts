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
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider implements Provider {
  readonly name = "openai" as const;
  private readonly baseUrl = "https://api.openai.com/v1";

  private readonly models: ModelDefinition[] = [
    {
      id: "gpt-4o",
      name: "GPT-4o",
      contextWindow: 128000,
      capabilities: ["chat", "vision", "function_calling"],
      pricing: { input: 2.5, output: 10.0 },
    },
    {
      id: "gpt-4-turbo",
      name: "GPT-4 Turbo",
      contextWindow: 128000,
      capabilities: ["chat", "vision", "function_calling"],
      pricing: { input: 10.0, output: 30.0 },
    },
    {
      id: "o1",
      name: "o1",
      contextWindow: 128000,
      capabilities: ["chat", "reasoning"],
      pricing: { input: 15.0, output: 60.0 },
    },
    {
      id: "o1-mini",
      name: "o1-mini",
      contextWindow: 128000,
      capabilities: ["chat", "reasoning", "coding"],
      pricing: { input: 3.0, output: 12.0 },
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
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: this.convertMessages(request.messages, request.systemPrompt),
        max_tokens: config.maxTokens || 4096,
        temperature: config.temperature ?? 0.7,
        tools: request.tools ? this.convertTools(request.tools) : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { message?: string } };
      const message = error.error?.message || response.statusText;
      logger.error(`OpenAI API request failed`, new Error(message));
      throw new NetworkError(`OpenAI API error: ${message}`, "https://api.openai.com");
    }

    const data = await response.json() as OpenAIResponse;
    return this.convertResponse(data, config.model);
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
    const message = choice.message;

    return {
      content: message.content || "",
      toolCalls: message.tool_calls?.map((t) => ({
        id: t.id,
        name: t.function.name,
        arguments: JSON.parse(t.function.arguments),
      })),
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model,
      finishReason: choice.finish_reason === "stop" ? "stop" : "tool_calls",
    };
  }
}
