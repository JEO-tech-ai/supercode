"""
WebSocket Event Protocol for workflow notifications
"""
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any


class EventType(str, Enum):
    """Event types for workflow notifications"""
    WORKFLOW_START = "workflow_start"
    WORKFLOW_END = "workflow_end"
    STEP_START = "step_start"
    STEP_LOG = "step_log"
    STEP_END = "step_end"
    STEP_CACHE_HIT = "step_cache_hit"
    ERROR = "error"


@dataclass
class WorkflowEvent:
    """
    Event message for WebSocket communication.

    Used by:
    - NotificationManager: Creates and sends events
    - Dashboard Server: Broadcasts to connected clients
    - Dashboard Client: Receives and displays events
    """
    event_type: EventType
    task_id: str
    step_name: Optional[str] = None
    payload: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "event_type": self.event_type.value,
            "task_id": self.task_id,
            "step_name": self.step_name,
            "payload": self.payload,
            "timestamp": self.timestamp,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "WorkflowEvent":
        """Create from dictionary"""
        return cls(
            event_type=EventType(data["event_type"]),
            task_id=data["task_id"],
            step_name=data.get("step_name"),
            payload=data.get("payload", {}),
            timestamp=data.get("timestamp", datetime.utcnow().isoformat()),
        )

    @classmethod
    def workflow_start(cls, task_id: str, description: str) -> "WorkflowEvent":
        """Create workflow start event"""
        return cls(
            event_type=EventType.WORKFLOW_START,
            task_id=task_id,
            payload={"description": description},
        )

    @classmethod
    def workflow_end(cls, task_id: str, status: str, summary: Dict[str, Any]) -> "WorkflowEvent":
        """Create workflow end event"""
        return cls(
            event_type=EventType.WORKFLOW_END,
            task_id=task_id,
            payload={"status": status, "summary": summary},
        )

    @classmethod
    def step_start(cls, task_id: str, step_name: str) -> "WorkflowEvent":
        """Create step start event"""
        return cls(
            event_type=EventType.STEP_START,
            task_id=task_id,
            step_name=step_name,
        )

    @classmethod
    def step_log(cls, task_id: str, step_name: str, message: str, level: str = "info") -> "WorkflowEvent":
        """Create step log event"""
        return cls(
            event_type=EventType.STEP_LOG,
            task_id=task_id,
            step_name=step_name,
            payload={"message": message, "level": level},
        )

    @classmethod
    def step_end(cls, task_id: str, step_name: str, status: str, output: Optional[Dict] = None) -> "WorkflowEvent":
        """Create step end event"""
        return cls(
            event_type=EventType.STEP_END,
            task_id=task_id,
            step_name=step_name,
            payload={"status": status, "output": output},
        )

    @classmethod
    def step_cache_hit(cls, task_id: str, step_name: str, cache_key: str) -> "WorkflowEvent":
        """Create cache hit event"""
        return cls(
            event_type=EventType.STEP_CACHE_HIT,
            task_id=task_id,
            step_name=step_name,
            payload={"cache_key": cache_key},
        )

    @classmethod
    def error(cls, task_id: str, message: str, step_name: Optional[str] = None) -> "WorkflowEvent":
        """Create error event"""
        return cls(
            event_type=EventType.ERROR,
            task_id=task_id,
            step_name=step_name,
            payload={"message": message},
        )
