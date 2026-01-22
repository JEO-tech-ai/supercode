"""
Task and Agent State Data Structures for Multi-Agent Scheduler
"""
from enum import Enum
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field, asdict
import uuid
from datetime import datetime


class TaskStatus(str, Enum):
    """Status of a task in the scheduler."""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class TaskPriority(str, Enum):
    """Priority levels for tasks."""
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"


class AgentStatus(str, Enum):
    """Status of an agent."""
    IDLE = "IDLE"
    WORKING = "WORKING"
    ERROR = "ERROR"
    OFFLINE = "OFFLINE"
    UNKNOWN = "UNKNOWN"


@dataclass
class Task:
    """Represents a task to be executed by an agent."""
    description: str
    target_role: str  # Role required to execute this task (planner, writer, tester, etc.)
    id: str = field(default_factory=lambda: f"task-{uuid.uuid4().hex[:8]}")
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.NORMAL
    dependencies: List[str] = field(default_factory=list)
    assigned_agent_id: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Task":
        """Create Task from dictionary."""
        data = data.copy()
        data["status"] = TaskStatus(data.get("status", "PENDING"))
        data["priority"] = TaskPriority(data.get("priority", "NORMAL"))
        return cls(**data)


@dataclass
class AgentState:
    """Represents the current state of an agent."""
    id: str
    name: str
    port: int
    roles: List[str]
    model: str
    status: AgentStatus = AgentStatus.UNKNOWN
    current_task_id: Optional[str] = None
    tasks_completed: int = 0
    tasks_failed: int = 0
    last_seen: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        data = asdict(self)
        data["status"] = self.status.value
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AgentState":
        """Create AgentState from dictionary."""
        data = data.copy()
        data["status"] = AgentStatus(data.get("status", "UNKNOWN"))
        return cls(**data)

    def is_available(self) -> bool:
        """Check if agent is available for new tasks."""
        return self.status == AgentStatus.IDLE

    def can_handle_role(self, role: str) -> bool:
        """Check if agent can handle a specific role."""
        return role in self.roles
