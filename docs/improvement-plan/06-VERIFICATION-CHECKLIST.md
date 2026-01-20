# 5회 검증 체크리스트

> **목적**: 계획의 정밀도와 실행 가능성을 5회 반복 검증하여 오류 최소화

---

## 검증 프로세스 개요

```
┌────────────────────────────────────────────────────────────────────┐
│  검증 1 → 검증 2 → 검증 3 → 검증 4 → 검증 5                        │
│    ↓        ↓        ↓        ↓        ↓                          │
│  아키텍처  기능명세   구현계획   통합검토   최종완결                │
│    ↓        ↓        ↓        ↓        ↓                          │
│  수정반영  수정반영   수정반영   수정반영   최종확정                │
└────────────────────────────────────────────────────────────────────┘
```

---

## 검증 1: 아키텍처 검토

### 목적
계획된 구조가 기존 코드와 호환되는지 확인

### 검증 항목

#### 1.1 파일 구조 호환성
- [ ] 신규 디렉토리가 기존 구조와 일관성 유지
- [ ] 모듈 경로가 tsconfig.json paths와 호환
- [ ] package.json exports 필드 호환

```bash
# 검증 명령 (Codex 실행)
shell "cd /Users/supercent/Documents/Github/supercode && \
  find src -type d | head -50"
```

#### 1.2 Import/Export 경로 검증
- [ ] 순환 의존성 없음
- [ ] 상대 경로 vs 절대 경로 일관성
- [ ] 신규 모듈의 barrel export 정의

```bash
# 검증 명령
shell "cd /Users/supercent/Documents/Github/supercode && \
  npx madge --circular src/"
```

#### 1.3 타입 정합성
- [ ] 기존 타입과 신규 타입 호환
- [ ] Generic 타입 올바른 사용
- [ ] Union/Intersection 타입 완전성

```bash
# 검증 명령
shell "cd /Users/supercent/Documents/Github/supercode && \
  bun run typecheck"
```

### 검증 1 결과 기록

| 항목 | 상태 | 비고 |
|------|------|------|
| 파일 구조 호환성 | ⬜ | |
| Import/Export 경로 | ⬜ | |
| 타입 정합성 | ⬜ | |

### 수정 필요 항목
```
1. [수정사항 기록]
2.
3.
```

---

## 검증 2: 기능 명세 검토

### 목적
각 기능의 입출력 인터페이스 정의 완료 및 의존성 확인

### 검증 항목

#### 2.1 Permission System 명세
- [ ] PermissionRule 타입 완전성
- [ ] PermissionManager 메서드 시그니처 명확
- [ ] Default rules 포괄성

```typescript
// 검증: 필요한 모든 케이스 커버?
interface PermissionRule {
  tool: string;      // ✅ 모든 tool 이름 지원?
  pattern?: string;  // ✅ glob 패턴 완전 지원?
  decision: PermissionDecision; // ✅ 3가지 decision 충분?
  reason?: string;   // ✅ 사용자 피드백용
}
```

#### 2.2 Plugin Architecture 명세
- [ ] Plugin interface 확장 가능
- [ ] PluginContext 필요 정보 포함
- [ ] Hook registration 완전성

```typescript
// 검증: 플러그인이 필요한 모든 것에 접근 가능?
interface PluginContext {
  client: SuperCodeClient;  // ✅
  project: ProjectMetadata; // ✅
  directory: string;        // ✅
  serverUrl: string;        // ✅
  shell: ShellInterface;    // ✅
  config: PluginConfig;     // ✅
  // 누락된 것?
}
```

#### 2.3 Background Agent Manager 명세
- [ ] Task lifecycle 완전 정의
- [ ] Concurrency config 충분
- [ ] Cleanup 정책 명확

#### 2.4 Ralph Loop 명세
- [ ] Completion detection 패턴 충분
- [ ] Iteration 제어 옵션 완전
- [ ] Error handling 정책 명확

#### 2.5 LSP Tools 명세
- [ ] 11개 도구 모두 args schema 정의
- [ ] 반환값 포맷 일관성
- [ ] Error 케이스 처리

### 검증 2 결과 기록

| 기능 | 입력 정의 | 출력 정의 | 에러 처리 |
|------|----------|----------|----------|
| Permission | ⬜ | ⬜ | ⬜ |
| Plugin | ⬜ | ⬜ | ⬜ |
| Background Agent | ⬜ | ⬜ | ⬜ |
| Ralph Loop | ⬜ | ⬜ | ⬜ |
| LSP Tools | ⬜ | ⬜ | ⬜ |

### 의존성 그래프 검증

```
Permission System
  └─ minimatch (glob matching) ✅ 이미 의존성에 있음?
  └─ zod (validation) ✅

Plugin Architecture
  └─ Permission System (Phase 1에서 먼저 완료 필요)

Background Agent Manager
  └─ Session Manager (기존)
  └─ Agent System (기존)

Ralph Loop
  └─ Background Agent Manager (같은 Phase)
  └─ Hook System (기존)
```

### 수정 필요 항목
```
1.
2.
3.
```

---

## 검증 3: 구현 계획 검토

### 목적
실제 코드 구현 프롬프트의 완성도 및 edge case 포함 확인

### 검증 항목

#### 3.1 코드 템플릿 완성도
- [ ] 모든 import 문 명시
- [ ] 타입 정의 완전
- [ ] 에러 클래스 정의
- [ ] 유틸리티 함수 포함

#### 3.2 Edge Case 처리

**Permission System Edge Cases:**
- [ ] 빈 resource (resource가 없는 tool 호출)
- [ ] 중복 rule 충돌 해결 로직
- [ ] Agent ID가 없는 경우

**Plugin Architecture Edge Cases:**
- [ ] Plugin load 실패 시 fallback
- [ ] Circular plugin dependency
- [ ] Plugin unload 시 cleanup

**Background Agent Edge Cases:**
- [ ] Task 취소 중 완료되는 경우
- [ ] 모든 slot이 차있을 때 새 task
- [ ] Session 종료 시 running task

**Ralph Loop Edge Cases:**
- [ ] 첫 iteration에서 완료 감지
- [ ] Tool call 없이 응답만 있는 경우
- [ ] LLM 응답 실패

#### 3.3 에러 처리 일관성
- [ ] 커스텀 Error 클래스 정의
- [ ] 에러 메시지 사용자 친화적
- [ ] Stack trace 보존

```typescript
// 검증: 에러 클래스 완전성
export class PermissionDeniedError extends Error { }
export class PluginLoadError extends Error { }
export class TaskTimeoutError extends Error { }
export class RalphLoopAbortedError extends Error { }
// 누락된 에러 타입?
```

### 검증 3 결과 기록

| 컴포넌트 | 템플릿 완성도 | Edge Case | 에러 처리 |
|----------|-------------|-----------|----------|
| Permission | ⬜ | ⬜ | ⬜ |
| Plugin | ⬜ | ⬜ | ⬜ |
| Background Agent | ⬜ | ⬜ | ⬜ |
| Ralph Loop | ⬜ | ⬜ | ⬜ |
| LSP Tools | ⬜ | ⬜ | ⬜ |
| Sisyphus | ⬜ | ⬜ | ⬜ |
| AST-Grep | ⬜ | ⬜ | ⬜ |
| Config Layers | ⬜ | ⬜ | ⬜ |

### 수정 필요 항목
```
1.
2.
3.
```

---

## 검증 4: 통합 검토

### 목적
Phase 간 의존성 및 연결점 검증, 기존 기능 regression 방지

### 검증 항목

#### 4.1 Phase 간 의존성

```
Phase 1 (Foundation)
├── Permission System → Phase 2의 모든 기능에서 사용
└── Plugin Architecture → Phase 2 hooks 확장 시 필요

Phase 2 (Core)
├── Background Agent → Phase 3 Sisyphus에서 사용
├── Ralph Loop → 독립적
└── LSP Tools → Phase 3 AST-Grep과 병행 사용 가능

Phase 3 (Advanced)
├── Sisyphus → Background Agent 필수
├── AST-Grep → 독립적
└── Config Layers → 독립적

Phase 4 (Polish)
└── 모든 Phase 완료 후 통합
```

- [ ] Phase 1 완료 없이 Phase 2 시작 불가 확인
- [ ] Phase 2 Background Agent 없이 Phase 3 Sisyphus 불가 확인

#### 4.2 기존 기능 Regression 검증

**기존 Hook System과의 호환:**
- [ ] 기존 30+ hooks 모두 동작
- [ ] 새 hooks와 기존 hooks 공존
- [ ] Hook priority 충돌 없음

**기존 Agent System과의 호환:**
- [ ] Cent agent 정상 동작
- [ ] 기존 agent 호출 방식 유지
- [ ] Agent context 공유 정상

**기존 Tool System과의 호환:**
- [ ] 기존 tools에 permission wrapper 적용 가능
- [ ] Tool registry 변경 없음
- [ ] MCP tools 정상 동작

**기존 Session System과의 호환:**
- [ ] Session 생성/저장/로드 정상
- [ ] Session forking 정상
- [ ] 새 compaction과 기존 방식 호환

### 검증 4 결과 기록

| 통합 영역 | 의존성 확인 | Regression 없음 |
|----------|------------|-----------------|
| Phase 1→2 | ⬜ | ⬜ |
| Phase 2→3 | ⬜ | ⬜ |
| Phase 3→4 | ⬜ | ⬜ |
| Hook System | ⬜ | ⬜ |
| Agent System | ⬜ | ⬜ |
| Tool System | ⬜ | ⬜ |
| Session System | ⬜ | ⬜ |

### 수정 필요 항목
```
1.
2.
3.
```

---

## 검증 5: 최종 완결성 검토

### 목적
모든 문서의 일관성 및 즉시 실행 가능한 프롬프트 완성도 확인

### 검증 항목

#### 5.1 문서 일관성

- [ ] 모든 파일 경로가 실제와 일치
- [ ] 타입 이름이 문서 간 일관
- [ ] 코드 예시가 실제 실행 가능
- [ ] TODO/FIXME 주석 없음

```bash
# 검증 명령
shell "grep -r 'TODO\|FIXME' \
  /Users/supercent/Documents/Github/supercode/docs/improvement-plan/"
```

#### 5.2 프롬프트 실행 가능성

**Phase 1 프롬프트 검증:**
- [ ] 필요한 모든 import 명시
- [ ] 의존 패키지 설치 명령 포함
- [ ] 파일 생성 순서 명확

**Phase 2 프롬프트 검증:**
- [ ] Phase 1 결과물 참조 정확
- [ ] 테스트 명령 포함
- [ ] 에러 발생 시 대응 포함

**Phase 3 프롬프트 검증:**
- [ ] Phase 1, 2 결과물 참조 정확
- [ ] 복잡한 로직 단계별 분리
- [ ] 검증 단계 포함

**Phase 4 프롬프트 검증:**
- [ ] 통합 테스트 명령 포함
- [ ] 문서화 자동 생성 가능
- [ ] 최종 검증 체크리스트 연동

#### 5.3 Gemini 분석 프롬프트 검증

```
# 각 Phase에서 사용할 Gemini 분석 프롬프트

Phase 1:
ask-gemini "@opencode/packages/opencode/src/permission/ 구조 분석"
→ 결과를 받아 Claude가 구현에 활용 가능?

Phase 2:
ask-gemini "@oh-my-opencode/src/features/background-agent/ 패턴 추출"
→ 결과가 구현에 충분한 정보 제공?

Phase 3:
ask-gemini "@oh-my-opencode/src/agents/sisyphus.ts 전체 분석"
→ 504줄 코드의 핵심 로직 파악 가능?
```

- [ ] 모든 Gemini 프롬프트가 구체적
- [ ] 파일 경로 정확
- [ ] 기대 결과 명확

#### 5.4 Codex 실행 명령 검증

```bash
# 각 Phase에서 사용할 Codex 명령

Phase 1:
shell "bun run typecheck"
shell "bun test --grep 'permission'"

Phase 2:
shell "bun test --grep 'background-agent\|ralph-loop'"
shell "bun run build"

Phase 3:
shell "bun test"
shell "bun run lint"

Phase 4:
shell "bun test:e2e"
shell "bun run build && bun run typecheck"
```

- [ ] 모든 명령이 supercode 프로젝트에서 유효
- [ ] 테스트 grep 패턴 정확
- [ ] 빌드 명령 올바름

### 검증 5 결과 기록

| 검증 항목 | 상태 | 비고 |
|----------|------|------|
| 문서 일관성 | ⬜ | |
| Phase 1 프롬프트 | ⬜ | |
| Phase 2 프롬프트 | ⬜ | |
| Phase 3 프롬프트 | ⬜ | |
| Phase 4 프롬프트 | ⬜ | |
| Gemini 프롬프트 | ⬜ | |
| Codex 명령 | ⬜ | |

---

## 최종 검증 결과 요약

### 검증 완료 상태

| 검증 단계 | 완료 | 수정 항목 수 | 재검증 필요 |
|----------|------|------------|------------|
| 검증 1: 아키텍처 | ⬜ | | ⬜ |
| 검증 2: 기능 명세 | ⬜ | | ⬜ |
| 검증 3: 구현 계획 | ⬜ | | ⬜ |
| 검증 4: 통합 | ⬜ | | ⬜ |
| 검증 5: 완결성 | ⬜ | | ⬜ |

### 최종 승인

- [ ] 모든 검증 완료
- [ ] 모든 수정 사항 반영
- [ ] 실행 준비 완료

**검증 완료일**: ________________

**검증자**: ________________

---

## 다음 단계

검증 완료 후:
→ [07-AGENT-SKILLS-UPDATE.md](./07-AGENT-SKILLS-UPDATE.md) - .agent-skills 업데이트
→ [prompts/](./prompts/) - 실행 프롬프트로 구현 시작
