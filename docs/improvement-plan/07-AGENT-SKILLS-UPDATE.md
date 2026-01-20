# .agent-skills 업데이트 계획

> **Multi-Agent Workflow**: 스킬 시스템과 SuperCode 통합

---

## 1. 현재 상태 분석

### 1.1 기존 스킬 구조

```
.agent-skills/
├── backend/ (6 skills)
├── frontend/ (4 skills)
├── code-quality/ (6 skills)
├── infrastructure/ (6 skills)
├── documentation/ (4 skills)
├── project-management/ (6 skills)
├── search-analysis/ (4 skills)
└── utilities/ (11 skills)

Total: 47 skills (37 active)
```

### 1.2 업데이트 필요성

| 영역 | 현재 | 목표 |
|------|------|------|
| SuperCode 전용 스킬 | 0 | 6+ |
| Multi-agent 워크플로우 | 부분 지원 | 완전 통합 |
| Token 최적화 | 3-tier | 유지 |
| MCP 통합 | 기본 | 강화 |

---

## 2. 신규 스킬 카테고리: supercode/

### 2.1 디렉토리 구조

```
.agent-skills/supercode/
├── supercode-development/
│   ├── SKILL.md
│   ├── SKILL.compact.md
│   └── SKILL.toon
├── agent-creation/
│   ├── SKILL.md
│   ├── SKILL.compact.md
│   └── SKILL.toon
├── hook-development/
│   ├── SKILL.md
│   ├── SKILL.compact.md
│   └── SKILL.toon
├── plugin-development/
│   ├── SKILL.md
│   ├── SKILL.compact.md
│   └── SKILL.toon
├── permission-design/
│   ├── SKILL.md
│   ├── SKILL.compact.md
│   └── SKILL.toon
└── session-management/
    ├── SKILL.md
    ├── SKILL.compact.md
    └── SKILL.toon
```

### 2.2 스킬 상세 정의

---

#### Skill 1: supercode-development

```yaml
# .agent-skills/supercode/supercode-development/SKILL.md

---
name: supercode-development
description: SuperCode CLI 개발 및 기여 가이드
license: Apache-2.0
compatibility: [bun>=1.3.5, typescript>=5.3]
metadata:
  version: "1.0.0"
  author: "SuperCode Team"
allowed-tools: [bash, read, write, edit, grep, glob]
tags: [supercode, cli, development, contribution]
platforms: [Claude, ChatGPT, Gemini]
---

# SuperCode Development Guide

## When to use this skill
- SuperCode 코드베이스에 기여할 때
- 새 기능을 추가할 때
- 버그를 수정할 때
- 코드 리뷰를 수행할 때

## Project Structure

```
supercode/
├── src/
│   ├── cli/          # CLI 명령어
│   ├── tui/          # React/Ink TUI
│   ├── agents/       # 에이전트 시스템
│   ├── core/         # 핵심 기능
│   │   ├── hooks/    # Hook 구현
│   │   ├── tools/    # Tool 구현
│   │   └── session/  # 세션 관리
│   ├── services/     # 비즈니스 로직
│   ├── features/     # 기능 모듈
│   ├── config/       # 설정 관리
│   └── plugin/       # 플러그인 시스템
├── packages/         # 모노레포 패키지
└── tests/            # 테스트
```

## Development Commands

```bash
# 개발 환경 설정
bun install

# 개발 모드 실행
bun src/cli/index.ts "test prompt"

# 타입 체크
bun run typecheck

# 테스트
bun test

# 빌드
bun run build
```

## Code Style

- TypeScript strict mode 사용
- ESM 모듈 시스템
- Zod for runtime validation
- React/Ink for TUI components

## Adding New Features

1. 기능 설계 및 타입 정의
2. 테스트 작성 (TDD 권장)
3. 구현
4. 문서 업데이트
5. PR 제출

## Best Practices

- 기존 패턴 따르기
- 에러 처리 철저히
- 타입 안전성 유지
- 테스트 커버리지 유지
```

---

#### Skill 2: agent-creation

```yaml
# .agent-skills/supercode/agent-creation/SKILL.md

---
name: agent-creation
description: SuperCode 에이전트 생성 및 설정 가이드
license: Apache-2.0
metadata:
  version: "1.0.0"
allowed-tools: [bash, read, write, edit]
tags: [supercode, agent, multi-agent, orchestration]
platforms: [Claude, ChatGPT, Gemini]
---

# Agent Creation Guide

## When to use this skill
- 새로운 전문 에이전트를 만들 때
- 기존 에이전트를 커스터마이즈할 때
- 에이전트 간 협업 설정할 때

## Agent Structure

```typescript
// src/agents/[agent-name]/index.ts

export interface AgentConfig {
  name: string;
  description: string;
  model?: string;
  tools: string[];
  systemPrompt: string;
  temperature?: number;
}

export const myAgent: AgentConfig = {
  name: 'my-agent',
  description: 'Agent description',
  tools: ['read', 'grep', 'glob'],
  systemPrompt: `You are a specialized agent for...`,
  temperature: 0.7,
};
```

## Agent Registration

```typescript
// src/agents/index.ts
import { myAgent } from './my-agent';

export const agents = {
  // ... existing agents
  'my-agent': myAgent,
};
```

## Creating Subagents

```typescript
// .supercode/agents/my-subagent.md
---
name: my-subagent
type: subagent
model: sonnet
tools: [read, grep]
---

# My Subagent

System prompt for the subagent...
```

## Agent Communication

```typescript
// Agent delegation via Task tool
const result = await task({
  subagent_type: 'my-agent',
  prompt: 'Analyze this code...',
});
```

## Best Practices

- 명확한 역할 정의
- 적절한 tool 제한
- 효과적인 system prompt
- 적절한 temperature 설정
```

---

#### Skill 3: hook-development

```yaml
# .agent-skills/supercode/hook-development/SKILL.md

---
name: hook-development
description: SuperCode Hook 개발 가이드
license: Apache-2.0
metadata:
  version: "1.0.0"
allowed-tools: [bash, read, write, edit]
tags: [supercode, hooks, lifecycle, extensibility]
platforms: [Claude, ChatGPT, Gemini]
---

# Hook Development Guide

## When to use this skill
- 새로운 Hook을 개발할 때
- 기존 Hook을 수정할 때
- Hook 시스템을 이해하고 싶을 때

## Hook Types

| Hook | Trigger Point | Use Case |
|------|--------------|----------|
| onUserPromptSubmit | 사용자 입력 후 | 컨텍스트 주입, 변환 |
| onPreToolUse | 도구 실행 전 | 권한 체크, 로깅 |
| onPostToolUse | 도구 실행 후 | 결과 처리, 검증 |
| onStop | 응답 완료 후 | 정리, 알림 |
| chat.message | 메시지 처리 시 | 메시지 변환 |
| permission.ask | 권한 요청 시 | 권한 결정 override |

## Hook Structure

```typescript
// src/core/hooks/my-hook/index.ts

import { HookHandler, HookContext } from '../types';

export function createMyHook(config: MyHookConfig): HookHandler {
  return async (ctx: HookContext, ...args: unknown[]) => {
    // Hook logic

    // Return undefined to continue chain
    // Return value to stop chain with result
    return undefined;
  };
}
```

## Hook Registration

```typescript
// src/core/hooks/index.ts

import { createMyHook } from './my-hook';

hookRegistry.register('onUserPromptSubmit', createMyHook({
  // config
}));
```

## Testing Hooks

```typescript
// tests/unit/hooks/my-hook.test.ts

describe('MyHook', () => {
  it('should process input correctly', async () => {
    const hook = createMyHook({ /* config */ });
    const ctx = createMockContext();

    const result = await hook(ctx, 'input');

    expect(result).toBe(expected);
  });
});
```

## Best Practices

- 단일 책임 원칙
- 에러 격리 (hook 실패가 전체 영향 X)
- 성능 고려 (async 최적화)
- 로깅 추가
```

---

#### Skill 4: plugin-development

```yaml
# .agent-skills/supercode/plugin-development/SKILL.md

---
name: plugin-development
description: SuperCode Plugin 개발 가이드
license: Apache-2.0
metadata:
  version: "1.0.0"
allowed-tools: [bash, read, write, edit]
tags: [supercode, plugin, extension, api]
platforms: [Claude, ChatGPT, Gemini]
---

# Plugin Development Guide

## When to use this skill
- SuperCode 기능을 확장할 때
- 커스텀 도구를 추가할 때
- 외부 서비스를 통합할 때

## Plugin Interface

```typescript
// my-plugin/index.ts

import { Plugin, PluginContext, ToolDefinition } from 'supercode';

const plugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My custom plugin',

  async onLoad(ctx: PluginContext) {
    console.log('Plugin loaded');
  },

  tools: [
    {
      name: 'my_tool',
      description: 'Does something useful',
      args: z.object({
        input: z.string(),
      }),
      async execute(args, ctx) {
        return `Result: ${args.input}`;
      },
    },
  ],

  hooks: [
    {
      name: 'onUserPromptSubmit',
      handler: async (ctx, prompt) => {
        // Modify or log prompt
        return prompt;
      },
    },
  ],
};

export default plugin;
```

## Plugin Configuration

```jsonc
// supercode.json
{
  "plugins": [
    "my-plugin",           // npm package
    "./plugins/local.ts"   // local file
  ]
}
```

## Publishing Plugin

```bash
# package.json
{
  "name": "supercode-plugin-my-plugin",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "supercode": ">=0.3.0"
  }
}

# Publish
npm publish
```

## Best Practices

- 최소 의존성
- 명확한 문서화
- 버전 호환성 명시
- 에러 처리 철저히
```

---

#### Skill 5: permission-design

```yaml
# .agent-skills/supercode/permission-design/SKILL.md

---
name: permission-design
description: SuperCode Permission 시스템 설계 가이드
license: Apache-2.0
metadata:
  version: "1.0.0"
allowed-tools: [read, write, edit]
tags: [supercode, permission, security, access-control]
platforms: [Claude, ChatGPT, Gemini]
---

# Permission Design Guide

## When to use this skill
- Permission 규칙을 설계할 때
- Agent별 접근 제어를 설정할 때
- 보안 정책을 구현할 때

## Permission Levels

- **allow**: 자동 허용
- **deny**: 자동 거부
- **ask**: 사용자 확인 요청

## Configuration

```jsonc
// supercode.json
{
  "permission": {
    "rules": [
      // 민감 파일 보호
      { "tool": "edit", "pattern": "*.env*", "decision": "ask" },
      { "tool": "edit", "pattern": "**/secrets/**", "decision": "deny" },

      // 읽기는 대부분 허용
      { "tool": "read", "pattern": "*", "decision": "allow" },

      // bash는 주의 필요
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
```

## Pattern Syntax

| Pattern | Matches |
|---------|---------|
| `*` | 모든 것 |
| `*.ts` | 모든 .ts 파일 |
| `src/**/*.ts` | src 하위 모든 .ts |
| `!*.test.ts` | .test.ts 제외 |

## Built-in Rulesets

```jsonc
// extends로 사용 가능
{
  "default": [/* 기본 규칙 */],
  "readonly": [/* 읽기 전용 */],
  "strict": [/* 엄격 모드 */],
  "development": [/* 개발용 (완화) */]
}
```

## Best Practices

- 최소 권한 원칙
- 명시적 deny > 암시적 allow
- Agent별 적절한 제한
- 정기적 규칙 검토
```

---

#### Skill 6: session-management

```yaml
# .agent-skills/supercode/session-management/SKILL.md

---
name: session-management
description: SuperCode 세션 관리 가이드
license: Apache-2.0
metadata:
  version: "1.0.0"
allowed-tools: [bash, read]
tags: [supercode, session, persistence, compaction]
platforms: [Claude, ChatGPT, Gemini]
---

# Session Management Guide

## When to use this skill
- 세션을 효과적으로 관리할 때
- 긴 대화의 컨텍스트를 유지할 때
- 세션 데이터를 활용할 때

## Session Lifecycle

```
Create → Active → [Compact] → [Fork] → Complete/Archive
```

## CLI Commands

```bash
# 세션 목록
supercode session list

# 새 세션 시작
supercode run "task" --new

# 세션 이어하기
supercode run --continue "follow up"

# 특정 세션 이어하기
supercode run --session <id> "task"

# 세션 fork
supercode session fork <id>

# 세션 export
supercode session export <id> --format json
```

## Session Structure

```typescript
interface Session {
  id: string;
  messages: Message[];
  metadata: {
    created_at: string;
    updated_at: string;
    name?: string;
    fork_parent?: string;
    compacted_at?: string;
  };
  attachments: Attachment[];
  state: 'active' | 'completed' | 'archived';
}
```

## Compaction

세션이 토큰 한도의 85%에 도달하면 자동 압축:

1. 최근 메시지 보존 (기본 5개)
2. 이전 대화 LLM 요약
3. 핵심 컨텍스트 유지

## Best Practices

- 주기적으로 새 세션 시작
- Fork로 실험적 변경
- 중요 세션 export 백업
- 완료된 작업은 archive
```

---

## 3. agent-routing.yaml 업데이트

### 3.1 SuperCode 특화 라우팅 추가

```yaml
# .agent-skills/agent-routing.yaml (전체 업데이트)

version: "3.1"
workflow: full-multiagent
preset: balanced
generated: 2026-01-20

# 기본 에이전트 설정
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
      - SkillExecute

  analyst:
    provider: gemini
    model: gemini-3-pro
    role: "대용량 분석, 리서치, 코드 리뷰"
    mcp_tool: ask-gemini
    context_limit: 1000000

  executor:
    provider: openai
    model: gpt-5.2-codex
    role: "명령 실행, 빌드, 배포, Docker/K8s"
    mcp_tool: shell

# 카테고리별 라우팅
routing:
  # 기존 카테고리
  backend:
    primary: orchestrator
    analyst: true
    executor: true
    skills: [api-design, database-schema-design, backend-testing]

  frontend:
    primary: orchestrator
    analyst: false
    skills: [ui-component-patterns, state-management, responsive-design]

  code-quality:
    primary: orchestrator
    analyst: true
    skills: [code-review, debugging, testing-strategies]

  infrastructure:
    primary: orchestrator
    executor: true
    skills: [deployment-automation, security-best-practices]

  documentation:
    primary: orchestrator
    skills: [technical-writing, api-documentation]

  # 신규: SuperCode 특화 라우팅
  supercode:
    development:
      primary: orchestrator
      analyst: true
      executor: true
      skills: [supercode-development, code-refactoring]
      workflow:
        - "Gemini: 기존 코드 구조 분석"
        - "Claude: 변경 사항 구현"
        - "Codex: 테스트 및 빌드"

    agent-creation:
      primary: orchestrator
      analyst: true
      skills: [agent-creation, ultrathink-multiagent-workflow]

    hook-development:
      primary: orchestrator
      skills: [hook-development, code-refactoring]

    plugin-development:
      primary: orchestrator
      skills: [plugin-development, api-design]

    permission-design:
      primary: orchestrator
      skills: [permission-design, security-best-practices]

    session-management:
      primary: orchestrator
      skills: [session-management]

# 워크플로우 템플릿
workflows:
  supercode-feature:
    description: "SuperCode 새 기능 개발"
    steps:
      - agent: analyst
        action: "ask-gemini '@supercode/src/ 관련 코드 분석'"
      - agent: orchestrator
        action: "설계 및 구현"
        skills: [supercode-development]
      - agent: executor
        action: "shell 'bun run typecheck && bun test'"
      - agent: orchestrator
        action: "결과 정리 및 문서화"

  supercode-bugfix:
    description: "SuperCode 버그 수정"
    steps:
      - agent: analyst
        action: "버그 원인 분석"
      - agent: orchestrator
        action: "수정 구현"
        skills: [debugging]
      - agent: executor
        action: "테스트 실행"

# 스킬 쿼리 매핑 (한국어 지원)
skill_mapping:
  # SuperCode 관련
  "supercode 개발": supercode/supercode-development
  "슈퍼코드 개발": supercode/supercode-development
  "에이전트 만들기": supercode/agent-creation
  "agent 생성": supercode/agent-creation
  "hook 개발": supercode/hook-development
  "훅 개발": supercode/hook-development
  "plugin 개발": supercode/plugin-development
  "플러그인 개발": supercode/plugin-development
  "permission 설계": supercode/permission-design
  "권한 설계": supercode/permission-design
  "session 관리": supercode/session-management
  "세션 관리": supercode/session-management
```

---

## 4. skills.json 업데이트

### 4.1 신규 카테고리 추가

```json
{
  "version": "3.1.0",
  "updated": "2026-01-20",
  "categories": [
    "backend",
    "frontend",
    "code-quality",
    "infrastructure",
    "documentation",
    "project-management",
    "search-analysis",
    "utilities",
    "supercode"
  ],
  "skills": [
    // ... existing skills ...

    // SuperCode skills
    {
      "name": "supercode-development",
      "category": "supercode",
      "path": "supercode/supercode-development",
      "description": "SuperCode CLI 개발 및 기여 가이드",
      "tags": ["supercode", "cli", "development", "contribution"],
      "platforms": ["Claude", "ChatGPT", "Gemini"],
      "tools": ["bash", "read", "write", "edit", "grep", "glob"]
    },
    {
      "name": "agent-creation",
      "category": "supercode",
      "path": "supercode/agent-creation",
      "description": "SuperCode 에이전트 생성 및 설정",
      "tags": ["supercode", "agent", "multi-agent", "orchestration"],
      "platforms": ["Claude", "ChatGPT", "Gemini"],
      "tools": ["bash", "read", "write", "edit"]
    },
    {
      "name": "hook-development",
      "category": "supercode",
      "path": "supercode/hook-development",
      "description": "SuperCode Hook 개발 가이드",
      "tags": ["supercode", "hooks", "lifecycle", "extensibility"],
      "platforms": ["Claude", "ChatGPT", "Gemini"],
      "tools": ["bash", "read", "write", "edit"]
    },
    {
      "name": "plugin-development",
      "category": "supercode",
      "path": "supercode/plugin-development",
      "description": "SuperCode Plugin 개발 가이드",
      "tags": ["supercode", "plugin", "extension", "api"],
      "platforms": ["Claude", "ChatGPT", "Gemini"],
      "tools": ["bash", "read", "write", "edit"]
    },
    {
      "name": "permission-design",
      "category": "supercode",
      "path": "supercode/permission-design",
      "description": "Permission 시스템 설계 가이드",
      "tags": ["supercode", "permission", "security", "access-control"],
      "platforms": ["Claude", "ChatGPT", "Gemini"],
      "tools": ["read", "write", "edit"]
    },
    {
      "name": "session-management",
      "category": "supercode",
      "path": "supercode/session-management",
      "description": "세션 관리 가이드",
      "tags": ["supercode", "session", "persistence", "compaction"],
      "platforms": ["Claude", "ChatGPT", "Gemini"],
      "tools": ["bash", "read"]
    }
  ]
}
```

---

## 5. 실행 계획

### 5.1 파일 생성 순서

```bash
# 1. 디렉토리 생성
mkdir -p /Users/supercent/Documents/Github/.agent-skills/supercode/{supercode-development,agent-creation,hook-development,plugin-development,permission-design,session-management}

# 2. 각 스킬 SKILL.md 생성
# (위 2.2 섹션의 내용)

# 3. Compact 버전 생성
python3 scripts/generate_compact_skills.py --category supercode

# 4. TOON 버전 생성
python3 scripts/toon_converter.py --category supercode

# 5. skills.json 업데이트
python3 scripts/skill_manifest_builder.py

# 6. agent-routing.yaml 업데이트
# (수동 편집)
```

### 5.2 검증

```bash
# 스킬 유효성 검사
python3 validate_claude_skills.py --category supercode

# 스킬 검색 테스트
python3 skill-query-handler.py search "supercode 개발"
python3 skill-query-handler.py search "hook 개발"

# Token 최적화 확인
python3 skill-query-handler.py stats --category supercode
```

---

## 다음 단계

→ [prompts/](./prompts/) - Phase별 실행 프롬프트
