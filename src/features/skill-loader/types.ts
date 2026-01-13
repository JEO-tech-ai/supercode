import type { SkillMcpConfig } from "../skill-mcp-manager/types";

export type SkillScope =
  | "builtin"
  | "config"
  | "user"
  | "project"
  | "opencode"
  | "opencode-project";

export interface SkillMetadata {
  name?: string;
  description?: string;
  model?: string;
  "argument-hint"?: string;
  agent?: string;
  subtask?: boolean;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  "allowed-tools"?: string;
  mcp?: SkillMcpConfig;
}

export interface SkillDefinition {
  name: string;
  description?: string;
  template: string;
  agent?: string;
  model?: string;
  subtask?: boolean;
  argumentHint?: string;
}

export interface LazyContentLoader {
  loaded: boolean;
  content?: string;
  load: () => Promise<string>;
}

export interface LoadedSkill {
  name: string;
  path?: string;
  resolvedPath?: string;
  definition: SkillDefinition;
  scope: SkillScope;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string[];
  mcpConfig?: SkillMcpConfig;
  lazyContent?: LazyContentLoader;
}

export interface DiscoverSkillsOptions {
  includeClaudeCodePaths?: boolean;
}
