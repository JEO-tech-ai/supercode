# Phase 1: Foundation (기반 강화)

> **Multi-Agent Execution**: Claude(설계) → Gemini(분석) → Claude(구현) → Codex(검증)

## 목표

SuperCode의 확장성을 위한 핵심 기반 시스템 구축:
1. Permission System (권한 체계)
2. Plugin Architecture (플러그인 아키텍처)
3. Configuration 계층화

---

## 1. Permission System 구현

### 1.1 아키텍처 설계

```
src/core/permission/
├── index.ts              # Main exports
├── types.ts              # Permission types & interfaces
├── rules.ts              # Rule evaluation engine
├── patterns.ts           # Wildcard pattern matching
├── defaults.ts           # Default permission rules
└── manager.ts            # Permission manager class
```

### 1.2 타입 정의

```typescript
// src/core/permission/types.ts

export type PermissionDecision = 'allow' | 'deny' | 'ask';

export interface PermissionRule {
  tool: string;           // Tool name or '*' for all
  pattern?: string;       // File/resource pattern (glob)
  decision: PermissionDecision;
  reason?: string;        // Optional explanation
}

export interface PermissionRuleset {
  name: string;           // Ruleset identifier
  rules: PermissionRule[];
  extends?: string;       // Parent ruleset to inherit
}

export interface AgentPermissions {
  agentId: string;
  ruleset: PermissionRuleset;
  overrides?: PermissionRule[];
}

export interface PermissionRequest {
  tool: string;
  resource?: string;      // File path or resource identifier
  agentId: string;
  context?: Record<string, unknown>;
}

export interface PermissionResult {
  decision: PermissionDecision;
  rule?: PermissionRule;
  reason?: string;
}
```

### 1.3 구현 명세

#### 1.3.1 Pattern Matcher

```typescript
// src/core/permission/patterns.ts

import { minimatch } from 'minimatch';

export function matchPattern(pattern: string, value: string): boolean {
  // Support for:
  // - Exact match: 'bash' matches 'bash'
  // - Wildcard: '*' matches everything
  // - Glob: '*.env' matches '.env', 'local.env'
  // - Path glob: 'src/**/*.ts' matches nested TS files

  if (pattern === '*') return true;
  if (pattern === value) return true;
  return minimatch(value, pattern, { dot: true });
}
```

#### 1.3.2 Permission Manager

```typescript
// src/core/permission/manager.ts

export class PermissionManager {
  private rulesets: Map<string, PermissionRuleset> = new Map();
  private agentPermissions: Map<string, AgentPermissions> = new Map();
  private askHandler?: (request: PermissionRequest) => Promise<PermissionDecision>;

  constructor(config: PermissionConfig) {
    this.loadDefaults();
    this.loadFromConfig(config);
  }

  async check(request: PermissionRequest): Promise<PermissionResult> {
    // 1. Get agent-specific permissions
    // 2. Evaluate rules in order (first match wins)
    // 3. If 'ask', invoke askHandler
    // 4. Cache decision for session
  }

  registerAskHandler(handler: typeof this.askHandler) {
    this.askHandler = handler;
  }

  addRule(agentId: string, rule: PermissionRule) { /* ... */ }
  removeRule(agentId: string, ruleIndex: number) { /* ... */ }
}
```

### 1.4 Default Rules

```typescript
// src/core/permission/defaults.ts

export const DEFAULT_RULES: PermissionRule[] = [
  // Sensitive files require permission
  { tool: 'edit', pattern: '*.env', decision: 'ask', reason: 'Environment file modification' },
  { tool: 'edit', pattern: '*.env.*', decision: 'ask' },
  { tool: 'edit', pattern: '**/credentials*', decision: 'ask' },
  { tool: 'edit', pattern: '**/secrets*', decision: 'ask' },

  // Read operations are generally allowed
  { tool: 'read', pattern: '*', decision: 'allow' },
  { tool: 'glob', pattern: '*', decision: 'allow' },
  { tool: 'grep', pattern: '*', decision: 'allow' },

  // Bash requires context-aware decisions
  { tool: 'bash', pattern: '*', decision: 'ask' },

  // File creation/modification defaults
  { tool: 'write', pattern: '*', decision: 'allow' },
  { tool: 'edit', pattern: '*', decision: 'allow' },
];

export const PLAN_AGENT_RULES: PermissionRuleset = {
  name: 'plan',
  rules: [
    { tool: 'edit', pattern: '*', decision: 'deny', reason: 'Plan agent is read-only' },
    { tool: 'write', pattern: '*', decision: 'deny' },
    { tool: 'edit', pattern: '.supercode/plan/**', decision: 'allow' },
    { tool: 'bash', pattern: '*', decision: 'ask' },
  ],
};
```

### 1.5 통합 계획

```typescript
// src/core/tools/wrapper.ts (기존 도구 래핑)

export function wrapToolWithPermission<T extends Tool>(
  tool: T,
  permissionManager: PermissionManager,
  agentId: string
): T {
  return {
    ...tool,
    async execute(args: ToolArgs): Promise<ToolResult> {
      const request: PermissionRequest = {
        tool: tool.name,
        resource: args.path || args.file,
        agentId,
      };

      const result = await permissionManager.check(request);

      if (result.decision === 'deny') {
        throw new PermissionDeniedError(result.reason);
      }

      if (result.decision === 'ask') {
        // 사용자에게 확인 요청
        const confirmed = await askUser(request, result);
        if (!confirmed) {
          throw new PermissionDeniedError('User denied permission');
        }
      }

      return tool.execute(args);
    },
  };
}
```

---

## 2. Plugin Architecture 구현

### 2.1 아키텍처 설계

```
src/plugin/
├── index.ts              # Main exports
├── types.ts              # Plugin types & interfaces
├── loader.ts             # Plugin discovery & loading
├── registry.ts           # Plugin registry (existing, enhance)
├── hooks.ts              # Hook plugin support
└── tools.ts              # Tool plugin support
```

### 2.2 타입 정의

```typescript
// src/plugin/types.ts

export interface PluginContext {
  client: SuperCodeClient;
  project: ProjectMetadata;
  directory: string;
  serverUrl: string;
  shell: ShellInterface;
  config: PluginConfig;
}

export interface PluginHook<T = void> {
  name: string;
  handler: (ctx: PluginContext, ...args: unknown[]) => Promise<T>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  args: z.ZodObject<any>;
  execute: (args: unknown, ctx: PluginContext) => Promise<string>;
}

export interface Plugin {
  name: string;
  version: string;
  description?: string;

  // Lifecycle hooks
  onLoad?: (ctx: PluginContext) => Promise<void>;
  onUnload?: (ctx: PluginContext) => Promise<void>;

  // Feature registrations
  tools?: ToolDefinition[];
  hooks?: PluginHook[];
  config?: (ctx: PluginContext) => Partial<SuperCodeConfig>;
  auth?: AuthPlugin;
}

export interface AuthPlugin {
  name: string;
  authenticate: (ctx: PluginContext) => Promise<AuthResult>;
  refresh?: (ctx: PluginContext, token: string) => Promise<AuthResult>;
}
```

### 2.3 Plugin Loader

```typescript
// src/plugin/loader.ts

export class PluginLoader {
  private plugins: Map<string, Plugin> = new Map();
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  async loadFromConfig(config: SuperCodeConfig): Promise<void> {
    const pluginNames = config.plugins || [];

    for (const name of pluginNames) {
      await this.loadPlugin(name);
    }
  }

  async loadPlugin(nameOrPath: string): Promise<Plugin> {
    // 1. Resolve plugin path (npm package or local file)
    // 2. Dynamic import
    // 3. Validate plugin structure
    // 4. Call onLoad
    // 5. Register tools/hooks

    const pluginModule = await import(this.resolvePath(nameOrPath));
    const plugin: Plugin = pluginModule.default || pluginModule;

    this.validatePlugin(plugin);

    if (plugin.onLoad) {
      await plugin.onLoad(this.context);
    }

    this.plugins.set(plugin.name, plugin);

    // Register tools
    if (plugin.tools) {
      for (const tool of plugin.tools) {
        toolRegistry.register(tool);
      }
    }

    // Register hooks
    if (plugin.hooks) {
      for (const hook of plugin.hooks) {
        hookRegistry.register(hook.name, hook.handler);
      }
    }

    return plugin;
  }

  private resolvePath(nameOrPath: string): string {
    // Handle: @scope/plugin, plugin-name, ./local-plugin.ts
    if (nameOrPath.startsWith('.') || nameOrPath.startsWith('/')) {
      return path.resolve(this.context.directory, nameOrPath);
    }
    return nameOrPath; // npm package
  }
}
```

### 2.4 Hook System 확장

```typescript
// src/plugin/hooks.ts

export type HookName =
  // Existing hooks
  | 'onUserPromptSubmit'
  | 'onPreToolUse'
  | 'onPostToolUse'
  | 'onStop'
  // New hooks (opencode style)
  | 'chat.message'
  | 'chat.params'
  | 'permission.ask'
  | 'tool.execute.before'
  | 'tool.execute.after'
  | 'experimental.chat.messages.transform'
  | 'experimental.chat.system.transform'
  | 'experimental.session.compacting';

export interface HookRegistry {
  register(name: HookName, handler: HookHandler): void;
  unregister(name: HookName, handler: HookHandler): void;
  emit<T>(name: HookName, ...args: unknown[]): Promise<T | void>;
  emitSequential<T>(name: HookName, ...args: unknown[]): Promise<T | void>;
}
```

---

## 3. Configuration 계층화

### 3.1 Config Layers

```typescript
// src/config/layers.ts

export type ConfigLayer =
  | 'cli'           // CLI arguments (highest priority)
  | 'project'       // supercode.json in project root
  | 'directory'     // .supercode/config.json
  | 'global'        // ~/.config/supercode/config.json
  | 'remote';       // .well-known/supercode (lowest priority)

export interface LayeredConfig {
  layer: ConfigLayer;
  path: string;
  config: Partial<SuperCodeConfig>;
}

export async function loadLayeredConfig(
  projectDir: string
): Promise<SuperCodeConfig> {
  const layers: LayeredConfig[] = [];

  // 1. Load remote config (if enabled)
  // 2. Load global config
  // 3. Load directory config
  // 4. Load project config
  // 5. CLI args applied last

  // Deep merge with precedence
  return mergeConfigs(layers);
}
```

### 3.2 JSONC Support

```typescript
// src/config/parser.ts

import { parse as parseJSONC } from 'jsonc-parser';

export function parseConfigFile(content: string, filePath: string): unknown {
  const ext = path.extname(filePath);

  if (ext === '.jsonc' || ext === '.json') {
    const errors: ParseError[] = [];
    const result = parseJSONC(content, errors, {
      allowTrailingComma: true,
      allowComments: true,
    });

    if (errors.length > 0) {
      throw new ConfigParseError(filePath, errors);
    }

    return result;
  }

  // YAML support maintained
  if (ext === '.yaml' || ext === '.yml') {
    return yaml.parse(content);
  }

  throw new UnsupportedConfigFormat(filePath);
}
```

---

## 4. 파일 수정 목록

### 4.1 신규 파일

| 파일 경로 | 목적 | 예상 LOC |
|-----------|------|----------|
| `src/core/permission/index.ts` | Permission 모듈 exports | 20 |
| `src/core/permission/types.ts` | 타입 정의 | 80 |
| `src/core/permission/rules.ts` | 규칙 평가 엔진 | 150 |
| `src/core/permission/patterns.ts` | 패턴 매칭 | 50 |
| `src/core/permission/defaults.ts` | 기본 규칙 | 100 |
| `src/core/permission/manager.ts` | Permission Manager | 200 |
| `src/plugin/types.ts` | 플러그인 타입 (확장) | 100 |
| `src/plugin/loader.ts` | 플러그인 로더 | 150 |
| `src/plugin/hooks.ts` | Hook 확장 | 100 |
| `src/config/layers.ts` | 설정 계층 | 100 |
| `src/config/parser.ts` | JSONC 파서 | 80 |

### 4.2 수정 파일

| 파일 경로 | 수정 내용 |
|-----------|-----------|
| `src/core/tools/bash.ts` | Permission wrapper 적용 |
| `src/core/tools/file.ts` | Permission wrapper 적용 |
| `src/plugin/index.ts` | Plugin loader 통합 |
| `src/config/loader.ts` | 계층 설정 로드 |
| `src/config/schema.ts` | Permission 스키마 추가 |
| `src/agents/index.ts` | Agent별 permission 적용 |

---

## 5. 멀티 에이전트 실행 계획

### Step 1: Gemini 분석
```bash
# 실행 프롬프트
ask-gemini "@opencode/packages/opencode/src/permission/
@opencode/packages/plugin/src/
Permission과 Plugin 시스템 아키텍처 분석.
주요 패턴과 구현 방식 추출해줘."
```

### Step 2: Claude 설계 및 구현
```
# 순서
1. Permission types.ts 작성
2. Pattern matcher 구현
3. Rule engine 구현
4. Permission Manager 구현
5. Default rules 정의
6. Tool wrapper 구현
7. Plugin types 확장
8. Plugin loader 구현
9. Config layers 구현
```

### Step 3: Codex 검증
```bash
# 검증 명령
shell "cd /Users/supercent/Documents/Github/supercode && bun run typecheck"
shell "cd /Users/supercent/Documents/Github/supercode && bun test --grep 'permission'"
shell "cd /Users/supercent/Documents/Github/supercode && bun run build"
```

---

## 6. 검증 체크리스트

### 아키텍처 검증 (검증 1)
- [ ] Permission 타입이 기존 Tool 시스템과 호환
- [ ] Plugin 인터페이스가 기존 Skills와 충돌 없음
- [ ] Config 계층이 기존 설정과 병합 가능

### 기능 검증 (검증 2)
- [ ] Permission allow/deny/ask 모두 동작
- [ ] Wildcard 패턴 매칭 정확성
- [ ] Plugin 로드/언로드 정상 동작
- [ ] Config 우선순위 올바름

### 통합 검증 (검증 3)
- [ ] 기존 hooks와 새 hooks 공존
- [ ] 기존 tools에 permission 적용 가능
- [ ] 타입 에러 없음

---

## 다음 단계

→ [03-PHASE2-CORE-FEATURES.md](./03-PHASE2-CORE-FEATURES.md) - Phase 2 핵심 기능 구현
