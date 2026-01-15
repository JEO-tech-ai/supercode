# Phase 3.1: Skill MCP Tool

> Priority: P2 (Medium)
> Effort: 3-4 days
> Dependencies: Skill file format, MCP infrastructure

## Overview

The Skill MCP tool loads and executes skills from the `.agent-skills/` directory. Skills are structured workflows that provide specialized knowledge and step-by-step guidance for specific tasks.

## Current State in SuperCode

### Existing Files
```
~/.agent-skills/               # Installed via setup
  ├── skills.json             # Skill registry
  └── [category]/[skill].md   # Individual skills
```

### What Exists
- Agent skills installed in home directory (38 skills)
- Skills.json registry

### What's Missing
- Skill loading tool
- Skill invocation mechanism
- Token-optimized rendering
- MCP integration

## Implementation Plan

### File Structure
```
src/core/tools/skill-mcp/
├── index.ts          # Tool exports
├── loader.ts         # Skill file parsing
├── renderer.ts       # Token-optimized rendering
└── types.ts          # Type definitions
```

### 1. Types (`types.ts`)

```typescript
export interface Skill {
  name: string;
  category: string;
  description: string;
  triggers: string[];
  filePath: string;
  content?: string;
}

export interface SkillRegistry {
  version: string;
  skills: Skill[];
}

export interface SkillMCPConfig {
  skillsDir: string;
  maxContentLength: number;
  renderMode: 'full' | 'compact' | 'toon';
}

export const DEFAULT_CONFIG: SkillMCPConfig = {
  skillsDir: '~/.agent-skills',
  maxContentLength: 50000,
  renderMode: 'compact',
};
```

### 2. Loader (`loader.ts`)

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Skill, SkillRegistry, SkillMCPConfig } from './types';
import { Log } from '../../../shared/logger';

export function resolveSkillsDir(dir: string): string {
  if (dir.startsWith('~')) {
    return path.join(os.homedir(), dir.slice(1));
  }
  return dir;
}

export function loadSkillRegistry(config: SkillMCPConfig): SkillRegistry | null {
  const dir = resolveSkillsDir(config.skillsDir);
  const registryPath = path.join(dir, 'skills.json');

  try {
    if (!fs.existsSync(registryPath)) {
      Log.warn('[skill-mcp] skills.json not found');
      return null;
    }

    const content = fs.readFileSync(registryPath, 'utf-8');
    return JSON.parse(content) as SkillRegistry;
  } catch (error) {
    Log.error('[skill-mcp] Failed to load registry:', error);
    return null;
  }
}

export function loadSkillContent(skill: Skill, config: SkillMCPConfig): string | null {
  const dir = resolveSkillsDir(config.skillsDir);
  const fullPath = path.join(dir, skill.filePath);

  try {
    if (!fs.existsSync(fullPath)) {
      Log.warn(`[skill-mcp] Skill file not found: ${fullPath}`);
      return null;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');
    
    // Truncate if too long
    if (content.length > config.maxContentLength) {
      content = content.slice(0, config.maxContentLength) + '\n\n[... truncated ...]';
    }

    return content;
  } catch (error) {
    Log.error(`[skill-mcp] Failed to load skill: ${skill.name}`, error);
    return null;
  }
}

export function findSkill(name: string, registry: SkillRegistry): Skill | null {
  // Exact match
  let skill = registry.skills.find(s => 
    s.name.toLowerCase() === name.toLowerCase()
  );
  
  if (skill) return skill;

  // Partial match
  skill = registry.skills.find(s => 
    s.name.toLowerCase().includes(name.toLowerCase()) ||
    name.toLowerCase().includes(s.name.toLowerCase())
  );

  return skill ?? null;
}

export function searchSkills(query: string, registry: SkillRegistry): Skill[] {
  const lower = query.toLowerCase();
  
  return registry.skills.filter(s =>
    s.name.toLowerCase().includes(lower) ||
    s.description.toLowerCase().includes(lower) ||
    s.category.toLowerCase().includes(lower) ||
    s.triggers.some(t => t.toLowerCase().includes(lower))
  );
}

export function listSkillsByCategory(registry: SkillRegistry): Record<string, Skill[]> {
  const byCategory: Record<string, Skill[]> = {};

  for (const skill of registry.skills) {
    if (!byCategory[skill.category]) {
      byCategory[skill.category] = [];
    }
    byCategory[skill.category].push(skill);
  }

  return byCategory;
}
```

### 3. Renderer (`renderer.ts`)

```typescript
import type { Skill, SkillRegistry, SkillMCPConfig } from './types';

export function renderSkillList(
  registry: SkillRegistry,
  mode: SkillMCPConfig['renderMode']
): string {
  const byCategory = groupByCategory(registry.skills);
  const lines: string[] = ['# Available Skills\n'];

  for (const [category, skills] of Object.entries(byCategory)) {
    lines.push(`## ${category}\n`);
    
    for (const skill of skills) {
      if (mode === 'toon') {
        lines.push(`- ${skill.name}`);
      } else if (mode === 'compact') {
        lines.push(`- **${skill.name}**: ${skill.description}`);
      } else {
        lines.push(`### ${skill.name}`);
        lines.push(skill.description);
        lines.push(`Triggers: ${skill.triggers.join(', ')}`);
        lines.push('');
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function renderSkillContent(
  skill: Skill,
  content: string,
  mode: SkillMCPConfig['renderMode']
): string {
  if (mode === 'toon') {
    // Ultra-compact: just key sections
    return extractKeySections(content);
  }
  
  if (mode === 'compact') {
    // Remove examples, keep structure
    return removeVerboseSections(content);
  }

  // Full mode
  return `# Skill: ${skill.name}\n\n${content}`;
}

function groupByCategory(skills: Skill[]): Record<string, Skill[]> {
  const result: Record<string, Skill[]> = {};
  
  for (const skill of skills) {
    if (!result[skill.category]) {
      result[skill.category] = [];
    }
    result[skill.category].push(skill);
  }
  
  return result;
}

function extractKeySections(content: string): string {
  // Extract only headers and first line of each section
  const lines = content.split('\n');
  const result: string[] = [];
  let inSection = false;

  for (const line of lines) {
    if (line.startsWith('#')) {
      result.push(line);
      inSection = true;
    } else if (inSection && line.trim()) {
      result.push(line);
      inSection = false;
    }
  }

  return result.join('\n');
}

function removeVerboseSections(content: string): string {
  // Remove code blocks, examples, verbose explanations
  let result = content;
  
  // Remove large code blocks
  result = result.replace(/```[\s\S]*?```/g, '[code example removed]');
  
  // Remove example sections
  result = result.replace(/## Example[\s\S]*?(?=##|$)/gi, '');
  
  return result;
}
```

### 4. Main Tool (`index.ts`)

```typescript
import type { ToolDefinition, ToolContext, ToolResult } from '../../types';
import type { SkillMCPConfig } from './types';
import { DEFAULT_CONFIG } from './types';
import { 
  loadSkillRegistry, 
  loadSkillContent, 
  findSkill, 
  searchSkills 
} from './loader';
import { renderSkillList, renderSkillContent } from './renderer';
import { Log } from '../../../shared/logger';

export interface SkillToolOptions {
  config?: Partial<SkillMCPConfig>;
}

export function createSkillMCPTool(options: SkillToolOptions = {}): ToolDefinition {
  const config: SkillMCPConfig = {
    ...DEFAULT_CONFIG,
    ...options.config,
  };

  return {
    name: 'skill',
    description: `Load a skill to get detailed instructions for a specific task.

Skills provide specialized knowledge and step-by-step guidance.
Use this when a task matches an available skill's description.`,
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the skill to load',
        },
        action: {
          type: 'string',
          enum: ['load', 'list', 'search'],
          description: 'Action to perform (default: load)',
          default: 'load',
        },
        query: {
          type: 'string',
          description: 'Search query (for search action)',
        },
        mode: {
          type: 'string',
          enum: ['full', 'compact', 'toon'],
          description: 'Render mode (default: compact)',
          default: 'compact',
        },
      },
      required: ['name'],
    },

    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const action = (args.action as string) ?? 'load';
      const mode = (args.mode as SkillMCPConfig['renderMode']) ?? config.renderMode;

      const registry = loadSkillRegistry(config);
      if (!registry) {
        return {
          success: false,
          error: 'Skill registry not found. Run skill setup first.',
        };
      }

      // List action
      if (action === 'list') {
        const list = renderSkillList(registry, mode);
        return {
          success: true,
          data: list,
        };
      }

      // Search action
      if (action === 'search') {
        const query = args.query as string ?? args.name as string;
        const results = searchSkills(query, registry);
        
        if (results.length === 0) {
          return {
            success: true,
            data: `No skills found matching "${query}"`,
          };
        }

        const formatted = results.map(s => 
          `- **${s.name}** (${s.category}): ${s.description}`
        ).join('\n');

        return {
          success: true,
          data: `Found ${results.length} skill(s):\n\n${formatted}`,
        };
      }

      // Load action (default)
      const name = args.name as string;
      const skill = findSkill(name, registry);
      
      if (!skill) {
        // Suggest similar skills
        const similar = searchSkills(name, registry).slice(0, 3);
        const suggestions = similar.length > 0
          ? `\n\nDid you mean: ${similar.map(s => s.name).join(', ')}?`
          : '';

        return {
          success: false,
          error: `Skill "${name}" not found.${suggestions}`,
        };
      }

      const content = loadSkillContent(skill, config);
      if (!content) {
        return {
          success: false,
          error: `Failed to load skill content for "${name}"`,
        };
      }

      const rendered = renderSkillContent(skill, content, mode);
      
      Log.info(`[skill-mcp] Loaded skill: ${skill.name}`, { mode });

      return {
        success: true,
        data: rendered,
      };
    },
  };
}

export * from './types';
export const skillMCPTool = createSkillMCPTool();
```

## Usage Examples

```typescript
// Load a specific skill
await skillTool.execute({ name: 'api-design' }, context);

// List all skills
await skillTool.execute({ name: '', action: 'list' }, context);

// Search skills
await skillTool.execute({ action: 'search', query: 'database' }, context);

// Compact mode for token savings
await skillTool.execute({ name: 'testing', mode: 'toon' }, context);
```

## Testing

```typescript
describe('SkillMCPTool', () => {
  it('should load skill by name');
  it('should list all skills');
  it('should search skills');
  it('should suggest similar skills on not found');
  it('should respect render mode');
  it('should truncate long content');
});
```

## Success Criteria

- [ ] Loads skills from ~/.agent-skills/
- [ ] Parses skills.json registry
- [ ] Loads individual skill content
- [ ] Supports list/search/load actions
- [ ] Token-optimized rendering modes
- [ ] Error handling with suggestions
