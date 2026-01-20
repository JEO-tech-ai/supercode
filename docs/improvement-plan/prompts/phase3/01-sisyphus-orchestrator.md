# Phase 3 Prompt 1: Sisyphus Orchestrator 고도화

## 사전 준비

### Gemini 분석 (먼저 실행)
```
ask-gemini "@oh-my-opencode/src/agents/sisyphus.ts 전체 분석 (504줄).
- Request classification 7가지 유형
- Agent delegation 로직
- Result integration 방식
- Context sharing 메커니즘
핵심 패턴과 알고리즘을 상세히 추출해줘."
```

---

## 실행 프롬프트

### 프롬프트 시작

SuperCode의 Cent Agent를 Sisyphus 스타일로 고도화해주세요.

**참조 프로젝트**:
- `/Users/supercent/Documents/Github/oh-my-opencode/src/agents/sisyphus.ts`
- `/Users/supercent/Documents/Github/supercode/src/agents/cent/` (기존)

**구현 위치**: `src/agents/sisyphus/`

**구현할 파일들**:

1. **src/agents/sisyphus/types.ts**
```typescript
export type RequestType =
  | 'code_generation'
  | 'code_modification'
  | 'bug_fix'
  | 'code_review'
  | 'research'
  | 'documentation'
  | 'infrastructure';

export interface ClassificationResult {
  type: RequestType;
  confidence: number;
  suggestedAgents: string[];
  context: {
    keywords: string[];
    entities: string[];
    scope: 'file' | 'module' | 'project';
  };
}

export interface DelegationPlan {
  primary: AgentAssignment;
  parallel: AgentAssignment[];
  sequential: AgentAssignment[];
  contextSharing: ContextSharingConfig;
}

export interface AgentAssignment {
  agentId: string;
  task: string;
  priority: number;
  dependencies: string[];
  timeout?: number;
}
```

2. **src/agents/sisyphus/classifier.ts**
- RequestClassifier 클래스
- Keyword-based fast classification
- LLM-based classification (confidence < 0.8일 때)
- 7가지 유형 분류
- 적합 agent 추천

3. **src/agents/sisyphus/delegator.ts**
- AgentDelegator 클래스
- createPlan(classification, prompt): DelegationPlan
- execute(plan): DelegationResult
- Background Agent Manager 통합
- Parallel vs Sequential 전략

4. **src/agents/sisyphus/integrator.ts**
- ResultIntegrator 클래스
- integrateResearch(): 연구 결과 통합
- integrateReview(): 코드 리뷰 통합
- integrateGeneric(): 일반 결과 통합
- Deduplication 및 ranking

5. **src/agents/sisyphus/index.ts**
- SisyphusOrchestrator 클래스
- 기존 Cent와 호환 인터페이스
- execute(prompt): Promise<Result>

**Request Type → Agent 매핑**:
```typescript
const AGENT_MAPPING: Record<RequestType, string[]> = {
  code_generation: ['frontend', 'oracle'],
  code_modification: ['explorer', 'oracle'],
  bug_fix: ['explorer', 'analyst'],
  code_review: ['analyst', 'oracle'],
  research: ['librarian', 'explorer'],
  documentation: ['docwriter', 'librarian'],
  infrastructure: ['executor', 'analyst'],
};
```

**요구사항**:
- 기존 Cent Agent 인터페이스 호환
- Background Agent Manager (Phase 2) 활용
- 병렬 실행 지원
- Context sharing between agents
- 결과 품질 향상

기존 supercode 코드 스타일을 따라주세요.

### 프롬프트 끝

---

## 검증 명령

```bash
shell "cd /Users/supercent/Documents/Github/supercode && bun run typecheck"
shell "cd /Users/supercent/Documents/Github/supercode && bun test --grep sisyphus"
```
