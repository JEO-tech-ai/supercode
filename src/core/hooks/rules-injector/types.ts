/**
 * Rules Injector Types
 * Type definitions for rules injection hook.
 * Adapted from Claude Code patterns for SuperCode integration
 */

/**
 * Rule file source
 */
export interface RuleSource {
  /** Path to the rules file */
  path: string;
  /** Name of the rule source */
  name: string;
  /** Whether this is a global or project-specific rule */
  scope: "global" | "project" | "directory";
  /** Content of the rule */
  content: string;
  /** Priority (higher = loaded first) */
  priority: number;
}

/**
 * Collected rules
 */
export interface CollectedRules {
  /** All collected rule sources */
  sources: RuleSource[];
  /** Merged content */
  merged: string;
  /** Whether any rules were found */
  hasRules: boolean;
  /** Total character count */
  totalLength: number;
}

/**
 * Rules injector options
 */
export interface RulesInjectorOptions {
  /** Global rules file paths (relative to home directory) */
  globalRulesFiles?: string[];
  /** Project rules file names (looked up from cwd) */
  projectRulesFiles?: string[];
  /** Directory rules file names (looked up per directory) */
  directoryRulesFiles?: string[];
  /** Maximum rules content length */
  maxRulesLength?: number;
  /** Cache TTL in ms */
  cacheTtlMs?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Rules cache entry
 */
export interface RulesCacheEntry {
  /** Cached rules */
  rules: CollectedRules;
  /** Cache timestamp */
  timestamp: number;
  /** Working directory */
  cwd: string;
}
