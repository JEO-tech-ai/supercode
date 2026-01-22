"""
Multi-Agent Flow - AI agents collaborating via HTTP port communication
"""
__version__ = "0.1.0"

from .shared.models import (
    TaskRequest,
    TaskResponse,
    TaskStatus,
    WorkflowStep,
    HealthResponse,
)
from .shared.config import AGENTS, get_agent_url
from .shared.client import agent_client

__all__ = [
    "TaskRequest",
    "TaskResponse",
    "TaskStatus",
    "WorkflowStep",
    "HealthResponse",
    "AGENTS",
    "get_agent_url",
    "agent_client",
]
