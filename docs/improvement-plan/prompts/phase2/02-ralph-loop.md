# Phase 2 Prompt 2: Ralph Loop 구현

## 사전 준비

### Gemini 분석 (먼저 실행)
```
ask-gemini "@oh-my-opencode/src/hooks/ralph-loop/ 전체 분석.
- RalphLoopExecutor 구조
- Completion detection 로직
- Iteration 관리
- CLI 통합 방식
핵심 패턴을 추출해줘."
```

---

## 실행 프롬프트

### 프롬프트 시작

SuperCode에 Ralph Loop (자율 반복 루프)를 구현해주세요.

**참조 프로젝트**:
- `/Users/supercent/Documents/Github/oh-my-opencode/src/hooks/ralph-loop/`
- `/Users/supercent/Documents/Github/supercode/` (대상 프로젝트)

**구현 위치**: `src/core/hooks/ralph-loop/`

**구현할 파일들**:

1. **src/core/hooks/ralph-loop/types.ts**
```typescript
export interface RalphLoopConfig {
  maxIterations: number;       // Default: 10
  timeoutMs: number;           // Default: 30 minutes
  completionPatterns: string[];
  pauseOnError: boolean;
}

export interface RalphLoopState {
  sessionId: string;
  taskPrompt: string;
  currentIteration: number;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'timeout';
  history: RalphIteration[];
  startedAt: Date;
}

export interface RalphIteration {
  iteration: number;
  prompt: string;
  response: string;
  toolCalls: ToolCall[];
  completionDetected: boolean;
  durationMs: number;
}

export type RalphCompletionPromise =
  | 'task_complete'
  | 'all_tests_pass'
  | 'no_more_changes'
  | 'user_satisfied'
  | 'manual_stop';
```

2. **src/core/hooks/ralph-loop/detector.ts**
- CompletionDetector 클래스
- Pattern matching (regex)
- Test success 감지
- No changes 감지
- 커스텀 completion 조건 지원

3. **src/core/hooks/ralph-loop/executor.ts**
- RalphLoopExecutor 클래스
- start(sessionId, taskPrompt): Promise<RalphLoopState>
- stop(): void
- shouldContinue() 로직
- buildIterationPrompt() - iteration별 프롬프트 생성

4. **src/core/hooks/ralph-loop/cli.ts**
- CLI 명령 등록: `/ralph-loop` 또는 `rl`
- Options: --max-iterations, --timeout
- 진행 상황 표시

5. **src/core/hooks/ralph-loop/index.ts**
- Hook 등록
- Export

**기본 Completion Patterns**:
```typescript
const DEFAULT_COMPLETION_PATTERNS = [
  'TASK COMPLETE',
  'task complete',
  'All tests pass',
  'all tests pass',
  'No more changes needed',
  'Implementation complete',
  '작업 완료',
  '모든 테스트 통과',
];
```

**요구사항**:
- Max iterations 도달 시 timeout
- AbortController로 취소 지원
- 각 iteration 히스토리 기록
- Background Agent Manager와 통합 (선택적)
- Hook으로 등록하여 `/ralph-loop` 명령으로 실행

**CLI 사용 예시**:
```bash
supercode "/ralph-loop Fix all type errors in src/"
supercode "/rl Implement the feature" --max-iterations 15
```

기존 supercode 코드 스타일을 따라주세요.

### 프롬프트 끝

---

## 검증 명령

```bash
shell "cd /Users/supercent/Documents/Github/supercode && bun run typecheck"
shell "cd /Users/supercent/Documents/Github/supercode && bun test --grep ralph"
```
