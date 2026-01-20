# Phase 4: Polish & Integration (완성도)

> **Multi-Agent Execution**: Claude(통합) → Gemini(검증) → Codex(최종빌드)

## 목표

최종 완성도 작업:
1. .agent-skills 통합
2. Documentation 정비
3. Testing & Validation
4. Performance Optimization

---

## 1. .agent-skills 통합

### 1.1 SuperCode 전용 스킬 카테고리 추가

```
.agent-skills/
├── supercode/                    # 신규 카테고리
│   ├── supercode-development/    # SuperCode 개발 가이드
│   ├── agent-creation/           # 에이전트 생성 스킬
│   ├── hook-development/         # Hook 개발 스킬
│   ├── plugin-development/       # 플러그인 개발 스킬
│   ├── permission-design/        # Permission 설계 스킬
│   └── session-management/       # 세션 관리 스킬
│
├── infrastructure/               # 확장
│   └── supercode-deployment/     # SuperCode 배포 스킬
│
└── utilities/                    # 확장
    └── supercode-config/         # SuperCode 설정 스킬
```

### 1.2 스킬 통합 설정

```typescript
// src/features/skill-loader/supercode-skills.ts

export const SUPERCODE_SKILL_CONFIG = {
  // 내장 스킬 경로
  builtinPath: path.join(__dirname, '../../skills'),

  // .agent-skills 연동
  agentSkillsPath: process.env.AGENT_SKILLS_PATH ||
    path.join(os.homedir(), '.agent-skills'),

  // 스킬 검색 우선순위
  searchOrder: [
    'project',      // .supercode/skills/
    'builtin',      // 내장 스킬
    'agent-skills', // .agent-skills
    'global',       // ~/.config/supercode/skills
  ],

  // 자동 스킬 매핑
  autoMapping: {
    'api design': 'backend/api-design',
    'code review': 'code-quality/code-review',
    'debugging': 'code-quality/debugging',
    'deployment': 'infrastructure/deployment-automation',
    'documentation': 'documentation/technical-writing',
  },
};
```

### 1.3 스킬 실행 통합

```typescript
// src/features/skill-loader/executor.ts

export class SkillExecutor {
  private loader: SkillLoader;
  private agentSkillsIntegration: AgentSkillsIntegration;

  async execute(skillQuery: string, mode: 'full' | 'compact' | 'toon' = 'compact'): Promise<SkillResult> {
    // 1. 스킬 검색
    const skill = await this.findSkill(skillQuery);

    if (!skill) {
      // .agent-skills에서 검색
      const agentSkill = await this.agentSkillsIntegration.search(skillQuery);
      if (agentSkill) {
        return this.executeAgentSkill(agentSkill, mode);
      }

      throw new SkillNotFoundError(skillQuery);
    }

    // 2. 모드에 따른 스킬 로드
    const content = await this.loadSkillContent(skill, mode);

    // 3. 컨텍스트에 스킬 주입
    return {
      skill: skill.name,
      content,
      mode,
      tokenCount: this.countTokens(content),
    };
  }

  private async loadSkillContent(skill: Skill, mode: string): Promise<string> {
    const basePath = skill.path;

    const filenames = {
      full: 'SKILL.md',
      compact: 'SKILL.compact.md',
      toon: 'SKILL.toon',
    };

    const filename = filenames[mode as keyof typeof filenames];
    const filePath = path.join(basePath, filename);

    if (await exists(filePath)) {
      return readFile(filePath, 'utf-8');
    }

    // Fallback to full version
    return readFile(path.join(basePath, 'SKILL.md'), 'utf-8');
  }
}
```

### 1.4 agent-routing.yaml 업데이트

```yaml
# .agent-skills/agent-routing.yaml (업데이트)

version: "3.1"
workflow: full-multiagent
preset: balanced

agents:
  orchestrator:
    provider: claude
    model: claude-opus-4-5-20251101
    role: "계획 수립, 코드 생성, 스킬 해석"
    tools:
      - Read
      - Write
      - Edit
      - Glob
      - Grep
      - Task
      - TodoWrite
      - SkillExecute  # 신규

  analyst:
    provider: gemini
    model: gemini-3-pro
    role: "대용량 분석, 리서치, 코드 리뷰"
    mcp_tool: ask-gemini
    context_limit: 1000000

  executor:
    provider: openai
    model: gpt-5.2-codex
    role: "명령 실행, 빌드, 배포"
    mcp_tool: shell

# SuperCode 특화 라우팅
supercode_routing:
  permission_design:
    primary: orchestrator
    skills: [permission-design, security-best-practices]

  hook_development:
    primary: orchestrator
    analyst: true
    skills: [hook-development, code-refactoring]

  plugin_development:
    primary: orchestrator
    skills: [plugin-development, api-design]

  agent_creation:
    primary: orchestrator
    analyst: true
    skills: [agent-creation, ultrathink-multiagent-workflow]
```

---

## 2. Documentation 정비

### 2.1 문서 구조

```
docs/
├── improvement-plan/             # 현재 계획 문서
├── guides/                       # 신규
│   ├── getting-started.md
│   ├── configuration.md
│   ├── permissions.md
│   ├── plugins.md
│   ├── hooks.md
│   ├── agents.md
│   └── skills.md
├── api/                          # 신규
│   ├── config-schema.md
│   ├── plugin-api.md
│   ├── hook-api.md
│   └── tool-api.md
└── examples/                     # 신규
    ├── custom-plugin/
    ├── custom-hook/
    └── custom-agent/
```

### 2.2 주요 문서 생성

```markdown
# docs/guides/permissions.md (예시)

# Permission System Guide

## Overview

SuperCode의 Permission System은 도구 사용에 대한 세밀한 접근 제어를 제공합니다.

## Permission Levels

- **allow**: 자동으로 허용
- **deny**: 자동으로 거부
- **ask**: 사용자에게 확인 요청

## Configuration

\`\`\`jsonc
// supercode.json
{
  "permission": {
    "rules": [
      { "tool": "edit", "pattern": "*.env", "decision": "ask" },
      { "tool": "bash", "pattern": "*", "decision": "ask" }
    ],
    "agents": {
      "plan": {
        "extends": "readonly",
        "overrides": [
          { "tool": "edit", "pattern": ".supercode/plan/**", "decision": "allow" }
        ]
      }
    }
  }
}
\`\`\`

## Pattern Syntax

- `*` - 모든 것에 매칭
- `*.ext` - 특정 확장자
- `**/pattern` - 재귀적 매칭
- `!pattern` - 제외

## Built-in Rulesets

- `default` - 기본 규칙
- `readonly` - 읽기 전용
- `strict` - 엄격 모드
```

---

## 3. Testing & Validation

### 3.1 테스트 구조

```
tests/
├── unit/
│   ├── permission/
│   │   ├── rules.test.ts
│   │   ├── patterns.test.ts
│   │   └── manager.test.ts
│   ├── plugin/
│   │   ├── loader.test.ts
│   │   └── registry.test.ts
│   ├── background-agent/
│   │   ├── manager.test.ts
│   │   └── concurrency.test.ts
│   ├── ralph-loop/
│   │   ├── detector.test.ts
│   │   └── executor.test.ts
│   └── config/
│       ├── layers.test.ts
│       └── parser.test.ts
├── integration/
│   ├── permission-tool.test.ts
│   ├── plugin-lifecycle.test.ts
│   ├── ralph-loop-e2e.test.ts
│   └── sisyphus-delegation.test.ts
└── e2e/
    ├── cli.test.ts
    └── tui.test.ts
```

### 3.2 핵심 테스트 케이스

```typescript
// tests/unit/permission/manager.test.ts

import { describe, it, expect } from 'bun:test';
import { PermissionManager } from '../../../src/core/permission/manager';

describe('PermissionManager', () => {
  describe('check', () => {
    it('should allow when rule matches allow', async () => {
      const manager = new PermissionManager({
        rules: [{ tool: 'read', pattern: '*', decision: 'allow' }],
      });

      const result = await manager.check({
        tool: 'read',
        resource: 'src/index.ts',
        agentId: 'build',
      });

      expect(result.decision).toBe('allow');
    });

    it('should deny sensitive files', async () => {
      const manager = new PermissionManager({
        rules: [
          { tool: 'edit', pattern: '*.env', decision: 'deny' },
        ],
      });

      const result = await manager.check({
        tool: 'edit',
        resource: '.env',
        agentId: 'build',
      });

      expect(result.decision).toBe('deny');
    });

    it('should respect agent-specific rules', async () => {
      const manager = new PermissionManager({
        rules: [{ tool: 'edit', pattern: '*', decision: 'allow' }],
        agents: {
          plan: {
            name: 'plan',
            rules: [{ tool: 'edit', pattern: '*', decision: 'deny' }],
          },
        },
      });

      const result = await manager.check({
        tool: 'edit',
        resource: 'src/index.ts',
        agentId: 'plan',
      });

      expect(result.decision).toBe('deny');
    });
  });

  describe('pattern matching', () => {
    it('should match glob patterns', async () => {
      const manager = new PermissionManager({
        rules: [
          { tool: 'edit', pattern: 'src/**/*.ts', decision: 'allow' },
        ],
      });

      const result = await manager.check({
        tool: 'edit',
        resource: 'src/core/tools/bash.ts',
        agentId: 'build',
      });

      expect(result.decision).toBe('allow');
    });
  });
});
```

### 3.3 Integration Test

```typescript
// tests/integration/ralph-loop-e2e.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { RalphLoopExecutor } from '../../src/core/hooks/ralph-loop/executor';

describe('Ralph Loop E2E', () => {
  let executor: RalphLoopExecutor;

  beforeEach(() => {
    executor = new RalphLoopExecutor({
      maxIterations: 5,
      timeoutMs: 60000,
      completionPatterns: ['TASK COMPLETE', 'All tests pass'],
      pauseOnError: false,
    });
  });

  it('should complete when pattern detected', async () => {
    // Mock agent that returns completion after 2 iterations
    let iteration = 0;
    mockAgent.setResponse(() => {
      iteration++;
      if (iteration >= 2) {
        return { content: 'TASK COMPLETE - all changes applied', toolCalls: [] };
      }
      return { content: 'Working on task...', toolCalls: [mockEditCall] };
    });

    const result = await executor.start('test-session', 'Fix the bug');

    expect(result.status).toBe('completed');
    expect(result.currentIteration).toBe(2);
  });

  it('should timeout after max iterations', async () => {
    mockAgent.setResponse(() => ({
      content: 'Still working...',
      toolCalls: [mockEditCall],
    }));

    const result = await executor.start('test-session', 'Complex task');

    expect(result.status).toBe('timeout');
    expect(result.currentIteration).toBe(5);
  });
});
```

---

## 4. Performance Optimization

### 4.1 최적화 대상

| 영역 | 현재 문제 | 최적화 방안 |
|------|----------|-------------|
| Skill Loading | 매번 파일 읽기 | LRU 캐시 적용 |
| Config Loading | 5 layers 순차 로드 | 병렬 로드 + 캐시 |
| Permission Check | 매 tool call마다 평가 | 결과 캐싱 |
| LSP Client | 언어별 새 연결 | Connection pool |
| Hook Pipeline | 순차 실행 | 병렬 실행 가능한 hook 분리 |

### 4.2 Skill Cache

```typescript
// src/features/skill-loader/cache.ts

import { LRUCache } from 'lru-cache';

export class SkillCache {
  private cache: LRUCache<string, SkillContent>;

  constructor(options: { maxSize: number; ttlMs: number }) {
    this.cache = new LRUCache({
      max: options.maxSize,
      ttl: options.ttlMs,
      sizeCalculation: (value) => value.content.length,
      maxSize: 10 * 1024 * 1024, // 10MB max
    });
  }

  get(key: string): SkillContent | undefined {
    return this.cache.get(key);
  }

  set(key: string, content: SkillContent): void {
    this.cache.set(key, content);
  }

  getCacheKey(skillPath: string, mode: string): string {
    return `${skillPath}:${mode}`;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
```

### 4.3 Permission Cache

```typescript
// src/core/permission/cache.ts

export class PermissionCache {
  private cache: Map<string, CachedPermission> = new Map();
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  getCacheKey(request: PermissionRequest): string {
    return `${request.agentId}:${request.tool}:${request.resource || '*'}`;
  }

  get(request: PermissionRequest): PermissionResult | undefined {
    const key = this.getCacheKey(request);
    const cached = this.cache.get(key);

    if (cached && !this.isExpired(cached)) {
      return cached.result;
    }

    return undefined;
  }

  set(request: PermissionRequest, result: PermissionResult): void {
    // Only cache allow/deny, not ask
    if (result.decision === 'ask') return;

    const key = this.getCacheKey(request);
    this.cache.set(key, {
      result,
      cachedAt: Date.now(),
    });
  }

  private isExpired(cached: CachedPermission): boolean {
    const TTL = 5 * 60 * 1000; // 5 minutes
    return Date.now() - cached.cachedAt > TTL;
  }

  clear(): void {
    this.cache.clear();
  }
}
```

---

## 5. 최종 검증 프로세스

### 5.1 Phase 4 체크리스트

```markdown
## .agent-skills 통합
- [ ] supercode/ 카테고리 생성
- [ ] 6개 신규 스킬 작성
- [ ] agent-routing.yaml 업데이트
- [ ] 스킬 검색 및 실행 테스트

## Documentation
- [ ] guides/ 문서 7개 작성
- [ ] api/ 문서 4개 작성
- [ ] examples/ 예제 3개 작성

## Testing
- [ ] Unit tests 작성 (>80% coverage)
- [ ] Integration tests 작성
- [ ] E2E tests 작성

## Performance
- [ ] Skill cache 적용
- [ ] Permission cache 적용
- [ ] Config parallel load
- [ ] LSP connection pool
```

### 5.2 Release Checklist

```markdown
## Pre-release
- [ ] 모든 테스트 통과
- [ ] TypeScript strict 에러 없음
- [ ] Lint 경고 없음
- [ ] 문서 완성도 확인
- [ ] CHANGELOG 업데이트
- [ ] Version bump

## Release
- [ ] Git tag 생성
- [ ] npm publish (if applicable)
- [ ] GitHub release 생성
- [ ] 문서 사이트 배포
```

---

## 다음 단계

→ [06-VERIFICATION-CHECKLIST.md](./06-VERIFICATION-CHECKLIST.md) - 5회 검증 체크리스트
