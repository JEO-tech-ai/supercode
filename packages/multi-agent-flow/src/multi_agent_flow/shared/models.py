"""
Shared Pydantic models for Multi-Agent Port Communication
"""
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from enum import Enum
from datetime import datetime
import uuid


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class WorkflowStep(str, Enum):
    CODE_GENERATION = "code_generation"
    CODE_REVIEW = "code_review"
    CODE_REVISION = "code_revision"
    TEST_EXECUTION = "test_execution"
    ANALYSIS = "analysis"


class AgentType(str, Enum):
    ORCHESTRATOR = "orchestrator"
    WRITER = "writer"
    REVIEWER = "reviewer"
    TESTER = "tester"
    ANALYZER = "analyzer"


# ============ Request Models ============

class TaskRequest(BaseModel):
    """Base request model for inter-agent communication"""
    task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workflow_step: WorkflowStep
    payload: Dict[str, Any]
    callback_url: Optional[str] = None
    priority: str = "medium"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True


class WorkflowRequest(BaseModel):
    """Request to start a new workflow"""
    workflow_type: str
    details: Dict[str, Any]


# ============ Response Models ============

class ErrorDetail(BaseModel):
    """Error information"""
    code: str
    message: str
    details: Optional[str] = None


class TaskResponse(BaseModel):
    """Base response model for inter-agent communication"""
    task_id: str
    workflow_step: str
    status: TaskStatus
    result: Optional[Dict[str, Any]] = None
    error: Optional[ErrorDetail] = None
    next_steps: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True


class WorkflowStatusResponse(BaseModel):
    """Workflow status response"""
    task_id: str
    status: str
    current_step: Optional[str] = None
    progress: Optional[float] = None
    history: Optional[List[Dict[str, Any]]] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = "ok"
    agent: str
    port: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============ Payload Models ============

class CodeGenerationPayload(BaseModel):
    """Payload for code generation task"""
    description: str
    requirements: List[str] = []
    language: str = "python"
    context: Optional[Dict[str, Any]] = None


class CodeReviewPayload(BaseModel):
    """Payload for code review task"""
    code: str
    file_name: str
    review_level: str = "standard"  # standard, strict, quick


class TestExecutionPayload(BaseModel):
    """Payload for test execution task"""
    code: str
    test_code: Optional[str] = None
    test_suite_path: Optional[str] = None


class AnalysisPayload(BaseModel):
    """Payload for analysis task"""
    workflow_data: Dict[str, Any]
    report_type: str = "summary"  # summary, detailed, metrics
