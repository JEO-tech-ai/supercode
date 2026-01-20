# Gap Analysis: SuperCode vs OpenCode + oh-my-opencode

> **Multi-Agent Workflow Required**: 이 분석은 스킬 기반 멀티 에이전트 워크플로우로 검증됨

## 멀티 에이전트 워크플로우 활용

```yaml
# agent-routing.yaml 기반 작업 분담
workflow:
  analysis_tasks:
    agent: Gemini (analyst)
    tool: ask-gemini
    prompt: "@supercode/ @opencode/ 기능 비교 분석"

  implementation_tasks:
    agent: Claude (orchestrator)
    tools: [Read, Write, Edit, Task]

  execution_tasks:
    agent: Codex (executor)
    tool: shell
    commands: [build, test, lint]
```

---

## 1. 기능 비교 매트릭스

### 1.1 Core Architecture

| Feature | SuperCode | OpenCode | oh-my-opencode | Gap Status |
|---------|:---------:|:--------:|:--------------:|:----------:|
| **CLI Framework** | Commander.js | Yargs | Plugin | ⚠️ Enhance |
| **TUI Framework** | React/Ink | SolidJS/OpenTUI | N/A | ✅ OK |
| **Package Structure** | 7 packages | 17 packages | 1 plugin | ⚠️ Modularize |
| **Build System** | Bun | Bun + Turbo | Bun | ✅ OK |
| **Runtime** | Bun 1.3.5+ | Bun 1.3.5+ | Bun | ✅ OK |

### 1.2 Agent System

| Feature | SuperCode | OpenCode | oh-my-opencode | Gap Status |
|---------|:---------:|:--------:|:--------------:|:----------:|
| **Agent Count** | 10+ | 5 | 7 | ✅ OK |
| **Orchestrator** | Cent | N/A | Sisyphus | ⚠️ Enhance |
| **Background Tasks** | Basic | N/A | Full Manager | ❌ Missing |
| **Parallel Execution** | Limited | Batch tool | Full | ❌ Missing |
| **Ralph Loop** | ❌ | ❌ | ✅ | ❌ Missing |
| **Agent Delegation** | Basic | Task tool | Full orchestration | ⚠️ Enhance |

### 1.3 Hook System

| Feature | SuperCode | OpenCode | oh-my-opencode | Gap Status |
|---------|:---------:|:--------:|:--------------:|:----------:|
| **Total Hooks** | 30+ | Plugin-based | 22 | ✅ OK |
| **Lifecycle Hooks** | 5 types | 13 types | 5 types | ⚠️ Expand |
| **Hook Registry** | Centralized | Plugin | Factory | ⚠️ Refactor |
| **Dynamic Enable/Disable** | Config | Config | Runtime | ⚠️ Enhance |

### 1.4 Permission System

| Feature | SuperCode | OpenCode | oh-my-opencode | Gap Status |
|---------|:---------:|:--------:|:--------------:|:----------:|
| **Permission Levels** | Basic | 3-level (allow/deny/ask) | Inherited | ❌ Missing |
| **Per-Tool Permissions** | ❌ | ✅ | ✅ | ❌ Missing |
| **Pattern-based Rules** | ❌ | Wildcard patterns | ❌ | ❌ Missing |
| **Per-Agent Permissions** | ❌ | ✅ | ✅ | ❌ Missing |

### 1.5 Plugin Architecture

| Feature | SuperCode | OpenCode | oh-my-opencode | Gap Status |
|---------|:---------:|:--------:|:--------------:|:----------:|
| **Plugin System** | Skills only | Full plugin SDK | Hook-based | ❌ Missing |
| **Tool Plugins** | MCP only | Native + MCP | ✅ | ⚠️ Enhance |
| **Auth Plugins** | ❌ | OAuth/API key | ❌ | ❌ Missing |
| **Config Plugins** | ❌ | ✅ | ❌ | ❌ Missing |

### 1.6 LSP Support

| Feature | SuperCode | OpenCode | oh-my-opencode | Gap Status |
|---------|:---------:|:--------:|:--------------:|:----------:|
| **LSP Integration** | Basic | Out-of-box | 11 tools | ⚠️ Enhance |
| **Hover** | ✅ | ✅ | ✅ | ✅ OK |
| **Goto Definition** | ✅ | ✅ | ✅ | ✅ OK |
| **References** | ✅ | ✅ | ✅ | ✅ OK |
| **Rename** | ✅ | ✅ | ✅ | ✅ OK |
| **Code Actions** | ❌ | ✅ | ✅ | ❌ Missing |
| **Diagnostics** | ❌ | ✅ | ✅ | ❌ Missing |
| **Workspace Symbols** | ❌ | ✅ | ✅ | ❌ Missing |

### 1.7 Session Management

| Feature | SuperCode | OpenCode | oh-my-opencode | Gap Status |
|---------|:---------:|:--------:|:--------------:|:----------:|
| **Persistence** | ✅ | ✅ | ✅ | ✅ OK |
| **Compaction** | Basic | Advanced (LLM) | Enhanced | ⚠️ Enhance |
| **Forking** | ✅ | ✅ | ✅ | ✅ OK |
| **Recovery** | Basic | Revert/Unrevert | Multi-stage | ⚠️ Enhance |
| **Sharing** | Planned | ✅ | ❌ | ❌ Missing |

### 1.8 Configuration System

| Feature | SuperCode | OpenCode | oh-my-opencode | Gap Status |
|---------|:---------:|:--------:|:--------------:|:----------:|
| **Config Layers** | 2 | 5 | 2 | ⚠️ Expand |
| **JSONC Support** | ❌ | ✅ | ✅ | ❌ Missing |
| **Environment Expansion** | Basic | Full | ✅ | ⚠️ Enhance |
| **Remote Config** | ❌ | .well-known | ❌ | ❌ Missing |
| **Config Validation** | Zod | Zod | Zod | ✅ OK |

---

## 2. 상세 Gap 분석

### 2.1 Critical Gaps (❌ Missing - 반드시 구현)

#### Gap 1: Background Agent Manager
```typescript
// oh-my-opencode 참조: src/features/background-agent/manager.ts
// 필요 기능:
- 병렬 태스크 실행
- Provider/Model별 동시성 제한
- 30분 TTL cleanup
- Session 기반 lifecycle
```

#### Gap 2: Ralph Loop
```typescript
// oh-my-opencode 참조: src/hooks/ralph-loop/
// 필요 기능:
- 완료 약속 감지까지 반복 실행
- Iteration tracking
- CLI: /ralph-loop "task" --max-iterations=10
```

#### Gap 3: Fine-grained Permission System
```typescript
// opencode 참조: packages/opencode/src/permission/
// 필요 기능:
- 3-level: allow / deny / ask
- Per-tool permissions
- Wildcard pattern matching
- Per-agent ruleset
```

#### Gap 4: Plugin Architecture
```typescript
// opencode 참조: packages/plugin/
// 필요 기능:
- Tool plugin registration
- Hook plugin registration
- Auth plugin support
- Config augmentation
```

#### Gap 5: Enhanced LSP Tools
```typescript
// oh-my-opencode 참조: src/tools/lsp/
// 추가 필요:
- codeActions.ts
- diagnostics.ts
- workspaceSymbols.ts
- documentSymbols.ts
- signatureHelp.ts
- completions.ts (enhanced)
```

### 2.2 Enhancement Gaps (⚠️ Enhance - 개선 필요)

#### Gap 6: Cent/Sisyphus Orchestrator 통합
```
현재 Cent Agent: 6-phase orchestrator
필요: Sisyphus 스타일 request classification + delegation
- 7개 요청 유형 분류
- 전문 에이전트 위임
- 결과 통합
```

#### Gap 7: Session Compaction 고도화
```
현재: 85% token 사용시 압축
필요: LLM 기반 semantic summarization
- 핵심 정보 보존
- 컨텍스트 연속성 유지
- 사용자 정의 압축 규칙
```

#### Gap 8: Configuration 계층 확장
```
현재: Project + Global (2 layers)
목표: 5 layers like opencode
1. CLI arguments
2. Project-level (supercode.json)
3. Directory-level (.supercode/)
4. Global (~/.config/supercode/)
5. Remote (.well-known/supercode)
```

#### Gap 9: Hook Lifecycle 확장
```typescript
// 추가 필요한 hooks:
- chat.params (LLM 파라미터 수정)
- permission.ask (권한 override)
- experimental.chat.messages.transform
- experimental.chat.system.transform
- experimental.session.compacting
```

---

## 3. 기능 우선순위 매트릭스

### 3.1 Impact vs Effort Matrix

```
                          HIGH IMPACT
                              │
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
    │   Ralph Loop            │   Background Agent      │
    │   Permission System     │   Plugin Architecture   │
    │                         │                         │
    │        QUICK WINS       │      BIG BETS          │
    │                         │                         │
LOW ├─────────────────────────┼─────────────────────────┤ HIGH
EFF │                         │                         │ EFFORT
ORT │   LSP Code Actions      │   Multi-client Arch    │
    │   JSONC Support         │   Remote Config        │
    │   Config Layers         │   Session Sharing      │
    │                         │                         │
    │        FILL-INS         │     LONG TERM         │
    │                         │                         │
    └─────────────────────────┼─────────────────────────┘
                              │
                          LOW IMPACT
```

### 3.2 구현 우선순위

| Priority | Feature | Impact | Effort | Phase |
|:--------:|---------|:------:|:------:|:-----:|
| P0 | Permission System | High | Medium | 1 |
| P0 | Plugin Architecture | High | High | 1 |
| P1 | Background Agent Manager | High | High | 2 |
| P1 | Ralph Loop | High | Medium | 2 |
| P1 | Enhanced LSP (6 tools) | High | Medium | 2 |
| P2 | Sisyphus Orchestrator | Medium | Medium | 3 |
| P2 | AST-Grep Integration | Medium | Medium | 3 |
| P2 | Config Layers (5) | Medium | Low | 3 |
| P3 | Session Sharing | Low | High | 4 |
| P3 | Multi-client Arch | Low | High | 4+ |

---

## 4. 의존성 그래프

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DEPENDENCY GRAPH                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Phase 1 (Foundation)                                               │
│   ┌─────────────────┐    ┌─────────────────┐                        │
│   │ Permission      │───▶│ Plugin          │                        │
│   │ System          │    │ Architecture    │                        │
│   └────────┬────────┘    └────────┬────────┘                        │
│            │                      │                                  │
│            ▼                      ▼                                  │
│   Phase 2 (Core)                                                     │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│   │ Background      │    │ Ralph Loop      │    │ LSP Tools       │ │
│   │ Agent Manager   │───▶│                 │    │ (Enhanced)      │ │
│   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘ │
│            │                      │                      │          │
│            └──────────────────────┼──────────────────────┘          │
│                                   ▼                                  │
│   Phase 3 (Advanced)                                                 │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│   │ Sisyphus        │───▶│ AST-Grep        │───▶│ Config          │ │
│   │ Orchestrator    │    │ Integration     │    │ Enhancement     │ │
│   └────────┬────────┘    └─────────────────┘    └─────────────────┘ │
│            │                                                         │
│            ▼                                                         │
│   Phase 4 (Polish)                                                   │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ .agent-skills Integration + Documentation + Testing          │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. 코드 위치 매핑

### 5.1 참조 코드 경로

| Feature | opencode 경로 | oh-my-opencode 경로 |
|---------|--------------|---------------------|
| Permission | `packages/opencode/src/permission/` | N/A |
| Plugin | `packages/plugin/src/` | `src/index.ts` (hook factory) |
| Background | N/A | `src/features/background-agent/` |
| Ralph Loop | N/A | `src/hooks/ralph-loop/` |
| LSP Tools | `packages/opencode/src/tool/` | `src/tools/lsp/` |
| Config | `packages/opencode/src/config/` | `src/config/` |
| Session | `packages/opencode/src/session/` | N/A |

### 5.2 SuperCode 대상 경로

| Feature | 신규/수정 대상 경로 |
|---------|---------------------|
| Permission | `src/core/permission/` (신규) |
| Plugin | `src/plugin/` (확장) |
| Background | `src/features/background-agent/` (신규) |
| Ralph Loop | `src/core/hooks/ralph-loop/` (신규) |
| LSP Tools | `src/core/tools/lsp/` (확장) |
| Config | `src/config/` (수정) |

---

## 6. 멀티 에이전트 워크플로우 매핑

### 각 Phase별 에이전트 역할

```yaml
# Phase 1: Foundation
agents:
  claude:
    role: "계획 수립, 아키텍처 설계, 코드 생성"
    skills: [code-refactoring, api-design]
  gemini:
    role: "기존 코드 분석, 의존성 파악"
    command: "ask-gemini '@supercode/src/core @opencode/packages/opencode 구조 비교'"
  codex:
    role: "빌드 및 타입체크"
    command: "shell 'bun run typecheck && bun run build'"

# Phase 2: Core Features
agents:
  claude:
    role: "Background Agent Manager, Ralph Loop 구현"
    skills: [backend-testing, debugging]
  gemini:
    role: "oh-my-opencode 참조 코드 심층 분석"
    command: "ask-gemini '@oh-my-opencode/src/ 핵심 패턴 추출'"
  codex:
    role: "테스트 실행, 통합 검증"
    command: "shell 'bun test'"

# Phase 3: Advanced
agents:
  claude:
    role: "Sisyphus 고도화, AST-Grep 통합"
    skills: [code-review, performance-optimization]
  gemini:
    role: "전체 아키텍처 리뷰"
  codex:
    role: "E2E 테스트 실행"

# Phase 4: Polish
agents:
  claude:
    role: "문서화, .agent-skills 통합"
    skills: [technical-writing, api-documentation]
  codex:
    role: "최종 빌드 및 배포 검증"
```

---

## 다음 단계

→ [02-PHASE1-FOUNDATION.md](./02-PHASE1-FOUNDATION.md) - Phase 1 상세 구현 계획
