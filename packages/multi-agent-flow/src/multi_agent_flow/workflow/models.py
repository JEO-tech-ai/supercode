"""
Workflow Data Models for Phase 3
"""
import uuid
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Any, Optional


class AgentName(str, Enum):
    """Agent names in workflow chain order"""
    PLANNER = "planner"
    WRITER = "writer"
    REVIEWER = "reviewer"
    TESTER = "tester"
    ANALYZER = "analyzer"

    @classmethod
    def get_chain_order(cls) -> List["AgentName"]:
        """Returns the standard workflow chain order"""
        return [cls.PLANNER, cls.WRITER, cls.REVIEWER, cls.TESTER, cls.ANALYZER]

    def next_agent(self) -> Optional["AgentName"]:
        """Get the next agent in the chain"""
        chain = self.get_chain_order()
        try:
            idx = chain.index(self)
            if idx < len(chain) - 1:
                return chain[idx + 1]
        except ValueError:
            pass
        return None


class WorkflowStatus(str, Enum):
    """Workflow execution status"""
    QUEUED = "QUEUED"
    DISPATCHING = "DISPATCHING"

    # Agent execution states
    RUNNING_PLANNER = "RUNNING_PLANNER"
    RUNNING_WRITER = "RUNNING_WRITER"
    RUNNING_REVIEWER = "RUNNING_REVIEWER"
    RUNNING_TESTER = "RUNNING_TESTER"
    RUNNING_ANALYZER = "RUNNING_ANALYZER"

    # Mid-workflow states
    PENDING_REWORK = "PENDING_REWORK"  # When Reviewer rejects

    # Terminal states
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    TIMED_OUT = "TIMED_OUT"
    IN_DLQ = "IN_DLQ"  # Dead Letter Queue

    @classmethod
    def for_agent(cls, agent: AgentName) -> "WorkflowStatus":
        """Get the running status for a specific agent"""
        mapping = {
            AgentName.PLANNER: cls.RUNNING_PLANNER,
            AgentName.WRITER: cls.RUNNING_WRITER,
            AgentName.REVIEWER: cls.RUNNING_REVIEWER,
            AgentName.TESTER: cls.RUNNING_TESTER,
            AgentName.ANALYZER: cls.RUNNING_ANALYZER,
        }
        return mapping.get(agent, cls.DISPATCHING)

    def is_terminal(self) -> bool:
        """Check if this is a terminal state"""
        return self in {
            WorkflowStatus.COMPLETED,
            WorkflowStatus.FAILED,
            WorkflowStatus.TIMED_OUT,
            WorkflowStatus.IN_DLQ,
        }


class StepStatus(str, Enum):
    """Individual step execution status"""
    SUCCESS = "success"
    FAILURE = "failure"
    REJECTED = "rejected"  # Reviewer rejection
    TIMED_OUT = "timed_out"
    SKIPPED = "skipped"


@dataclass
class StepResult:
    """Result of a single agent's execution"""
    step_name: AgentName
    status: StepStatus
    started_at: str
    completed_at: str
    input_path: str
    output_path: str
    exit_code: int
    output_data: Optional[Dict[str, Any]] = None
    error_log_path: Optional[str] = None
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_name": self.step_name.value,
            "status": self.status.value,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "input_path": self.input_path,
            "output_path": self.output_path,
            "exit_code": self.exit_code,
            "output_data": self.output_data,
            "error_log_path": self.error_log_path,
            "error_message": self.error_message,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StepResult":
        return cls(
            step_name=AgentName(data["step_name"]),
            status=StepStatus(data["status"]),
            started_at=data["started_at"],
            completed_at=data["completed_at"],
            input_path=data["input_path"],
            output_path=data["output_path"],
            exit_code=data["exit_code"],
            output_data=data.get("output_data"),
            error_log_path=data.get("error_log_path"),
            error_message=data.get("error_message"),
        )


@dataclass
class WorkflowState:
    """Main state object persisted for each workflow"""
    task_id: str
    task_description: str
    status: WorkflowStatus = WorkflowStatus.QUEUED
    current_step: Optional[AgentName] = None
    history: List[StepResult] = field(default_factory=list)
    retry_count: int = 0
    rework_count: int = 0
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    last_updated: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def __post_init__(self):
        if isinstance(self.status, str):
            self.status = WorkflowStatus(self.status)
        if isinstance(self.current_step, str):
            self.current_step = AgentName(self.current_step)

    def update_timestamp(self):
        """Update the last_updated timestamp"""
        self.last_updated = datetime.utcnow().isoformat()

    def get_last_output(self) -> Optional[Dict[str, Any]]:
        """Get the output data from the last successful step"""
        for result in reversed(self.history):
            if result.status == StepStatus.SUCCESS and result.output_data:
                return result.output_data
        return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "task_description": self.task_description,
            "status": self.status.value,
            "current_step": self.current_step.value if self.current_step else None,
            "history": [h.to_dict() for h in self.history],
            "retry_count": self.retry_count,
            "rework_count": self.rework_count,
            "created_at": self.created_at,
            "last_updated": self.last_updated,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "WorkflowState":
        history = [StepResult.from_dict(h) for h in data.get("history", [])]
        return cls(
            task_id=data["task_id"],
            task_description=data["task_description"],
            status=WorkflowStatus(data["status"]),
            current_step=AgentName(data["current_step"]) if data.get("current_step") else None,
            history=history,
            retry_count=data.get("retry_count", 0),
            rework_count=data.get("rework_count", 0),
            created_at=data.get("created_at", datetime.utcnow().isoformat()),
            last_updated=data.get("last_updated", datetime.utcnow().isoformat()),
        )


@dataclass
class AgentInput:
    """Input provided to an agent"""
    task_id: str
    task_description: str
    step_name: str
    previous_step_output: Optional[Dict[str, Any]] = None
    context: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "task_description": self.task_description,
            "step_name": self.step_name,
            "previous_step_output": self.previous_step_output,
            "context": self.context,
        }


@dataclass
class AgentOutput:
    """Standardized output from an agent"""
    status: str  # 'success' or 'rejected'
    payload: Dict[str, Any] = field(default_factory=dict)
    message: Optional[str] = None
    feedback: Optional[str] = None  # For reviewer rejection feedback

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "payload": self.payload,
            "message": self.message,
            "feedback": self.feedback,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AgentOutput":
        return cls(
            status=data.get("status", "failure"),
            payload=data.get("payload", {}),
            message=data.get("message"),
            feedback=data.get("feedback"),
        )

    def is_success(self) -> bool:
        return self.status == "success"

    def is_rejected(self) -> bool:
        return self.status == "rejected"
