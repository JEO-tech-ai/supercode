import { Hono } from "hono";
import { z } from "zod";
import { getModelRouter } from "../../services/models/router";
import type { ProviderName } from "../../services/models/types";

const ProviderConfigSchema = z.object({
  provider: z.enum(["anthropic", "openai", "google", "local"]),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  enabled: z.boolean().optional(),
});

const SetModelSchema = z.object({
  model: z.string(),
});

interface ProviderRuntimeConfig {
  apiKey?: string;
  baseUrl?: string;
  enabled: boolean;
}

const runtimeProviderConfigs = new Map<ProviderName, ProviderRuntimeConfig>([
  ["anthropic", { enabled: true }],
  ["openai", { enabled: true }],
  ["google", { enabled: true }],
  ["local", { enabled: true }],
]);

const ENV_KEY_MAP: Record<ProviderName, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
  local: "",
};

export function createProviderConfigRoutes(): Hono {
  const app = new Hono();

  app.get("/", (c) => {
    const providers = Array.from(runtimeProviderConfigs.entries()).map(
      ([name, config]) => ({
        name,
        ...config,
        hasApiKey: !!config.apiKey,
      })
    );

    return c.json({
      providers,
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/:name", (c) => {
    const name = c.req.param("name") as ProviderName;
    const config = runtimeProviderConfigs.get(name);

    if (!config) {
      return c.json({ error: `Unknown provider: ${name}` }, 404);
    }

    return c.json({
      name,
      ...config,
      hasApiKey: !!config.apiKey,
    });
  });

  app.post("/:name", async (c) => {
    const name = c.req.param("name") as ProviderName;
    
    try {
      const body = await c.req.json();
      const validated = ProviderConfigSchema.partial().parse(body);

      const existing = runtimeProviderConfigs.get(name) || { enabled: true };
      
      const updated: ProviderRuntimeConfig = {
        ...existing,
        ...(validated.apiKey !== undefined && { apiKey: validated.apiKey }),
        ...(validated.baseUrl !== undefined && { baseUrl: validated.baseUrl }),
        ...(validated.enabled !== undefined && { enabled: validated.enabled }),
      };

      runtimeProviderConfigs.set(name, updated);

      if (validated.apiKey) {
        const envKey = ENV_KEY_MAP[name];
        if (envKey) {
          process.env[envKey] = validated.apiKey;
        }
      }

      return c.json({
        success: true,
        provider: name,
        config: {
          ...updated,
          hasApiKey: !!updated.apiKey,
          apiKey: undefined,
        },
        message: `Provider ${name} configured successfully`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          error: "Invalid configuration",
          details: error.errors,
        }, 400);
      }
      throw error;
    }
  });

  app.delete("/:name", (c) => {
    const name = c.req.param("name") as ProviderName;

    if (!runtimeProviderConfigs.has(name)) {
      return c.json({ error: `Unknown provider: ${name}` }, 404);
    }

    runtimeProviderConfigs.set(name, { enabled: true });

    const envKey = ENV_KEY_MAP[name];
    if (envKey && process.env[envKey]) {
      delete process.env[envKey];
    }

    return c.json({
      success: true,
      provider: name,
      message: `Provider ${name} configuration reset`,
    });
  });

  app.post("/model", async (c) => {
    try {
      const body = await c.req.json();
      const { model } = SetModelSchema.parse(body);

      const router = getModelRouter();
      
      const isLocalModel = model.startsWith("local/") || 
                           ["llama", "qwen", "deepseek", "mistral", "local"].includes(model);

      if (!isLocalModel) {
        const provider = model.split("/")[0] as ProviderName;
        const config = runtimeProviderConfigs.get(provider);
        
        if (!config?.apiKey && provider !== "local") {
          return c.json({
            error: `No API key configured for ${provider}`,
            hint: `POST /provider/${provider} with { "apiKey": "your-key" }`,
          }, 401);
        }
      }

      await router.setModel(model);

      return c.json({
        success: true,
        model: router.getCurrentModel(),
        message: `Model set to ${model}`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          error: "Invalid request",
          details: error.errors,
        }, 400);
      }
      if (error instanceof Error) {
        return c.json({
          error: error.message,
        }, 400);
      }
      throw error;
    }
  });

  app.get("/model", (c) => {
    const router = getModelRouter();
    return c.json({
      current: router.getCurrentModel(),
      available: router.listModels(),
    });
  });

  app.get("/models", (c) => {
    const router = getModelRouter();
    const models = router.listModels();
    
    const grouped = models.reduce((acc, model) => {
      const provider = model.provider || "unknown";
      if (!acc[provider]) {
        acc[provider] = [];
      }
      acc[provider].push(model);
      return acc;
    }, {} as Record<string, typeof models>);

    return c.json({
      models: grouped,
      total: models.length,
    });
  });

  return app;
}

export function getProviderRuntimeConfig(name: ProviderName): ProviderRuntimeConfig | undefined {
  return runtimeProviderConfigs.get(name);
}

export function setProviderRuntimeConfig(name: ProviderName, config: Partial<ProviderRuntimeConfig>): void {
  const existing = runtimeProviderConfigs.get(name) || { enabled: true };
  runtimeProviderConfigs.set(name, { ...existing, ...config });
}
