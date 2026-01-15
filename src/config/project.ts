import { z } from "zod";
import { readFile } from "fs/promises";
import { join } from "path";
import type { AISDKProviderName } from "../services/models/ai-sdk/types";

const SuperCodeConfigSchema = z.object({
  provider: z.enum([
    "anthropic",
    "openai",
    "google",
    "ollama",
    "lmstudio",
    "llamacpp",
    "supercent",
    "amazon-bedrock",
    "azure",
    "google-vertex",
    "deepinfra",
  ]).default("ollama"),
  model: z.string().optional(),
  baseURL: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().default(4096),
  streaming: z.boolean().default(true),
});

export type SuperCodeConfig = z.infer<typeof SuperCodeConfigSchema>;

// Backward compatibility
export type SuperCoinConfig = SuperCodeConfig;
const SuperCoinConfigSchema = SuperCodeConfigSchema;

const CONFIG_FILENAMES = ["supercode.json", ".supercode.json", "supercoin.json", ".supercoin.json", "opencode.json", ".opencode.json"];

export async function loadProjectConfig(cwd: string = process.cwd()): Promise<SuperCodeConfig> {
  for (const filename of CONFIG_FILENAMES) {
    try {
      const configPath = join(cwd, filename);
      const content = await readFile(configPath, "utf-8");
      const parsed = JSON.parse(content);
      return SuperCodeConfigSchema.parse(parsed);
    } catch {
      continue;
    }
  }

  return SuperCodeConfigSchema.parse({});
}

export function getDefaultProvider(): AISDKProviderName {
  return "ollama";
}

export function getDefaultModel(provider: AISDKProviderName | "supercent"): string {
  const defaults: Record<AISDKProviderName | "supercent", string> = {
    anthropic: "claude-sonnet-4-5",
    openai: "gpt-4o",
    google: "gemini-2.0-flash",
    ollama: "rnj-1",
    lmstudio: "local-model",
    llamacpp: "local-model",
    supercent: "cent-1",
    "amazon-bedrock": "anthropic.claude-3-haiku-20240307-v1:0",
    azure: "gpt-4o",
    "google-vertex": "gemini-1.5-flash",
    deepinfra: "meta-llama/Meta-Llama-3.1-70B-Instruct",
  };
  return defaults[provider];
}

export async function resolveProviderFromConfig(cwd?: string, mode: "normal" | "ultrawork" = "normal"): Promise<{
  provider: AISDKProviderName | "supercent";
  model: string;
  baseURL?: string;
  temperature: number;
  maxTokens: number;
}> {
  const config = await loadProjectConfig(cwd);
  
  const provider = config.provider as AISDKProviderName | "supercent";
  let model = config.model || getDefaultModel(provider);
  let temperature = config.temperature;
  let maxTokens = config.maxTokens;

  if (mode === "ultrawork") {
    if (provider === "anthropic") model = "claude-3-5-sonnet-latest";
    if (provider === "openai") model = "gpt-4o";
    if (provider === "google") model = "gemini-2.0-flash-exp";
    if (provider === "supercent") model = "cent-1-ultra";
    
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

export { loadProjectConfig as loadOpenCodeConfig };
export type { SuperCodeConfig as OpenCodeConfig };
