/**
 * AST-Grep CLI
 * Command-line interface wrapper for ast-grep.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import { spawn } from "bun";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { RunOptions, SgResult, CliMatch, EnvironmentCheckResult } from "./types";
import { getCachedBinaryPath, ensureAstGrepBinary } from "./downloader";
import logger from "../../../shared/logger";

/**
 * Default limits
 */
const DEFAULT_TIMEOUT_MS = 300000; // 5 minutes
const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024; // 1MB
const DEFAULT_MAX_MATCHES = 500;

/**
 * Cached binary path
 */
let cachedBinaryPath: string | null = null;

/**
 * Search paths for ast-grep binary
 */
const SEARCH_PATHS = [
  // Homebrew (macOS)
  "/opt/homebrew/bin/sg",
  "/usr/local/bin/sg",
  // Linux
  "/usr/bin/sg",
  // Cargo install location
  join(homedir(), ".cargo/bin/sg"),
  // npm global
  join(homedir(), ".npm/bin/sg"),
  // Local node_modules
  "node_modules/.bin/sg",
  // Config directory
  join(homedir(), ".config/supercode/bin/sg"),
];

/**
 * Find ast-grep binary
 */
export async function getAstGrepPath(): Promise<string | null> {
  if (cachedBinaryPath) {
    if (existsSync(cachedBinaryPath)) {
      return cachedBinaryPath;
    }
    cachedBinaryPath = null;
  }

  // Check downloaded/cached binary first
  const downloadedPath = getCachedBinaryPath();
  if (downloadedPath) {
    cachedBinaryPath = downloadedPath;
    return downloadedPath;
  }

  // Check search paths
  for (const path of SEARCH_PATHS) {
    if (existsSync(path)) {
      cachedBinaryPath = path;
      return path;
    }
  }

  // Try running "sg" from PATH
  try {
    const proc = spawn({
      cmd: ["which", "sg"],
      stdout: "pipe",
      stderr: "ignore",
    });

    const output = await new Response(proc.stdout).text();
    const path = output.trim();

    if (path && existsSync(path)) {
      cachedBinaryPath = path;
      return path;
    }
  } catch {
    // which command failed
  }

  return null;
}

/**
 * Check if CLI is available
 */
export async function isCliAvailable(): Promise<boolean> {
  const path = await getAstGrepPath();
  return path !== null;
}

/**
 * Ensure CLI is available
 * Will attempt to download if not found
 */
export async function ensureCliAvailable(): Promise<boolean> {
  if (await isCliAvailable()) return true;

  // Try to download automatically
  logger.info("[ast-grep] CLI not found, attempting to download...");
  const downloadedPath = await ensureAstGrepBinary();

  if (downloadedPath) {
    cachedBinaryPath = downloadedPath;
    return true;
  }

  logger.warn(
    "[ast-grep] CLI not found and auto-download failed. Install with: npm install -g @ast-grep/cli, " +
    "cargo install ast-grep --locked, or brew install ast-grep"
  );

  return false;
}

/**
 * Check environment
 */
export async function checkEnvironment(): Promise<EnvironmentCheckResult> {
  const result: EnvironmentCheckResult = {
    cli: { available: false },
  };

  const path = await getAstGrepPath();

  if (path) {
    result.cli.available = true;
    result.cli.path = path;

    // Try to get version
    try {
      const proc = spawn({
        cmd: [path, "--version"],
        stdout: "pipe",
        stderr: "ignore",
      });

      const output = await new Response(proc.stdout).text();
      const versionMatch = output.match(/\d+\.\d+\.\d+/);
      if (versionMatch) {
        result.cli.version = versionMatch[0];
      }
    } catch {
      // Version check failed
    }
  } else {
    result.cli.error = "ast-grep CLI not found";
  }

  return result;
}

/**
 * Format environment check result
 */
export function formatEnvironmentCheck(result: EnvironmentCheckResult): string {
  const lines: string[] = ["AST-Grep Environment Check:", ""];

  if (result.cli.available) {
    lines.push(`  CLI: ✓ Available`);
    if (result.cli.path) lines.push(`    Path: ${result.cli.path}`);
    if (result.cli.version) lines.push(`    Version: ${result.cli.version}`);
  } else {
    lines.push(`  CLI: ✗ Not available`);
    if (result.cli.error) lines.push(`    Error: ${result.cli.error}`);
    lines.push("");
    lines.push("  Install with one of:");
    lines.push("    npm install -g @ast-grep/cli");
    lines.push("    cargo install ast-grep --locked");
    lines.push("    brew install ast-grep");
  }

  return lines.join("\n");
}

/**
 * Run ast-grep CLI
 */
export async function runSg(options: RunOptions): Promise<SgResult> {
  const binaryPath = await getAstGrepPath();
  if (!binaryPath) {
    return {
      matches: [],
      totalMatches: 0,
      truncated: false,
      error: "ast-grep CLI not found",
    };
  }

  const { pattern, lang, paths = ["."], globs, rewrite, context, timeout = DEFAULT_TIMEOUT_MS } = options;

  // Build command args
  const args = [
    "run",
    "-p", pattern,
    "--lang", lang,
    "--json=compact",
  ];

  // Add globs
  if (globs) {
    for (const glob of globs) {
      args.push("--globs", glob);
    }
  }

  // Add rewrite (for replace)
  if (rewrite) {
    args.push("--update-all");
    args.push("--rewrite", rewrite);
  }

  // Add paths
  args.push(...paths);

  try {
    const proc = spawn({
      cmd: [binaryPath, ...args],
      stdout: "pipe",
      stderr: "pipe",
      cwd: process.cwd(),
    });

    // Set up timeout
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeout);
    });

    // Read stdout
    let output = "";
    let outputSize = 0;
    let truncatedBySize = false;

    const readPromise = (async () => {
      const reader = proc.stdout.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        outputSize += chunk.length;

        if (outputSize > DEFAULT_MAX_OUTPUT_BYTES) {
          truncatedBySize = true;
          break;
        }

        output += chunk;
      }

      return output;
    })();

    const result = await Promise.race([readPromise, timeoutPromise]);

    if (result === null) {
      proc.kill();
      return {
        matches: [],
        totalMatches: 0,
        truncated: true,
        truncatedReason: "timeout",
        error: `Timeout after ${timeout / 1000} seconds`,
      };
    }

    // Parse JSON compact output (one match per line)
    const matches: CliMatch[] = [];
    const lines = output.trim().split("\n").filter(Boolean);

    for (const line of lines) {
      if (matches.length >= DEFAULT_MAX_MATCHES) break;

      try {
        const match = JSON.parse(line) as CliMatch;
        matches.push(match);
      } catch {
        // Skip invalid JSON lines
      }
    }

    return {
      matches,
      totalMatches: matches.length,
      truncated: truncatedBySize || matches.length >= DEFAULT_MAX_MATCHES,
      truncatedReason: truncatedBySize
        ? "max_output_bytes"
        : matches.length >= DEFAULT_MAX_MATCHES
        ? "max_matches"
        : undefined,
    };
  } catch (error) {
    return {
      matches: [],
      totalMatches: 0,
      truncated: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Format search result
 */
export function formatSearchResult(result: SgResult): string {
  if (result.error) {
    return `Error: ${result.error}`;
  }

  if (result.matches.length === 0) {
    return "No matches found.";
  }

  const lines: string[] = [];

  for (const match of result.matches) {
    const line = match.range.start.line;
    const col = match.range.start.column;
    lines.push(`${match.file}:${line}:${col}`);
    lines.push(`  ${match.text}`);
    lines.push("");
  }

  if (result.truncated) {
    lines.push(`\n... Results truncated (${result.truncatedReason})`);
  }

  lines.push(`\nTotal: ${result.totalMatches} match(es)`);

  return lines.join("\n");
}

/**
 * Format replace result
 */
export function formatReplaceResult(result: SgResult, isDryRun: boolean): string {
  const prefix = isDryRun ? "[DRY RUN] " : "";

  if (result.error) {
    return `${prefix}Error: ${result.error}`;
  }

  if (result.matches.length === 0) {
    return `${prefix}No matches found.`;
  }

  const lines: string[] = [];

  if (isDryRun) {
    lines.push("[DRY RUN] The following replacements would be made:");
    lines.push("");
  } else {
    lines.push("Applied the following replacements:");
    lines.push("");
  }

  for (const match of result.matches) {
    const line = match.range.start.line;
    lines.push(`${match.file}:${line}`);
    lines.push(`  ${match.text}`);
    lines.push("");
  }

  if (result.truncated) {
    lines.push(`\n... Results truncated (${result.truncatedReason})`);
  }

  lines.push(`\n${prefix}Total: ${result.totalMatches} replacement(s)`);

  return lines.join("\n");
}
