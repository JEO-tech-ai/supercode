# Supercode

Multi-Agent AI Development Tools - A collection of AI-powered development utilities.

## Packages

### multi-agent-flow

A multi-agent system where AI agents collaborate via HTTP port communication.

```
┌─────────────────────────────────────────────────────┐
│               Single Terminal: maf start             │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              Orchestrator (:8000)                    │
│           Task Distribution & Monitoring             │
└─────────┬──────────┬──────────┬──────────┬─────────┘
          │          │          │          │
          ▼          ▼          ▼          ▼
     ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
     │ Writer │ │Reviewer│ │ Tester │ │Analyzer│
     │ :8001  │ │ :8002  │ │ :8003  │ │ :8004  │
     └────────┘ └────────┘ └────────┘ └────────┘
```

## Installation

### Using uv (Recommended)

```bash
# Clone the repository
git clone https://github.com/supercent/supercode.git
cd supercode

# Install with uv
uv sync

# Install specific package
uv pip install -e packages/multi-agent-flow
```

### Using pip

```bash
pip install -e packages/multi-agent-flow
```

## Quick Start

### Start Multi-Agent System

```bash
# Start all agents
maf start

# Check status
maf status

# Run a workflow
maf workflow "Create a fibonacci function"

# Stop all agents
maf stop
```

### API Access

Once started, access the API documentation at:
- Orchestrator: http://localhost:8000/docs
- Writer: http://localhost:8001/docs
- Reviewer: http://localhost:8002/docs
- Tester: http://localhost:8003/docs
- Analyzer: http://localhost:8004/docs

## Workflow

The multi-agent system executes tasks in a pipeline:

1. **Code Generation** (Writer:8001) - Generate code based on requirements
2. **Code Review** (Reviewer:8002) - Review and provide feedback
3. **Test Execution** (Tester:8003) - Run tests and validate
4. **Analysis** (Analyzer:8004) - Generate quality report

## Project Structure

```
supercode/
├── pyproject.toml           # Workspace configuration
├── packages/
│   └── multi-agent-flow/    # Multi-agent system
│       ├── pyproject.toml
│       └── src/
│           └── multi_agent_flow/
│               ├── cli.py           # CLI commands
│               ├── orchestrator/    # Central coordinator
│               ├── agents/          # AI agents
│               │   ├── writer/
│               │   ├── reviewer/
│               │   ├── tester/
│               │   └── analyzer/
│               └── shared/          # Shared utilities
└── README.md
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `maf start` | Start all agents |
| `maf stop` | Stop all agents |
| `maf status` | Check agent status |
| `maf workflow "task"` | Run a workflow |

## Configuration

Logs and PID files are stored in `~/.multi-agent-flow/`:
- `logs/` - Agent log files
- `pids/` - Process ID files

## Development

```bash
# Install dev dependencies
uv sync --all-extras

# Run tests
pytest packages/multi-agent-flow/tests/

# Format code
ruff format .

# Lint
ruff check .
```

## Requirements

- Python 3.11+
- uv (recommended) or pip

## License

MIT License
