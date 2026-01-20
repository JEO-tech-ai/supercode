/**
 * Integration Tests for Ollama Provider
 * Tests the LocalProvider with Ollama-specific configurations
 * Uses mocked HTTP responses to test without a running Ollama server
 */

import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { LocalProvider } from "../../src/services/models/providers/local";

// Mock fetch globally
const originalFetch = globalThis.fetch;

describe("Ollama Provider Integration", () => {
  let provider: LocalProvider;
  let mockResponses: Map<string, Response>;

  beforeEach(() => {
    provider = new LocalProvider({
      baseUrl: "http://localhost:11434/v1",
      apiType: "ollama",
      skipAuth: true,
    });
    mockResponses = new Map();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  /**
   * Helper to mock fetch responses
   */
  function mockFetch(urlPattern: string, response: object, status = 200) {
    mockResponses.set(urlPattern, new Response(JSON.stringify(response), {
      status,
      headers: { "Content-Type": "application/json" },
    }));

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      for (const [pattern, resp] of mockResponses) {
        if (url.includes(pattern)) {
          // Clone response since it can only be consumed once
          return resp.clone();
        }
      }

      return new Response(JSON.stringify({ error: "Not mocked" }), { status: 404 });
    };
  }

  // ===========================================================================
  // Model Listing Tests
  // ===========================================================================

  describe("Model Listing", () => {
    test("should fetch models from Ollama API", async () => {
      mockFetch("/api/tags", {
        models: [
          {
            name: "llama3.3:latest",
            modified_at: "2024-01-15T00:00:00Z",
            size: 5000000000,
            details: {
              family: "llama",
              parameter_size: "70B",
              quantization_level: "Q4_0",
            },
          },
          {
            name: "codellama:7b",
            modified_at: "2024-01-14T00:00:00Z",
            size: 3500000000,
            details: {
              family: "llama",
              parameter_size: "7B",
              quantization_level: "Q4_0",
            },
          },
        ],
      });

      const models = await provider.fetchModels();

      expect(models.length).toBe(2);
      expect(models[0].id).toBe("llama3.3:latest");
      expect(models[1].id).toBe("codellama:7b");
    });

    test("should infer context window from model name", async () => {
      mockFetch("/api/tags", {
        models: [
          { name: "llama3.3:latest", details: {} },
          { name: "mistral:7b", details: {} },
          { name: "qwen2.5-coder:32b", details: {} },
          { name: "deepseek-coder-v2:latest", details: {} },
        ],
      });

      const models = await provider.fetchModels();

      const llama = models.find((m) => m.id === "llama3.3:latest");
      expect(llama?.contextWindow).toBe(128000);

      const mistral = models.find((m) => m.id === "mistral:7b");
      expect(mistral?.contextWindow).toBe(32768);

      const qwen = models.find((m) => m.id === "qwen2.5-coder:32b");
      expect(qwen?.contextWindow).toBe(32768);

      const deepseek = models.find((m) => m.id === "deepseek-coder-v2:latest");
      expect(deepseek?.contextWindow).toBe(64000);
    });

    test("should infer capabilities from model name", async () => {
      mockFetch("/api/tags", {
        models: [
          { name: "codellama:7b", details: {} },
          { name: "llava:13b", details: {} },
          { name: "mistral:latest", details: {} },
        ],
      });

      const models = await provider.fetchModels();

      const codellama = models.find((m) => m.id === "codellama:7b");
      expect(codellama?.capabilities).toContain("coding");

      const llava = models.find((m) => m.id === "llava:13b");
      expect(llava?.capabilities).toContain("vision");

      const mistral = models.find((m) => m.id === "mistral:latest");
      expect(mistral?.capabilities).toContain("chat");
      expect(mistral?.capabilities).not.toContain("coding");
    });

    test("should return default models when API fails", async () => {
      mockFetch("/api/tags", { error: "Connection refused" }, 500);

      const models = await provider.fetchModels();

      expect(models.length).toBeGreaterThan(0);
      expect(models.some((m) => m.id === "llama3.3:latest")).toBe(true);
    });

    test("should use cached models within TTL", async () => {
      let fetchCount = 0;

      globalThis.fetch = async () => {
        fetchCount++;
        return new Response(JSON.stringify({
          models: [{ name: "test-model:latest", details: {} }],
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      // First fetch populates cache
      await provider.fetchModels();
      expect(fetchCount).toBe(1);

      // Subsequent calls to listModels() use cache (without async fetch)
      provider.listModels();
      provider.listModels();

      // Cache is used, so no additional fetches
      expect(fetchCount).toBe(1);
    });
  });

  // ===========================================================================
  // Completion Tests
  // ===========================================================================

  describe("Completions", () => {
    test("should send completion request to Ollama", async () => {
      let capturedRequest: { url: string; body: string } | null = null;

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url.includes("/chat/completions")) {
          capturedRequest = {
            url,
            body: init?.body as string,
          };

          return new Response(JSON.stringify({
            choices: [
              {
                message: { content: "Hello! How can I help you today?" },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 8,
              total_tokens: 18,
            },
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
      };

      const response = await provider.complete(
        {
          messages: [{ role: "user", content: "Hello" }],
        },
        {
          model: "llama3.3:latest",
          maxTokens: 1000,
          temperature: 0.7,
        },
        ""
      );

      expect(capturedRequest).not.toBeNull();
      expect(capturedRequest!.url).toContain("/chat/completions");

      const requestBody = JSON.parse(capturedRequest!.body);
      expect(requestBody.model).toBe("llama3.3:latest");
      expect(requestBody.max_tokens).toBe(1000);
      expect(requestBody.temperature).toBe(0.7);

      expect(response.content).toBe("Hello! How can I help you today?");
      expect(response.usage.totalTokens).toBe(18);
      expect(response.finishReason).toBe("stop");
    });

    test("should include system prompt in messages", async () => {
      let capturedBody: Record<string, unknown> | null = null;

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response(JSON.stringify({
          choices: [{ message: { content: "Response" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      await provider.complete(
        {
          messages: [{ role: "user", content: "Hello" }],
          systemPrompt: "You are a helpful assistant.",
        },
        { model: "llama3.3:latest" },
        ""
      );

      expect(capturedBody).not.toBeNull();
      const messages = capturedBody!.messages as Array<{ role: string; content: string }>;
      expect(messages[0].role).toBe("system");
      expect(messages[0].content).toBe("You are a helpful assistant.");
      expect(messages[1].role).toBe("user");
    });

    test("should handle tool calls", async () => {
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "call_123",
                    function: {
                      name: "get_weather",
                      arguments: JSON.stringify({ location: "Tokyo" }),
                    },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: { prompt_tokens: 20, completion_tokens: 15, total_tokens: 35 },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const response = await provider.complete(
        {
          messages: [{ role: "user", content: "What's the weather in Tokyo?" }],
          tools: [
            {
              name: "get_weather",
              description: "Get weather for a location",
              parameters: {
                type: "object",
                properties: {
                  location: { type: "string" },
                },
              },
            },
          ],
        },
        { model: "llama3.3:latest" },
        ""
      );

      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls?.length).toBe(1);
      expect(response.toolCalls?.[0].name).toBe("get_weather");
      expect(response.toolCalls?.[0].arguments).toEqual({ location: "Tokyo" });
    });

    test("should handle API errors gracefully", async () => {
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({
          error: { message: "Model not found" },
        }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      };

      await expect(
        provider.complete(
          { messages: [{ role: "user", content: "Hello" }] },
          { model: "nonexistent-model" },
          ""
        )
      ).rejects.toThrow();
    });

    test("should handle network errors", async () => {
      globalThis.fetch = async () => {
        throw new Error("ECONNREFUSED");
      };

      await expect(
        provider.complete(
          { messages: [{ role: "user", content: "Hello" }] },
          { model: "llama3.3:latest" },
          ""
        )
      ).rejects.toThrow(/Failed to connect/);
    });
  });

  // ===========================================================================
  // Availability Tests
  // ===========================================================================

  describe("Server Availability", () => {
    test("should detect Ollama server availability", async () => {
      mockFetch("/api/tags", { models: [] });

      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    test("should return false when server is unavailable", async () => {
      globalThis.fetch = async () => {
        throw new Error("ECONNREFUSED");
      };

      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });

    test("should return false when connection times out", async () => {
      // Mock fetch to throw AbortError (simulating timeout)
      globalThis.fetch = async () => {
        const error = new Error("The operation was aborted");
        error.name = "AbortError";
        throw error;
      };

      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });
  });

  // ===========================================================================
  // Configuration Tests
  // ===========================================================================

  describe("Configuration", () => {
    test("should strip /v1 suffix for Ollama API calls", async () => {
      let capturedUrl = "";

      globalThis.fetch = async (input: RequestInfo | URL) => {
        capturedUrl = typeof input === "string" ? input : input.toString();
        return new Response(JSON.stringify({ models: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      await provider.fetchModels();

      // Should call /api/tags without /v1
      expect(capturedUrl).toBe("http://localhost:11434/api/tags");
    });

    test("should use /v1 for chat completions", async () => {
      let capturedUrl = "";

      globalThis.fetch = async (input: RequestInfo | URL) => {
        capturedUrl = typeof input === "string" ? input : input.toString();
        return new Response(JSON.stringify({
          choices: [{ message: { content: "Hi" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      await provider.complete(
        { messages: [{ role: "user", content: "Hi" }] },
        { model: "llama3.3:latest" },
        ""
      );

      expect(capturedUrl).toBe("http://localhost:11434/v1/chat/completions");
    });

    test("should update configuration dynamically", async () => {
      provider.updateConfig({
        baseUrl: "http://192.168.1.100:11434/v1",
        defaultContextWindow: 16384,
      });

      const info = provider.getModelInfo("custom-model");
      expect(info?.contextWindow).toBe(16384);
    });
  });
});

// ===========================================================================
// Ollama-specific Model Tests
// ===========================================================================

describe("Ollama Model Specifics", () => {
  test("should handle quantized model names", () => {
    const provider = new LocalProvider({ apiType: "ollama" });

    // Various quantization formats
    const models = [
      "llama3.3:70b-instruct-q4_0",
      "mistral:7b-instruct-q8_0",
      "codellama:13b-code-q5_k_m",
    ];

    for (const model of models) {
      expect(provider.isValidModel(model)).toBe(true);
      const info = provider.getModelInfo(model);
      expect(info).not.toBeNull();
    }
  });

  test("should handle model tags", () => {
    const provider = new LocalProvider({ apiType: "ollama" });

    const modelTags = [
      "llama3.3:latest",
      "llama3.3:70b",
      "llama3.3:70b-instruct",
      "codellama:7b-code",
      "codellama:13b-python",
    ];

    for (const tag of modelTags) {
      expect(provider.isValidModel(tag)).toBe(true);
    }
  });

  test("should return correct names for known models", () => {
    const provider = new LocalProvider({ apiType: "ollama" });

    // Known default models have predefined names
    const info1 = provider.getModelInfo("qwen2.5-coder:latest");
    expect(info1?.name).toBe("Qwen 2.5 Coder");

    const info2 = provider.getModelInfo("deepseek-coder-v2:latest");
    expect(info2?.name).toBe("DeepSeek Coder V2");

    // Unknown models get formatted names (split by - and _)
    const info3 = provider.getModelInfo("custom-model-name:latest");
    expect(info3?.name).toBe("Custom Model Name");
  });

  test("should have zero pricing for all models", () => {
    const provider = new LocalProvider({ apiType: "ollama" });

    const models = provider.listModels();
    for (const model of models) {
      expect(model.pricing.input).toBe(0);
      expect(model.pricing.output).toBe(0);
    }
  });
});
