import { z } from "zod";

export const CommandInfoSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  agent: z.string().optional(),
  model: z.string().optional(),
  mcp: z.string().optional(),
  subtask: z.boolean().optional(),
  hints: z.array(z.string()).optional(),
  aliases: z.array(z.string()).optional(),
  category: z.enum(["session", "navigation", "system", "agent", "mcp", "git", "context", "debug"]).optional(),
  template: z.union([z.string(), z.function().returns(z.promise(z.string()))]),
});

export type CommandInfo = z.infer<typeof CommandInfoSchema>;

export interface CommandExecuteOptions {
  sessionId: string;
  args: string[];
  rawArgs: string;
  workdir: string;
  model?: string;
  agent?: string;
}

const BUILTIN_COMMANDS: CommandInfo[] = [
  {
    name: "init",
    description: "Analyze codebase and create a summary",
    category: "context",
    template: `Analyze this codebase and provide:
1. Tech stack overview
2. Project structure
3. Key entry points
4. Development conventions`,
  },
  {
    name: "plan",
    description: "Create a detailed implementation plan",
    category: "agent",
    agent: "planner",
    subtask: true,
    aliases: ["planning"],
    template: `Create a detailed implementation plan for: $ARGUMENTS

Include:
1. Objectives and success criteria
2. Step-by-step implementation tasks
3. Files that will be created or modified
4. Potential risks and mitigations
5. Testing approach`,
  },
  {
    name: "review",
    description: "Review code changes",
    category: "agent",
    agent: "code-reviewer",
    subtask: true,
    aliases: ["code-review", "cr"],
    template: `Review the following code for:
- Best practices
- Potential bugs
- Performance issues
- Security concerns

$ARGUMENTS`,
  },
  {
    name: "test",
    description: "Generate tests for code",
    category: "agent",
    aliases: ["tests"],
    template: `Generate comprehensive tests for: $ARGUMENTS

Include:
1. Unit tests
2. Edge cases
3. Integration tests if applicable`,
  },
  {
    name: "fix",
    description: "Fix an issue or bug",
    category: "agent",
    aliases: ["bugfix", "solve"],
    template: `Fix the following issue:
1. Analyze the problem
2. Identify the root cause
3. Implement a solution
4. Verify the fix works
5. Ensure no regressions

Issue: $ARGUMENTS`,
  },
  {
    name: "explain",
    description: "Explain code or concept",
    category: "context",
    aliases: ["describe", "what"],
    template: `Explain the following in detail:
1. What it does
2. How it works
3. Key components and their interactions
4. Any important considerations

$ARGUMENTS`,
  },
  {
    name: "refactor",
    description: "Refactor code for better quality",
    category: "agent",
    aliases: ["improve", "cleanup"],
    template: `Refactor the following code:
1. Identify improvement opportunities
2. Apply clean code principles
3. Improve readability and maintainability
4. Preserve existing functionality
5. Add comments where helpful

$ARGUMENTS`,
  },
  {
    name: "docs",
    description: "Generate documentation",
    category: "agent",
    agent: "docwriter",
    aliases: ["document", "readme"],
    template: `Generate documentation for: $ARGUMENTS

Include:
1. Overview and purpose
2. Usage examples
3. API reference if applicable
4. Configuration options`,
  },
  {
    name: "commit",
    description: "Create a git commit with generated message",
    category: "git",
    template: `Analyze the staged changes and create a commit:
1. Review \`git diff --staged\`
2. Generate a descriptive commit message
3. Follow conventional commits format
4. Execute the commit

$ARGUMENTS`,
  },
  {
    name: "pr",
    description: "Create a pull request",
    category: "git",
    template: `Create a pull request:
1. Review all commits on current branch
2. Generate PR title and description
3. Include summary of changes
4. Create PR using gh cli

$ARGUMENTS`,
  },
  {
    name: "debug",
    description: "Debug an issue",
    category: "debug",
    template: `Debug the following issue:
1. Reproduce the problem
2. Add diagnostic logging
3. Identify root cause
4. Propose fix

$ARGUMENTS`,
  },
  {
    name: "new",
    description: "Start a new chat session",
    category: "session",
    template: "Start a new conversation.",
  },
  {
    name: "clear",
    description: "Clear current session messages",
    category: "session",
    template: "Clear all messages in current session.",
  },
  {
    name: "help",
    description: "Show available commands",
    category: "system",
    aliases: ["commands", "?"],
    template: "List all available slash commands with their descriptions.",
  },
];

class CommandRegistry {
  private commands = new Map<string, CommandInfo>();
  private aliasMap = new Map<string, string>();
  private loaded = false;

  register(command: CommandInfo): void {
    const validated = CommandInfoSchema.parse(command);
    this.commands.set(validated.name, validated);

    if (validated.aliases) {
      for (const alias of validated.aliases) {
        this.aliasMap.set(alias, validated.name);
      }
    }
  }

  unregister(name: string): boolean {
    const command = this.commands.get(name);
    if (!command) return false;

    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliasMap.delete(alias);
      }
    }

    return this.commands.delete(name);
  }

  get(nameOrAlias: string): CommandInfo | undefined {
    const name = this.aliasMap.get(nameOrAlias) || nameOrAlias;
    return this.commands.get(name);
  }

  has(nameOrAlias: string): boolean {
    const name = this.aliasMap.get(nameOrAlias) || nameOrAlias;
    return this.commands.has(name);
  }

  list(): CommandInfo[] {
    return Array.from(this.commands.values());
  }

  listByCategory(category: CommandInfo["category"]): CommandInfo[] {
    return this.list().filter((cmd) => cmd.category === category);
  }

  async load(customCommands?: CommandInfo[]): Promise<void> {
    if (this.loaded) return;

    for (const cmd of BUILTIN_COMMANDS) {
      this.register(cmd);
    }

    if (customCommands) {
      for (const cmd of customCommands) {
        this.register(cmd);
      }
    }

    this.loaded = true;
  }

  clear(): void {
    this.commands.clear();
    this.aliasMap.clear();
    this.loaded = false;
  }

  get size(): number {
    return this.commands.size;
  }

  get isLoaded(): boolean {
    return this.loaded;
  }
}

export const commandRegistry = new CommandRegistry();

export async function loadCommands(customCommands?: CommandInfo[]): Promise<void> {
  await commandRegistry.load(customCommands);
}

export function getCommand(name: string): CommandInfo | undefined {
  return commandRegistry.get(name);
}

export function listCommands(): CommandInfo[] {
  return commandRegistry.list();
}

export function registerCommand(command: CommandInfo): void {
  commandRegistry.register(command);
}
