/**
 * Built-in Slash Commands
 * Default slash commands for SuperCode
 */

import type {
  SlashCommand,
  SlashCommandContext,
  SlashCommandResult,
} from "./types";
import { getSlashCommandRegistry } from "./registry";
import { getSkillLoader, formatSkillList } from "../skill";

const argsRegex = /(?:\[Image\s+\d+\]|"[^"]*"|'[^']*'|[^\s"']+)/gi;
const placeholderRegex = /\$(\d+)/g;
const quoteTrimRegex = /^["']|["']$/g;

function parseArgs(input: string): string[] {
  const matches = input.match(argsRegex) ?? [];
  return matches.map((arg) => arg.replace(quoteTrimRegex, ""));
}

function expandTemplate(template: string, rawArgs: string, args: string[]): string {
  const placeholders = template.match(placeholderRegex) ?? [];
  let last = 0;
  for (const item of placeholders) {
    const value = Number(item.slice(1));
    if (value > last) last = value;
  }

  const withArgs = template.replace(placeholderRegex, (_, index) => {
    const position = Number(index);
    const argIndex = position - 1;
    if (argIndex >= args.length) return "";
    if (position === last) return args.slice(argIndex).join(" ");
    return args[argIndex];
  });

  return withArgs
    .replace(/\$ARGUMENTS/g, rawArgs || "(no additional context provided)")
    .replace(/\{args\}/g, rawArgs || "(no additional context provided)")
    .trim();
}

function createTemplateCommand(options: {
  name: string;
  description: string;
  template: string;
  argumentHint?: string;
  aliases?: string[];
  category?: SlashCommand["category"];
  showInPalette?: boolean;
  priority?: number;
}): SlashCommand {
  return {
    name: options.name,
    description: options.description,
    argumentHint: options.argumentHint,
    category: options.category ?? "workflow",
    aliases: options.aliases,
    showInPalette: options.showInPalette ?? true,
    priority: options.priority,
    handler: async (args, context): Promise<SlashCommandResult> => {
      const parsedArgs = parseArgs(args);
      const prompt = expandTemplate(options.template, args, parsedArgs);
      return {
        success: true,
        prompt,
        continue: true,
      };
    },
  };
}

const planCommand = createTemplateCommand({
  name: "plan",
  description: "Create a detailed implementation plan",
  argumentHint: "<task>",
  aliases: ["planning"],
  priority: 80,
  template: `Create a detailed implementation plan for the following task. Include:
1. Objectives and success criteria
2. Step-by-step implementation tasks
3. Files that will be created or modified
4. Potential risks and mitigations
5. Testing approach

Task: {args}`,
});

const reviewCommand = createTemplateCommand({
  name: "review",
  description: "Review code changes",
  argumentHint: "<diff/summary>",
  aliases: ["code-review", "cr"],
  priority: 80,
  template: `Review the following code changes for:
1. Code quality and best practices
2. Potential bugs or issues
3. Performance considerations
4. Security implications
5. Suggestions for improvement

{args}`,
});

const testCommand = createTemplateCommand({
  name: "test",
  description: "Run tests and analyze results",
  argumentHint: "[scope]",
  aliases: ["tests"],
  priority: 70,
  template: `Run the test suite and analyze the results:
1. Execute all relevant tests
2. Report any failures with details
3. Suggest fixes for failing tests
4. Check test coverage if available

{args}`,
});

const fixCommand = createTemplateCommand({
  name: "fix",
  description: "Fix an issue or bug",
  argumentHint: "<issue>",
  aliases: ["bugfix", "solve"],
  priority: 70,
  template: `Fix the following issue:
1. Analyze the problem
2. Identify the root cause
3. Implement a solution
4. Verify the fix works
5. Ensure no regressions

Issue: {args}`,
});

const explainCommand = createTemplateCommand({
  name: "explain",
  description: "Explain code or concept",
  argumentHint: "<topic>",
  aliases: ["describe", "what"],
  priority: 60,
  template: `Explain the following in detail:
1. What it does
2. How it works
3. Key components and their interactions
4. Any important considerations

{args}`,
});

const refactorCommand = createTemplateCommand({
  name: "refactor",
  description: "Refactor code",
  argumentHint: "<code>",
  aliases: ["improve", "cleanup"],
  priority: 60,
  template: `Refactor the following code:
1. Identify improvement opportunities
2. Apply clean code principles
3. Improve readability and maintainability
4. Preserve existing functionality
5. Add comments where helpful

{args}`,
});

/**
 * /help command - Show help information
 */
const helpCommand: SlashCommand = {
  name: "help",
  description: "Show help information and available commands",
  category: "help",
  aliases: ["h", "?"],
  showInPalette: true,
  priority: 100,
  handler: async (args, context): Promise<SlashCommandResult> => {
    const registry = getSlashCommandRegistry();
    const commands = registry.getAll().filter((c) => c.enabled && c.showInPalette);

    // Group by category
    const byCategory = new Map<string, typeof commands>();
    for (const cmd of commands) {
      const cat = cmd.category;
      if (!byCategory.has(cat)) {
        byCategory.set(cat, []);
      }
      byCategory.get(cat)!.push(cmd);
    }

    let output = "# SuperCode Commands\n\n";

    const categoryOrder = ["skill", "workflow", "session", "navigation", "settings", "help", "custom"];

    for (const cat of categoryOrder) {
      const catCommands = byCategory.get(cat);
      if (!catCommands || catCommands.length === 0) continue;

      output += `## ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n\n`;

      for (const cmd of catCommands.sort((a, b) => (b.priority || 0) - (a.priority || 0))) {
        const hint = cmd.argumentHint ? ` ${cmd.argumentHint}` : "";
        output += `- \`/${cmd.name}${hint}\` - ${cmd.description}\n`;
      }

      output += "\n";
    }

    return {
      success: true,
      output,
    };
  },
};

/**
 * /skills command - List available skills
 */
const skillsCommand: SlashCommand = {
  name: "skills",
  description: "List all available skills",
  argumentHint: "[filter]",
  category: "skill",
  aliases: ["skill-list", "sl"],
  showInPalette: true,
  priority: 90,
  handler: async (args, context): Promise<SlashCommandResult> => {
    const loader = getSkillLoader(context.cwd);

    // Parse filter from args
    let tags: string[] | undefined;
    let agent: string | undefined;

    if (args) {
      const parts = args.split(/\s+/);
      for (const part of parts) {
        if (part.startsWith("tag:")) {
          tags = tags || [];
          tags.push(part.slice(4));
        } else if (part.startsWith("agent:")) {
          agent = part.slice(6);
        } else {
          // Treat as tag
          tags = tags || [];
          tags.push(part);
        }
      }
    }

    const skills = await loader.loadAll({ tags, agent });
    const formatted = formatSkillList(
      skills.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.frontmatter.description,
        agent: s.frontmatter.agent || "cent",
        tags: s.frontmatter.tags || [],
      }))
    );

    return {
      success: true,
      output: formatted,
    };
  },
};

/**
 * /ultrawork command - Enable advanced multi-agent mode
 */
const ultraworkCommand: SlashCommand = {
  name: "ultrawork",
  description: "Enable advanced multi-agent orchestration mode",
  argumentHint: "[task]",
  category: "workflow",
  aliases: ["ulw", "ultra"],
  showInPalette: true,
  priority: 95,
  handler: async (args, context): Promise<SlashCommandResult> => {
    const prompt = `<ultrawork-mode>
ULTRAWORK MODE ACTIVATED

You are now operating in UltraWork mode - an advanced multi-agent orchestration system.

## Available Agents

1. **Claude Code (Orchestrator)** - Planning, code generation, skill interpretation
2. **Gemini-CLI (Analyst)** - Large-context analysis, research, code review (ask-gemini)
3. **Codex-CLI (Executor)** - Shell execution, builds, deployments (shell)

## Workflow

1. **Intent Phase**: Understand the task completely
2. **Assessment Phase**: Evaluate complexity and select agents
3. **Exploration Phase**: Gather context from codebase
4. **Implementation Phase**: Execute with appropriate agents
5. **Verification Phase**: Validate results

## Agent Selection Guide

- **Simple tasks**: Claude Code alone
- **Large codebase analysis**: Delegate to Gemini-CLI
- **Shell operations**: Delegate to Codex-CLI
- **Complex multi-step**: Orchestrate all agents

${args ? `## Current Task\n\n${args}` : ""}

Execute this task using the UltraWork multi-agent workflow.
</ultrawork-mode>`;

    return {
      success: true,
      prompt,
      continue: true,
    };
  },
};

/**
 * /cent command - Activate Cent agent
 */
const centCommand: SlashCommand = {
  name: "cent",
  description: "Activate Cent multi-agent orchestrator",
  argumentHint: "[task]",
  category: "workflow",
  aliases: ["c"],
  showInPalette: true,
  priority: 90,
  handler: async (args, context): Promise<SlashCommandResult> => {
    const prompt = `<cent-agent>
Activate Cent agent with 6-phase workflow:

1. Intent Phase - Understand requirements
2. Context Phase - Gather relevant information
3. Decomposition Phase - Break into subtasks
4. Delegation Phase - Assign to appropriate agents
5. Execution Phase - Execute subtasks
6. Verification Phase - Validate completion

${args ? `Task: ${args}` : "Awaiting task specification."}
</cent-agent>`;

    return {
      success: true,
      prompt,
      continue: true,
    };
  },
};

/**
 * /gemini command - Query Gemini via MCP
 */
const geminiCommand: SlashCommand = {
  name: "gemini",
  description: "Query Gemini for large-context analysis",
  argumentHint: "<query>",
  category: "workflow",
  aliases: ["g", "gem"],
  showInPalette: true,
  priority: 85,
  handler: async (args, context): Promise<SlashCommandResult> => {
    if (!args) {
      return {
        success: false,
        error: new Error("Query is required for /gemini command"),
      };
    }

    const prompt = `<gemini-query>
Use the ask-gemini MCP tool to analyze:

${args}

The Gemini agent is optimized for:
- Large context analysis (1M+ tokens)
- Code review and research
- Complex architecture analysis
</gemini-query>`;

    return {
      success: true,
      prompt,
      continue: true,
    };
  },
};

/**
 * /codex command - Execute via Codex-CLI
 */
const codexCommand: SlashCommand = {
  name: "codex",
  description: "Execute shell commands via Codex-CLI",
  argumentHint: "<command>",
  category: "workflow",
  aliases: ["x", "exec"],
  showInPalette: true,
  priority: 85,
  handler: async (args, context): Promise<SlashCommandResult> => {
    if (!args) {
      return {
        success: false,
        error: new Error("Command is required for /codex command"),
      };
    }

    const prompt = `<codex-exec>
Use the Codex-CLI shell tool to execute:

${args}

Working directory: ${context.cwd}

The Codex agent is optimized for:
- Long-running shell commands
- Build and deployment operations
- Docker/Kubernetes tasks
</codex-exec>`;

    return {
      success: true,
      prompt,
      continue: true,
    };
  },
};

/**
 * /clear command - Clear conversation
 */
const clearCommand: SlashCommand = {
  name: "clear",
  description: "Clear conversation history",
  category: "session",
  aliases: ["cls", "reset"],
  showInPalette: true,
  priority: 50,
  handler: async (args, context): Promise<SlashCommandResult> => {
    return {
      success: true,
      output: "Conversation cleared.",
      data: { action: "clear" },
    };
  },
};

/**
 * /compact command - Compact context
 */
const compactCommand: SlashCommand = {
  name: "compact",
  description: "Compact conversation context to save tokens",
  category: "session",
  aliases: ["summarize"],
  showInPalette: true,
  priority: 50,
  handler: async (args, context): Promise<SlashCommandResult> => {
    const prompt = `<context-compaction>
Summarize the current conversation into a compact context that preserves:
- Key decisions made
- Important code changes
- Current task state
- Next steps planned

Format the summary for minimum token usage while retaining all essential information.
</context-compaction>`;

    return {
      success: true,
      prompt,
      continue: true,
    };
  },
};

/**
 * Register all built-in commands
 */
export function registerBuiltinCommands(): void {
  const registry = getSlashCommandRegistry();

  registry.register(planCommand);
  registry.register(reviewCommand);
  registry.register(testCommand);
  registry.register(fixCommand);
  registry.register(explainCommand);
  registry.register(refactorCommand);
  registry.register(helpCommand);
  registry.register(skillsCommand);
  registry.register(ultraworkCommand);
  registry.register(centCommand);
  registry.register(geminiCommand);
  registry.register(codexCommand);
  registry.register(clearCommand);
  registry.register(compactCommand);
}

/**
 * Get all built-in commands
 */
export const BUILTIN_COMMANDS: SlashCommand[] = [
  planCommand,
  reviewCommand,
  testCommand,
  fixCommand,
  explainCommand,
  refactorCommand,
  helpCommand,
  skillsCommand,
  ultraworkCommand,
  centCommand,
  geminiCommand,
  codexCommand,
  clearCommand,
  compactCommand,
];
