# Phase 2: 훅 시스템 개선

## 목표

기존 2개 훅에서 Oh-My-OpenCode 수준의 22개 정적 훅 시스템으로 확장

---

## 현재 상태

### SuperCode 현재 훅
- `logging.ts` - 로깅 훅
- `todo-continuation.ts` - Todo 연속 훅
- 총 2개, 이벤트 트리거 1개만 활성

### Oh-My-OpenCode 훅 시스템
- 26개 정적 훅
- ~13,600줄 코드
- 세션 복구, 컨텍스트 윈도우 관리, 에러 복구 등

---

## 작업 목록

### 2.1 핵심 인프라 개선
- [ ] `src/core/hooks/types.ts` - 통합 훅 타입 시스템
- [ ] `src/core/hooks/registry.ts` - 향상된 훅 레지스트리
- [ ] `src/core/hooks/events.ts` - 이벤트 트리거 시스템

### 2.2 세션 복구 훅 (Priority 1)
- [ ] `src/core/hooks/session-recovery/index.ts` - 메인 복구 로직
- [ ] `src/core/hooks/session-recovery/types.ts` - 복구 타입
- [ ] `src/core/hooks/session-recovery/storage.ts` - 상태 저장
- [ ] `src/core/hooks/session-recovery/handlers.ts` - 에러 핸들러

### 2.3 컨텍스트 윈도우 훅 (Priority 2)
- [ ] `src/core/hooks/context-window-limit-recovery/index.ts`
- [ ] `src/core/hooks/context-window-limit-recovery/types.ts`
- [ ] `src/core/hooks/context-window-limit-recovery/pruning.ts`
- [ ] `src/core/hooks/context-window-monitor.ts`
- [ ] `src/core/hooks/preemptive-compaction/index.ts`

### 2.4 도구 관련 훅 (Priority 3)
- [ ] `src/core/hooks/tool-output-truncator.ts`
- [ ] `src/core/hooks/thinking-block-validator.ts`
- [ ] `src/core/hooks/edit-error-recovery/index.ts`

### 2.5 콘텐츠 주입 훅 (Priority 4)
- [ ] `src/core/hooks/rules-injector/index.ts`
- [ ] `src/core/hooks/directory-agents-injector.ts`
- [ ] `src/core/hooks/directory-readme-injector.ts`

### 2.6 세션 관리 훅 (Priority 5)
- [ ] `src/core/hooks/session-notification.ts`
- [ ] `src/core/hooks/empty-message-sanitizer.ts`
- [ ] `src/core/hooks/background-notification.ts`

### 2.7 특수 모드 훅 (Priority 6)
- [ ] `src/core/hooks/think-mode/index.ts`
- [ ] `src/core/hooks/keyword-detector.ts`
- [ ] `src/core/hooks/auto-slash-command.ts`

### 2.8 통합 및 초기화
- [ ] `src/core/hooks/index.ts` - 모든 훅 Export
- [ ] 기존 코드에 이벤트 트리거 추가

---

## 훅 우선순위

| 우선순위 | 훅 | 설명 |
|---------|-----|------|
| 1 | session-recovery | 세션 에러 복구 |
| 1 | context-window-limit-recovery | 토큰 한도 복구 |
| 2 | context-window-monitor | 사용량 모니터링 |
| 2 | tool-output-truncator | 출력 자르기 |
| 3 | thinking-block-validator | 사고 블록 검증 |
| 3 | edit-error-recovery | 편집 에러 복구 |
| 4 | preemptive-compaction | 사전 압축 |
| 4 | rules-injector | 규칙 주입 |
| 5 | session-notification | 알림 |
| 6 | think-mode | 사고 모드 |

---

## 훅 이벤트 타입

```typescript
export type HookEventType =
  // 세션 라이프사이클
  | "session.start"
  | "session.end"
  | "session.idle"
  | "session.error"
  | "session.compacting"

  // 메시지 라이프사이클
  | "message.before"
  | "message.after"
  | "message.updated"
  | "message.error"

  // 도구 라이프사이클
  | "tool.before"
  | "tool.after"
  | "tool.error"

  // 에이전트 라이프사이클
  | "agent.spawn"
  | "agent.complete"

  // 특수 이벤트
  | "context.overflow"
  | "user.prompt";
```

---

## 검증 방법

```bash
# 훅 시스템 테스트
bun test tests/hooks/

# 세션 복구 테스트
bun test tests/hooks/session-recovery.test.ts

# 컨텍스트 윈도우 테스트
bun test tests/hooks/context-window.test.ts
```

---

## 참조

- `/Users/supercent/Documents/Github/oh-my-opencode/src/hooks/`
- Oh-My-OpenCode 훅 총 26개, ~13,600줄
