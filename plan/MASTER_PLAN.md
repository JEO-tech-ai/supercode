# SuperCode 개선 프로젝트 마스터 플랜

## 프로젝트 개요

**목표**: SuperCode를 Oh-My-OpenCode 수준으로 개선
**방식**: 점진적 마이그레이션 (기존 코드 유지)
**시작일**: 2026-01-12
**예상 기간**: 9-14주

---

## 개선 항목 요약

| Phase | 항목 | 작업량 | 상태 |
|-------|------|--------|------|
| 1 | Google Antigravity 인증 | Medium | ✅ Completed |
| 2 | 훅 시스템 개선 (22개) | Large | Pending |
| 3 | 도구 시스템 (LSP + AST-Grep) | Large | Pending |
| 4 | 에이전트 시스템 (Sisyphus) | Large | Pending |
| 5 | 통합 및 최적화 | Medium | Pending |

---

## 멀티 에이전트 워크플로우

| Agent | Role | Tool |
|-------|------|------|
| **Claude Code** | Orchestrator | Built-in |
| **Gemini-CLI** | Analyst | `ask-gemini` |
| **Codex-CLI** | Executor | `shell` |

---

## 작업 흐름

```
1. plan/phaseN.md 계획 확인
2. work/phaseN/progress.md 실행 로그 갱신
3. 코드 구현
4. work/phaseN/issues.md 이슈 기록
5. 검증 후 다음 Phase
```

---

## 참조 프로젝트

- **SuperCode**: `/Users/supercent/Documents/Github/supercode`
- **Oh-My-OpenCode**: `/Users/supercent/Documents/Github/oh-my-opencode`

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-12 | 마스터 플랜 초안 작성 |
