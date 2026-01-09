/**
 * Configuration Loader
 * Loads and merges configuration from multiple sources
 */
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { SuperCoinConfigSchema, type SuperCoinConfig } from "./schema";

const CONFIG_FILENAME = "config.json";

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== null &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[Extract<keyof T, string>];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }

  return result;
}

/**
 * Try to read and parse a JSON config file
 */
async function tryReadConfig(filePath: string): Promise<Record<string, unknown> | null> {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = await readFile(filePath, "utf-8");
    // Support JSONC (JSON with comments)
    const cleaned = content
      .replace(/\/\/.*$/gm, "") // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments
    return JSON.parse(cleaned);
  } catch (error) {
    console.error(`Error reading config from ${filePath}:`, error);
    return null;
  }
}

/**
 * Get configuration file paths
 */
function getConfigPaths(directory?: string): string[] {
  const paths: string[] = [];

  // User-level config
  const home = process.env.HOME || process.env.USERPROFILE || "";
  if (home) {
    paths.push(path.join(home, ".config", "supercoin", CONFIG_FILENAME));
  }

  // Project-level config
  const projectDir = directory || process.cwd();
  paths.push(path.join(projectDir, ".supercoin", CONFIG_FILENAME));

  return paths;
}

/**
 * Load configuration from all sources
 */
export async function loadConfig(directory?: string): Promise<SuperCoinConfig> {
  const configPaths = getConfigPaths(directory);
  let mergedConfig: Record<string, unknown> = {};

  // Load and merge configs (later files override earlier ones)
  for (const configPath of configPaths) {
    const config = await tryReadConfig(configPath);
    if (config) {
      mergedConfig = deepMerge(mergedConfig, config);
    }
  }

  // Validate and return
  const result = SuperCoinConfigSchema.safeParse(mergedConfig);

  if (!result.success) {
    console.error("Configuration validation errors:", result.error.errors);
    // Return defaults on error
    return SuperCoinConfigSchema.parse({});
  }

  return result.data;
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): SuperCoinConfig {
  return SuperCoinConfigSchema.parse({});
}
