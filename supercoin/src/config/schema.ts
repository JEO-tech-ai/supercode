/**
 * SuperCoin Configuration Schema
 * Zod-based configuration validation
 */
import { z } from "zod";

// Provider configuration
export const ProviderConfigSchema = z.object({
  enabled: z.boolean().default(true),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  defaultModel: z.string().optional(),
});

// Agent configuration
export const AgentConfigSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  disabled: z.boolean().optional(),
});

// Server configuration
export const ServerConfigSchema = z.object({
  port: z.number().min(1024).max(65535).default(3100),
  host: z.string().default("127.0.0.1"),
  autoStart: z.boolean().default(true),
});

// Main configuration schema
export const SuperCoinConfigSchema = z.object({
  // Default model
  default_model: z.string().default("anthropic/claude-sonnet-4"),

  // Fallback models
  fallback_models: z.array(z.string()).default([
    "openai/gpt-4o",
    "google/gemini-2.0-flash",
  ]),

  // Providers
  providers: z.object({
    anthropic: ProviderConfigSchema.optional(),
    openai: ProviderConfigSchema.optional(),
    google: ProviderConfigSchema.optional(),
  }).optional(),

  // Agents
  agents: z.record(z.string(), AgentConfigSchema).optional(),
  disabled_agents: z.array(z.string()).optional(),

  // Hooks
  disabled_hooks: z.array(z.string()).optional(),

  // Server
  server: ServerConfigSchema.optional(),

  // Experimental features
  experimental: z.object({
    preemptive_compaction: z.boolean().default(false),
    parallel_agents: z.boolean().default(true),
  }).optional(),
});

export type SuperCoinConfig = z.infer<typeof SuperCoinConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export function getDefaultConfig(): SuperCoinConfig {
  return SuperCoinConfigSchema.parse({});
}
