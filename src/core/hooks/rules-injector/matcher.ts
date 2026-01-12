/**
 * Rules Matcher
 * Matches files against rule patterns and handles deduplication.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { relative } from "node:path";
import type { RuleMetadata } from "./types";

/**
 * Match result
 */
export interface MatchResult {
  /** Whether the rule applies */
  applies: boolean;
  /** Reason for the match (for debugging) */
  reason?: string;
}

/**
 * Create a content hash for deduplication
 */
export function createContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/**
 * Check if content hash already exists (duplicate)
 */
export function isDuplicateByContentHash(
  hash: string,
  existingHashes: Set<string>
): boolean {
  return existingHashes.has(hash);
}

/**
 * Get real path for a file (resolving symlinks)
 */
export function getRealPath(path: string): string | null {
  try {
    return realpathSync(path);
  } catch {
    return null;
  }
}

/**
 * Check if real path already exists (duplicate)
 */
export function isDuplicateByRealPath(
  realPath: string,
  existingPaths: Set<string>
): boolean {
  return existingPaths.has(realPath);
}

/**
 * Convert glob pattern to regex
 */
export function globToRegex(pattern: string): RegExp {
  // Escape special regex chars except * and ?
  let regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    // ** matches any path
    .replace(/\*\*/g, "{{DOUBLESTAR}}")
    // * matches any chars except /
    .replace(/\*/g, "[^/]*")
    // ? matches single char
    .replace(/\?/g, ".")
    // Restore **
    .replace(/\{\{DOUBLESTAR\}\}/g, ".*");

  // Handle leading ** or ending **
  if (regex.startsWith(".*")) {
    regex = "(?:.*/)?" + regex.slice(2);
  }

  return new RegExp(`^${regex}$`);
}

/**
 * Match a file path against a glob pattern
 */
export function matchGlob(filePath: string, pattern: string): boolean {
  // Normalize paths
  const normalizedPath = filePath.replace(/\\/g, "/");
  const normalizedPattern = pattern.replace(/\\/g, "/");

  // Simple exact match
  if (normalizedPath === normalizedPattern) {
    return true;
  }

  // Glob match
  try {
    const regex = globToRegex(normalizedPattern);
    return regex.test(normalizedPath);
  } catch {
    return false;
  }
}

/**
 * Match a file against multiple glob patterns
 */
export function matchGlobs(
  filePath: string,
  patterns: string | string[]
): { matches: boolean; matchedPattern?: string } {
  const patternList = Array.isArray(patterns) ? patterns : [patterns];

  for (const pattern of patternList) {
    if (matchGlob(filePath, pattern)) {
      return { matches: true, matchedPattern: pattern };
    }
  }

  return { matches: false };
}

/**
 * Check if a rule should apply to a given file
 */
export function shouldApplyRule(
  metadata: RuleMetadata,
  filePath: string,
  projectRoot?: string
): MatchResult {
  // Rule always applies if alwaysApply is true
  if (metadata.alwaysApply) {
    return { applies: true, reason: "alwaysApply" };
  }

  // Rule applies to all files if no globs specified
  if (!metadata.globs || (Array.isArray(metadata.globs) && metadata.globs.length === 0)) {
    return { applies: true, reason: "no globs (applies to all)" };
  }

  // Get relative path for matching
  const relativePath = projectRoot
    ? relative(projectRoot, filePath)
    : filePath;

  // Match against globs
  const { matches, matchedPattern } = matchGlobs(relativePath, metadata.globs);

  if (matches) {
    return { applies: true, reason: `matched glob: ${matchedPattern}` };
  }

  // Also try matching against absolute path
  const absMatch = matchGlobs(filePath, metadata.globs);
  if (absMatch.matches) {
    return { applies: true, reason: `matched glob (abs): ${absMatch.matchedPattern}` };
  }

  return { applies: false, reason: "no glob match" };
}

/**
 * Normalize a file path for consistent matching
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

/**
 * Check if a path matches any of the common rule file patterns
 */
export function isRuleFile(path: string): boolean {
  const normalizedPath = normalizePath(path).toLowerCase();

  const rulePatterns = [
    /claude\.md$/,
    /agents\.md$/,
    /rules\.md$/,
    /\.cursorrules$/,
    /\.windsurfrules$/,
    /copilot-instructions\.md$/,
    /\.instructions\.md$/,
  ];

  return rulePatterns.some((pattern) => pattern.test(normalizedPath));
}
