# Phase 4: 에이전트 시스템 개선 - 완료

## 개요
Oh-My-OpenCode의 Sisyphus 패턴을 SuperCode에 적용.
메타데이터 기반 위임 시스템과 동적 프롬프트 생성.

## 완료된 작업

### 4.1 에이전트 타입 확장 (`src/services/agents/types.ts`)
- `AgentCategory` 타입 추가 (orchestrator, exploration, specialist, advisor, utility)
- `AgentCost` 타입 추가 (FREE, CHEAP, EXPENSIVE)
- `DelegationTrigger` 인터페이스 (domain, trigger)
- `AgentPromptMetadata` 인터페이스 (category, cost, triggers, useWhen, avoidWhen)
- `AgentConfig` 인터페이스 (mode, model, temperature, prompt)
- `AgentFactory` 타입
- `RequestType` 확장 (SKILL_MATCH, GITHUB_WORK, AMBIGUOUS)
- `AgentName` 확장 (librarian, frontend, multimodal)

### 4.2 Sisyphus 프롬프트 빌더 (`src/services/agents/sisyphus/`)
- `prompt-builder.ts`: 동적 프롬프트 생성
  - `buildKeyTriggersSection()` - Phase 0 트리거
  - `buildToolSelectionTable()` - 도구 선택 우선순위
  - `buildDelegationTable()` - 위임 테이블
  - `buildExplorationSection()` - 탐색 에이전트 섹션
  - `buildSpecialistSection()` - 전문가 에이전트 섹션
  - `buildAdvisorSection()` - 자문 에이전트 섹션
  - `buildHardBlocksSection()` - 금지 규칙
  - `buildAntiPatternsSection()` - 안티 패턴
  - `buildOrchestratorPrompt()` - 전체 프롬프트 생성
  - `collectAgentMetadata()` - 메타데이터 수집

### 4.3 새 에이전트 3개
#### Librarian (`src/services/agents/librarian.ts`)
- 외부 리서치 전문가
- GitHub, 문서, 웹 검색
- Model: gemini-2.5-flash
- Category: exploration, Cost: CHEAP

#### Frontend (`src/services/agents/frontend.ts`)
- UI/UX 전문가
- 시각적 변경, 스타일링
- Model: gemini-2.5-pro
- Category: specialist, Cost: CHEAP

#### Multimodal (`src/services/agents/multimodal.ts`)
- PDF/이미지 분석 전문가
- 시각적 콘텐츠 해석
- Model: gemini-2.5-flash
- Category: utility, Cost: CHEAP

### 4.4 기존 에이전트 메타데이터 추가
- `ExplorerAgent`: EXPLORER_METADATA 추가
- `AnalystAgent`: ANALYST_METADATA 추가
- `DocWriterAgent`: DOC_WRITER_METADATA 추가

## 파일 목록

### 신규 생성
```
src/services/agents/sisyphus/
├── index.ts           - 모듈 내보내기
└── prompt-builder.ts  - 동적 프롬프트 빌더

src/services/agents/
├── librarian.ts       - 외부 리서치 에이전트
├── frontend.ts        - UI/UX 전문가 에이전트
└── multimodal.ts      - PDF/이미지 분석 에이전트
```

### 수정됨
```
src/services/agents/types.ts     - 타입 확장
src/services/agents/explorer.ts  - 메타데이터 추가
src/services/agents/analyst.ts   - 메타데이터 추가
src/services/agents/doc-writer.ts - 메타데이터 추가
src/services/agents/index.ts     - 내보내기 업데이트
```

## 에이전트 총계
- 기존: 6개 (coin, analyst, executor, code_reviewer, doc_writer, explorer)
- 신규: 3개 (librarian, frontend, multimodal)
- **총합: 9개 에이전트**

## 위임 시스템

### 카테고리별 에이전트
| Category | Agents | Purpose |
|----------|--------|---------|
| Orchestrator | coin | 마스터 조율자 |
| Exploration | explorer, librarian | 내부/외부 검색 |
| Specialist | frontend, doc_writer | 도메인 전문가 |
| Advisor | analyst | 전략적 자문 |
| Utility | executor, code_reviewer, multimodal | 유틸리티 |

### 비용 분류
| Cost | Agents |
|------|--------|
| FREE | explorer |
| CHEAP | librarian, frontend, doc_writer, multimodal |
| EXPENSIVE | analyst |

## 검증
```bash
# TypeScript 검사 통과
bun tsc --noEmit
```

## 완료 일시
2026-01-12
