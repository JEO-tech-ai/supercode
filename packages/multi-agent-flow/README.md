# Multi-Agent Flow v2.0

A multi-agent AI system that orchestrates various AI models (Claude, Codex, Gemini, OpenCode) in separate terminal windows for collaborative software development.

## Features

- **Multi-Terminal Launch**: Launch AI agents in separate terminal windows with a single command
- **Model Diversity**: Support for multiple AI backends (Claude, Codex, Gemini, OpenCode)
- **Cross-Platform**: macOS (iTerm2, Terminal.app) and Linux (tmux) support
- **Port Management**: Automatic port allocation and conflict resolution
- **Process Lifecycle**: Health monitoring, graceful shutdown, status tracking
- **Configurable**: YAML-based configuration for agent roles and models

## Architecture v2.0

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SUPERCODE MULTI-AGENT SYSTEM                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│   │ Orchestrator │   │   Planner    │   │    Writer    │                │
│   │   (Claude)   │   │  (OpenCode)  │   │   (Codex)    │                │
│   │   :8000      │   │   :8001      │   │   :8002      │                │
│   └──────────────┘   └──────────────┘   └──────────────┘                │
│                                                                          │
│   ┌──────────────┐   ┌──────────────┐                                   │
│   │    Tester    │   │   Analyzer   │                                   │
│   │   (Codex)    │   │   (Gemini)   │                                   │
│   │   :8003      │   │   :8004      │                                   │
│   └──────────────┘   └──────────────┘                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

| Agent | Model | Port | Role |
|-------|-------|------|------|
| Orchestrator | Claude | 8000 | Task distribution, workflow coordination, code review |
| Planner | OpenCode | 8001 | Planning, architecture design |
| Writer | Codex | 8002 | Code generation |
| Tester | Codex | 8003 | Test execution, validation |
| Analyzer | Gemini | 8004 | Analysis, large-scale code review |

## Installation

```bash
# Using uv (recommended)
uv pip install -e .

# Using pip
pip install -e .

# Install optional dependencies for process monitoring
pip install psutil
```

## Quick Start

### Phase 1: Multi-Terminal Launch

```bash
# Launch all AI agents in separate terminal windows
maf launch

# Check status of all agents
maf status

# Stop all agents
maf stop
```

### Backend Mode (uvicorn)

```bash
# Start backend HTTP agents
maf start

# Run a workflow
maf workflow "Create a hello world function"

# Stop all agents
maf stop
```

## Configuration

Create a `config.yaml` file to customize agent settings:

```yaml
version: "2.0"

settings:
  port_range:
    start: 8000
    end: 8010
  terminal_app: "iTerm2"  # or "Terminal.app" for macOS
  tmux_session: "supercode"  # for Linux

agents:
  orchestrator:
    name: "Orchestrator"
    model: "claude"
    command: "claude"
    port: 8000
    roles:
      - orchestrator
      - reviewer
    env:
      SUPERCODE_MODE: "orchestrator"

  planner:
    name: "Planner"
    model: "opencode"
    command: "opencode"
    port: 8001
    roles:
      - planner

  writer:
    name: "Writer"
    model: "codex"
    command: "codex"
    port: 8002
    roles:
      - writer

  tester:
    name: "Tester"
    model: "codex"
    command: "codex"
    port: 8003
    roles:
      - tester

  analyzer:
    name: "Analyzer"
    model: "gemini"
    command: "gemini"
    port: 8004
    roles:
      - analyzer
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `maf launch` | Launch AI agents in separate terminal windows (Phase 1) |
| `maf start` | Start backend agents (uvicorn mode) |
| `maf stop` | Stop all running agents |
| `maf status` | Display status of all agents |
| `maf workflow "task"` | Start a workflow with task description |

## API Reference

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

## Programmatic Usage

```python
from multi_agent_flow.launcher import LauncherManager

# Initialize launcher
manager = LauncherManager(
    port_range=(8000, 8010),
    terminal_app="iTerm2",
)

# Start all agents
results = manager.start_all()

# Check status
manager.print_status()

# Stop all agents
manager.stop_all()
```

## Platform Support

### macOS
- **iTerm2** (recommended): Full window management with AppleScript
- **Terminal.app**: Basic support via AppleScript

### Linux
- **tmux**: Session-based terminal management
  - Each agent runs in a separate tmux window
  - Use `tmux attach -t supercode` to view agents

## Development Roadmap

### Phase 1 (Current)
- [x] Multi-terminal launcher
- [x] Port allocation and management
- [x] Process lifecycle management
- [x] Cross-platform support (macOS/Linux)
- [x] YAML configuration

### Phase 2 (Planned)
- [ ] Task scheduling system
- [ ] Real-time status monitoring
- [ ] Parallel task execution
- [ ] Agent-to-orchestrator communication
- [ ] WebSocket-based dashboard

## Requirements

- Python 3.11+
- macOS or Linux
- AI CLI tools installed (`claude`, `codex`, `gemini`, `opencode`)

## License

MIT License
