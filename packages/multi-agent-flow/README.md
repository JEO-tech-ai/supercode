# Multi-Agent Flow

A multi-agent system where AI agents collaborate via HTTP port communication.

## Features

- **Single Command Startup**: Start all agents with `maf start`
- **HTTP Communication**: Agents communicate via REST API
- **Pipeline Workflow**: Sequential task execution across agents
- **Health Monitoring**: Built-in health checks and status monitoring

## Architecture

```
Orchestrator (:8000) → Writer (:8001) → Reviewer (:8002) → Tester (:8003) → Analyzer (:8004)
```

| Agent | Port | Role |
|-------|------|------|
| Orchestrator | 8000 | Task distribution, workflow coordination |
| Writer | 8001 | Code generation |
| Reviewer | 8002 | Code review, quality feedback |
| Tester | 8003 | Test execution, validation |
| Analyzer | 8004 | Analysis, report generation |

## Installation

```bash
# Using uv
uv pip install -e .

# Using pip
pip install -e .
```

## Usage

```bash
# Start all agents
maf start

# Check status
maf status

# Run a workflow
maf workflow "Create a hello world function"

# Stop all agents
maf stop
```

## API

### Start Workflow

```bash
curl -X POST http://localhost:8000/api/orchestrator/start_workflow \
  -H "Content-Type: application/json" \
  -d '{"workflow_type": "code_generation", "details": {"task_description": "Create a fibonacci function"}}'
```

### Check Status

```bash
curl http://localhost:8000/api/orchestrator/workflow_status/{task_id}
```

## Programmatic Usage

```python
from multi_agent_flow import TaskRequest, WorkflowStep, agent_client

# Initialize client
await agent_client.initialize()

# Send task to writer
request = TaskRequest(
    workflow_step=WorkflowStep.CODE_GENERATION,
    payload={"description": "Create a fibonacci function"}
)
response = await agent_client.send_task("writer", "/api/writer/generate_code", request)

# Close client
await agent_client.close()
```

## License

MIT License
