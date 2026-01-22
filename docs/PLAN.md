# Supercode Multi-Agent System v2.0

## Overview

멀티 터미널 기반 AI 에이전트 오케스트레이션 시스템

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         supercode start                                      │
│                    (Single Command Launcher)                                 │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Terminal 1   │     │  Terminal 2   │     │  Terminal 3   │
│  Claude Code  │     │    Codex      │     │  Gemini-CLI   │
│ (Orchestrator)│     │(Writer/Tester)│     │  (Analyzer)   │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Message Queue   │
                    │  (Task Scheduler) │
                    └───────────────────┘
```

## Agent Roles & Models

| Agent | Model | Terminal | Port | Responsibility |
|-------|-------|----------|------|----------------|
| **Orchestrator** | Claude Code | T1 | 8000 | 작업 분배, 상태 관리, 최종 결정 |
| **Planner** | OpenCode | T2 | 8001 | 계획 수립, 요구사항 분석, 설계 |
| **Writer** | Codex | T3 | 8002 | 코드 생성, 구현 |
| **Reviewer** | Claude Code | T1 | 8003 | 코드 리뷰, 품질 검사 |
| **Tester** | Codex | T3 | 8004 | 테스트 실행, 검증 |
| **Analyzer** | Gemini-CLI | T4 | 8005 | 분석, 리포트, 대용량 처리 |

## Implementation Phases

### Phase 1: Multi-Terminal Launcher

**목표**: 단일 명령으로 여러 터미널 프로세스를 정렬하여 실행

```bash
supercode start
# → Terminal 1: cmd > claude (Orchestrator + Reviewer)
# → Terminal 2: cmd > opencode (Planner)
# → Terminal 3: cmd > codex (Writer + Tester)
# → Terminal 4: cmd > gemini (Analyzer)
```

**구현 사항**:
- [x] 터미널 멀티플렉서 (tmux/iTerm2 AppleScript)
- [x] 각 터미널에서 AI CLI 모델 구동 (claude, codex, gemini, opencode)
- [x] 프로세스 상태 모니터링 (psutil)
- [x] 포트 할당 및 헬스체크 (PortAllocator)
- [x] YAML 기반 설정 (config.yaml)
- [x] CLI 명령어 (maf launch/status/stop)

### Phase 2: Orchestration & Scheduling

**목표**: 중앙 제어 및 병렬 태스크 스케줄링

**구현 사항**:
- [x] Supercode CLI (`maf task`, `maf queue` 명령)
- [x] Task Queue (InMemoryTaskQueue - 우선순위 지원)
- [x] 병렬 실행 스케줄러 (TaskScheduler)
- [x] 실시간 상태 모니터링 (`maf queue` 명령)
- [x] 에이전트 상태 파일 저장 (`agent_status.json`)

### Phase 3: Advanced Features

**목표**: 정밀도 향상 및 고급 기능

**구현 사항**:
- [ ] 에이전트 체이닝 (Planner → Writer → Reviewer → Tester → Analyzer)
- [ ] 피드백 루프 (Reviewer → Writer 재작업)
- [ ] 우선순위 기반 스케줄링
- [ ] 작업 결과 캐싱
- [ ] 실패 복구 메커니즘

## Workflow Example

```
User Input: "Create a REST API for user authentication"
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Orchestrator (Claude Code)                                   │
│ - 작업 분석 및 에이전트 할당                                   │
│ - Task ID 생성: task-001                                     │
└─────────────────────────────────────────────────────────────┘
    │
    ├──────────────────────────────────────────────────────────┐
    ▼                                                          │
┌─────────────────────────────────────────────────────────────┐│
│ Planner (OpenCode)                                          ││
│ - 요구사항 분석                                              ││
│ - 기술 스택 결정                                             ││
│ - 구현 계획 수립                                             ││
│ - Output: implementation_plan.md                            ││
└─────────────────────────────────────────────────────────────┘│
    │                                                          │
    ▼                                                          │
┌─────────────────────────────────────────────────────────────┐│
│ Writer (Codex)                                              ││
│ - 코드 생성                                                  ││
│ - 파일 구조 생성                                             ││
│ - Output: auth_api.py, models.py, routes.py                 ││
└─────────────────────────────────────────────────────────────┘│
    │                                                          │
    ▼                                                          │
┌─────────────────────────────────────────────────────────────┐│
│ Reviewer (Claude Code)                                      ││
│ - 코드 품질 검사                                             ││
│ - 보안 취약점 분석                                           ││
│ - Output: review_report.md, suggestions[]                   ││
└─────────────────────────────────────────────────────────────┘│
    │                                                          │
    ├── [피드백 있으면] ─────────────────────────────────────── ┘
    │         └─→ Writer 재작업 요청
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Tester (Codex)                                              │
│ - 테스트 코드 생성                                           │
│ - 테스트 실행                                                │
│ - Output: test_auth.py, test_results.json                   │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Analyzer (Gemini-CLI)                                       │
│ - 전체 워크플로우 분석                                        │
│ - 품질 메트릭 계산                                           │
│ - 최종 리포트 생성                                           │
│ - Output: final_report.md                                   │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Orchestrator (Claude Code)                                   │
│ - 최종 결과 종합                                             │
│ - 사용자에게 결과 전달                                        │
└─────────────────────────────────────────────────────────────┘
```

## Task Scheduling

### Queue Structure

```
Priority Queue:
├── HIGH: 긴급 수정, 보안 이슈
├── NORMAL: 일반 작업
└── LOW: 리팩토링, 문서화

Parallel Execution:
├── Writer + Tester (독립 작업 시)
├── Multiple Writers (파일별 분할)
└── Analyzer (비동기 리포트 생성)
```

### Status Monitoring

```bash
supercode status
┌─────────────────────────────────────────────────────────────┐
│ SUPERCODE AGENT STATUS                                       │
├─────────────────────────────────────────────────────────────┤
│ ● Orchestrator (Claude)    Ready     Port: 8000             │
│ ● Planner (OpenCode)       Ready     Port: 8001             │
│ ● Writer (Codex)           Working   Port: 8002  Task: #003 │
│ ● Reviewer (Claude)        Idle      Port: 8003             │
│ ● Tester (Codex)           Queue: 2  Port: 8004             │
│ ● Analyzer (Gemini)        Ready     Port: 8005             │
├─────────────────────────────────────────────────────────────┤
│ Active Tasks: 3  |  Queued: 2  |  Completed: 15             │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

- **Terminal Manager**: tmux / iTerm2 AppleScript
- **IPC**: HTTP REST + WebSocket
- **Queue**: Redis (production) / In-memory (dev)
- **CLI**: Python Click / Node.js Commander
- **Monitoring**: Real-time WebSocket dashboard

## File Structure

```
supercode/
├── packages/
│   └── multi-agent-flow/
│       ├── src/multi_agent_flow/
│       │   ├── launcher/          # 터미널 런처
│       │   │   ├── tmux.py
│       │   │   ├── iterm.py
│       │   │   └── manager.py
│       │   ├── scheduler/         # 태스크 스케줄러
│       │   │   ├── queue.py
│       │   │   ├── executor.py
│       │   │   └── priority.py
│       │   ├── agents/            # 에이전트 정의
│       │   │   ├── orchestrator.py
│       │   │   ├── planner.py
│       │   │   ├── writer.py
│       │   │   ├── reviewer.py
│       │   │   ├── tester.py
│       │   │   └── analyzer.py
│       │   ├── protocols/         # 통신 프로토콜
│       │   │   ├── messages.py
│       │   │   └── handlers.py
│       │   └── cli.py             # CLI 진입점
│       └── scripts/
│           ├── start.sh
│           └── stop.sh
└── docs/
    ├── PLAN.md                    # 이 문서
    └── architecture/
        ├── agents.md
        ├── scheduler.md
        └── protocols.md
```

## Progress Tracking

| Phase | Status | Assignee | Notes |
|-------|--------|----------|-------|
| Phase 1 | ✅ Completed | Gemini + Claude | 멀티터미널 런처 구현 완료 |
| Phase 2 | ✅ Completed | Gemini + Claude + Codex | 태스크 스케줄러 구현 완료 |
| Phase 3 | ⏳ Pending | All Agents | 고급 기능 |

## Phase 1 Deliverables

### Implemented Modules
- `launcher/port_allocator.py` - 포트 할당 관리 (8000-8010)
- `launcher/process_manager.py` - 에이전트 프로세스 라이프사이클 관리
- `launcher/platforms.py` - macOS (AppleScript) / Linux (tmux) 지원
- `launcher/manager.py` - 중앙 런처 매니저

### CLI Commands
```bash
maf launch   # 멀티터미널 에이전트 실행
maf status   # 상태 확인
maf stop     # 전체 중지
```

---
**Created**: 2026-01-22
**Last Updated**: 2026-01-22
**Status**: ✅ Phase 2 Complete
