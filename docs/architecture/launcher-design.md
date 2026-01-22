# Multi-Terminal Launcher Design

## Architecture Overview

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

## Module Structure

### 1. Port Allocator (`port_allocator.py`)

- Range: 8000-8005
- Socket-based availability check
- Internal tracking of allocated ports
- Thread-safe allocation

### 2. Process Manager (`process_manager.py`)

- PID tracking with `psutil`
- Agent lifecycle management
- Health monitoring via polling
- Graceful shutdown (SIGTERM → SIGKILL)

### 3. Platform Launchers

#### macOS (`mac_launcher.py`)
- AppleScript-based terminal control
- Support for iTerm2 and Terminal.app
- Window title customization

#### Linux (`linux_launcher.py`)
- tmux session management
- Window/pane creation
- Child process PID detection

### 4. Main Launcher (`supercode.py`)

- CLI argument parsing
- Configuration loading
- OS detection
- Agent orchestration

## Configuration Schema

```yaml
agents:
  claude:
    name: "Claude Code (Orchestrator + Reviewer)"
    command: "npm start claude"
    initial_port: 8000
  opencode:
    name: "OpenCode (Planner)"
    command: "npm start opencode"
    initial_port: 8001
  codex:
    name: "Codex (Writer + Tester)"
    command: "npm start codex"
    initial_port: 8002
  gemini:
    name: "Gemini-CLI (Analyzer)"
    command: "npm start gemini"
    initial_port: 8003

platforms:
  macos:
    terminal_app: "iTerm2"
  linux:
    tmux_session_name: "supercode_agents"

port_range:
  start: 8000
  end: 8005
```

## Health Monitoring

1. **PID Check**: `psutil.Process(pid).is_running()`
2. **Port Check**: Socket bind attempt
3. **HTTP Health**: `/health` endpoint polling (Phase 2)

## Inter-Process Communication

| Direction | Method | Purpose |
|-----------|--------|---------|
| Launcher → Agent | ENV vars, CLI args | PORT, AGENT_ID |
| Agent → Agent | HTTP REST, WebSocket | Task delegation |
| Agent → Launcher | Polling (no push) | Status monitoring |

## Implementation Priority

1. ✅ Core architecture design
2. 🔄 Port allocator
3. 🔄 Process manager
4. ⏳ Platform launchers
5. ⏳ Main CLI
6. ⏳ Task scheduler (Phase 2)

---
**Source**: Gemini-CLI Analysis
**Date**: 2026-01-22
