/**
 * Skill System Constants
 * Configuration and default values for the skill system
 */

import * as path from "path";
import * as os from "os";
import type { SkillFrontmatter, SkillSource } from "./types";

/**
 * Skill directory paths by source type
 */
export function getSkillPaths(cwd: string = process.cwd()): Record<SkillSource, string> {
  const homeDir = os.homedir();

  return {
    project: path.join(cwd, ".supercode", "skills"),
    user: path.join(homeDir, ".config", "supercode", "skills"),
    global: path.join(homeDir, ".claude", "skills"),
    builtin: path.join(__dirname, "..", "..", "..", "skills"),
  };
}

/**
 * Skill file patterns
 */
export const SKILL_FILE_PATTERNS = [
  "*.md",
  "**/*.md",
];

/**
 * Default skill frontmatter
 */
export const DEFAULT_SKILL_FRONTMATTER: SkillFrontmatter = {
  description: "No description provided",
  agent: "cent",
  subtask: false,
  tokenMode: "compact",
  priority: 0,
};

/**
 * Skill cache TTL (milliseconds)
 */
export const SKILL_CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Maximum skill file size (bytes)
 */
export const MAX_SKILL_FILE_SIZE = 100 * 1024; // 100KB

/**
 * Frontmatter delimiters
 */
export const FRONTMATTER_DELIMITER = "---";

/**
 * Skill instruction tag
 */
export const SKILL_INSTRUCTION_TAG = "skill-instruction";

/**
 * Token optimization modes
 */
export const TOKEN_MODES = {
  full: {
    name: "Full",
    description: "Complete skill content with all details",
    tokenReduction: 0,
  },
  compact: {
    name: "Compact",
    description: "Condensed skill content",
    tokenReduction: 0.88,
  },
  toon: {
    name: "Toon",
    description: "Minimal skill content for maximum token savings",
    tokenReduction: 0.95,
  },
} as const;

/**
 * Agent mapping for skill execution
 */
export const AGENT_MAPPING = {
  cent: {
    name: "Cent",
    description: "Multi-agent orchestrator with 6-phase workflow",
    model: "anthropic/claude-sonnet-4-5",
    capabilities: ["planning", "coordination", "execution"],
  },
  sisyphus: {
    name: "Sisyphus",
    description: "Advanced orchestrator with 5-phase workflow",
    model: "anthropic/claude-opus-4-5",
    capabilities: ["deep-analysis", "complex-tasks", "multi-step"],
  },
  claude: {
    name: "Claude",
    description: "Default Claude Code agent",
    model: "anthropic/claude-sonnet-4-5",
    capabilities: ["coding", "analysis", "documentation"],
  },
  gemini: {
    name: "Gemini",
    description: "Google Gemini via gemini-cli MCP",
    model: "gemini/gemini-2.5-pro",
    capabilities: ["large-context", "research", "analysis"],
  },
  codex: {
    name: "Codex",
    description: "OpenAI Codex via codex-cli MCP",
    model: "openai/codex",
    capabilities: ["shell", "execution", "automation"],
  },
} as const;

/**
 * Skill categories with descriptions
 */
export const SKILL_CATEGORIES = {
  backend: {
    name: "Backend",
    description: "API design, database, authentication",
    tags: ["api", "database", "auth", "server"],
  },
  frontend: {
    name: "Frontend",
    description: "UI components, state management",
    tags: ["ui", "components", "state", "css"],
  },
  "code-quality": {
    name: "Code Quality",
    description: "Code review, debugging, refactoring",
    tags: ["review", "debug", "refactor", "lint"],
  },
  infrastructure: {
    name: "Infrastructure",
    description: "Deployment, monitoring, security",
    tags: ["deploy", "ci-cd", "docker", "security"],
  },
  documentation: {
    name: "Documentation",
    description: "Technical docs, API docs",
    tags: ["docs", "readme", "api-docs"],
  },
  utilities: {
    name: "Utilities",
    description: "Git workflows, environment setup",
    tags: ["git", "env", "setup", "config"],
  },
  workflow: {
    name: "Workflow",
    description: "Multi-agent workflows, automation",
    tags: ["workflow", "automation", "orchestration"],
  },
  custom: {
    name: "Custom",
    description: "User-defined skills",
    tags: [],
  },
} as const;

/**
 * Built-in skills definitions
 */
export const BUILTIN_SKILLS = {
  "api-design": {
    name: "API Design",
    description: "Design RESTful APIs with OpenAPI spec",
    agent: "cent",
    tags: ["api", "backend", "design"],
  },
  "code-review": {
    name: "Code Review",
    description: "Review code for best practices and issues",
    agent: "gemini",
    tags: ["review", "quality"],
  },
  debug: {
    name: "Debug",
    description: "Debug and fix issues in code",
    agent: "claude",
    tags: ["debug", "fix"],
  },
  documentation: {
    name: "Documentation",
    description: "Generate technical documentation",
    agent: "claude",
    tags: ["docs", "readme"],
  },
  refactor: {
    name: "Refactor",
    description: "Refactor code for better structure",
    agent: "claude",
    tags: ["refactor", "clean-code"],
  },
  "test-generation": {
    name: "Test Generation",
    description: "Generate unit and integration tests",
    agent: "claude",
    tags: ["test", "quality"],
  },
  "git-workflow": {
    name: "Git Workflow",
    description: "Manage git operations and workflows",
    agent: "codex",
    tags: ["git", "version-control"],
  },
} as const;
