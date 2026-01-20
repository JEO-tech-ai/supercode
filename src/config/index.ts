/**
 * Configuration System
 * Layered configuration loading with priority:
 *   1. Environment Variables (highest)
 *   2. Project Config (supercode.json, opencode.json)
 *   3. Global Config (~/.config/supercode/config.json)
 *   4. Default Values (lowest)
 *
 * @example
 * ```typescript
 * import { loadLayeredConfig, saveGlobalConfig } from '~/config';
 *
 * // Load merged config from all sources
 * const { config, sources } = await loadLayeredConfig();
 * console.log(config.default_model);
 *
 * // Save to global config
 * await saveGlobalConfig({ default_model: 'anthropic/claude-opus-4-5' });
 * ```
 */

// Schema and types
export {
  SuperCodeConfigSchema,
  SuperCoinConfigSchema,
  getDefaultConfig,
  type SuperCodeConfig,
  type SuperCoinConfig,
} from "./schema";

// Layered loader (recommended)
export {
  loadLayeredConfig,
  saveGlobalConfig,
  saveProjectConfig,
  resolveProviderConfig,
  getConfigPaths,
  hasConfigSource,
  type ConfigSource,
  type LayeredConfigResult,
  type LoadConfigOptions,
} from "./layered-loader";

// Project config loader (backward compatibility)
export {
  loadProjectConfig,
  loadOpenCodeConfig,
  getDefaultProvider,
  getDefaultModel,
  resolveProviderFromConfig,
  type SuperCodeConfig as ProjectConfig,
  type OpenCodeConfig,
} from "./project";

// OpenCode config (backward compatibility)
export {
  loadOpenCodeConfig as loadLegacyOpenCodeConfig,
  type OpenCodeConfig as LegacyOpenCodeConfig,
} from "./opencode";
