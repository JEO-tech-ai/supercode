/**
 * Skill System Types
 * Multi-agent workflow skill definitions for SuperCode
 */

/**
 * Skill frontmatter parsed from YAML header
 */
export interface SkillFrontmatter {
  /** Skill display name */
  name?: string;
  /** Short description */
  description: string;
  /** Argument hint for slash command display */
  argumentHint?: string;
  /** Model to use for this skill */
  model?: string;
  /** Agent to execute this skill */
  agent?: "cent" | "sisyphus" | "claude" | "gemini" | "codex";
  /** Run as background subtask */
  subtask?: boolean;
  /** Allowed tools for this skill */
  allowedTools?: string[];
  /** Skill tags for categorization */
  tags?: string[];
  /** Token optimization mode */
  tokenMode?: "full" | "compact" | "toon";
  /** Priority level (higher = more important) */
  priority?: number;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Parsed skill definition
 */
export interface Skill {
  /** Unique skill identifier (file-based) */
  id: string;
  /** Skill file name without extension */
  name: string;
  /** Full file path */
  path: string;
  /** Source directory type */
  source: SkillSource;
  /** Parsed frontmatter */
  frontmatter: SkillFrontmatter;
  /** Skill instruction content (markdown body) */
  instruction: string;
  /** Raw file content */
  raw: string;
  /** File modification time */
  mtime: Date;
}

/**
 * Skill source directory type
 */
export type SkillSource =
  | "project"     // .supercode/skills/
  | "user"        // ~/.config/supercode/skills/
  | "global"      // ~/.claude/skills/
  | "builtin";    // Built-in skills

/**
 * Skill execution context
 */
export interface SkillExecutionContext {
  /** Current session ID */
  sessionId: string;
  /** Current working directory */
  cwd: string;
  /** Arguments passed to skill */
  args?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Parent skill (if subtask) */
  parentSkillId?: string;
  /** Execution timeout (ms) */
  timeout?: number;
}

/**
 * Skill execution result
 */
export interface SkillExecutionResult {
  /** Whether execution succeeded */
  success: boolean;
  /** Output from skill execution */
  output?: string;
  /** Error if failed */
  error?: Error;
  /** Execution duration (ms) */
  duration: number;
  /** Token usage */
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  /** Cost estimate */
  cost?: number;
}

/**
 * Skill loading options
 */
export interface SkillLoadOptions {
  /** Include project skills */
  includeProject?: boolean;
  /** Include user skills */
  includeUser?: boolean;
  /** Include global skills */
  includeGlobal?: boolean;
  /** Include builtin skills */
  includeBuiltin?: boolean;
  /** Filter by tags */
  tags?: string[];
  /** Filter by agent */
  agent?: string;
  /** Refresh cache */
  refresh?: boolean;
}

/**
 * Skill registry events
 */
export interface SkillRegistryEvents {
  "skill:loaded": { skill: Skill };
  "skill:unloaded": { skillId: string };
  "skill:executed": { skillId: string; result: SkillExecutionResult };
  "skill:error": { skillId: string; error: Error };
  "skills:refreshed": { count: number };
}

/**
 * Skill category for organization
 */
export type SkillCategory =
  | "backend"
  | "frontend"
  | "code-quality"
  | "infrastructure"
  | "documentation"
  | "utilities"
  | "workflow"
  | "custom";

/**
 * Built-in skill IDs
 */
export type BuiltinSkillId =
  | "api-design"
  | "code-review"
  | "debug"
  | "documentation"
  | "refactor"
  | "test-generation"
  | "git-workflow";
