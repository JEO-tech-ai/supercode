/**
 * Cent Agent Constants
 * Phase definitions, templates, and configuration constants.
 */

import type { CentPhaseDefinition, MultiAgentConfig } from "./types";
import type { ToolSelectionEntry } from "../types";

/**
 * Agent name identifier
 */
export const AGENT_NAME = "cent";

/**
 * Agent display name
 */
export const AGENT_DISPLAY_NAME = "Cent";

/**
 * Agent description
 */
export const AGENT_DESCRIPTION =
  "Enhanced orchestrator agent with 6-phase workflow, multi-agent coordination, and autonomous task completion";

/**
 * 6-Phase Workflow Definitions
 */
export const CENT_PHASES: CentPhaseDefinition[] = [
  {
    id: "intent",
    number: 0,
    name: "Intent Classification",
    description: "Parse, validate, and classify user intent",
    actions: [
      "Parse user request for clear objectives",
      "Identify task type (code, explain, fix, create, refactor)",
      "Determine scope and complexity level",
      "Check for ambiguities requiring clarification",
      "Validate feasibility within constraints",
    ],
    transitions: [
      { target: "context", condition: "Intent is clear and actionable", priority: 1 },
      { target: "ask_user", condition: "Ambiguous or conflicting requirements", priority: 2 },
    ],
    suggestedAgents: ["oracle"],
    suggestedTools: ["Read", "Glob"],
  },
  {
    id: "context",
    number: 1,
    name: "Context Gathering",
    description: "Assess codebase and gather necessary context",
    actions: [
      "Delegate to explore agent for codebase scan",
      "Identify relevant files and patterns",
      "Map dependencies and architecture",
      "Build mental model of affected areas",
      "Gather existing tests and documentation",
    ],
    transitions: [
      { target: "decomposition", condition: "Sufficient context gathered", priority: 1 },
      { target: "intent", condition: "New information changes understanding", priority: 2 },
    ],
    suggestedAgents: ["explore", "librarian"],
    suggestedTools: ["Glob", "Grep", "Read"],
  },
  {
    id: "decomposition",
    number: 2,
    name: "Task Decomposition",
    description: "Break complex tasks into manageable subtasks",
    actions: [
      "Identify distinct work units",
      "Determine task dependencies and ordering",
      "Estimate complexity per subtask",
      "Assign priority levels",
      "Create execution plan with checkpoints",
    ],
    transitions: [
      { target: "delegation", condition: "Tasks decomposed and prioritized", priority: 1 },
      { target: "context", condition: "Need more exploration before planning", priority: 2 },
    ],
    suggestedAgents: ["oracle"],
    suggestedTools: ["TodoWrite"],
  },
  {
    id: "delegation",
    number: 3,
    name: "Agent Delegation",
    description: "Route tasks to appropriate specialist agents",
    actions: [
      "Match tasks to agent capabilities",
      "Consider cost (FREE/CHEAP/EXPENSIVE)",
      "Respect agent specializations",
      "Parallelize independent tasks",
      "Queue dependent tasks in order",
    ],
    transitions: [
      { target: "execution", condition: "All tasks delegated", priority: 1 },
      { target: "decomposition", condition: "Tasks need further breakdown", priority: 2 },
    ],
    suggestedAgents: ["explore", "librarian", "frontend-engineer", "document-writer"],
    suggestedTools: ["Task"],
  },
  {
    id: "execution",
    number: 4,
    name: "Task Execution",
    description: "Execute tasks with monitoring and error recovery",
    actions: [
      "Execute delegated tasks",
      "Monitor progress and status",
      "Handle errors with recovery strategies",
      "Retry with alternative approaches",
      "Escalate persistent issues",
    ],
    transitions: [
      { target: "verification", condition: "All tasks completed successfully", priority: 1 },
      { target: "delegation", condition: "Need to re-delegate failed tasks", priority: 2 },
      { target: "decomposition", condition: "Scope changed during execution", priority: 3 },
    ],
    suggestedAgents: ["explore", "frontend-engineer", "librarian"],
    suggestedTools: ["Edit", "Write", "Bash", "Task"],
  },
  {
    id: "verification",
    number: 5,
    name: "Verification & Completion",
    description: "Verify results and finalize task",
    actions: [
      "Verify changes against requirements",
      "Run relevant tests if applicable",
      "Check for regressions or side effects",
      "Summarize actions taken",
      "Report completion with context",
    ],
    transitions: [
      { target: "complete", condition: "All verifications passed", priority: 1 },
      { target: "execution", condition: "Issues found requiring fixes", priority: 2 },
    ],
    suggestedAgents: ["oracle", "explore"],
    suggestedTools: ["Bash", "Read", "Grep"],
  },
];

/**
 * Default multi-agent configuration
 */
export const DEFAULT_MULTI_AGENT_CONFIG: MultiAgentConfig = {
  claude: {
    enabled: true,
    role: "orchestrator",
  },
  gemini: {
    enabled: true,
    role: "analyst",
    mcpTool: "ask-gemini",
  },
  codex: {
    enabled: true,
    role: "executor",
    mcpTool: "shell",
  },
};

/**
 * Tool selection guide for Cent
 */
export const CENT_TOOL_SELECTION: ToolSelectionEntry[] = [
  {
    tool: "Read",
    when: "Need to examine file contents",
    why: "Precise file reading with line numbers",
  },
  {
    tool: "Glob",
    when: "Finding files by pattern",
    why: "Fast pattern-based file discovery",
  },
  {
    tool: "Grep",
    when: "Searching code content",
    why: "Regex-powered content search",
  },
  {
    tool: "Edit",
    when: "Modifying existing code",
    why: "Safe, targeted code modifications",
  },
  {
    tool: "Write",
    when: "Creating new files",
    why: "Full file creation when needed",
  },
  {
    tool: "Bash",
    when: "Running commands",
    why: "Git, npm, build tools, tests",
  },
  {
    tool: "Task",
    when: "Delegating to specialist",
    why: "Parallel agent execution",
  },
  {
    tool: "TodoWrite",
    when: "Tracking progress",
    why: "Structured task management",
  },
  {
    tool: "ask-gemini",
    when: "Large codebase analysis (MCP)",
    why: "1M+ token context analysis",
  },
  {
    tool: "shell (Codex)",
    when: "Long-running commands (MCP)",
    why: "Docker, builds, deployments",
  },
];

/**
 * Cost awareness guidelines
 */
export const COST_GUIDELINES = `## Cost Awareness

| Cost Level | Usage | Examples |
|------------|-------|----------|
| FREE | Exploration, simple tasks | explore, glob, grep |
| CHEAP | Most implementation work | edit, write, bash |
| EXPENSIVE | Complex decisions, deep reasoning | oracle with extended thinking |

**Rules**:
1. Default to CHEAP agents for implementation
2. Use FREE agents for discovery and exploration
3. Only use EXPENSIVE agents when CHEAP are insufficient
4. Parallelize independent tasks to save time`;

/**
 * Multi-agent coordination guidelines
 */
export const MULTI_AGENT_GUIDELINES = `## Multi-Agent Workflow

| Agent | Role | MCP Tool | Best For |
|-------|------|----------|----------|
| Claude Code | Orchestrator | Built-in | Planning, code generation, skill interpretation |
| Gemini-CLI | Analyst | ask-gemini | Large codebase analysis, research, reviews |
| Codex-CLI | Executor | shell | Long commands, Docker, builds, deployments |

### When to Delegate

**Claude Code (Default)**:
- Code writing and modification
- File operations
- Skill-based task planning

**Gemini-CLI (ask-gemini)**:
- Codebase analysis (1M+ tokens)
- Architecture research
- Code review for large PRs

**Codex-CLI (shell)**:
- Long-running build commands
- Docker/Kubernetes operations
- Deployment scripts`;

/**
 * Ralph Loop integration section
 */
export const RALPH_LOOP_SECTION = `## Ralph Loop Integration

Cent supports autonomous task completion via Ralph Loop.

### Activation
- Use \`/ralph <task>\` or \`/loop <task>\` to start
- Set completion promise with \`<promise>DONE</promise>\`

### Behavior
1. Cent executes the 6-phase workflow
2. Upon completion of each phase, progress is tracked
3. On session.idle, Ralph Loop checks for completion
4. If not complete, sends continuation prompt
5. Loop until \`<promise>DONE</promise>\` detected or max iterations

### Best Practices
- Use todos to track progress within loop
- Break large tasks into phases
- Report completion explicitly with promise tag
- Handle errors gracefully without stopping loop`;

/**
 * Completion verification checklist
 */
export const VERIFICATION_CHECKLIST = `## Verification Checklist

Before marking complete, verify:

- [ ] All requirements addressed
- [ ] Code follows existing patterns
- [ ] No regressions introduced
- [ ] Tests pass (if applicable)
- [ ] Changes are minimal and focused
- [ ] Documentation updated (if needed)

When all checks pass, output: \`<promise>DONE</promise>\``;

/**
 * Skill integration section
 */
export const SKILL_INTEGRATION_SECTION = `## Skill System Integration

Cent has access to a skill system for specialized workflows.

### Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| \`/skills\` | List all available skills | \`/skills\` |
| \`/skill <id>\` | Execute a specific skill | \`/skill api-design\` |
| \`/ultrawork\` | Enable multi-agent mode | \`/ultrawork <task>\` |
| \`/gemini\` | Query Gemini agent | \`/gemini <query>\` |
| \`/codex\` | Execute via Codex | \`/codex <command>\` |

### Skill Structure

Skills are Markdown files with YAML frontmatter:
\`\`\`markdown
---
description: "Skill description"
agent: "cent"
tags: ["api", "backend"]
---
<skill-instruction>
Instructions for the agent
</skill-instruction>
\`\`\`

### Skill Locations

1. **Project**: \`.supercode/skills/\` - Project-specific skills
2. **User**: \`~/.config/supercode/skills/\` - User-defined skills
3. **Global**: \`~/.claude/skills/\` - Shared skills
4. **Builtin**: System built-in skills

### Token Optimization

- \`full\`: Complete skill content
- \`compact\`: Condensed (88% reduction)
- \`toon\`: Minimal (95% reduction)

### Phase 0 Integration

During Intent Classification (Phase 0):
1. Check if user request matches a skill pattern
2. If match found, load skill and inject instruction
3. Follow skill workflow instead of generic approach`;

/**
 * Skill patterns for intent detection
 */
export const SKILL_INTENT_PATTERNS = [
  { pattern: /api\s+(design|create|build)/i, skill: "api-design" },
  { pattern: /(code\s+)?review/i, skill: "code-review" },
  { pattern: /debug(ging)?|fix\s+bug/i, skill: "debug" },
  { pattern: /(write|create|generate)\s+(docs?|documentation)/i, skill: "documentation" },
  { pattern: /refactor/i, skill: "refactor" },
  { pattern: /(write|create|generate)\s+tests?/i, skill: "test-generation" },
  { pattern: /git\s+(commit|push|merge|rebase)/i, skill: "git-workflow" },
];
