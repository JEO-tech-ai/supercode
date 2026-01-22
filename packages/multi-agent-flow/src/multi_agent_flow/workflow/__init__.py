"""
Workflow Engine for Multi-Agent Flow

Phase 3: Agent Chaining & Task Dispatch
Phase 4: Parallel Execution & Real Integration
"""
from .models import (
    WorkflowStatus,
    StepStatus as ModelStepStatus,
    AgentName,
    StepResult,
    WorkflowState,
    AgentInput,
    AgentOutput,
)
from .ipc import FileIPCManager
from .engine import WorkflowEngine
from .graph import WorkflowGraph, StepStatus as GraphStepStatus
from .parallel import ParallelScheduler, run_parallel_workflow

__all__ = [
    # Phase 3 - Models
    "WorkflowStatus",
    "ModelStepStatus",
    "AgentName",
    "StepResult",
    "WorkflowState",
    "AgentInput",
    "AgentOutput",
    "FileIPCManager",
    "WorkflowEngine",
    # Phase 4 - Parallel Execution
    "WorkflowGraph",
    "GraphStepStatus",
    "ParallelScheduler",
    "run_parallel_workflow",
]
