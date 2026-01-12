import { z } from "zod";

const LocalhostProviderSchema = z.object({
  enabled: z.boolean().default(true),
  baseUrl: z.string().default("http://localhost:11434/v1"),
  defaultModel: z.string().optional(),
});

export const SuperCodeConfigSchema = z.object({
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
      defaultModel: z.string().default("rnj-1"),
    }).optional(),
    lmstudio: LocalhostProviderSchema.extend({
      baseUrl: z.string().default("http://localhost:1234/v1"),
      defaultModel: z.string().default("local-model"),
    }).optional(),
    llamacpp: LocalhostProviderSchema.extend({
      baseUrl: z.string().default("http://localhost:8080/v1"),
      defaultModel: z.string().default("local-model"),
    }).optional(),
    local: LocalhostProviderSchema.extend({
      baseUrl: z.string().default("http://localhost:11434/v1"),
      defaultModel: z.string().default("llama3.3:latest"),
      apiType: z.enum(["ollama", "openai-compatible"]).default("ollama"),
      skipAuth: z.boolean().default(true),
    }).optional(),
  }).optional(),
  agents: z.record(z.object({
    model: z.string().optional(),
    disabled: z.boolean().optional(),
  })).optional(),
  orchestrator: z.object({
    enabled: z.boolean().default(true),
    defaultOrchestrator: z.enum(["sisyphus", "cent"]).default("cent"),
    costAwareness: z.boolean().default(true),
    specialists: z.object({
      explore: z.boolean().default(true),
      oracle: z.boolean().default(true),
      librarian: z.boolean().default(true),
      frontendEngineer: z.boolean().default(true),
      documentWriter: z.boolean().default(true),
      multimodalLooker: z.boolean().default(true),
    }).optional(),
    models: z.object({
      free: z.string().default("claude-3-5-haiku-latest"),
      cheap: z.string().default("claude-sonnet-4-20250514"),
      expensive: z.string().default("claude-opus-4-20250514"),
    }).optional(),
  }).optional(),
  disabled_hooks: z.array(z.string()).default([]),
  hooks: z.object({
    sessionLifecycle: z.boolean().default(true),
    contextWindowMonitor: z.boolean().default(true),
    toolCallMonitor: z.boolean().default(true),
    outputTruncator: z.boolean().default(true),
    thinkingValidator: z.boolean().default(true),
    rulesInjector: z.boolean().default(true),
    readmeInjector: z.boolean().default(false),
    sessionRecovery: z.boolean().default(true),
    editErrorRecovery: z.boolean().default(true),
    contextLimitRecovery: z.boolean().default(true),
    preemptiveCompaction: z.boolean().default(true),
    promptContextInjector: z.boolean().default(true),
    sessionNotification: z.boolean().default(false),
    commentChecker: z.boolean().default(true),
    directoryAgentsInjector: z.boolean().default(true),
    emptyTaskResponseDetector: z.boolean().default(true),
    thinkMode: z.boolean().default(true),
    keywordDetector: z.boolean().default(true),
    autoSlashCommand: z.boolean().default(true),
    backgroundNotification: z.boolean().default(true),
    ralphLoop: z.boolean().default(false),
    interactiveBashSession: z.boolean().default(true),
    nonInteractiveEnv: z.boolean().default(true),
    emptyMessageSanitizer: z.boolean().default(true),
    agentUsageReminder: z.boolean().default(true),
    compactionContextInjector: z.boolean().default(true),
    debug: z.boolean().default(false),
  }).optional(),
  server: z.object({
    port: z.number().int().min(1).max(65535).default(3100),
    host: z.string().default("127.0.0.1"),
    autoStart: z.boolean().default(true),
  }).optional(),
});

export type SuperCodeConfig = z.infer<typeof SuperCodeConfigSchema>;

// Backward compatibility
export type SuperCoinConfig = SuperCodeConfig;
export const SuperCoinConfigSchema = SuperCodeConfigSchema;

export function getDefaultConfig(): SuperCodeConfig {
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
