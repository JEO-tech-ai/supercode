/**
 * Directory README Injector Hook
 * Injects directory-specific README files into context.
 * Adapted from Claude Code patterns for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "./types";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import logger from "../../shared/logger";

/**
 * README injector options
 */
export interface DirectoryReadmeInjectorOptions {
  /** README file names to look for */
  readmeFiles?: string[];
  /** Maximum README content length */
  maxReadmeLength?: number;
  /** Maximum directory depth to search */
  maxDepth?: number;
  /** Cache TTL in ms */
  cacheTtlMs?: number;
  /** Include parent READMEs */
  includeParent?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: DirectoryReadmeInjectorOptions = {
  readmeFiles: ["README.md", "readme.md", "README", "README.txt"],
  maxReadmeLength: 10000,
  maxDepth: 3,
  cacheTtlMs: 30000,
  includeParent: false,
  debug: false,
};

/**
 * README source
 */
interface ReadmeSource {
  path: string;
  directory: string;
  content: string;
  depth: number;
}

/**
 * Cache entry
 */
interface CacheEntry {
  sources: ReadmeSource[];
  merged: string;
  timestamp: number;
  cwd: string;
}

/**
 * README cache
 */
const readmeCache = new Map<string, CacheEntry>();

/**
 * Read file safely
 */
function readFileSafe(path: string, maxLength: number): string | null {
  try {
    if (existsSync(path)) {
      const stat = statSync(path);
      if (stat.isFile() && stat.size < maxLength * 2) {
        const content = readFileSync(path, "utf-8");
        return content.slice(0, maxLength);
      }
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

/**
 * Find README in directory
 */
function findReadmeInDir(
  dir: string,
  readmeFiles: string[]
): string | null {
  for (const filename of readmeFiles) {
    const path = join(dir, filename);
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

/**
 * Collect READMEs from directory and parents
 */
function collectReadmes(
  cwd: string,
  projectRoot: string | undefined,
  options: Required<DirectoryReadmeInjectorOptions>
): ReadmeSource[] {
  const sources: ReadmeSource[] = [];
  let currentDir = cwd;
  let depth = 0;
  const visited = new Set<string>();

  while (depth < options.maxDepth) {
    if (visited.has(currentDir)) break;
    visited.add(currentDir);

    const readmePath = findReadmeInDir(currentDir, options.readmeFiles);
    if (readmePath) {
      const content = readFileSafe(readmePath, options.maxReadmeLength);
      if (content) {
        sources.push({
          path: readmePath,
          directory: currentDir,
          content,
          depth,
        });
      }
    }

    // Stop at project root or filesystem root
    if (currentDir === projectRoot || currentDir === "/" || currentDir === "") {
      break;
    }

    // Only include parent if option is set
    if (!options.includeParent && depth > 0) {
      break;
    }

    const parent = dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
    depth++;
  }

  return sources;
}

/**
 * Merge README sources
 */
function mergeReadmes(sources: ReadmeSource[], maxLength: number): string {
  if (sources.length === 0) return "";

  // Sort by depth (current directory first)
  const sorted = [...sources].sort((a, b) => a.depth - b.depth);

  const parts: string[] = [];
  let totalLength = 0;

  for (const source of sorted) {
    const header = `<!-- README from ${basename(source.directory)} -->`;
    const section = `${header}\n${source.content.trim()}`;

    if (totalLength + section.length > maxLength) {
      break;
    }

    parts.push(section);
    totalLength += section.length + 2;
  }

  return parts.join("\n\n");
}

/**
 * Get cached READMEs or collect fresh
 */
function getCachedReadmes(
  sessionId: string,
  cwd: string,
  projectRoot: string | undefined,
  options: Required<DirectoryReadmeInjectorOptions>
): { sources: ReadmeSource[]; merged: string } {
  const cacheKey = `${sessionId}:${cwd}`;
  const now = Date.now();

  const cached = readmeCache.get(cacheKey);
  if (cached && cached.cwd === cwd && now - cached.timestamp < options.cacheTtlMs) {
    return { sources: cached.sources, merged: cached.merged };
  }

  const sources = collectReadmes(cwd, projectRoot, options);
  const merged = mergeReadmes(sources, options.maxReadmeLength);

  readmeCache.set(cacheKey, {
    sources,
    merged,
    timestamp: now,
    cwd,
  });

  return { sources, merged };
}

/**
 * Create directory README injector hook
 */
export function createDirectoryReadmeInjectorHook(
  options: DirectoryReadmeInjectorOptions = {}
): Hook {
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  } as Required<DirectoryReadmeInjectorOptions>;

  return {
    name: "directory-readme-injector",
    description: "Injects directory README files into context",
    events: ["session.start", "message.before"],
    priority: 90, // Slightly lower than rules

    async handler(context: HookContext): Promise<HookResult | void> {
      const { sessionId, event, data } = context;

      if (!data) return;

      const contextData = data as {
        cwd?: string;
        projectRoot?: string;
        path?: { cwd?: string; root?: string };
      };

      const cwd = contextData.cwd || contextData.path?.cwd || process.cwd();
      const projectRoot = contextData.projectRoot || contextData.path?.root;

      if (event === "session.start") {
        const { sources, merged } = getCachedReadmes(
          sessionId,
          cwd,
          projectRoot,
          mergedOptions
        );

        if (mergedOptions.debug && sources.length > 0) {
          logger.debug(
            `[directory-readme-injector] Pre-loaded ${sources.length} READMEs ` +
            `for session ${sessionId}`
          );
        }

        if (merged) {
          return {
            continue: true,
            context: [merged],
          };
        }

        return;
      }

      if (event === "message.before") {
        const { sources, merged } = getCachedReadmes(
          sessionId,
          cwd,
          projectRoot,
          mergedOptions
        );

        if (!merged) return;

        if (mergedOptions.debug) {
          logger.debug(
            `[directory-readme-injector] Injecting ${sources.length} READMEs`
          );
        }

        return {
          continue: true,
          context: [merged],
        };
      }

      return;
    },
  };
}

/**
 * Clear README cache
 */
export function clearReadmeCache(sessionId?: string): void {
  if (sessionId) {
    for (const key of readmeCache.keys()) {
      if (key.startsWith(`${sessionId}:`)) {
        readmeCache.delete(key);
      }
    }
  } else {
    readmeCache.clear();
  }
}

export type { DirectoryReadmeInjectorOptions };
