# Phase 2 Prompt 1: Background Agent Manager 구현

## 사전 준비

### Gemini 분석 (먼저 실행)
```
ask-gemini "@oh-my-opencode/src/features/background-agent/ 전체 분석.
- BackgroundManager 클래스 구조
- Task lifecycle
- Concurrency 제어 방식
- Cleanup 정책
핵심 구현 패턴을 추출해줘."
```

---

## 실행 프롬프트

### 프롬프트 시작

SuperCode에 Background Agent Manager를 구현해주세요.

**참조 프로젝트**:
- `/Users/supercent/Documents/Github/oh-my-opencode/src/features/background-agent/manager.ts`
- `/Users/supercent/Documents/Github/supercode/` (대상 프로젝트)

**구현 위치**: `src/features/background-agent/`

**구현할 파일들**:

1. **src/features/background-agent/types.ts**
```typescript
export interface BackgroundTask {
  id: string;
  sessionId: string;
  agentId: string;
  provider: string;
  model: string;
  prompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: string;
  error?: Error;
}

export interface ConcurrencyConfig {
  maxConcurrent: number;
  perProvider: Record<string, number>;
  perModel: Record<string, number>;
}

export interface BackgroundManagerConfig {
  concurrency: ConcurrencyConfig;
  ttlMs: number;              // Default: 30 minutes
  cleanupIntervalMs: number;  // Default: 5 minutes
}

export interface TaskOptions {
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
  onProgress?: (progress: number) => void;
  onComplete?: (result: string) => void;
  onError?: (error: Error) => void;
}
```

2. **src/features/background-agent/concurrency.ts**
- ConcurrencyLimiter 클래스
- acquire/release 패턴
- Key별 동시성 제한 (provider, model)

3. **src/features/background-agent/manager.ts**
- BackgroundManager 클래스
- submit(task): Promise<string> - task ID 반환
- cancel(taskId): Promise<boolean>
- getStatus(taskId): BackgroundTask | undefined
- getBySession(sessionId): BackgroundTask[]
- Priority queue 지원
- Cleanup daemon

4. **src/features/background-agent/cleanup.ts**
- TTL 기반 자동 정리
- Session 종료 시 정리

5. **src/features/background-agent/index.ts**

**요구사항**:
- Session 기반 lifecycle
- 30분 TTL
- Provider/Model별 동시성 제한
- Graceful shutdown 지원
- 기존 Agent 시스템과 통합

**설정 예시** (supercode.json):
```jsonc
{
  "backgroundAgent": {
    "maxConcurrent": 5,
    "perProvider": {
      "anthropic": 3,
      "openai": 2
    },
    "ttlMs": 1800000
  }
}
```

기존 supercode 코드 스타일을 따라주세요.

### 프롬프트 끝

---

## 검증 명령

```bash
shell "cd /Users/supercent/Documents/Github/supercode && bun run typecheck"
shell "cd /Users/supercent/Documents/Github/supercode && bun test --grep background"
```
