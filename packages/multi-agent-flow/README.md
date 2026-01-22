# Multi-Agent Flow v2.0

멀티 AI 에이전트 오케스트레이션 시스템 - Claude, Codex, Gemini, OpenCode를 협업시켜 소프트웨어 개발을 자동화합니다.

## Quick Start

```bash
# 설치
uv pip install -e .

# 에이전트 실행
maf launch

# 태스크 제출
maf task "REST API 생성" writer -p HIGH

# 상태 확인
maf status
```

## Architecture

```mermaid
graph TB
    subgraph Launcher["Phase 1: Multi-Terminal Launcher"]
        CLI[maf launch] --> PM[Process Manager]
        PM --> T1[Terminal 1<br/>Orchestrator]
        PM --> T2[Terminal 2<br/>Planner]
        PM --> T3[Terminal 3<br/>Writer]
        PM --> T4[Terminal 4<br/>Tester]
        PM --> T5[Terminal 5<br/>Analyzer]
    end

    subgraph Scheduler["Phase 2: Task Scheduler"]
        TQ[Task Queue<br/>Priority: HIGH/NORMAL/LOW]
        SM[State Manager<br/>agent_status.json]
        TS[Task Scheduler]
        TQ --> TS
        SM --> TS
    end

    subgraph Communication["Communication Layer"]
        HTTP[HTTP REST API]
        CB[Callback URLs]
        HTTP <--> CB
    end

    Launcher --> Scheduler
    Scheduler --> Communication
```

## Agent Roles

| Agent | Model | Port | Responsibility |
|:------|:------|:----:|:---------------|
| **Orchestrator** | Claude | 8000 | 작업 분배, 워크플로우 조정, 코드 리뷰 |
| **Planner** | OpenCode | 8001 | 계획 수립, 아키텍처 설계 |
| **Writer** | Codex | 8002 | 코드 생성 |
| **Tester** | Codex | 8003 | 테스트 실행, 검증 |
| **Analyzer** | Gemini | 8004 | 분석, 대용량 코드 리뷰 (1M+ 토큰) |

## CLI Commands

| Command | Description |
|:--------|:------------|
| `maf launch` | 터미널 윈도우에 AI 에이전트 실행 |
| `maf status` | 모든 에이전트 상태 확인 |
| `maf stop` | 모든 에이전트 중지 |
| `maf task "desc" role [-p PRIORITY]` | 스케줄러에 태스크 제출 |
| `maf queue` | 태스크 큐 상태 확인 |
| `maf run "task"` | 전체 워크플로우 실행 (Phase 3) |
| `maf wf-status <id>` | 워크플로우 상태 확인 |
| `maf wf-list` | 모든 워크플로우 목록 |
| `maf agents` | 사용 가능한 CLI 에이전트 확인 (Phase 4) |
| `maf dashboard` | 실시간 대시보드 서버 시작 (Phase 4) |
| `maf monitor [task_id]` | 터미널에서 워크플로우 모니터링 (Phase 4) |
| `maf cache stats\|clear\|cleanup` | 캐시 관리 (Phase 4) |

## Communication Flow

```mermaid
sequenceDiagram
    participant User
    participant Orchestrator
    participant Writer
    participant Tester

    User->>Orchestrator: POST /start_workflow
    Orchestrator->>Writer: POST /generate_code<br/>(+ callback_url)
    Writer-->>Orchestrator: TaskResponse
    Writer--)Orchestrator: POST /task_status (callback)
    Orchestrator->>Tester: POST /execute_tests
    Tester-->>Orchestrator: TaskResponse
    Orchestrator-->>User: Workflow Complete
```

### Communication Patterns

| Pattern | Type | Description |
|:--------|:-----|:------------|
| Request-Response | 동기 | HTTP POST → 즉시 응답 대기 |
| Callback | 비동기 | 작업 완료 후 callback_url로 상태 전송 |
| Health Check | 폴링 | GET /health 엔드포인트 |

## Phase 4: Real Integration Architecture

```mermaid
graph TB
    subgraph CLI["CLI Layer"]
        RUN[maf run] --> WE[Workflow Engine]
        DASH[maf dashboard] --> WS[WebSocket Server]
        MON[maf monitor] --> WSC[WebSocket Client]
    end

    subgraph Core["Core Engine"]
        WE --> |"1. Check Cache"| CM[Cache Manager]
        WE --> |"2. Execute"| AR[Agent Runner]
        WE --> |"3. Notify"| NM[Notification Manager]
    end

    subgraph Agents["Agent Execution"]
        AR --> |"subprocess"| CLAUDE[claude CLI]
        AR --> |"subprocess"| CODEX[codex CLI]
        AR --> |"subprocess"| GEMINI[gemini CLI]
        AR --> |"subprocess"| OPENCODE[opencode CLI]
    end

    subgraph Cache["Caching Layer"]
        CM --> FC[File Cache]
        CM -.-> RC[Redis Cache]
    end

    subgraph Dashboard["Real-time Dashboard"]
        NM --> |"events"| WS
        WS --> |"broadcast"| WSC
        WSC --> RICH[Rich Terminal UI]
    end

    style CLI fill:#e1f5fe
    style Core fill:#fff3e0
    style Agents fill:#e8f5e9
    style Cache fill:#fce4ec
    style Dashboard fill:#f3e5f5
```

### Parallel Execution DAG

```mermaid
graph LR
    subgraph Sequential["Default Sequential"]
        P1[Planner] --> W1[Writer] --> R1[Reviewer] --> T1[Tester] --> A1[Analyzer]
    end

    subgraph Parallel["With Parallel Analysis"]
        P2[Planner] --> W2[Writer]
        W2 --> SEC[Security Analyzer]
        W2 --> STY[Style Checker]
        SEC --> R2[Reviewer]
        STY --> R2
        R2 --> T2[Tester]
    end

    style Sequential fill:#e3f2fd
    style Parallel fill:#e8f5e9
```

### Data Flow

```mermaid
sequenceDiagram
    participant CLI as maf run
    participant Engine as Workflow Engine
    participant Cache as Cache Manager
    participant Runner as Agent Runner
    participant Agent as CLI Agent
    participant WS as WebSocket

    CLI->>Engine: start_workflow(task)
    Engine->>WS: workflow_start event

    loop Each Step
        Engine->>Cache: check cache
        alt Cache Hit
            Cache-->>Engine: cached result
            Engine->>WS: cache_hit event
        else Cache Miss
            Engine->>Runner: run(agent, prompt)
            Runner->>Agent: subprocess.Popen
            Agent-->>Runner: stdout/stderr
            Runner-->>Engine: AgentResult
            Engine->>Cache: store result
        end
        Engine->>WS: step_end event
    end

    Engine->>WS: workflow_end event
    Engine-->>CLI: WorkflowState
```

## Project Status

| Phase | Status | Description |
|:------|:------:|:------------|
| Phase 1 | ✅ | Multi-Terminal Launcher |
| Phase 2 | ✅ | Task Scheduler |
| Phase 3 | ✅ | Agent Chaining, Feedback Loop |
| Phase 4 | ✅ | Real Agent Integration, WebSocket Dashboard, Caching, Parallel Execution |

---

<details>
<summary><b>Installation Details</b></summary>

### Requirements
- Python 3.11+
- macOS or Linux
- AI CLI tools: `claude`, `codex`, `gemini`, `opencode`

### Install Methods

```bash
# Using uv (recommended)
uv pip install -e .

# Using pip
pip install -e .

# With process monitoring
pip install psutil
```

</details>

<details>
<summary><b>Configuration (config.yaml)</b></summary>

```yaml
version: "2.0"

settings:
  port_range:
    start: 8000
    end: 8010
  terminal_app: "Terminal"  # macOS: "Terminal" or "iTerm2"
  tmux_session: "supercode"  # Linux

agents:
  orchestrator:
    name: "Orchestrator"
    model: "claude"
    command: "claude"
    port: 8000
    roles: [orchestrator, reviewer]
    env:
      SUPERCODE_MODE: "orchestrator"

  planner:
    name: "Planner"
    model: "opencode"
    command: "opencode"
    port: 8001
    roles: [planner]

  writer:
    name: "Writer"
    model: "codex"
    command: "codex"
    port: 8002
    roles: [writer]

  tester:
    name: "Tester"
    model: "codex"
    command: "codex"
    port: 8003
    roles: [tester]

  analyzer:
    name: "Analyzer"
    model: "gemini"
    command: "gemini"
    port: 8004
    roles: [analyzer]
```

</details>

<details>
<summary><b>Platform Support</b></summary>

### macOS
- **Terminal.app** (default): AppleScript 기반 윈도우 관리
- **iTerm2**: 고급 윈도우 관리 (한글 로케일 이슈로 Terminal 권장)

### Linux
- **tmux**: 세션 기반 터미널 관리
  ```bash
  tmux attach -t supercode  # 에이전트 확인
  ```

</details>

<details>
<summary><b>API Reference</b></summary>

### Start Workflow
```bash
curl -X POST http://localhost:8000/api/orchestrator/start_workflow \
  -H "Content-Type: application/json" \
  -d '{"workflow_type": "code_generation", "details": {"task_description": "Create a fibonacci function"}}'
```

### Check Workflow Status
```bash
curl http://localhost:8000/api/orchestrator/workflow_status/{task_id}
```

### Health Check
```bash
curl http://localhost:8000/health
```

</details>

<details>
<summary><b>Programmatic Usage</b></summary>

### Launcher
```python
from multi_agent_flow.launcher import LauncherManager

manager = LauncherManager(
    port_range=(8000, 8010),
    terminal_app="Terminal",
)

results = manager.start_all()
manager.print_status()
manager.stop_all()
```

### Scheduler
```python
from multi_agent_flow.scheduler import TaskScheduler, TaskPriority

scheduler = TaskScheduler()
scheduler.register_agents_from_config(agents_config)

task = scheduler.submit_task(
    description="Generate REST API",
    target_role="writer",
    priority=TaskPriority.HIGH
)

scheduler.print_status()
```

### Agent Runner (Phase 4)
```python
import asyncio
from multi_agent_flow.agents import AgentRunner

runner = AgentRunner()

# Check available agents
print(runner.list_available_agents())

# Execute an agent
async def run():
    result = await runner.run("claude", "Explain this code")
    print(result.stdout)

asyncio.run(run())
```

### Parallel Workflow (Phase 4)
```python
from multi_agent_flow.workflow import WorkflowGraph, ParallelScheduler

# Create a parallel workflow
graph = WorkflowGraph.with_parallel_analysis()

# Get parallel groups
groups = graph.get_parallel_groups()
# [['Planner'], ['Writer'], ['SecurityAnalyzer', 'StyleChecker'], ['Reviewer'], ['Tester']]
```

### Cache Manager (Phase 4)
```python
import asyncio
from multi_agent_flow.cache import CacheManager

cache = CacheManager(default_ttl=3600)

async def cache_example():
    # Store result
    await cache.set_step_result("task-1", "planner", "input", {"plan": "..."})

    # Retrieve cached result
    result = await cache.get_step_result("task-1", "planner", "input")

    # Check stats
    print(cache.get_stats())

asyncio.run(cache_example())
```

</details>

<details>
<summary><b>File Structure</b></summary>

```
multi-agent-flow/
├── src/multi_agent_flow/
│   ├── launcher/           # Phase 1 - Multi-Terminal
│   │   ├── port_allocator.py
│   │   ├── process_manager.py
│   │   ├── platforms.py
│   │   └── manager.py
│   ├── scheduler/          # Phase 2 - Task Scheduling
│   │   ├── task.py
│   │   ├── queue.py
│   │   ├── state_manager.py
│   │   └── scheduler.py
│   ├── workflow/           # Phase 3 & 4 - Workflow Engine
│   │   ├── models.py       # Data models
│   │   ├── ipc.py          # File-based IPC
│   │   ├── engine.py       # State machine
│   │   ├── graph.py        # DAG for parallel execution
│   │   └── parallel.py     # Parallel scheduler
│   ├── agents/             # Phase 4 - Agent Runner
│   │   ├── config.py       # Agent configuration
│   │   └── runner.py       # CLI subprocess execution
│   ├── cache/              # Phase 4 - Caching
│   │   ├── base.py         # Abstract cache interface
│   │   ├── file_cache.py   # File-based cache
│   │   └── manager.py      # Cache manager
│   ├── dashboard/          # Phase 4 - Real-time Dashboard
│   │   ├── server.py       # FastAPI WebSocket server
│   │   ├── client.py       # Rich terminal client
│   │   ├── notifications.py # Event dispatcher
│   │   └── connection_manager.py
│   ├── shared/             # Shared utilities
│   │   └── events.py       # WebSocket event protocol
│   └── cli.py
├── config.yaml
└── pyproject.toml
```

</details>

<details>
<summary><b>Development Roadmap</b></summary>

### Phase 1 ✅ Complete
- [x] Multi-terminal launcher
- [x] Port allocation and management
- [x] Process lifecycle management
- [x] Cross-platform support (macOS/Linux)
- [x] YAML configuration

### Phase 2 ✅ Complete
- [x] Task scheduling system
- [x] Priority queue (HIGH/NORMAL/LOW)
- [x] Agent state persistence (JSON)
- [x] CLI integration (maf task, maf queue)

### Phase 3 ✅ Complete
- [x] Agent chaining (Planner → Writer → Reviewer → Tester → Analyzer)
- [x] Feedback loop (Reviewer → Writer rework)
- [x] Workflow state machine
- [x] File-based IPC
- [x] Retry/failure recovery
- [x] CLI integration (maf run, maf wf-status, maf wf-list)

### Phase 4 ✅ Complete
- [x] Real agent CLI integration (`agents/runner.py`)
- [x] WebSocket real-time dashboard (`dashboard/server.py`, `dashboard/client.py`)
- [x] Result caching (`cache/manager.py`, `cache/file_cache.py`)
- [x] Parallel step execution (`workflow/graph.py`, `workflow/parallel.py`)
- [x] CLI commands: `maf agents`, `maf dashboard`, `maf monitor`, `maf cache`

</details>

---

**License**: MIT
