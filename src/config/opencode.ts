import { z } from "zod";
import { readFile } from "fs/promises";
import { join } from "path";
import type { AISDKProviderName } from "../services/models/ai-sdk/types";

const OpenCodeConfigSchema = z.object({
  provider: z.enum(["anthropic", "openai", "google", "ollama", "lmstudio", "llamacpp"]).default("ollama"),
  model: z.string().optional(),
  baseURL: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().default(4096),
  streaming: z.boolean().default(true),
});

export type OpenCodeConfig = z.infer<typeof OpenCodeConfigSchema>;

const CONFIG_FILENAMES = ["opencode.json", ".opencode.json", "supercoin.json"];

export async function loadOpenCodeConfig(cwd: string = process.cwd()): Promise<OpenCodeConfig> {
  for (const filename of CONFIG_FILENAMES) {
    try {
      const configPath = join(cwd, filename);
      const content = await readFile(configPath, "utf-8");
      const parsed = JSON.parse(content);
      return OpenCodeConfigSchema.parse(parsed);
    } catch {
      continue;
    }
  }

  return OpenCodeConfigSchema.parse({});
}

export function getDefaultProvider(): AISDKProviderName {
  return "ollama";
}

export function getDefaultModel(provider: AISDKProviderName): string {
  const defaults: Record<AISDKProviderName, string> = {
    anthropic: "claude-sonnet-4-5",
    openai: "gpt-4o",
    google: "gemini-2.0-flash",
    ollama: "rnj-1",
    lmstudio: "local-model",
    llamacpp: "local-model",
    supercent: "supercent-1",
  };
  return defaults[provider];
}

export async function resolveProviderFromConfig(cwd?: string, mode: "normal" | "ultrawork" = "normal"): Promise<{
  provider: AISDKProviderName;
  model: string;
  baseURL?: string;
  temperature: number;
  maxTokens: number;
}> {
  const config = await loadOpenCodeConfig(cwd);
  
  const provider = config.provider as AISDKProviderName;
  let model = config.model || getDefaultModel(provider);
  let temperature = config.temperature;
  let maxTokens = config.maxTokens;

  if (mode === "ultrawork") {
    if (provider === "anthropic") model = "claude-3-5-sonnet-latest";
    if (provider === "openai") model = "gpt-4o";
    if (provider === "google") model = "gemini-2.0-flash-exp";
    
    temperature = 0.2;
    maxTokens = 8192;
  }

  return {
    provider,
    model,
    baseURL: config.baseURL,
    temperature,
    maxTokens,
  };
}
