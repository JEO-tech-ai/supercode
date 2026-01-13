# Skills Integration Plan

> **목표**: skills-template의 스킬 시스템을 supercode에 통합하여 확장 가능한 기능 제공

## Overview

Skills Integration은 skills-template의 agent-skills를 supercode에 통합하여, AI 에이전트가 특정 작업에 대한 전문 지식을 활용할 수 있게 합니다.

## Skills System Architecture

### From skills-template

```
.agent-skills/
├── backend/
│   ├── api-design/SKILL.md
│   ├── database-schema-design/SKILL.md
│   └── backend-testing/SKILL.md
├── frontend/
│   ├── state-management/SKILL.md
│   ├── responsive-design/SKILL.md
│   └── ui-component-patterns/SKILL.md
├── code-quality/
│   ├── code-review/SKILL.md
│   ├── testing-strategies/SKILL.md
│   └── performance-optimization/SKILL.md
├── documentation/
│   ├── technical-writing/SKILL.md
│   └── api-documentation/SKILL.md
├── infrastructure/
│   ├── deployment-automation/SKILL.md
│   └── security-best-practices/SKILL.md
├── project-management/
│   ├── ultrathink-multiagent-workflow/SKILL.md
│   └── task-planning/SKILL.md
├── search-analysis/
│   └── codebase-search/SKILL.md
└── utilities/
    ├── git-workflow/SKILL.md
    └── mcp-codex-integration/SKILL.md
```

### Skill Format

```markdown
---
name: skill-name
description: What this skill does and when to use it
allowed-tools: [Read, Grep, Glob, Bash]
tags: [tag1, tag2]
platforms: [Claude, ChatGPT, Gemini]
---

# Skill Title

## When to use this skill
- Condition 1
- Condition 2

## Instructions
### Step 1: ...
### Step 2: ...

## Examples
### Example 1: Basic usage
### Example 2: Advanced usage

## Constraints
### MUST DO
### MUST NOT DO

## References
```

## Implementation Plan

### 1. Skill Loader Enhancement

```typescript
// src/features/skill-loader/index.ts
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { parseFrontmatter } from './frontmatter';

export interface Skill {
  name: string;
  description: string;
  path: string;
  content: string;
  allowedTools?: string[];
  tags?: string[];
  platforms?: string[];
  mcpConfig?: Record<string, unknown>;
}

export interface SkillLoaderOptions {
  includeClaudeSkills?: boolean;
  includeProjectSkills?: boolean;
  includeGlobalSkills?: boolean;
}

const SKILL_PATHS = [
  // Global skills
  '~/.config/supercode/skills',
  '~/.claude/skills',
  // Project skills
  '.agent-skills',
  '.supercode/skills',
  '.claude/skills',
];

export class SkillLoader {
  private skills: Map<string, Skill> = new Map();
  private options: SkillLoaderOptions;
  
  constructor(options: SkillLoaderOptions = {}) {
    this.options = {
      includeClaudeSkills: options.includeClaudeSkills ?? true,
      includeProjectSkills: options.includeProjectSkills ?? true,
      includeGlobalSkills: options.includeGlobalSkills ?? true,
    };
  }
  
  async discover(): Promise<Skill[]> {
    const allPaths = this.resolvePaths();
    
    for (const basePath of allPaths) {
      if (!existsSync(basePath)) continue;
      
      await this.scanDirectory(basePath);
    }
    
    return Array.from(this.skills.values());
  }
  
  private async scanDirectory(dir: string, category = ''): Promise<void> {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recurse into subdirectory
        await this.scanDirectory(fullPath, entry.name);
      } else if (entry.name === 'SKILL.md') {
        // Found a skill file
        const skill = await this.loadSkill(fullPath, category);
        if (skill) {
          this.skills.set(skill.name, skill);
        }
      }
    }
  }
  
  private async loadSkill(path: string, category: string): Promise<Skill | null> {
    try {
      const content = readFileSync(path, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      
      return {
        name: frontmatter.name || category,
        description: frontmatter.description || '',
        path,
        content: body,
        allowedTools: frontmatter['allowed-tools'],
        tags: frontmatter.tags,
        platforms: frontmatter.platforms,
        mcpConfig: frontmatter.mcp,
      };
    } catch (error) {
      console.warn(`Failed to load skill from ${path}:`, error);
      return null;
    }
  }
  
  getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }
  
  searchSkills(query: string): Skill[] {
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.skills.values()).filter(skill =>
      skill.name.toLowerCase().includes(lowerQuery) ||
      skill.description.toLowerCase().includes(lowerQuery) ||
      skill.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
  
  private resolvePaths(): string[] {
    const paths: string[] = [];
    const home = process.env.HOME || '';
    const cwd = process.cwd();
    
    for (const p of SKILL_PATHS) {
      let resolved = p;
      if (p.startsWith('~')) {
        resolved = join(home, p.slice(2));
      } else if (p.startsWith('.')) {
        resolved = resolve(cwd, p);
      }
      paths.push(resolved);
    }
    
    return paths;
  }
}
```

### 2. Skill Tool

```typescript
// src/core/tools/skill/index.ts
import { z } from 'zod';
import { SkillLoader, Skill } from '../../features/skill-loader';

export const skillSchema = z.object({
  name: z.string().describe('Skill name to load'),
});

export function createSkillTool(options: {
  skills: Skill[];
  mcpManager?: SkillMcpManager;
  getSessionID: () => string;
}) {
  return {
    name: 'skill',
    description: `Load a skill to get detailed instructions for a specific task.

Skills provide specialized knowledge and step-by-step guidance.
Use this when a task matches an available skill's description.

<available_skills>
${options.skills.map(s => `  <skill>
    <name>${s.name}</name>
    <description>${s.description}</description>
  </skill>`).join('\n')}
</available_skills>`,
    parameters: skillSchema,
    execute: async (params: z.infer<typeof skillSchema>) => {
      const skill = options.skills.find(s => s.name === params.name);
      
      if (!skill) {
        return `Skill not found: ${params.name}

Available skills:
${options.skills.map(s => `- ${s.name}: ${s.description}`).join('\n')}`;
      }
      
      // If skill has MCP config, start MCP server
      if (skill.mcpConfig && options.mcpManager) {
        await options.mcpManager.loadSkillMcp(skill, options.getSessionID());
      }
      
      return `# Skill: ${skill.name}

${skill.content}`;
    },
  };
}
```

### 3. Slash Command Tool

```typescript
// src/core/tools/slashcommand/index.ts
import { z } from 'zod';

export interface SlashCommand {
  name: string;
  description: string;
  template: string;
  parameters?: Record<string, string>;
}

const BUILTIN_COMMANDS: SlashCommand[] = [
  {
    name: 'ultrawork',
    description: 'Maximum effort mode for complex tasks',
    template: `[ultrawork-mode]
MAXIMIZE EFFORT. Launch multiple background agents IN PARALLEL.
NEVER stop at first result - be exhaustive.`,
  },
  {
    name: 'analyze',
    description: 'Deep analysis mode',
    template: `[analyze-mode]
ANALYSIS MODE. Gather context before diving deep.
Consult oracle for strategic guidance if needed.`,
  },
  {
    name: 'search',
    description: 'Exhaustive search mode',
    template: `[search-mode]
MAXIMIZE SEARCH EFFORT. Launch multiple background agents IN PARALLEL.
NEVER stop at first result - be exhaustive.`,
  },
  {
    name: 'plan',
    description: 'Planning mode with structured approach',
    template: `[plan-mode]
PLANNING MODE. Create detailed implementation plan before action.
Use todowrite to track all tasks.`,
  },
  {
    name: 'ralph-loop',
    description: 'Self-referential development loop',
    template: `[ralph-loop]
You are starting a Ralph Loop - a self-referential development loop.
Continue until task is complete or max iterations reached.`,
  },
];

export const slashcommandSchema = z.object({
  command: z.string().describe('The slash command to execute'),
});

export function createSlashcommandTool(options: {
  commands?: SlashCommand[];
  skills?: Skill[];
}) {
  const allCommands = [
    ...BUILTIN_COMMANDS,
    ...(options.commands || []),
  ];
  
  // Add skill-based commands
  if (options.skills) {
    for (const skill of options.skills) {
      allCommands.push({
        name: skill.name,
        description: `Load ${skill.name} skill`,
        template: skill.content,
      });
    }
  }
  
  return {
    name: 'slashcommand',
    description: `Load a skill to get detailed instructions for a specific task.

Skills provide specialized knowledge and step-by-step guidance.
Use this when a task matches an available skill's description.

<available_skills>
${allCommands.map(c => `- /${c.name}: ${c.description}`).join('\n')}
</available_skills>`,
    parameters: slashcommandSchema,
    execute: async (params: z.infer<typeof slashcommandSchema>) => {
      const commandName = params.command.replace(/^\//, '').split(' ')[0];
      const command = allCommands.find(c => c.name === commandName);
      
      if (!command) {
        return `Unknown command: /${commandName}

Available commands:
${allCommands.map(c => `/${c.name} - ${c.description}`).join('\n')}`;
      }
      
      return command.template;
    },
  };
}
```

### 4. Auto Slash Command Hook

```typescript
// src/core/hooks/auto-slash-command/index.ts
export function createAutoSlashCommandHook(options: { skills: Skill[] }) {
  return {
    'chat.message': async (
      input: ChatMessageInput,
      output: ChatMessageOutput
    ) => {
      const text = output.parts
        ?.filter(p => p.type === 'text')
        .map(p => p.text)
        .join(' ') || '';
      
      // Detect skill keywords and auto-inject
      for (const skill of options.skills) {
        const keywords = skill.tags || [];
        const nameKeyword = skill.name.replace(/-/g, ' ');
        
        if (text.toLowerCase().includes(nameKeyword) ||
            keywords.some(k => text.toLowerCase().includes(k))) {
          // Inject skill loading suggestion
          output.parts?.push({
            type: 'text',
            text: `\n\n[SKILL SUGGESTION: Consider using /${skill.name} for this task]`,
          });
          break;
        }
      }
    },
  };
}
```

### 5. MCP Skill Integration

```typescript
// src/features/skill-mcp-manager/index.ts
export class SkillMcpManager {
  private activeServers: Map<string, McpServer> = new Map();
  private sessionServers: Map<string, Set<string>> = new Map();
  
  async loadSkillMcp(skill: Skill, sessionId: string): Promise<void> {
    if (!skill.mcpConfig) return;
    
    for (const [name, config] of Object.entries(skill.mcpConfig)) {
      const serverKey = `${skill.name}:${name}`;
      
      if (this.activeServers.has(serverKey)) {
        // Server already running, just track session
        this.trackSession(serverKey, sessionId);
        continue;
      }
      
      const server = await this.startServer(name, config);
      this.activeServers.set(serverKey, server);
      this.trackSession(serverKey, sessionId);
    }
  }
  
  async disconnectSession(sessionId: string): Promise<void> {
    for (const [serverKey, sessions] of this.sessionServers) {
      sessions.delete(sessionId);
      
      if (sessions.size === 0) {
        // No more sessions using this server
        const server = this.activeServers.get(serverKey);
        if (server) {
          await server.stop();
          this.activeServers.delete(serverKey);
        }
        this.sessionServers.delete(serverKey);
      }
    }
  }
  
  private async startServer(name: string, config: unknown): Promise<McpServer> {
    // Start MCP server based on config
    const server = new McpServer(name, config);
    await server.start();
    return server;
  }
  
  private trackSession(serverKey: string, sessionId: string): void {
    let sessions = this.sessionServers.get(serverKey);
    if (!sessions) {
      sessions = new Set();
      this.sessionServers.set(serverKey, sessions);
    }
    sessions.add(sessionId);
  }
}
```

### 6. Skill MCP Tool

```typescript
// src/core/tools/skill-mcp/index.ts
import { z } from 'zod';

export const skillMcpSchema = z.object({
  mcp_name: z.string().describe('MCP server name'),
  tool_name: z.string().optional().describe('Tool to invoke'),
  resource_name: z.string().optional().describe('Resource to access'),
  prompt_name: z.string().optional().describe('Prompt to use'),
  arguments: z.string().optional().describe('JSON arguments'),
  grep: z.string().optional().describe('Filter output'),
});

export function createSkillMcpTool(options: {
  manager: SkillMcpManager;
  getLoadedSkills: () => Skill[];
  getSessionID: () => string;
}) {
  return {
    name: 'skill_mcp',
    description: `Invoke MCP server operations from skill-embedded MCPs.
Requires mcp_name plus exactly one of: tool_name, resource_name, or prompt_name.`,
    parameters: skillMcpSchema,
    execute: async (params: z.infer<typeof skillMcpSchema>) => {
      const server = options.manager.getServer(params.mcp_name);
      
      if (!server) {
        return `MCP server not found: ${params.mcp_name}`;
      }
      
      let result: string;
      
      if (params.tool_name) {
        const args = params.arguments ? JSON.parse(params.arguments) : {};
        result = await server.invokeTool(params.tool_name, args);
      } else if (params.resource_name) {
        result = await server.getResource(params.resource_name);
      } else if (params.prompt_name) {
        const args = params.arguments ? JSON.parse(params.arguments) : {};
        result = await server.usePrompt(params.prompt_name, args);
      } else {
        return 'Must specify one of: tool_name, resource_name, or prompt_name';
      }
      
      if (params.grep) {
        const lines = result.split('\n');
        const pattern = new RegExp(params.grep, 'i');
        result = lines.filter(l => pattern.test(l)).join('\n');
      }
      
      return result;
    },
  };
}
```

## File Structure

```
src/features/skill-loader/
├── index.ts                    # Main SkillLoader class
├── index.test.ts
├── frontmatter.ts              # Frontmatter parser
├── frontmatter.test.ts
└── types.ts

src/features/skill-mcp-manager/
├── index.ts                    # SkillMcpManager
├── index.test.ts
├── manager.ts
├── env-cleaner.ts
└── types.ts

src/core/tools/skill/
├── index.ts                    # skill tool
├── index.test.ts
├── loader.ts
├── constants.ts
└── types.ts

src/core/tools/slashcommand/
├── index.ts                    # slashcommand tool
├── index.test.ts
├── builtin.ts                  # Built-in commands
├── registry.ts
└── types.ts

src/core/tools/skill-mcp/
├── index.ts                    # skill_mcp tool
└── index.test.ts

src/core/hooks/auto-slash-command/
├── index.ts
└── index.test.ts
```

## Implementation Checklist

### Phase 1: Skill Loader (Day 1-2)
- [ ] Implement frontmatter parser
- [ ] Implement directory scanning
- [ ] Implement skill loading
- [ ] Add search functionality
- [ ] Write tests

### Phase 2: Skill Tools (Day 3-4)
- [ ] Implement skill tool
- [ ] Implement slashcommand tool
- [ ] Add builtin commands
- [ ] Write tests

### Phase 3: MCP Integration (Day 5-6)
- [ ] Implement SkillMcpManager
- [ ] Implement skill_mcp tool
- [ ] Add session tracking
- [ ] Write tests

### Phase 4: Auto-detection (Day 7)
- [ ] Implement auto-slash-command hook
- [ ] Add keyword detection
- [ ] Integration testing

## Success Criteria

| Metric | Target |
|--------|--------|
| Skills Loaded | 30+ from skills-template |
| Load Time | < 100ms |
| MCP Integration | 100% compatibility |
| Test Coverage | 80%+ |

## Dependencies

```json
{
  "dependencies": {
    "gray-matter": "^4.0.3",
    "@modelcontextprotocol/sdk": "^1.25.1"
  }
}
```

---

**Last Updated**: 2026-01-13
**Status**: 📋 Planning Complete
