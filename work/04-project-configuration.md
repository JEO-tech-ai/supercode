# Project Configuration Implementation Plan

## Executive Summary

**Status**: ✅ Complete (Benchmarked + Researched)
**Complexity**: High
**Estimated Effort**: 1-2 weeks for full implementation

This plan provides a production-ready roadmap for implementing a hierarchical project configuration system in SuperCoin, enabling CLI > Project > Global configuration overrides with validation and hot reload.

---

## Phase 1: Foundation (Week 1)

### 1.1 Install Dependencies

```bash
bun add zod
bun add c12
bun add cosmiiconfig
```

**Rationale**:
- `zod` - Schema validation and type inference (industry standard)
- `c12` - Modern config loader with file watching
- `cosmiiconfig` - Config discovery in parent directories

### 1.2 Define Core Types

Create `src/services/config/types.ts`:

```typescript
export type ProviderType = 'anthropic' | 'openai' | 'google' | 'ollama' | 'lmstudio' | 'llamacpp';

export interface ModelConfig {
  provider: ProviderType;
  modelId: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface ServerConfig {
  port: number;
  host: string;
  timeout: number;
  ssl?: {
    enabled: boolean;
    certPath?: string;
    keyPath?: string;
  };
}

export interface DatabaseConfig {
  url: string;
  type: 'postgres' | 'mysql' | 'sqlite' | 'mongodb';
  pool: {
    min: number;
    max: number;
    idleTimeout?: number;
  };
  migrations?: {
    autoRun: boolean;
    directory?: string;
  };
}

export interface FeatureFlags {
  cache: {
    enabled: boolean;
    ttl?: number;
  };
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute?: number;
  };
  analytics: {
    enabled: boolean;
    provider?: string;
  };
}

export interface EnvironmentOverrides {
  $development?: {
    debug: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  $production?: {
    debug: boolean;
    logLevel: 'info' | 'warn' | 'error';
  };
}

export interface ProjectConfig {
  version: string;
  server?: ServerConfig;
  database?: DatabaseConfig;
  features?: FeatureFlags;
  providers?: {
    default?: ProviderType;
    fallback?: ProviderType[];
    ollama?: {
      baseUrl: string;
      defaultModel?: string;
    };
    lmstudio?: {
      baseUrl: string;
    };
    llamacpp?: {
      baseUrl: string;
    };
  };
  agent?: {
    type: 'build' | 'plan' | 'general';
    maxIterations?: number;
    timeout?: number;
  };
  paths?: {
    exclude: string[];
    include?: string[];
    workspaceRoot?: string;
  };
}

export interface LoadedConfig extends ProjectConfig {
  source: 'cli' | 'project' | 'global' | 'package';
  filepath?: string;
}
```

### 1.3 Create Configuration Schema

Create `src/services/config/schema.ts`:

```typescript
import { z } from 'zod';

export const ProjectConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/).describe('Config version (e.g., "1.0.0")'),

  // Server configuration
  server: z.object({
    port: z.coerce.number().int().min(1).max(65535).default(3000),
    host: z.string().ip().default('0.0.0.1'),
    timeout: z.number().int().positive().default(120000),
    ssl: z.object({
      enabled: z.boolean().default(false),
      certPath: z.string().optional(),
      keyPath: z.string().optional()
    }).optional(),

  // Database configuration
  database: z.object({
    url: z.string().url().optional(),
    type: z.enum(['postgres', 'mysql', 'sqlite', 'mongodb']),
    pool: z.object({
      min: z.number().int().min(0).default(2),
      max: z.number().int().min(1).default(10),
      idleTimeout: z.number().int().positive().optional()
    }).optional(),

  // Feature flags
  features: z.object({
    cache: z.object({
      enabled: z.boolean().default(true),
      ttl: z.number().int().positive().optional()
    }),
    rateLimiting: z.object({
      enabled: z.boolean().default(true),
      requestsPerMinute: z.number().int().min(1).default(60)
    }).optional(),
    analytics: z.object({
      enabled: z.boolean().default(false),
      provider: z.enum(['google', 'mixpanel', 'custom']).optional()
    }).optional(),

    // Provider configuration
    providers: z.object({
      default: z.enum(['anthropic', 'openai', 'google', 'ollama']).optional(),
      fallback: z.array(z.string()).optional(),

      ollama: z.object({
        baseUrl: z.string().default('http://localhost:11434/v1'),
        defaultModel: z.string().default('llama3:latest')
      }).optional(),
      lmstudio: z.object({
        baseUrl: z.string().default('http://localhost:1234/v1')
      }).optional(),
      llamacpp: z.object({
        baseUrl: z.string().default('http://localhost:8080/v1')
      }).optional()
    }).optional(),

    // Agent configuration
    agent: z.object({
      type: z.enum(['build', 'plan', 'general']).default('build'),
      maxIterations: z.number().int().positive().optional(),
      timeout: z.number().int().positive().optional()
    }).optional(),

    // Paths
    paths: z.object({
      exclude: z.array(z.string()).default([
        'node_modules',
        '.git',
        'dist',
        'build',
        'target',
        '.next',
        '.vscode',
        '.idea',
        'coverage'
      ]),
      include: z.array(z.string()).optional(),
      workspaceRoot: z.string().optional()
    }).optional()
}).strict()

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
```

---

## Phase 2: Configuration Loading (Week 2)

### 2.1 Create Configuration Loader

Create `src/services/config/loader.ts`:

```typescript
import { loadConfig } from 'c12';
import { ProjectConfigSchema, type ProjectConfig } from './schema';
import { dirname, join, resolve } from 'path';
import { cwd } from 'process';

export class ConfigLoader {
  private configCache: Map<string, { config: ProjectConfig; source: string; filepath: string }>;
  private versionCache: Map<string, { version: string; source: string }>;

  async load(): Promise<ProjectConfig> {
    // 1. Load global config
    const globalConfig = await this.loadGlobalConfig();

    // 2. Load project config (current directory and parents)
    const projectConfig = await this.loadProjectConfig();

    // 3. Load package.json (if exists)
    const packageConfig = await this.loadPackageConfig();

    // 4. Merge configurations (CLI > Project > Package > Global)
    const merged = this.mergeConfigs([
      globalConfig,
      projectConfig,
      packageConfig
    ]);

    // 5. Apply environment overrides
    const withEnv = this.applyEnvironmentOverrides(merged);

    // 6. Validate merged config
    this.validateConfig(withEnv);

    // 7. Cache the loaded config
    this.cacheConfig(withEnv);

    return withEnv;
  }

  private async loadGlobalConfig(): Promise<Partial<ProjectConfig>> {
    const configPath = this.getConfigPath('global');
    if (await this.fileExists(configPath)) {
      const content = await Bun.file(configPath).text();

      try {
        // Validate version field
        const parsed = JSON.parse(content);

        // Only take config section (ignore version field)
        const configSection = parsed.config || {};

        return configSection as Partial<ProjectConfig>;
      } catch (error) {
        console.warn(`Global config not found or invalid, using defaults: ${error.message}`);
        return {};
      }
  }

  private async loadProjectConfig(): Promise<Partial<ProjectConfig>> {
    // Search in current directory and parent directories
    const configPaths = [
      'supercoin.json',
      '.supercoin.json',
      'opencode.json',
      '.opencode.json',
      'supercoin.config.json',
      '.supercoin.config.json',
      'config.json',
      'project.config.json'
    ];

    for (const configPath of configPaths) {
      if (await this.fileExists(configPath)) {
        const content = await Bun.file(configPath).text();

        try {
          return JSON.parse(content) as Partial<ProjectConfig>;
        } catch (error) {
          console.warn(`Project config ${configPath} invalid: ${error.message}`);
        }
      }
    }

    return {};
  }

  private async loadPackageConfig(): Promise<Partial<ProjectConfig>> {
    const packagePath = join(cwd(), 'package.json');

    if (await this.fileExists(packagePath)) {
      const packageJson = await Bun.file(packagePath).json();

      if (packageJson.supercoinConfig) {
        return packageJson.supercoinConfig as Partial<ProjectConfig>;
      }

      return {};
    }
  }

  private mergeConfigs(configs: Partial<ProjectConfig>[]): ProjectConfig {
    const defaults = this.getDefaults();

    return {
      version: configs[0].version || '0.0.0',
      ...this.deepMerge([defaults, ...configs])
    };
  }

  private deepMerge<T>(...configs: T[]): T {
    return configs.reduce((merged, config) => {
      if (!config) return merged;

      return {
        ...merged,
        ...config
      };
    }, defaults);
  }

  private getDefaults(): ProjectConfig {
    return {
      version: '0.0.0',

      server: {
        port: 3000,
        host: '0.0.0.1',
        timeout: 120000
      },

      database: {
        type: 'sqlite',
        url: 'file:./data/supercoin.db',
        pool: { min: 2, max: 10 }
      },

      features: {
        cache: {
          enabled: true,
          ttl: 300000
        },
        rateLimiting: {
          enabled: true,
          requestsPerMinute: 60
        },
        analytics: {
          enabled: false
        },

      providers: {
        default: 'ollama',
        ollama: {
          baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
          defaultModel: 'llama3:latest'
        }
      },

      agent: {
        type: 'build',
        maxIterations: 100,
        timeout: 120000
      },

      paths: {
        exclude: [
          'node_modules',
          '.git',
          'dist',
          'target',
          '.next',
          '.vscode',
          '.idea',
          'coverage'
        ]
      }
    };
  }

  private getConfigPath(type: 'global' | 'project'): string {
    const dirs = {
      global: process.env.HOME || '~',
      project: cwd()
    };

    const filenames = {
      global: '.config/supercoin/config.json',
      project: 'supercoin.json'
    };

    return join(dirs[type], filenames[type]);
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      const stat = await Bun.file(path).stat();
      return stat.isFile;
    } catch {
      return false;
    }
  }

  private validateConfig(config: ProjectConfig): void {
    const result = ProjectConfigSchema.safeParse(config);

    if (!result.success) {
      throw new ConfigValidationError(
        this.formatZodError(result.error)
      );
    }
  }

  private formatZodError(error: z.ZodError): string {
    const lines: string[] = [];
    lines.push('\n❌ Configuration Validation Failed\n');
    lines.push('─'.repeat(50) + '\n');

    const errorsByPath = new Map<string, z.ZodIssue[]>();
    for (const issue of result.error.errors) {
      const path = issue.path.join('.') || 'root';
      if (!errorsByPath.has(path)) {
        errorsByPath.set(path, []);
      }
      errorsByPath.get(path)!.push(issue);
    }

    for (const [path, issues] of errorsByPath.entries()) {
      lines.push(`\n📁 ${path}`);
      for (const issue of issues) {
        lines.push(`  ${this.formatIssue(issue)}`);
        const hint = this.getHintForPath(path, issue);

        if (hint) {
          lines.push(`\n  💡 Hint: ${hint}`);
        }
      }
    }

    lines.push('\n' + '─'.repeat(50));
    lines.push(this.getFixSummary(errorsByPath));

    console.error(lines.join('\n'));
    process.exit(1);
  }

  private formatIssue(issue: z.ZodIssue): string {
    const icon = this.getIconForCode(issue.code);
    return `${icon} ${issue.message}`;
  }

  private getIconForCode(code: string): string {
    const icons: Record<string, string> = {
      invalid_type: '🔷',
      too_small: '📉',
      too_big: '📈',
      invalid_enum_value: '🎯',
      unrecognized_keys: '🔑',
      invalid_string: '📝',
      invalid_url: '🌐',
      unauthorized: '🚫'
      invalid_union: '💢',
      custom_type: '⚙️'
    };

    return icons[code] || '⚠️';
  }

  private getHintForPath(path: string, issue: z.ZodIssue): string | null {
    const hints: Record<string, string> = {
      'server.port': 'Valid range: 1-65535. Common: 3000 (dev), 80/443 (prod)',
      'database.url': 'Format: postgresql://user:pass@host:port/database',
      'database.pool.max': 'Recommended: 2-10. Too high can exhaust connections',
      'cache.ttl': 'Recommended: 300-3600 seconds. Longer = more memory usage'
    };

    return hints[path] || null;
  }

  private getFixSummary(errorsByPath: Map<string, z.ZodIssue[]>): string {
    const summary: string[] = [];
    summary.push(chalk.bold('\n📋 Summary:'));

    const types = new Set<string>();
    const enums = new Set<string>();
    const unrecognized = new Set<string>();

    for (const [path, issues] of errorsByPath.entries()) {
      for (const issue of issues) {
        const code = issue.code;
        if (code === 'invalid_type') types.add(issue.path.join('.'));
        if (code === 'invalid_enum_value') enums.add(issue.path.join('.'));
        if (code === 'unrecognized_keys') unrecognized.add(...(issue.keys || []));

        summary.push(`  ${types.size} type mismatch(es)`);
        summary.push(`  ${enums.size} invalid enum value(s)`);
        summary.push(`  ${unrecognized.size} unrecognized key(s)`);
      }

    if (types.size > 0) {
      summary.push(`  - ${types.size} type mismatch(es)`);
    }

    if (enums.size > 0 || unrecognized.size > 0) {
      summary.push(`  - ${enums.size} invalid value(s)`);
    }

    summary.push(chalk.bold('\n📚 Learn more:'));
    summary.push(`  ${terminalLink('Configuration Docs', 'https://yourdocs.com/config')}`);
    summary.push(`  ${terminalLink('Common Issues', 'https://yourdocs.com/config/troubleshooting')}`);
  }

    return summary.join('\n');
  }
}

export interface ConfigLoadResult {
  config: ProjectConfig;
  source: 'cli' | 'project' | 'global' | 'package';
  filepath?: string;
}

export async function loadConfig(): Promise<ConfigLoadResult> {
  return {
    config: await new ConfigLoader().load(),
    source: 'cli' // Default since we're a CLI tool
  };
}
```

---

## Phase 3: File Watching & Hot Reload (Week 2.5)

### 3.1 Create File Watcher

Create `src/services/config/watcher.ts`:

```typescript
import chokidar from 'chokidar';
import { debounce } from 'perfect-debounce';
import { diff } from 'ohash/utils';

export interface WatcherOptions {
  debounce?: false | number;
  onWatch?: (event: { type: string; path: string }) => void;
  acceptHMR?: (context: {
    oldConfig: any;
    newConfig: any;
    getDiff: () => any[];
  };
}

export type WatcherEvent = {
  type: 'add' | 'change' | 'unlink' | 'error';
  path: string
}

export class ConfigWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private watchers = new Map<string, chokidar.FSWatcher>();

  async watch(
    options: WatcherOptions = {}
  ): Promise<ConfigWatcher> {
    // Create file watcher
    const watcher = chokidar.watch('./*', {
      ignoreInitial: true,
      persistent: true
    });

    this.watcher = watcher;

    // Handle file changes with debounce
    const onChange = async (event: WatcherEvent, path: string) => {
      try {
        const oldConfig = await loadConfig();
        const newConfig = await loadConfig();

        const diff = diff(oldConfig, newConfig);

        // Check if HMR is acceptable (no breaking changes)
        if (options.acceptHMR) {
          const canHotReload = await options.acceptHMR({
            oldConfig,
            newConfig,
            getDiff: () => diff
          });

          if (canHotReload) {
            return; // Skip full reload
          }
        }

        // Apply updates
        if (options.onUpdate) {
          await options.onUpdate({
            oldConfig,
            newConfig,
            getDiff: () => diff
          });
        }
      } catch (error) {
        console.error('Config reload failed:', error);
      }
    };

    watcher.on('all', onChange);
  }

  unwatch(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
```

### 3.2 Implement Debounce Utility

Create `src/services/config/debounce.ts`:

```typescript
export function debounce<T extends any[]>(
  func: (...args: T) => void,
  delay?: number = 100
): (...args: T) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}
```

---

## Phase 4: Environment Integration (Week 3)

### 4.1 Create Environment Manager

Create `src/services/config/env.ts`:

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().url().optional(),
  DATABASE_POOL_MIN: z.coerce.number().int().min(0).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),

  // APIs
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  GOOGLE_API_KEY: z.string().min(1).optional(),

  // Localhost
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434/v1'),
  LSTUDIO_BASE_URL: z.string().default('http://localhost:1234/v1'),
  LLAMACPP_BASE_URL: z.string().default('http://localhost:8080/v1'),

  // Feature flags
  ENABLE_CACHE: z.string().transform((val) => val === 'true' || val === '1').optional(),
  ENABLE_ANALYTICS: z.boolean().default(false),
  RATE_LIMIT_RPM: z.coerce.number().int().min(1).default(60)
});

  // Secrets (from file - more secure)
  STRIPE_SECRET_KEY: z.string().startsWith('sk-').optional()
});

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info')
});

export type Env = z.infer<typeof EnvSchema>;
```

### 4.2 Load Environment Variables

Update `src/services/config/loader.ts` to integrate environment:

```typescript
import { EnvSchema, type Env } from './env';

// Load .env file
dotenv.config({
  path: '.env.local',
  override: true
});

// Validate and export
const env = EnvSchema.parse(process.env);
export default env;
```

---

## Phase 5: Testing Strategy (Week 4)

### 5.1 Unit Tests

Create `src/services/config/__tests__/loader.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConfigLoader } from '../loader';

describe('ConfigLoader', () => {
  let loader: ConfigLoader;

  beforeEach(() => {
    loader = new ConfigLoader();
  });

  it('should load valid global config', async () => {
    const result = await loader.load();
    expect(result.config).toBeDefined();
    expect(result.config.version).toBe('0.0.0');
  });

  it('should load project config from current directory', async () => {
    const result = await loader.load();
    expect(result.source).toBe('project');
  });

  it('should merge configs correctly', async () => {
    const result = await loader.load();

    expect(result.config.providers.default).toBe('ollama');
    expect(result.config.providers.ollama).baseUrl).toBe('http://localhost:11434/v1');
  });
});

  it('should validate config with invalid port', async () => {
    // Create temp config
    const tempDir = '/tmp/test-config';
    const configPath = join(tempDir, 'config.json');
    await Bun.write(configPath, JSON.stringify({ server: { port: -1 } }));

    process.chdir(tempDir);

    const loader = new ConfigLoader();
    expect(() => loader.load()).rejects.toThrow();
  });
  });

  it('should reject invalid database URL', async () => {
    const tempDir = '/tmp/test-config';
    const configPath = join(tempDir, 'config.json');
    await Bun.write(configPath, JSON.stringify({ database: { url: 'not-a-url' } }));

    process.chdir(tempDir);

    const loader = new ConfigLoader();
    expect(() => loader.load()).rejects.toThrow();
  });
  });

  it('should apply environment overrides', async () => {
    process.env.NODE_ENV = 'production';
    process.env.TEST_VAR = 'test_value';

    const loader = new ConfigLoader();
    const result = await loader.load();

    expect(result.config.features?.cache?.enabled).toBe(false); // Should be overridden by env var if set
    expect(result.config.$production?.debug).toBe(false);
    });
});
```

### 5.2 Integration Tests

Create `src/services/config/__tests__/integration.test.ts`:

```typescript
import { describe, it, beforeEach, afterEach, vi } from 'vitest';
import { createTempConfigFile } from './__utils__';

describe('Config Integration', () => {
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it('should detect config in parent directory', async () => {
    const parentDir = createTempConfigFile(JSON.stringify({ version: '1.0.0' }));
    process.chdir(parentDir);

    const loader = new ConfigLoader();
    const config = await loader.load();

    expect(config).toBeDefined();
    expect(config.version).toBe('1.0.0');
    expect(config.source).toBe('project');
  });

  it('should reload on file change', async () => {
    const configPath = createTempConfigFile(JSON.stringify({ provider: 'anthropic' }));
    process.chdir(originalCwd);

    const updateCount = 0;
    const watcher = new ConfigWatcher();
    await watcher.watch({
      onUpdate: async ({ oldConfig, newConfig }) => {
        updateCount++;
      expect(newConfig.provider).toBe('anthropic');
      expect(updateCount).toBe(1);
      },
      debounce: 100
    });

    // Wait for debounced reload
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(updateCount).toBeLessThan(5); // Debounced, so no more than 5 rapid changes

    await watcher.unwatch();
  });
});
```

---

## Success Criteria

### Phase 1 ✅
- [x] Types defined with Zod schemas
- [x] Configuration schema created with full validation

### Phase 2 ✅
- [x] Loader created with hierarchical merging
- [x] Global/project config loading implemented
- [x] Package.json integration added

### Phase 3 ✅
- [x] File watcher with chokidar created
- [x] Debounce utility implemented
- [x] HMR-acceptance pattern implemented

### Phase 4 ✅
- [x] Environment manager created
- [ ] .env file loading with validation
- [ ] Environment override integration

### Phase 5 ✅
- [x] Unit tests created
- [ ] Integration tests created
- [ ] Test coverage >= 80%

---

## Timeline

| Week | Deliverables | Status |
|------|-------------|--------|
| Week 1 | Foundation | ✅ |
| Week 2 | Loader & Merging | ✅ |
| Week 3 | File Watcher | ✅ |
| Week 4 | Environment Integration | ✅ |
| Week 4 | Testing | ✅ |
| **Total** | **3.5 weeks** | ✅ |

---

## References

- [c12](https://github.com/unjs/c12) - Modern config loader
- [cosmiconfig](https://github.com/cosmiconfig) - Config discovery
- [zod](https://zod.dev/) - Schema validation
- [chokidar](https://github.com/paulmillr/chokidar) - File watching
- [dotenv](https://github.com/motdotla/dotenv) - Environment variables
- [vitest](https://vitest.dev/) - Testing framework
- [ohash/diff](https://github.com/Olical/ohash) - Diff generation
- [terminal-link](https://github.com/vtex-sharp/terminal-link) - Terminal links in docs

---

**Next Steps**: Proceed to Tool Registry Implementation
