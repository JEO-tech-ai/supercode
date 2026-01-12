/**
 * Rules Injector Hook
 * Injects project and directory rules into conversation context.
 * Supports YAML frontmatter with globs, alwaysApply, and descriptions.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "../types";
import type {
  RulesInjectorOptions,
  RuleSource,
  CollectedRules,
  RulesCacheEntry,
  RuleMetadata,
} from "./types";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import logger from "../../../shared/logger";
import { parseRuleFrontmatter } from "./parser";
import {
  createContentHash,
  getRealPath,
  shouldApplyRule,
  isDuplicateByContentHash,
  isDuplicateByRealPath,
} from "./matcher";

/**
 * Default options
 */
const DEFAULT_OPTIONS: RulesInjectorOptions = {
  globalRulesFiles: [
    ".supercode/rules",
    ".supercode/rules.md",
    ".config/supercode/rules",
    ".config/supercode/rules.md",
    ".claude/rules.md",
  ],
  projectRulesFiles: [
    // Claude Code patterns
    "CLAUDE.md",
    ".claude/rules.md",
    ".claude/settings.md",
    // SuperCode patterns
    ".supercode/rules.md",
    ".supercode/settings.md",
    // Other AI tools compatibility
    ".cursorrules",
    ".windsurfrules",
    "copilot-instructions.md",
    ".github/copilot-instructions.md",
    // Agent patterns
    "AGENTS.md",
    ".agents/rules.md",
  ],
  directoryRulesFiles: [
    "CLAUDE.md",
    "AGENTS.md",
    ".rules.md",
    ".instructions.md",
  ],
  maxRulesLength: 50000,
  cacheTtlMs: 30000,
  debug: false,
};

/**
 * Rules cache
 */
const rulesCache = new Map<string, RulesCacheEntry>();

/**
 * Deduplication state for rule collection
 */
interface DeduplicationState {
  contentHashes: Set<string>;
  realPaths: Set<string>;
}

/**
 * Read file safely and parse frontmatter
 */
function readAndParseRuleFile(path: string): {
  rawContent: string;
  body: string;
  metadata: RuleMetadata;
  contentHash: string;
  realPath: string | null;
} | null {
  try {
    if (!existsSync(path)) {
      return null;
    }

    const rawContent = readFileSync(path, "utf-8");
    const { metadata, body } = parseRuleFrontmatter(rawContent);
    const contentHash = createContentHash(rawContent);
    const realPath = getRealPath(path);

    return {
      rawContent,
      body,
      metadata,
      contentHash,
      realPath,
    };
  } catch {
    // Ignore read errors
  }
  return null;
}

/**
 * Read file safely (legacy compatibility)
 */
function readFileSafe(path: string): string | null {
  try {
    if (existsSync(path)) {
      return readFileSync(path, "utf-8");
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

/**
 * Find rules file by walking up directory tree
 */
function findRulesInDirectory(
  startDir: string,
  filename: string,
  stopDir?: string
): string | null {
  let currentDir = startDir;

  while (currentDir !== stopDir && currentDir !== "/" && currentDir !== "") {
    const filePath = join(currentDir, filename);
    if (existsSync(filePath)) {
      return filePath;
    }
    const parent = dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }

  return null;
}

/**
 * Check if rule should be skipped due to deduplication
 */
function shouldSkipDueToDuplication(
  contentHash: string,
  realPath: string | null,
  dedupState: DeduplicationState
): boolean {
  // Check content hash
  if (isDuplicateByContentHash(contentHash, dedupState.contentHashes)) {
    return true;
  }

  // Check real path
  if (realPath && isDuplicateByRealPath(realPath, dedupState.realPaths)) {
    return true;
  }

  return false;
}

/**
 * Add rule to deduplication state
 */
function addToDedupState(
  contentHash: string,
  realPath: string | null,
  dedupState: DeduplicationState
): void {
  dedupState.contentHashes.add(contentHash);
  if (realPath) {
    dedupState.realPaths.add(realPath);
  }
}

/**
 * Collect global rules
 */
function collectGlobalRules(
  options: Required<RulesInjectorOptions>,
  dedupState: DeduplicationState
): RuleSource[] {
  const sources: RuleSource[] = [];
  const home = homedir();

  for (const file of options.globalRulesFiles) {
    const path = join(home, file);
    const parsed = readAndParseRuleFile(path);

    if (!parsed) continue;

    // Check for duplicates
    if (shouldSkipDueToDuplication(parsed.contentHash, parsed.realPath, dedupState)) {
      if (options.debug) {
        logger.debug(`[rules-injector] Skipping duplicate global rule: ${path}`);
      }
      continue;
    }

    // Add to dedup state
    addToDedupState(parsed.contentHash, parsed.realPath, dedupState);

    sources.push({
      path,
      name: `global:${file}`,
      scope: "global",
      content: parsed.body,
      rawContent: parsed.rawContent,
      priority: 100, // Global rules have highest priority
      metadata: parsed.metadata,
      contentHash: parsed.contentHash,
      realPath: parsed.realPath || undefined,
    });
  }

  return sources;
}

/**
 * Collect project rules
 */
function collectProjectRules(
  cwd: string,
  options: Required<RulesInjectorOptions>,
  dedupState: DeduplicationState
): RuleSource[] {
  const sources: RuleSource[] = [];

  for (const file of options.projectRulesFiles) {
    const foundPath = findRulesInDirectory(cwd, file);
    if (!foundPath) continue;

    const parsed = readAndParseRuleFile(foundPath);
    if (!parsed) continue;

    // Check for duplicates
    if (shouldSkipDueToDuplication(parsed.contentHash, parsed.realPath, dedupState)) {
      if (options.debug) {
        logger.debug(`[rules-injector] Skipping duplicate project rule: ${foundPath}`);
      }
      continue;
    }

    // Add to dedup state
    addToDedupState(parsed.contentHash, parsed.realPath, dedupState);

    sources.push({
      path: foundPath,
      name: `project:${file}`,
      scope: "project",
      content: parsed.body,
      rawContent: parsed.rawContent,
      priority: 50, // Project rules have medium priority
      metadata: parsed.metadata,
      contentHash: parsed.contentHash,
      realPath: parsed.realPath || undefined,
    });
  }

  return sources;
}

/**
 * Collect directory-specific rules
 */
function collectDirectoryRules(
  currentDir: string,
  projectRoot: string,
  options: Required<RulesInjectorOptions>,
  dedupState: DeduplicationState
): RuleSource[] {
  const sources: RuleSource[] = [];

  // Only look in current directory (not walking up)
  for (const file of options.directoryRulesFiles) {
    const path = join(currentDir, file);

    if (!existsSync(path) || path === projectRoot) continue;

    const parsed = readAndParseRuleFile(path);
    if (!parsed) continue;

    // Check for duplicates
    if (shouldSkipDueToDuplication(parsed.contentHash, parsed.realPath, dedupState)) {
      if (options.debug) {
        logger.debug(`[rules-injector] Skipping duplicate directory rule: ${path}`);
      }
      continue;
    }

    // Add to dedup state
    addToDedupState(parsed.contentHash, parsed.realPath, dedupState);

    sources.push({
      path,
      name: `directory:${file}`,
      scope: "directory",
      content: parsed.body,
      rawContent: parsed.rawContent,
      priority: 25, // Directory rules have lowest priority
      metadata: parsed.metadata,
      contentHash: parsed.contentHash,
      realPath: parsed.realPath || undefined,
    });
  }

  return sources;
}

/**
 * Merge rules with priority ordering
 */
function mergeRules(sources: RuleSource[], maxLength: number): string {
  // Sort by priority (descending) then by path
  const sorted = [...sources].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.path.localeCompare(b.path);
  });

  const parts: string[] = [];
  let totalLength = 0;

  for (const source of sorted) {
    const header = `<!-- Rules from ${source.name} -->`;
    const section = `${header}\n${source.content.trim()}`;

    if (totalLength + section.length > maxLength) {
      // Truncate if necessary
      const remaining = maxLength - totalLength - 50;
      if (remaining > 200) {
        parts.push(section.slice(0, remaining) + "\n...[truncated]");
      }
      break;
    }

    parts.push(section);
    totalLength += section.length + 2; // +2 for newlines
  }

  return parts.join("\n\n");
}

/**
 * Collect all rules for a session
 */
export function collectRules(
  cwd: string,
  projectRoot?: string,
  options: RulesInjectorOptions = {},
  targetFilePath?: string
): CollectedRules {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options } as Required<RulesInjectorOptions>;

  // Initialize deduplication state
  const dedupState: DeduplicationState = {
    contentHashes: new Set(),
    realPaths: new Set(),
  };

  const sources: RuleSource[] = [];

  // Collect global rules
  sources.push(...collectGlobalRules(mergedOptions, dedupState));

  // Collect project rules
  sources.push(...collectProjectRules(cwd, mergedOptions, dedupState));

  // Collect directory rules (if different from project root)
  if (projectRoot && cwd !== projectRoot) {
    sources.push(...collectDirectoryRules(cwd, projectRoot, mergedOptions, dedupState));
  }

  // Filter rules based on target file path (if provided)
  let applicableSources = sources;
  if (targetFilePath) {
    applicableSources = sources.filter((source) => {
      if (!source.metadata) return true;

      const result = shouldApplyRule(source.metadata, targetFilePath, projectRoot);
      if (!result.applies && mergedOptions.debug) {
        logger.debug(
          `[rules-injector] Skipping rule ${source.name} for ${targetFilePath}: ${result.reason}`
        );
      }
      return result.applies;
    });
  }

  const merged = mergeRules(applicableSources, mergedOptions.maxRulesLength);

  return {
    sources: applicableSources,
    merged,
    hasRules: applicableSources.length > 0,
    totalLength: merged.length,
  };
}

/**
 * Get cached rules or collect fresh
 * Note: targetFilePath filtering is done post-cache to allow caching of base rules
 */
function getCachedRules(
  sessionId: string,
  cwd: string,
  projectRoot?: string,
  options: RulesInjectorOptions = {},
  targetFilePath?: string
): CollectedRules {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options } as Required<RulesInjectorOptions>;
  const cacheKey = `${sessionId}:${cwd}`;

  const cached = rulesCache.get(cacheKey);
  const now = Date.now();

  // If no target file path, use cache directly
  if (!targetFilePath) {
    if (cached && cached.cwd === cwd && now - cached.timestamp < mergedOptions.cacheTtlMs) {
      return cached.rules;
    }

    const rules = collectRules(cwd, projectRoot, options);

    rulesCache.set(cacheKey, {
      rules,
      timestamp: now,
      cwd,
    });

    return rules;
  }

  // With target file path, collect fresh and filter
  // (could optimize by caching base rules and filtering on demand)
  return collectRules(cwd, projectRoot, options, targetFilePath);
}

/**
 * Create rules injector hook
 */
export function createRulesInjectorHook(
  options: RulesInjectorOptions = {}
): Hook {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options } as Required<RulesInjectorOptions>;

  return {
    name: "rules-injector",
    description: "Injects project and directory rules into context",
    events: ["session.start", "message.before"],
    priority: 95, // High priority to inject early

    async handler(context: HookContext): Promise<HookResult | void> {
      const { sessionId, event, data } = context;

      if (!data) return;

      const contextData = data as {
        cwd?: string;
        projectRoot?: string;
        path?: { cwd?: string; root?: string };
        filePath?: string;
        targetFile?: string;
        file?: string;
      };

      // Extract working directory
      const cwd =
        contextData.cwd ||
        contextData.path?.cwd ||
        process.cwd();

      const projectRoot =
        contextData.projectRoot ||
        contextData.path?.root;

      // Extract target file path for conditional rule application
      const targetFilePath =
        contextData.filePath ||
        contextData.targetFile ||
        contextData.file;

      // On session start, pre-warm cache (without file filtering)
      if (event === "session.start") {
        const rules = getCachedRules(sessionId, cwd, projectRoot, options);

        if (mergedOptions.debug && rules.hasRules) {
          logger.debug(
            `[rules-injector] Pre-loaded ${rules.sources.length} rule sources ` +
            `(${rules.totalLength} chars) for session ${sessionId}`
          );
        }

        if (rules.hasRules) {
          return {
            continue: true,
            context: [rules.merged],
          };
        }

        return;
      }

      // On message, inject rules if available (with optional file filtering)
      if (event === "message.before") {
        const rules = getCachedRules(sessionId, cwd, projectRoot, options, targetFilePath);

        if (!rules.hasRules) {
          return;
        }

        if (mergedOptions.debug) {
          logger.debug(
            `[rules-injector] Injecting ${rules.sources.length} rule sources ` +
            `for session ${sessionId}` +
            (targetFilePath ? ` (filtered for ${targetFilePath})` : "")
          );
        }

        return {
          continue: true,
          context: [rules.merged],
        };
      }

      return;
    },
  };
}

/**
 * Clear rules cache
 */
export function clearRulesCache(sessionId?: string): void {
  if (sessionId) {
    for (const key of rulesCache.keys()) {
      if (key.startsWith(`${sessionId}:`)) {
        rulesCache.delete(key);
      }
    }
  } else {
    rulesCache.clear();
  }
}

/**
 * Get cache stats
 */
export function getRulesCacheStats(): {
  size: number;
  entries: string[];
} {
  return {
    size: rulesCache.size,
    entries: Array.from(rulesCache.keys()),
  };
}

// Re-export types
export type { RulesInjectorOptions, RuleSource, CollectedRules, RuleMetadata };

// Re-export parser and matcher utilities
export { parseRuleFrontmatter, hasFrontmatter } from "./parser";
export {
  createContentHash,
  getRealPath,
  shouldApplyRule,
  matchGlob,
  matchGlobs,
  isRuleFile,
  normalizePath,
} from "./matcher";
