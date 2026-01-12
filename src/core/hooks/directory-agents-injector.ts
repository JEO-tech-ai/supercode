/**
 * Directory Agents Injector Hook
 * Injects AGENTS.md files from parent directories into session context.
 */

import type { Hook, HookContext, HookResult } from "./types";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";

export interface DirectoryAgentsInjectorOptions {
  /** Maximum depth to search for AGENTS.md */
  maxDepth?: number;
  /** File names to search for */
  fileNames?: string[];
  /** Cache TTL in ms */
  cacheTtl?: number;
  /** Debug mode */
  debug?: boolean;
}

interface CachedAgents {
  content: string;
  path: string;
  timestamp: number;
}

const agentsCache = new Map<string, CachedAgents>();

/**
 * Find AGENTS.md files in parent directories
 */
function findAgentsFiles(
  startDir: string,
  fileNames: string[],
  maxDepth: number
): { path: string; content: string }[] {
  const results: { path: string; content: string }[] = [];
  let currentDir = startDir;
  let depth = 0;

  while (depth < maxDepth) {
    for (const fileName of fileNames) {
      const filePath = join(currentDir, fileName);
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, "utf-8");
          results.push({ path: filePath, content });
        } catch {
          // Ignore read errors
        }
      }
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break; // Reached root
    }
    currentDir = parentDir;
    depth++;
  }

  return results;
}

/**
 * Create directory agents injector hook
 */
export function createDirectoryAgentsInjectorHook(
  options: DirectoryAgentsInjectorOptions = {}
): Hook {
  const {
    maxDepth = 5,
    fileNames = ["AGENTS.md", ".agents.md", "agents.md"],
    cacheTtl = 60000, // 1 minute
    debug = false,
  } = options;

  return {
    name: "directory-agents-injector",
    description: "Injects AGENTS.md files from parent directories",
    events: ["message.before"],

    async handler(context: HookContext): Promise<HookResult> {
      const { workdir, sessionId } = context;

      if (!workdir) {
        return { action: "continue" };
      }

      // Check cache
      const cacheKey = `${sessionId}:${workdir}`;
      const cached = agentsCache.get(cacheKey);
      const now = Date.now();

      if (cached && now - cached.timestamp < cacheTtl) {
        if (debug) {
          console.log(`[directory-agents-injector] Using cached agents from ${cached.path}`);
        }
        return {
          action: "continue",
          modified: true,
          prependContext: `<agents-context source="${cached.path}">\n${cached.content}\n</agents-context>\n\n`,
        };
      }

      // Find AGENTS.md files
      const agentsFiles = findAgentsFiles(workdir, fileNames, maxDepth);

      if (agentsFiles.length === 0) {
        return { action: "continue" };
      }

      // Use the first (closest) AGENTS.md
      const agentsFile = agentsFiles[0];

      // Update cache
      agentsCache.set(cacheKey, {
        content: agentsFile.content,
        path: agentsFile.path,
        timestamp: now,
      });

      if (debug) {
        console.log(`[directory-agents-injector] Injecting agents from ${agentsFile.path}`);
      }

      return {
        action: "continue",
        modified: true,
        prependContext: `<agents-context source="${agentsFile.path}">\n${agentsFile.content}\n</agents-context>\n\n`,
      };
    },
  };
}

/**
 * Clear agents cache
 */
export function clearAgentsCache(): void {
  agentsCache.clear();
}

/**
 * Get agents cache stats
 */
export function getAgentsCacheStats(): { size: number; entries: string[] } {
  return {
    size: agentsCache.size,
    entries: Array.from(agentsCache.keys()),
  };
}
