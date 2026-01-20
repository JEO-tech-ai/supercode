# SuperCode Improvement Plan - Overview

> **Version**: 1.0.0 | **Created**: 2026-01-20 | **Status**: Planning Phase

## Executive Summary

SuperCode를 OpenCode 수준의 기능 동작성과 oh-my-opencode 플러그인의 핵심 기능 수준으로 개선하는 종합 계획입니다.

### 현재 상태 (As-Is)

| Project | LOC | Agents | Hooks | Key Strength |
|---------|-----|--------|-------|--------------|
| **supercode** | ~60K | 10+ | 30+ | React/Ink TUI, Multi-provider |
| **opencode** | ~37.7K | 5 | Plugin-based | LSP, Permission system, 17 packages |
| **oh-my-opencode** | ~5K | 7 | 22 | Background tasks, Ralph Loop |

### 목표 상태 (To-Be)

SuperCode = OpenCode 기능 동작성 + oh-my-opencode 핵심 기능

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SuperCode v1.0                                │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │   OpenCode      │  │  oh-my-opencode │  │   Current           │  │
│  │   Features      │  │   Features      │  │   SuperCode         │  │
│  │                 │  │                 │  │                     │  │
│  │ • LSP Support   │  │ • Ralph Loop    │  │ • React/Ink TUI     │  │
│  │ • Permissions   │  │ • Background    │  │ • 10+ Agents        │  │
│  │ • Plugin Arch   │  │   Agent Manager │  │ • 30+ Hooks         │  │
│  │ • Session Mgmt  │  │ • 22 Hooks      │  │ • Multi-provider    │  │
│  │ • Multi-client  │  │ • Sisyphus      │  │ • MCP Integration   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    UNIFIED SUPERCODE                             ││
│  │  • Production-grade CLI with OpenCode-level functionality       ││
│  │  • oh-my-opencode style agent orchestration                     ││
│  │  • Enhanced permission & plugin systems                          ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

## 개선 단계 (4 Phases)

### Phase 1: Foundation (기반 강화)
- Permission system 강화
- Plugin architecture 도입
- Configuration 계층화
- 예상 작업: 15-20 files 수정/생성

### Phase 2: Core Features (핵심 기능)
- Background Agent Manager
- Ralph Loop 통합
- Enhanced LSP tools (11개)
- Session compaction 개선
- 예상 작업: 25-30 files 수정/생성

### Phase 3: Advanced Features (고급 기능)
- Sisyphus orchestrator 고도화
- AST-Grep 통합
- Multi-client architecture
- 예상 작업: 20-25 files 수정/생성

### Phase 4: Polish & Integration (완성도)
- .agent-skills 통합
- Documentation
- Testing & validation
- 예상 작업: 10-15 files 수정/생성

## 5회 검증 프로세스

```
┌─────────────────────────────────────────────────────────────────────┐
│  검증 1: 아키텍처 검토                                               │
│  ├─ 계획된 구조가 기존 코드와 호환되는지 확인                        │
│  └─ import/export 경로, 타입 정합성 검증                             │
├─────────────────────────────────────────────────────────────────────┤
│  검증 2: 기능 명세 검토                                              │
│  ├─ 각 기능의 입출력 인터페이스 정의 완료                            │
│  └─ 의존성 순서 및 구현 우선순위 확인                                │
├─────────────────────────────────────────────────────────────────────┤
│  검증 3: 구현 계획 검토                                              │
│  ├─ 실제 코드 구현 프롬프트 완성도 확인                              │
│  └─ Edge case 및 에러 처리 포함 여부 확인                            │
├─────────────────────────────────────────────────────────────────────┤
│  검증 4: 통합 검토                                                   │
│  ├─ Phase 간 의존성 및 연결점 검증                                   │
│  └─ 기존 기능 regression 방지 확인                                   │
├─────────────────────────────────────────────────────────────────────┤
│  검증 5: 최종 완결성 검토                                            │
│  ├─ 모든 문서의 일관성 확인                                          │
│  └─ 즉시 실행 가능한 프롬프트 완성도 확인                            │
└─────────────────────────────────────────────────────────────────────┘
```

## 문서 구조

```
docs/improvement-plan/
├── 00-OVERVIEW.md              ← 현재 문서
├── 01-GAP-ANALYSIS.md          ← 기능 Gap 상세 분석
├── 02-PHASE1-FOUNDATION.md     ← Phase 1 상세 계획
├── 03-PHASE2-CORE-FEATURES.md  ← Phase 2 상세 계획
├── 04-PHASE3-ADVANCED.md       ← Phase 3 상세 계획
├── 05-PHASE4-POLISH.md         ← Phase 4 상세 계획
├── 06-VERIFICATION-CHECKLIST.md ← 5회 검증 체크리스트
├── 07-AGENT-SKILLS-UPDATE.md   ← .agent-skills 업데이트 계획
└── prompts/                    ← 실행 가능한 프롬프트 모음
    ├── phase1/
    ├── phase2/
    ├── phase3/
    └── phase4/
```

## 사용 방법

1. **계획 검토**: 01~05 문서를 순서대로 검토
2. **검증 수행**: 06 체크리스트로 5회 검증 진행
3. **실행**: prompts/ 디렉토리의 프롬프트를 순서대로 실행
4. **agent-skills 업데이트**: 07 문서 참조하여 스킬 업데이트

## 핵심 참조 프로젝트

| 프로젝트 | 경로 | 참조 목적 |
|----------|------|-----------|
| supercode | `/Users/supercent/Documents/Github/supercode` | 기준 코드베이스 |
| opencode | `/Users/supercent/Documents/Github/opencode` | 기능 동작성 참조 |
| oh-my-opencode | `/Users/supercent/Documents/Github/oh-my-opencode` | 플러그인 기능 참조 |
| .agent-skills | `/Users/supercent/Documents/Github/.agent-skills` | 스킬 시스템 업데이트 |

## 다음 단계

→ [01-GAP-ANALYSIS.md](./01-GAP-ANALYSIS.md) 문서로 진행
