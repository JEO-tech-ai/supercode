/**
 * AST-Grep Types
 * Type definitions for AST-Grep integration.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

/**
 * Position in source code
 */
export interface Position {
  line: number;
  column: number;
}

/**
 * Range in source code
 */
export interface Range {
  start: Position;
  end: Position;
}

/**
 * CLI match result
 */
export interface CliMatch {
  text: string;
  range: {
    byteOffset: { start: number; end: number };
    start: Position;
    end: Position;
  };
  file: string;
  lines: string;
  charCount: { leading: number; trailing: number };
  language: string;
}

/**
 * Simplified search match
 */
export interface SearchMatch {
  file: string;
  text: string;
  range: Range;
  lines: string;
}

/**
 * CLI execution result
 */
export interface SgResult {
  matches: CliMatch[];
  totalMatches: number;
  truncated: boolean;
  truncatedReason?: "max_matches" | "max_output_bytes" | "timeout";
  error?: string;
}

/**
 * CLI language options
 */
export type CliLanguage =
  | "bash"
  | "c"
  | "cpp"
  | "csharp"
  | "css"
  | "elixir"
  | "go"
  | "haskell"
  | "html"
  | "java"
  | "javascript"
  | "json"
  | "kotlin"
  | "lua"
  | "nix"
  | "php"
  | "python"
  | "ruby"
  | "rust"
  | "scala"
  | "solidity"
  | "swift"
  | "typescript"
  | "tsx"
  | "yaml";

/**
 * Run options for CLI
 */
export interface RunOptions {
  pattern: string;
  lang: CliLanguage;
  paths?: string[];
  globs?: string[];
  rewrite?: string;
  context?: number;
  timeout?: number;
}

/**
 * Environment check result
 */
export interface EnvironmentCheckResult {
  cli: {
    available: boolean;
    path?: string;
    version?: string;
    error?: string;
  };
}
