# Phase 1 Prompt 1: Permission System 구현

## 사전 준비

### Gemini 분석 (먼저 실행)
```
ask-gemini "@opencode/packages/opencode/src/permission/ Permission 시스템 전체 분석.
- 타입 정의
- Rule evaluation 로직
- Pattern matching 방식
- Agent별 permission 적용 방식
핵심 패턴과 구현 방식을 추출해줘."
```

---

## 실행 프롬프트

다음 내용을 Claude에게 전달하여 구현을 시작합니다:

---

### 프롬프트 시작

SuperCode에 Permission System을 구현해주세요.

**참조 프로젝트**:
- `/Users/supercent/Documents/Github/opencode/packages/opencode/src/permission/`
- `/Users/supercent/Documents/Github/supercode/` (대상 프로젝트)

**구현 위치**: `src/core/permission/`

**구현할 파일들**:

1. **src/core/permission/types.ts** - 타입 정의
```typescript
export type PermissionDecision = 'allow' | 'deny' | 'ask';

export interface PermissionRule {
  tool: string;
  pattern?: string;
  decision: PermissionDecision;
  reason?: string;
}

export interface PermissionRuleset {
  name: string;
  rules: PermissionRule[];
  extends?: string;
}

export interface AgentPermissions {
  agentId: string;
  ruleset: PermissionRuleset;
  overrides?: PermissionRule[];
}

export interface PermissionRequest {
  tool: string;
  resource?: string;
  agentId: string;
  context?: Record<string, unknown>;
}

export interface PermissionResult {
  decision: PermissionDecision;
  rule?: PermissionRule;
  reason?: string;
}

export interface PermissionConfig {
  rules?: PermissionRule[];
  agents?: Record<string, AgentPermissions>;
  defaultDecision?: PermissionDecision;
}
```

2. **src/core/permission/patterns.ts** - 패턴 매칭
- minimatch를 사용한 glob 패턴 매칭
- 정확한 매칭, 와일드카드, 경로 glob 지원

3. **src/core/permission/rules.ts** - 규칙 평가 엔진
- First match wins 전략
- 규칙 우선순위 처리
- extends 상속 처리

4. **src/core/permission/defaults.ts** - 기본 규칙
- 민감 파일 (*.env, credentials) ask
- 읽기 작업 allow
- bash ask
- plan agent readonly ruleset

5. **src/core/permission/manager.ts** - PermissionManager 클래스
- check(request): Promise<PermissionResult>
- registerAskHandler
- addRule / removeRule
- Session-scoped caching

6. **src/core/permission/index.ts** - Exports

**요구사항**:
- Zod validation 사용
- 기존 src/core/tools/ 시스템과 호환
- 비동기 ask handler 지원
- 명확한 에러 메시지

**테스트 작성 위치**: `tests/unit/permission/`

기존 supercode 코드 스타일을 따라주세요. 먼저 types.ts부터 시작해서 순서대로 구현해주세요.

### 프롬프트 끝

---

## 검증 명령

```bash
# Codex로 검증
shell "cd /Users/supercent/Documents/Github/supercode && bun run typecheck"
shell "cd /Users/supercent/Documents/Github/supercode && bun test --grep permission"
```
