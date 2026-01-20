/**
 * Integration Tests for LM Studio Provider
 * Tests the LocalProvider with LM Studio (OpenAI-compatible) configurations
 * Uses mocked HTTP responses to test without a running LM Studio server
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { LocalProvider } from "../../src/services/models/providers/local";

// Store original fetch
const originalFetch = globalThis.fetch;

describe("LM Studio Provider Integration", () => {
  let provider: LocalProvider;

  beforeEach(() => {
    provider = new LocalProvider({
      baseUrl: "http://localhost:1234/v1",
      apiType: "openai-compatible",
      skipAuth: true,
      defaultContextWindow: 4096,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ===========================================================================
  // Model Listing Tests (OpenAI-compatible API)
  // ===========================================================================

  describe("Model Listing (OpenAI-compatible)", () => {
    test("should fetch models from /v1/models endpoint", async () => {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url.includes("/v1/models")) {
          return new Response(JSON.stringify({
            object: "list",
            data: [
              { id: "TheBloke/Llama-2-7B-Chat-GGUF", object: "model", owned_by: "user" },
              { id: "microsoft/phi-2-GGUF", object: "model", owned_by: "user" },
              { id: "codellama-7b-instruct.Q4_K_M.gguf", object: "model", owned_by: "user" },
            ],
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
      };

      const models = await provider.fetchModels();

      expect(models.length).toBe(3);
      expect(models[0].id).toBe("TheBloke/Llama-2-7B-Chat-GGUF");
      expect(models[1].id).toBe("microsoft/phi-2-GGUF");
      expect(models[2].id).toBe("codellama-7b-instruct.Q4_K_M.gguf");
    });

    test("should use default context window for LM Studio models", async () => {
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({
          object: "list",
          data: [
            { id: "custom-model-gguf", object: "model" },
          ],
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const models = await provider.fetchModels();

      // LM Studio models use the configured default context window
      expect(models[0].contextWindow).toBe(4096);
    });

    test("should format GGUF model names", async () => {
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({
          object: "list",
          data: [
            { id: "llama-2-7b-chat.Q4_K_M.gguf", object: "model" },
          ],
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const models = await provider.fetchModels();
      expect(models[0].name).toBeDefined();
    });

    test("should return defaults when LM Studio is not running", async () => {
      globalThis.fetch = async () => {
        throw new Error("ECONNREFUSED");
      };

      const models = await provider.fetchModels();

      // Should return default models
      expect(models.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Completion Tests (OpenAI-compatible API)
  // ===========================================================================

  describe("Completions (OpenAI-compatible)", () => {
    test("should send completion request to LM Studio", async () => {
      let capturedRequest: { url: string; body: Record<string, unknown> } | null = null;

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url.includes("/chat/completions")) {
          capturedRequest = {
            url,
            body: JSON.parse(init?.body as string),
          };

          return new Response(JSON.stringify({
            id: "chatcmpl-123",
            object: "chat.completion",
            created: Date.now(),
            model: "local-model",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: "I'm running locally via LM Studio!",
                },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 15,
              completion_tokens: 10,
              total_tokens: 25,
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
          messages: [
            { role: "user", content: "Are you running locally?" },
          ],
        },
        {
          model: "local-model",
          maxTokens: 500,
          temperature: 0.8,
        },
        ""
      );

      expect(capturedRequest).not.toBeNull();
      expect(capturedRequest!.url).toBe("http://localhost:1234/v1/chat/completions");
      expect(capturedRequest!.body.model).toBe("local-model");
      expect(capturedRequest!.body.max_tokens).toBe(500);
      expect(capturedRequest!.body.temperature).toBe(0.8);
      expect(capturedRequest!.body.stream).toBe(false);

      expect(response.content).toBe("I'm running locally via LM Studio!");
      expect(response.usage.totalTokens).toBe(25);
      expect(response.model).toBe("local-model");
    });

    test("should handle multi-turn conversations", async () => {
      let capturedMessages: Array<{ role: string; content: string }> = [];

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(init?.body as string);
        capturedMessages = body.messages;

        return new Response(JSON.stringify({
          choices: [
            {
              message: { role: "assistant", content: "The capital of France is Paris." },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      await provider.complete(
        {
          messages: [
            { role: "user", content: "Hi!" },
            { role: "assistant", content: "Hello! How can I help you?" },
            { role: "user", content: "What's the capital of France?" },
          ],
          systemPrompt: "You are a helpful geography assistant.",
        },
        { model: "local-model" },
        ""
      );

      expect(capturedMessages.length).toBe(4);
      expect(capturedMessages[0].role).toBe("system");
      expect(capturedMessages[1].role).toBe("user");
      expect(capturedMessages[2].role).toBe("assistant");
      expect(capturedMessages[3].role).toBe("user");
    });

    test("should not include auth header when skipAuth is true", async () => {
      let capturedHeaders: Record<string, string> = {};

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedHeaders = Object.fromEntries(
          Object.entries(init?.headers || {})
        ) as Record<string, string>;

        return new Response(JSON.stringify({
          choices: [{ message: { content: "Response" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      await provider.complete(
        { messages: [{ role: "user", content: "Test" }] },
        { model: "local-model" },
        "some-token"
      );

      // Should not have Authorization header since skipAuth is true
      expect(capturedHeaders.Authorization).toBeUndefined();
    });

    test("should include auth header when skipAuth is false", async () => {
      const authProvider = new LocalProvider({
        baseUrl: "http://localhost:1234/v1",
        apiType: "openai-compatible",
        skipAuth: false,
      });

      let capturedHeaders: Record<string, string> = {};

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedHeaders = Object.fromEntries(
          Object.entries(init?.headers || {})
        ) as Record<string, string>;

        return new Response(JSON.stringify({
          choices: [{ message: { content: "Response" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      await authProvider.complete(
        { messages: [{ role: "user", content: "Test" }] },
        { model: "local-model" },
        "api-key-123"
      );

      expect(capturedHeaders.Authorization).toBe("Bearer api-key-123");
    });

    test("should handle empty response gracefully", async () => {
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({
          choices: [
            {
              message: { content: null },
              finish_reason: "stop",
            },
          ],
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const response = await provider.complete(
        { messages: [{ role: "user", content: "Test" }] },
        { model: "local-model" },
        ""
      );

      expect(response.content).toBe("");
    });

    test("should handle LM Studio error responses", async () => {
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({
          error: {
            message: "Model not loaded. Please load a model first.",
            type: "invalid_request_error",
            code: "model_not_loaded",
          },
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      };

      await expect(
        provider.complete(
          { messages: [{ role: "user", content: "Test" }] },
          { model: "unloaded-model" },
          ""
        )
      ).rejects.toThrow(/Model not loaded/);
    });
  });

  // ===========================================================================
  // Server Availability Tests
  // ===========================================================================

  describe("Server Availability", () => {
    test("should check OpenAI-compatible endpoint for availability", async () => {
      let checkedUrl = "";

      globalThis.fetch = async (input: RequestInfo | URL) => {
        checkedUrl = typeof input === "string" ? input : input.toString();

        if (checkedUrl.includes("/models")) {
          return new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        throw new Error("Not found");
      };

      const available = await provider.isAvailable();

      expect(available).toBe(true);
    });

    test("should fallback to OpenAI endpoint if Ollama fails", async () => {
      const checkedUrls: string[] = [];

      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        checkedUrls.push(url);

        if (url.includes("/api/tags")) {
          throw new Error("Not Ollama");
        }

        if (url.includes("/models")) {
          return new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        throw new Error("Unknown");
      };

      const available = await provider.isAvailable();

      expect(available).toBe(true);
      expect(checkedUrls.some((u) => u.includes("/models"))).toBe(true);
    });
  });

  // ===========================================================================
  // Configuration Tests
  // ===========================================================================

  describe("Configuration", () => {
    test("should use custom port", async () => {
      const customProvider = new LocalProvider({
        baseUrl: "http://localhost:5555/v1",
        apiType: "openai-compatible",
      });

      let capturedUrl = "";

      globalThis.fetch = async (input: RequestInfo | URL) => {
        capturedUrl = typeof input === "string" ? input : input.toString();
        return new Response(JSON.stringify({
          choices: [{ message: { content: "OK" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      await customProvider.complete(
        { messages: [{ role: "user", content: "Hi" }] },
        { model: "test-model" },
        ""
      );

      expect(capturedUrl).toContain("localhost:5555");
    });

    test("should support remote LM Studio servers", async () => {
      const remoteProvider = new LocalProvider({
        baseUrl: "http://192.168.1.100:1234/v1",
        apiType: "openai-compatible",
        skipAuth: false,
      });

      let capturedUrl = "";

      globalThis.fetch = async (input: RequestInfo | URL) => {
        capturedUrl = typeof input === "string" ? input : input.toString();
        return new Response(JSON.stringify({
          choices: [{ message: { content: "Remote response" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const response = await remoteProvider.complete(
        { messages: [{ role: "user", content: "Hi" }] },
        { model: "remote-model" },
        "secret-key"
      );

      expect(capturedUrl).toContain("192.168.1.100:1234");
      expect(response.content).toBe("Remote response");
    });

    test("should update context window via config", () => {
      provider.updateConfig({ defaultContextWindow: 8192 });

      const info = provider.getModelInfo("new-model");
      expect(info?.contextWindow).toBe(8192);
    });
  });
});

// ===========================================================================
// LM Studio Specific Features
// ===========================================================================

describe("LM Studio Specific Features", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("should handle GGUF model file names", () => {
    const provider = new LocalProvider({
      baseUrl: "http://localhost:1234/v1",
      apiType: "openai-compatible",
    });

    const modelNames = [
      "llama-2-7b.Q4_K_M.gguf",
      "mistral-7b-instruct-v0.2.Q5_K_S.gguf",
      "phi-2.Q8_0.gguf",
      "codellama-13b-instruct.Q4_0.gguf",
    ];

    for (const name of modelNames) {
      expect(provider.isValidModel(name)).toBe(true);
      const info = provider.getModelInfo(name);
      expect(info).not.toBeNull();
    }
  });

  test("should handle HuggingFace-style model paths", () => {
    const provider = new LocalProvider({
      baseUrl: "http://localhost:1234/v1",
      apiType: "openai-compatible",
    });

    const modelPaths = [
      "TheBloke/Llama-2-7B-Chat-GGUF",
      "microsoft/phi-2",
      "meta-llama/Llama-2-7b-chat-hf",
      "codellama/CodeLlama-7b-Instruct-hf",
    ];

    for (const path of modelPaths) {
      expect(provider.isValidModel(path)).toBe(true);
    }
  });

  test("should return default capabilities for unknown models", () => {
    const provider = new LocalProvider({
      baseUrl: "http://localhost:1234/v1",
      apiType: "openai-compatible",
    });

    // Unknown models get default "chat" capability
    // (capability inference is not used for getModelInfo generic fallback)
    const coderInfo = provider.getModelInfo("codellama-7b-instruct.Q4_K_M.gguf");
    expect(coderInfo?.capabilities).toContain("chat");

    const chatInfo = provider.getModelInfo("llama-2-7b-chat.Q4_K_M.gguf");
    expect(chatInfo?.capabilities).toContain("chat");

    // Known default models have proper capabilities
    const qwenCoder = provider.getModelInfo("qwen2.5-coder:latest");
    expect(qwenCoder?.capabilities).toContain("coding");
  });

  test("should have zero pricing for local models", () => {
    const provider = new LocalProvider({
      baseUrl: "http://localhost:1234/v1",
      apiType: "openai-compatible",
    });

    const info = provider.getModelInfo("any-local-model");
    expect(info?.pricing.input).toBe(0);
    expect(info?.pricing.output).toBe(0);
  });
});

// ===========================================================================
// llama.cpp Server Compatibility
// ===========================================================================

describe("llama.cpp Server Compatibility", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("should work with llama.cpp server on port 8080", async () => {
    const llamaCppProvider = new LocalProvider({
      baseUrl: "http://localhost:8080/v1",
      apiType: "openai-compatible",
      skipAuth: true,
    });

    let capturedUrl = "";

    globalThis.fetch = async (input: RequestInfo | URL) => {
      capturedUrl = typeof input === "string" ? input : input.toString();

      return new Response(JSON.stringify({
        choices: [
          {
            message: { content: "Response from llama.cpp" },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const response = await llamaCppProvider.complete(
      { messages: [{ role: "user", content: "Hello" }] },
      { model: "llama-2-7b" },
      ""
    );

    expect(capturedUrl).toContain("localhost:8080");
    expect(response.content).toBe("Response from llama.cpp");
  });

  test("should handle llama.cpp specific response format", async () => {
    const llamaCppProvider = new LocalProvider({
      baseUrl: "http://localhost:8080/v1",
      apiType: "openai-compatible",
    });

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        id: "cmpl-abc123",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "llama-2-7b",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "I am running on llama.cpp server.",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 8,
          total_tokens: 20,
        },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const response = await llamaCppProvider.complete(
      { messages: [{ role: "user", content: "What server are you running on?" }] },
      { model: "llama-2-7b" },
      ""
    );

    expect(response.content).toBe("I am running on llama.cpp server.");
    expect(response.usage.promptTokens).toBe(12);
    expect(response.usage.completionTokens).toBe(8);
  });
});
