import { z } from "zod";

const LocalhostProviderSchema = z.object({
  enabled: z.boolean().default(true),
  baseUrl: z.string().default("http://localhost:11434/v1"),
  defaultModel: z.string().optional(),
});

export const SuperCoinConfigSchema = z.object({
  default_model: z.string().default("anthropic/claude-sonnet-4-5"),
  fallback_models: z.array(z.string()).default([]),
  providers: z.object({
    anthropic: z.object({
      enabled: z.boolean().default(true),
      apiKey: z.string().optional(),
      baseUrl: z.string().url().default("https://api.anthropic.com"),
    }).optional(),
    openai: z.object({
      enabled: z.boolean().default(true),
      apiKey: z.string().optional(),
      baseUrl: z.string().url().default("https://api.openai.com"),
    }).optional(),
    google: z.object({
      enabled: z.boolean().default(true),
      apiKey: z.string().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      baseUrl: z.string().url().default("https://generativelanguage.googleapis.com"),
    }).optional(),
    ollama: LocalhostProviderSchema.extend({
      baseUrl: z.string().default("http://localhost:11434/v1"),
      defaultModel: z.string().default("llama3.2"),
    }).optional(),
    lmstudio: LocalhostProviderSchema.extend({
      baseUrl: z.string().default("http://localhost:1234/v1"),
      defaultModel: z.string().default("local-model"),
    }).optional(),
    llamacpp: LocalhostProviderSchema.extend({
      baseUrl: z.string().default("http://localhost:8080/v1"),
      defaultModel: z.string().default("local-model"),
    }).optional(),
  }).optional(),
  agents: z.record(z.object({
    model: z.string().optional(),
    disabled: z.boolean().optional(),
  })).optional(),
  disabled_hooks: z.array(z.string()).default([]),
  server: z.object({
    port: z.number().int().min(1).max(65535).default(3100),
    host: z.string().default("127.0.0.1"),
    autoStart: z.boolean().default(true),
  }).optional(),
});

export type SuperCoinConfig = z.infer<typeof SuperCoinConfigSchema>;

export function getDefaultConfig(): SuperCoinConfig {
  return {
    default_model: "anthropic/claude-sonnet-4-5",
    fallback_models: [],
    providers: {
      anthropic: {
        enabled: true,
        baseUrl: "https://api.anthropic.com",
      },
    },
    disabled_hooks: [],
    server: {
      port: 3100,
      host: "127.0.0.1",
      autoStart: true,
    },
  };
}
