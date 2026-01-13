# Config System Improvement Plan

> **목표**: JSONC 지원, multi-path 설정, 세분화된 권한 시스템 구현

## Overview

설정 시스템을 oh-my-opencode 수준으로 개선하여 팀 협업과 프로젝트별 커스터마이징을 지원합니다.

## Current State Analysis

### supercode (현재)
```typescript
// src/config/loader.ts
// JSON only, single path, basic validation
const configPaths = [
  '~/.config/supercoin/config.json',
  '.supercoin/config.json',
];
```

### oh-my-opencode (목표)
```typescript
// JSONC + multi-path + fine-grained permissions
const configPaths = [
  '~/.config/opencode/config.jsonc',
  '~/.claude/settings.json',
  './.opencode/config.jsonc',
  './.claude/settings.json',
];
```

## Implementation Plan

### 1. JSONC Parser Integration

```typescript
// src/config/jsonc-parser.ts
import { parse as parseJsonc, ParseError, printParseErrorCode } from 'jsonc-parser';

export interface JsoncParseResult<T> {
  data: T | null;
  errors: ParseError[];
  warnings: string[];
}

export function parseJsoncFile<T>(content: string, filePath: string): JsoncParseResult<T> {
  const errors: ParseError[] = [];
  
  const data = parseJsonc(content, errors, {
    allowTrailingComma: true,
    allowEmptyContent: true,
  }) as T;
  
  const warnings = errors
    .filter(e => !isCriticalError(e))
    .map(e => formatError(e, filePath));
  
  const criticalErrors = errors.filter(isCriticalError);
  
  if (criticalErrors.length > 0) {
    return {
      data: null,
      errors: criticalErrors,
      warnings,
    };
  }
  
  return { data, errors: [], warnings };
}

function isCriticalError(error: ParseError): boolean {
  // Trailing commas and comments are OK
  return ![
    'InvalidCommentToken',
    'TrailingComma',
  ].includes(printParseErrorCode(error.error));
}

function formatError(error: ParseError, filePath: string): string {
  return `${filePath}:${error.offset}: ${printParseErrorCode(error.error)}`;
}
```

### 2. Multi-Path Configuration Loader

```typescript
// src/config/loader.ts
import { parseJsoncFile } from './jsonc-parser';
import { SuperCodeConfigSchema } from './schema';
import { existsSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { homedir } from 'os';

export interface ConfigSource {
  path: string;
  priority: number;
  type: 'user' | 'global' | 'project' | 'claude';
}

const CONFIG_SOURCES: ConfigSource[] = [
  // Global (lowest priority)
  { path: '~/.config/supercode/config.jsonc', priority: 1, type: 'global' },
  { path: '~/.config/supercode/config.json', priority: 1, type: 'global' },
  
  // User Claude settings
  { path: '~/.claude/settings.json', priority: 2, type: 'claude' },
  
  // Project (highest priority)
  { path: '.supercode/config.jsonc', priority: 3, type: 'project' },
  { path: '.supercode/config.json', priority: 3, type: 'project' },
  { path: '.claude/settings.json', priority: 3, type: 'claude' },
];

export interface LoadedConfig {
  config: SuperCodeConfig;
  sources: string[];
  warnings: string[];
  errors: ConfigError[];
}

export async function loadConfig(projectDir?: string): Promise<LoadedConfig> {
  const baseDir = projectDir || process.cwd();
  const loadedSources: string[] = [];
  const warnings: string[] = [];
  const errors: ConfigError[] = [];
  
  let mergedConfig: Partial<SuperCodeConfig> = {};
  
  // Sort by priority (lowest first for proper merging)
  const sortedSources = [...CONFIG_SOURCES].sort((a, b) => a.priority - b.priority);
  
  for (const source of sortedSources) {
    const resolvedPath = resolvePath(source.path, baseDir);
    
    if (!existsSync(resolvedPath)) continue;
    
    try {
      const content = readFileSync(resolvedPath, 'utf-8');
      const isJsonc = resolvedPath.endsWith('.jsonc');
      
      const result = isJsonc 
        ? parseJsoncFile(content, resolvedPath)
        : { data: JSON.parse(content), errors: [], warnings: [] };
      
      if (result.errors.length > 0) {
        errors.push({
          path: resolvedPath,
          message: result.errors.map(e => e.message || String(e)).join(', '),
        });
        continue;
      }
      
      warnings.push(...result.warnings);
      
      // Transform Claude settings to SuperCode format
      const config = source.type === 'claude'
        ? transformClaudeSettings(result.data)
        : result.data;
      
      // Deep merge (later sources override earlier)
      mergedConfig = deepMerge(mergedConfig, config);
      loadedSources.push(resolvedPath);
      
    } catch (err) {
      errors.push({
        path: resolvedPath,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
  
  // Validate with Zod
  const validationResult = SuperCodeConfigSchema.safeParse(mergedConfig);
  
  if (!validationResult.success) {
    errors.push({
      path: 'validation',
      message: validationResult.error.message,
    });
    // Use defaults for invalid config
    mergedConfig = getDefaultConfig();
  }
  
  return {
    config: validationResult.success ? validationResult.data : getDefaultConfig(),
    sources: loadedSources,
    warnings,
    errors,
  };
}

function resolvePath(path: string, baseDir: string): string {
  if (path.startsWith('~')) {
    return resolve(homedir(), path.slice(2));
  }
  if (path.startsWith('.')) {
    return resolve(baseDir, path);
  }
  return path;
}

function transformClaudeSettings(settings: any): Partial<SuperCodeConfig> {
  // Map Claude settings to SuperCode format
  return {
    claude_code: {
      hooks: settings.hooks !== false,
      skills: settings.skills !== false,
    },
    permissions: transformClaudePermissions(settings.permissions),
    disabled_hooks: settings.disabledHooks,
  };
}
```

### 3. Permission System

```typescript
// src/config/permissions.ts
import { z } from 'zod';

export const PermissionLevel = z.enum(['ask', 'allow', 'deny']);
export type PermissionLevel = z.infer<typeof PermissionLevel>;

export const ToolPermissionSchema = z.object({
  default: PermissionLevel.default('ask'),
  tools: z.record(z.string(), PermissionLevel).optional(),
  patterns: z.array(z.object({
    pattern: z.string(),
    permission: PermissionLevel,
  })).optional(),
});

export const AgentPermissionSchema = z.object({
  default: PermissionLevel.default('allow'),
  agents: z.record(z.string(), z.object({
    tools: ToolPermissionSchema.optional(),
    enabled: z.boolean().optional(),
  })).optional(),
});

export const PermissionConfigSchema = z.object({
  tools: ToolPermissionSchema.optional(),
  agents: AgentPermissionSchema.optional(),
  dangerous_commands: z.object({
    default: PermissionLevel.default('ask'),
    patterns: z.array(z.string()).optional(),
  }).optional(),
});

export type PermissionConfig = z.infer<typeof PermissionConfigSchema>;

export class PermissionChecker {
  constructor(private config: PermissionConfig) {}
  
  async checkToolPermission(
    toolName: string,
    agentName?: string,
    args?: Record<string, unknown>
  ): Promise<PermissionResult> {
    // Check agent-specific permissions first
    if (agentName && this.config.agents?.agents?.[agentName]) {
      const agentConfig = this.config.agents.agents[agentName];
      
      if (agentConfig.enabled === false) {
        return { allowed: false, reason: `Agent ${agentName} is disabled` };
      }
      
      if (agentConfig.tools) {
        const result = this.checkToolConfig(toolName, agentConfig.tools, args);
        if (result.decision !== 'default') {
          return result;
        }
      }
    }
    
    // Check global tool permissions
    if (this.config.tools) {
      const result = this.checkToolConfig(toolName, this.config.tools, args);
      if (result.decision !== 'default') {
        return result;
      }
    }
    
    // Check dangerous command patterns for bash
    if (toolName === 'bash' && args?.command) {
      const cmd = String(args.command);
      if (this.isDangerousCommand(cmd)) {
        const level = this.config.dangerous_commands?.default || 'ask';
        return {
          allowed: level === 'allow',
          needsConfirmation: level === 'ask',
          reason: `Potentially dangerous command: ${cmd.slice(0, 50)}`,
        };
      }
    }
    
    // Default: allow
    return { allowed: true };
  }
  
  private checkToolConfig(
    toolName: string,
    config: z.infer<typeof ToolPermissionSchema>,
    args?: Record<string, unknown>
  ): PermissionResult & { decision: 'explicit' | 'pattern' | 'default' } {
    // Check explicit tool permission
    if (config.tools?.[toolName]) {
      const level = config.tools[toolName];
      return {
        allowed: level === 'allow',
        needsConfirmation: level === 'ask',
        reason: `Tool ${toolName} is ${level}`,
        decision: 'explicit',
      };
    }
    
    // Check patterns
    if (config.patterns) {
      for (const { pattern, permission } of config.patterns) {
        if (this.matchesPattern(toolName, args, pattern)) {
          return {
            allowed: permission === 'allow',
            needsConfirmation: permission === 'ask',
            reason: `Matched pattern: ${pattern}`,
            decision: 'pattern',
          };
        }
      }
    }
    
    // Default
    const level = config.default;
    return {
      allowed: level === 'allow',
      needsConfirmation: level === 'ask',
      reason: 'Default permission',
      decision: 'default',
    };
  }
  
  private isDangerousCommand(command: string): boolean {
    const patterns = this.config.dangerous_commands?.patterns || [
      'rm -rf',
      'rm -r /',
      'chmod 777',
      'git push --force',
      'DROP TABLE',
      'DELETE FROM',
      '> /dev/',
      'mkfs',
      ':(){:|:&};:',  // Fork bomb
    ];
    
    return patterns.some(p => command.includes(p));
  }
  
  private matchesPattern(
    toolName: string,
    args: Record<string, unknown> | undefined,
    pattern: string
  ): boolean {
    // Simple pattern matching
    // Format: "tool:arg=value" or "tool:*" or just "tool"
    const [toolPattern, argPattern] = pattern.split(':');
    
    if (!minimatch(toolName, toolPattern)) {
      return false;
    }
    
    if (argPattern && args) {
      const [argName, argValue] = argPattern.split('=');
      if (argValue) {
        return String(args[argName]) === argValue;
      }
      return argName in args;
    }
    
    return true;
  }
}

export interface PermissionResult {
  allowed: boolean;
  needsConfirmation?: boolean;
  reason?: string;
}
```

### 4. Enhanced Config Schema

```typescript
// src/config/schema.ts
import { z } from 'zod';
import { PermissionConfigSchema } from './permissions';

export const HookConfigSchema = z.object({
  enabled: z.boolean().default(true),
  options: z.record(z.unknown()).optional(),
});

export const AgentOverrideSchema = z.object({
  model: z.string().optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
  systemPrompt: z.string().optional(),
});

export const SuperCodeConfigSchema = z.object({
  // Provider settings
  provider: z.string().default('anthropic'),
  model: z.string().default('claude-sonnet-4-20250514'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().default(8192),
  baseURL: z.string().optional(),
  
  // Hook configuration
  disabled_hooks: z.array(z.string()).optional(),
  hooks: z.record(z.string(), HookConfigSchema).optional(),
  
  // Agent configuration
  agents: z.record(z.string(), AgentOverrideSchema).optional(),
  sisyphus_agent: z.object({
    disabled: z.boolean().optional(),
    model: z.string().optional(),
  }).optional(),
  
  // Permission system
  permissions: PermissionConfigSchema.optional(),
  
  // Claude Code compatibility
  claude_code: z.object({
    hooks: z.boolean().default(true),
    skills: z.boolean().default(true),
    mcp: z.boolean().default(true),
  }).optional(),
  
  // Feature flags
  experimental: z.object({
    dcp_for_compaction: z.boolean().optional(),
    parallel_tools: z.boolean().optional(),
  }).optional(),
  
  // Comment checker
  comment_checker: z.object({
    enabled: z.boolean().default(true),
    languages: z.array(z.string()).optional(),
    severity: z.enum(['error', 'warning', 'info']).default('warning'),
  }).optional(),
  
  // Ralph Loop
  ralph_loop: z.object({
    max_iterations: z.number().default(100),
    completion_promise: z.string().default('DONE'),
  }).optional(),
  
  // Notification
  notification: z.object({
    enabled: z.boolean().default(true),
    force_enable: z.boolean().default(false),
    sound: z.boolean().default(true),
  }).optional(),
  
  // Auto-update
  auto_update: z.boolean().default(true),
  
  // Google Auth (for Antigravity)
  google_auth: z.boolean().default(true),
  
  // Skills
  disabled_skills: z.array(z.string()).optional(),
  skills: z.array(z.object({
    name: z.string(),
    path: z.string().optional(),
    mcpConfig: z.record(z.unknown()).optional(),
  })).optional(),
});

export type SuperCodeConfig = z.infer<typeof SuperCodeConfigSchema>;

export function getDefaultConfig(): SuperCodeConfig {
  return SuperCodeConfigSchema.parse({});
}
```

### 5. Config CLI Commands

```typescript
// src/cli/commands/config.ts
import { Command } from 'commander';
import { loadConfig } from '../../config/loader';

export function createConfigCommand(globalConfig: any): Command {
  const cmd = new Command('config')
    .description('View and manage configuration');
  
  cmd
    .command('show')
    .description('Show current configuration')
    .option('--sources', 'Show config sources')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const { config, sources, warnings, errors } = await loadConfig();
      
      if (options.sources) {
        console.log('Configuration sources:');
        sources.forEach(s => console.log(`  ✓ ${s}`));
        if (warnings.length > 0) {
          console.log('\nWarnings:');
          warnings.forEach(w => console.log(`  ⚠ ${w}`));
        }
        if (errors.length > 0) {
          console.log('\nErrors:');
          errors.forEach(e => console.log(`  ✗ ${e.path}: ${e.message}`));
        }
        return;
      }
      
      if (options.json) {
        console.log(JSON.stringify(config, null, 2));
      } else {
        printConfig(config);
      }
    });
  
  cmd
    .command('validate')
    .description('Validate configuration files')
    .action(async () => {
      const { errors, warnings, sources } = await loadConfig();
      
      if (errors.length === 0 && warnings.length === 0) {
        console.log('✓ All configuration files are valid');
        console.log(`  Loaded from: ${sources.join(', ')}`);
        return;
      }
      
      if (warnings.length > 0) {
        console.log('Warnings:');
        warnings.forEach(w => console.log(`  ⚠ ${w}`));
      }
      
      if (errors.length > 0) {
        console.log('Errors:');
        errors.forEach(e => console.log(`  ✗ ${e.path}: ${e.message}`));
        process.exit(1);
      }
    });
  
  cmd
    .command('init')
    .description('Initialize configuration file')
    .option('--global', 'Create global config')
    .option('--jsonc', 'Use JSONC format (with comments)')
    .action(async (options) => {
      const template = generateConfigTemplate(options.jsonc);
      const path = options.global 
        ? '~/.config/supercode/config' + (options.jsonc ? '.jsonc' : '.json')
        : '.supercode/config' + (options.jsonc ? '.jsonc' : '.json');
      
      // Write template
      console.log(`Created: ${path}`);
    });
  
  return cmd;
}
```

## Example Configuration

```jsonc
// .supercode/config.jsonc
{
  // Provider settings
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  
  // Permission system
  "permissions": {
    "tools": {
      "default": "allow",
      "tools": {
        "bash": "ask",      // Always ask for bash
        "write": "allow",   // Allow file writes
        "edit": "allow"     // Allow edits
      },
      "patterns": [
        { "pattern": "bash:command=rm*", "permission": "ask" },
        { "pattern": "bash:command=git push*", "permission": "ask" }
      ]
    },
    "agents": {
      "default": "allow",
      "agents": {
        "oracle": { "enabled": true },
        "frontend-ui-ux-engineer": { 
          "enabled": true,
          "tools": { "default": "allow" }
        }
      }
    },
    "dangerous_commands": {
      "default": "deny",
      "patterns": [
        "rm -rf /",
        "git push --force main"
      ]
    }
  },
  
  // Hooks
  "disabled_hooks": [],
  "hooks": {
    "comment-checker": {
      "enabled": true,
      "options": { "severity": "warning" }
    }
  },
  
  // Claude Code compatibility
  "claude_code": {
    "hooks": true,
    "skills": true,
    "mcp": true
  }
}
```

## File Structure

```
src/config/
├── index.ts              # Main exports
├── loader.ts             # Multi-path config loader
├── loader.test.ts
├── jsonc-parser.ts       # JSONC parsing utilities
├── jsonc-parser.test.ts
├── schema.ts             # Zod schemas
├── schema.test.ts
├── permissions.ts        # Permission system
├── permissions.test.ts
├── transformer.ts        # Claude settings transformer
└── defaults.ts           # Default configuration
```

## Implementation Checklist

### Phase 1: JSONC Support (Day 1)
- [ ] Add jsonc-parser dependency
- [ ] Implement parseJsoncFile
- [ ] Add error formatting with line numbers
- [ ] Write tests

### Phase 2: Multi-Path Loading (Day 2)
- [ ] Implement path resolution
- [ ] Add Claude settings transformer
- [ ] Implement deep merge
- [ ] Add source tracking
- [ ] Write tests

### Phase 3: Permission System (Day 3-4)
- [ ] Implement PermissionChecker class
- [ ] Add pattern matching
- [ ] Add dangerous command detection
- [ ] Integrate with tool execution
- [ ] Write tests

### Phase 4: CLI Commands (Day 5)
- [ ] Implement config show
- [ ] Implement config validate
- [ ] Implement config init
- [ ] Add documentation

## Dependencies

```json
{
  "dependencies": {
    "jsonc-parser": "^3.3.1",
    "picomatch": "^4.0.2"
  }
}
```

## Success Criteria

| Metric | Target |
|--------|--------|
| JSONC Parsing | 100% compatibility |
| Config Merging | Correct priority order |
| Permission Checks | < 1ms per check |
| Test Coverage | 80%+ |

---

**Last Updated**: 2026-01-13
**Status**: 📋 Planning Complete
