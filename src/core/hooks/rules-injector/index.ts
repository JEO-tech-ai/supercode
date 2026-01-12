/**
 * Rules Injector Hook
 * Injects project and directory rules into conversation context.
 * Adapted from Claude Code patterns for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "../types";
import type {
  RulesInjectorOptions,
  RuleSource,
  CollectedRules,
  RulesCacheEntry,
} from "./types";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import logger from "../../../shared/logger";

/**
 * Default options
 */
const DEFAULT_OPTIONS: RulesInjectorOptions = {
  globalRulesFiles: [".supercode/rules", ".config/supercode/rules"],
  projectRulesFiles: [
    "CLAUDE.md",
    ".claude/rules.md",
    ".supercode/rules.md",
    ".cursorrules",
    ".windsurfrules",
    "AGENTS.md",
  ],
  directoryRulesFiles: ["CLAUDE.md", "AGENTS.md", ".rules.md"],
  maxRulesLength: 50000,
  cacheTtlMs: 30000,
  debug: false,
};

/**
 * Rules cache
 */
const rulesCache = new Map<string, RulesCacheEntry>();

/**
 * Read file safely
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
 * Collect global rules
 */
function collectGlobalRules(options: Required<RulesInjectorOptions>): RuleSource[] {
  const sources: RuleSource[] = [];
  const home = homedir();

  for (const file of options.globalRulesFiles) {
    const path = join(home, file);
    const content = readFileSafe(path);
    if (content) {
      sources.push({
        path,
        name: `global:${file}`,
        scope: "global",
        content,
        priority: 100, // Global rules have highest priority
      });
    }
  }

  return sources;
}

/**
 * Collect project rules
 */
function collectProjectRules(
  cwd: string,
  options: Required<RulesInjectorOptions>
): RuleSource[] {
  const sources: RuleSource[] = [];

  for (const file of options.projectRulesFiles) {
    const foundPath = findRulesInDirectory(cwd, file);
    if (foundPath) {
      const content = readFileSafe(foundPath);
      if (content) {
        sources.push({
          path: foundPath,
          name: `project:${file}`,
          scope: "project",
          content,
          priority: 50, // Project rules have medium priority
        });
      }
    }
  }

  return sources;
}

/**
 * Collect directory-specific rules
 */
function collectDirectoryRules(
  currentDir: string,
  projectRoot: string,
  options: Required<RulesInjectorOptions>
): RuleSource[] {
  const sources: RuleSource[] = [];

  // Only look in current directory (not walking up)
  for (const file of options.directoryRulesFiles) {
    const path = join(currentDir, file);
    if (existsSync(path) && path !== projectRoot) {
      const content = readFileSafe(path);
      if (content) {
        sources.push({
          path,
          name: `directory:${file}`,
          scope: "directory",
          content,
          priority: 25, // Directory rules have lowest priority
        });
      }
    }
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
  options: RulesInjectorOptions = {}
): CollectedRules {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options } as Required<RulesInjectorOptions>;

  const sources: RuleSource[] = [];

  // Collect global rules
  sources.push(...collectGlobalRules(mergedOptions));

  // Collect project rules
  sources.push(...collectProjectRules(cwd, mergedOptions));

  // Collect directory rules (if different from project root)
  if (projectRoot && cwd !== projectRoot) {
    sources.push(...collectDirectoryRules(cwd, projectRoot, mergedOptions));
  }

  // Deduplicate by path
  const uniqueSources = sources.filter(
    (s, i, arr) => arr.findIndex((x) => x.path === s.path) === i
  );

  const merged = mergeRules(uniqueSources, mergedOptions.maxRulesLength);

  return {
    sources: uniqueSources,
    merged,
    hasRules: uniqueSources.length > 0,
    totalLength: merged.length,
  };
}

/**
 * Get cached rules or collect fresh
 */
function getCachedRules(
  sessionId: string,
  cwd: string,
  projectRoot?: string,
  options: RulesInjectorOptions = {}
): CollectedRules {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options } as Required<RulesInjectorOptions>;
  const cacheKey = `${sessionId}:${cwd}`;

  const cached = rulesCache.get(cacheKey);
  const now = Date.now();

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
      };

      // Extract working directory
      const cwd =
        contextData.cwd ||
        contextData.path?.cwd ||
        process.cwd();

      const projectRoot =
        contextData.projectRoot ||
        contextData.path?.root;

      // On session start, pre-warm cache
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

      // On message, inject rules if available
      if (event === "message.before") {
        const rules = getCachedRules(sessionId, cwd, projectRoot, options);

        if (!rules.hasRules) {
          return;
        }

        if (mergedOptions.debug) {
          logger.debug(
            `[rules-injector] Injecting ${rules.sources.length} rule sources ` +
            `for session ${sessionId}`
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

export type { RulesInjectorOptions, RuleSource, CollectedRules };
