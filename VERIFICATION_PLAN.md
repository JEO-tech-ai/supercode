# SuperCode vs OpenCode 검증 계획

> Ultrathink Multi-Agent Workflow 기반 구조 검증

## 검증 대상

| 프로젝트 | 경로 | 규모 |
|----------|------|------|
| supercode | /Users/supercent/Documents/Github/supercode | 49,000+ LOC |
| oh-my-opencode | /Users/supercent/Documents/Github/oh-my-opencode | 365 files |

---

## Priority 1: Critical - 에이전트 아키텍처

### 검증 항목
- [ ] 오케스트레이터 에이전트 비교 (coin vs Sisyphus)
- [ ] 에이전트 레지스트리 구조
- [ ] 에이전트 간 작업 위임 로직

### 유사점
- 다중 에이전트 시스템 (MAS)
- 오케스트레이터 패턴 (coin, Sisyphus)
- 역할별 전문 에이전트 (explorer, doc_writer 등)

### 차이점
- oh-my-opencode: UI/UX, 멀티모달 특화 에이전트
- supercode: 개발 단계 중심 (분석, 실행, 코드리뷰)

---

## Priority 2: High - 인증 시스템

### 검증 항목
- [ ] AuthHub vs Antigravity OAuth 구조
- [ ] 다중 프로바이더 지원 여부
- [ ] 토큰 관리 및 갱신 로직

### supercode (AuthHub)
- 다중 프로바이더: Claude, Codex, Gemini
- /src/services/auth/hub.ts

### oh-my-opencode (Antigravity)
- Google OAuth 특화
- /src/auth/antigravity/

---

## Priority 3: High - UI 구조

### 검증 항목
- [ ] TUI 프레임워크 비교
- [ ] 웹 UI 유무
- [ ] 대시보드 구현 방식

### supercode
- TUI: Ink + React
- Web: Solid.js 콘솔
- /src/cli/components/, /packages/console/

### oh-my-opencode
- TUI: @clack/prompts
- Web: 없음

---

## Priority 4: Medium - 훅 시스템

### 검증 항목
- [ ] 훅 레지스트리 구현 비교
- [ ] 이벤트 트리거 시점
- [ ] 확장성 평가

### supercode
- EventEmitter 기반 HookRegistry
- 동적 이벤트 등록

### oh-my-opencode
- 22개 정적 훅
- 사전 정의된 확장 지점

---

## Priority 5: Medium - 도구 시스템

### 검증 항목
- [ ] 도구 종류 및 복잡성
- [ ] LSP/AST 지원 여부
- [ ] 도구 호출 API 비교

### supercode (Core Tools)
- bash, file, search, todo
- 저수준 OS 명령

### oh-my-opencode
- LSP 11개 + AST-Grep
- 고수준 코드 분석

---

## Completed
- [x] 프로젝트 구조 탐색 (Phase 1)
- [x] Gemini 분석 결과 종합 (Phase 2)

---

**Version**: 1.0.0 | **Created**: 2026-01-12
