/**
 * AST-Grep Tools Module
 * AST-aware code search and replace integration for SuperCode.
 * Provides 3 tools: search, replace, check.
 */

// Type exports
export * from "./types";

// CLI exports
export {
  getAstGrepPath,
  isCliAvailable,
  ensureCliAvailable,
  checkEnvironment,
  formatEnvironmentCheck,
  runSg,
  formatSearchResult,
  formatReplaceResult,
} from "./cli";

// Downloader exports
export {
  getCacheDir,
  getCachedBinaryPath,
  ensureAstGrepBinary,
  downloadAstGrep,
  getDownloadedVersion,
} from "./downloader";

// Tool exports
export {
  astGrepSearchTool,
  astGrepReplaceTool,
  astGrepCheckTool,
  astGrepTools,
} from "./tools";
