/**
 * Layered Configuration Loader
 * Implements hierarchical config loading with priority:
 *   1. Environment Variables (highest)
 *   2. Project Config (opencode.json, supercoin.json)
 *   3. Global Config (~/.config/supercode/config.json)
 *   4. Default Values (lowest)
 */

import { z } from "zod";
import { readFile, mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { SuperCodeConfigSchema, type SuperCodeConfig, getDefaultConfig } from "./schema";
import logger from "../shared/logger";

// =============================================================================
// Types
// =============================================================================

export interface ConfigSource {
  name: string;
  path?: string;
  priority: number;
  config: Partial<SuperCodeConfig>;
}

export interface LayeredConfigResult {
  /** Final merged configuration */
  config: SuperCodeConfig;
  /** Sources that contributed to the config (in priority order) */
  sources: ConfigSource[];
  /** Path to the project config file (if any) */
  projectConfigPath?: string;
  /** Path to the global config file (if any) */
  globalConfigPath?: string;
}

export interface LoadConfigOptions {
  /** Working directory for project config */
  cwd?: string;
  /** Skip global config loading */
  skipGlobal?: boolean;
  /** Skip environment variable loading */
  skipEnv?: boolean;
  /** Custom global config path */
  globalConfigPath?: string;
}

// =============================================================================
// Constants
// =============================================================================

const PROJECT_CONFIG_FILES = [
  "supercode.json",
  ".supercode.json",
  "supercoin.json",
  ".supercoin.json",
  "opencode.json",
  ".opencode.json",
];

const GLOBAL_CONFIG_DIR = join(homedir(), ".config", "supercode");
const GLOBAL_CONFIG_FILE = "config.json";
const GLOBAL_CONFIG_PATH = join(GLOBAL_CONFIG_DIR, GLOBAL_CONFIG_FILE);

// Environment variable prefix
const ENV_PREFIX = "SUPERCODE_";

// Environment variable mappings
const ENV_MAPPINGS: Record<string, string> = {
  [`${ENV_PREFIX}PROVIDER`]: "provider",
  [`${ENV_PREFIX}MODEL`]: "model",
  [`${ENV_PREFIX}BASE_URL`]: "baseURL",
  [`${ENV_PREFIX}TEMPERATURE`]: "temperature",
  [`${ENV_PREFIX}MAX_TOKENS`]: "maxTokens",
  [`${ENV_PREFIX}DEFAULT_MODEL`]: "default_model",
  [`${ENV_PREFIX}SERVER_PORT`]: "server.port",
  [`${ENV_PREFIX}SERVER_HOST`]: "server.host",
  [`${ENV_PREFIX}ORCHESTRATOR`]: "orchestrator.defaultOrchestrator",
  // Legacy OpenCode compatibility
  OPENCODE_PROVIDER: "provider",
  OPENCODE_MODEL: "model",
  OPENCODE_BASE_URL: "baseURL",
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Deep merge two objects (target takes precedence for defined values)
 */
function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base };

  for (const key of Object.keys(override) as (keyof T)[]) {
    const overrideValue = override[key];
    const baseValue = result[key];

    if (overrideValue === undefined) {
      continue;
    }

    if (
      typeof overrideValue === "object" &&
      overrideValue !== null &&
      !Array.isArray(overrideValue) &&
      typeof baseValue === "object" &&
      baseValue !== null &&
      !Array.isArray(baseValue)
    ) {
      result[key] = deepMerge(
        baseValue as Record<string, unknown>,
        overrideValue as Record<string, unknown>
      ) as T[keyof T];
    } else {
      result[key] = overrideValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Set a nested value using dot notation path
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
}

/**
 * Parse environment variable value to appropriate type
 */
function parseEnvValue(value: string, path: string): unknown {
  // Boolean
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;

  // Number (for specific paths)
  if (path.includes("port") || path.includes("tokens") || path === "temperature") {
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
  }

  // Array (comma-separated)
  if (value.includes(",") && !value.includes("{")) {
    return value.split(",").map((s) => s.trim());
  }

  // JSON object
  if (value.startsWith("{") || value.startsWith("[")) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

// =============================================================================
// Config Loaders
// =============================================================================

/**
 * Load project config from current working directory
 */
async function loadProjectConfig(cwd: string): Promise<ConfigSource | null> {
  for (const filename of PROJECT_CONFIG_FILES) {
    const configPath = join(cwd, filename);
    try {
      if (!existsSync(configPath)) continue;

      const content = await readFile(configPath, "utf-8");
      const parsed = JSON.parse(content);

      return {
        name: `project:${filename}`,
        path: configPath,
        priority: 2,
        config: parsed,
      };
    } catch (error) {
      logger.debug(`[config] Failed to load ${configPath}`, { error });
      continue;
    }
  }

  return null;
}

/**
 * Load global config from ~/.config/supercode/config.json
 */
async function loadGlobalConfig(customPath?: string): Promise<ConfigSource | null> {
  const configPath = customPath || GLOBAL_CONFIG_PATH;

  try {
    if (!existsSync(configPath)) {
      return null;
    }

    const content = await readFile(configPath, "utf-8");
    const parsed = JSON.parse(content);

    return {
      name: "global",
      path: configPath,
      priority: 3,
      config: parsed,
    };
  } catch (error) {
    logger.debug(`[config] Failed to load global config from ${configPath}`, { error });
    return null;
  }
}

/**
 * Load config from environment variables
 */
function loadEnvConfig(): ConfigSource | null {
  const config: Record<string, unknown> = {};
  let hasValues = false;

  // Check mapped environment variables
  for (const [envKey, configPath] of Object.entries(ENV_MAPPINGS)) {
    const value = process.env[envKey];
    if (value !== undefined) {
      setNestedValue(config, configPath, parseEnvValue(value, configPath));
      hasValues = true;
    }
  }

  // Check all SUPERCODE_ prefixed variables
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(ENV_PREFIX) && value !== undefined) {
      // Convert SUPERCODE_SOME_KEY to some.key
      const configPath = key
        .slice(ENV_PREFIX.length)
        .toLowerCase()
        .replace(/_/g, ".");

      // Skip if already handled by explicit mapping
      if (!(key in ENV_MAPPINGS)) {
        setNestedValue(config, configPath, parseEnvValue(value, configPath));
        hasValues = true;
      }
    }
  }

  if (!hasValues) {
    return null;
  }

  return {
    name: "environment",
    priority: 1,
    config,
  };
}

// =============================================================================
// Main Loader
// =============================================================================

/**
 * Load configuration from all sources with proper priority
 *
 * Priority (highest to lowest):
 * 1. Environment variables (SUPERCODE_*, OPENCODE_*)
 * 2. Project config (supercode.json, opencode.json, etc.)
 * 3. Global config (~/.config/supercode/config.json)
 * 4. Default values
 *
 * @example
 * ```typescript
 * const { config, sources } = await loadLayeredConfig({ cwd: process.cwd() });
 * console.log(config.default_model);
 * console.log(sources.map(s => s.name)); // ["environment", "project:supercode.json", "global", "defaults"]
 * ```
 */
export async function loadLayeredConfig(options: LoadConfigOptions = {}): Promise<LayeredConfigResult> {
  const { cwd = process.cwd(), skipGlobal = false, skipEnv = false, globalConfigPath } = options;

  const sources: ConfigSource[] = [];

  // 1. Start with defaults (lowest priority)
  const defaultConfig = getDefaultConfig();
  sources.push({
    name: "defaults",
    priority: 4,
    config: defaultConfig,
  });

  // 2. Load global config
  if (!skipGlobal) {
    const globalSource = await loadGlobalConfig(globalConfigPath);
    if (globalSource) {
      sources.push(globalSource);
    }
  }

  // 3. Load project config
  const projectSource = await loadProjectConfig(cwd);
  if (projectSource) {
    sources.push(projectSource);
  }

  // 4. Load environment variables (highest priority)
  if (!skipEnv) {
    const envSource = loadEnvConfig();
    if (envSource) {
      sources.push(envSource);
    }
  }

  // Sort by priority (lower number = higher priority)
  sources.sort((a, b) => a.priority - b.priority);

  // Merge configs (higher priority overwrites lower)
  let mergedConfig = defaultConfig;
  for (const source of [...sources].reverse()) {
    if (source.name !== "defaults") {
      mergedConfig = deepMerge(mergedConfig, source.config);
    }
  }

  // Validate final config
  const validatedConfig = SuperCodeConfigSchema.parse(mergedConfig);

  logger.debug("[config] Loaded layered config", {
    sources: sources.map((s) => ({ name: s.name, path: s.path })),
  });

  return {
    config: validatedConfig,
    sources,
    projectConfigPath: projectSource?.path,
    globalConfigPath: !skipGlobal ? (globalConfigPath || GLOBAL_CONFIG_PATH) : undefined,
  };
}

// =============================================================================
// Config Writers
// =============================================================================

/**
 * Ensure global config directory exists
 */
async function ensureGlobalConfigDir(): Promise<void> {
  if (!existsSync(GLOBAL_CONFIG_DIR)) {
    await mkdir(GLOBAL_CONFIG_DIR, { recursive: true });
  }
}

/**
 * Save config to global config file
 */
export async function saveGlobalConfig(config: Partial<SuperCodeConfig>): Promise<string> {
  await ensureGlobalConfigDir();

  // Load existing config and merge
  const existing = await loadGlobalConfig();
  const merged = existing
    ? deepMerge(existing.config as SuperCodeConfig, config)
    : config;

  const content = JSON.stringify(merged, null, 2);
  await writeFile(GLOBAL_CONFIG_PATH, content, "utf-8");

  logger.info("[config] Saved global config", { path: GLOBAL_CONFIG_PATH });
  return GLOBAL_CONFIG_PATH;
}

/**
 * Save config to project config file
 */
export async function saveProjectConfig(
  config: Partial<SuperCodeConfig>,
  cwd: string = process.cwd(),
  filename: string = "supercode.json"
): Promise<string> {
  const configPath = join(cwd, filename);

  // Load existing config and merge
  let existing: Partial<SuperCodeConfig> = {};
  try {
    if (existsSync(configPath)) {
      const content = await readFile(configPath, "utf-8");
      existing = JSON.parse(content);
    }
  } catch {}

  const merged = deepMerge(existing as SuperCodeConfig, config);
  const content = JSON.stringify(merged, null, 2);
  await writeFile(configPath, content, "utf-8");

  logger.info("[config] Saved project config", { path: configPath });
  return configPath;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the resolved config for a specific provider
 */
export async function resolveProviderConfig(
  options: LoadConfigOptions = {}
): Promise<{
  provider: string;
  model: string;
  baseURL?: string;
  temperature: number;
  maxTokens: number;
}> {
  const { config } = await loadLayeredConfig(options);

  // Parse default_model format: "provider/model" or just "model"
  const [providerPart, modelPart] = config.default_model.includes("/")
    ? config.default_model.split("/", 2)
    : ["ollama", config.default_model];

  // Check provider-specific settings
  const providerConfig = config.providers?.[providerPart as keyof typeof config.providers];

  return {
    provider: providerPart,
    model: modelPart,
    baseURL: providerConfig?.baseUrl,
    temperature: 0.7, // Default
    maxTokens: 4096, // Default
  };
}

/**
 * Get config paths info
 */
export function getConfigPaths(): {
  globalDir: string;
  globalConfig: string;
  projectConfigFiles: string[];
  envPrefix: string;
} {
  return {
    globalDir: GLOBAL_CONFIG_DIR,
    globalConfig: GLOBAL_CONFIG_PATH,
    projectConfigFiles: PROJECT_CONFIG_FILES,
    envPrefix: ENV_PREFIX,
  };
}

/**
 * Check if a config source exists
 */
export async function hasConfigSource(
  type: "project" | "global",
  cwd?: string
): Promise<boolean> {
  if (type === "global") {
    return existsSync(GLOBAL_CONFIG_PATH);
  }

  const workDir = cwd || process.cwd();
  for (const filename of PROJECT_CONFIG_FILES) {
    if (existsSync(join(workDir, filename))) {
      return true;
    }
  }
  return false;
}
