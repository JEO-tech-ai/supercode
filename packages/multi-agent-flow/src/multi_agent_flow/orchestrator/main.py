"""
Orchestrator Agent - Central coordinator for multi-agent workflow
Port: 8000
"""
import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from multi_agent_flow.shared.models import (
    WorkflowRequest, WorkflowStatusResponse, TaskRequest, TaskResponse,
    TaskStatus, WorkflowStep, HealthResponse, ErrorDetail
)
from multi_agent_flow.shared.client import agent_client
from multi_agent_flow.shared.config import AGENTS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Workflow state storage (in-memory for demo)
workflows: Dict[str, Dict[str, Any]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    logger.info("Orchestrator starting up...")
    await agent_client.initialize()
    yield
    logger.info("Orchestrator shutting down...")
    await agent_client.close()


app = FastAPI(
    title="Orchestrator Agent",
    description="Central coordinator for multi-agent workflow",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Health Check ============

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="ok",
        agent="orchestrator",
        port=8000,
    )


# ============ Workflow Management ============

@app.post("/api/orchestrator/start_workflow", response_model=WorkflowStatusResponse)
async def start_workflow(request: WorkflowRequest, background_tasks: BackgroundTasks):
    """Start a new multi-agent workflow"""
    task_id = str(uuid.uuid4())

    # Initialize workflow state
    workflows[task_id] = {
        "task_id": task_id,
        "workflow_type": request.workflow_type,
        "details": request.details,
        "status": "started",
        "current_step": None,
        "history": [],
        "created_at": datetime.utcnow().isoformat(),
    }

    # Run workflow in background
    background_tasks.add_task(execute_workflow, task_id, request)

    logger.info(f"Workflow started: {task_id}")
    return WorkflowStatusResponse(
        task_id=task_id,
        status="started",
        current_step="initializing",
    )


@app.post("/api/orchestrator/task_status")
async def receive_task_status(response: TaskResponse):
    """Receive status updates from other agents"""
    task_id = response.task_id

    if task_id not in workflows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow {task_id} not found"
        )

    # Update workflow state
    workflows[task_id]["history"].append({
        "step": response.workflow_step,
        "status": response.status,
        "result": response.result,
        "error": response.error.model_dump() if response.error else None,
        "timestamp": datetime.utcnow().isoformat(),
    })

    logger.info(f"Task status received: {task_id} - {response.workflow_step} - {response.status}")
    return {"message": "Status updated successfully"}


@app.get("/api/orchestrator/workflow_status/{task_id}", response_model=WorkflowStatusResponse)
async def get_workflow_status(task_id: str):
    """Get workflow status"""
    if task_id not in workflows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow {task_id} not found"
        )

    wf = workflows[task_id]
    return WorkflowStatusResponse(
        task_id=task_id,
        status=wf["status"],
        current_step=wf["current_step"],
        history=wf["history"],
    )


@app.get("/api/orchestrator/health_all")
async def check_all_agents():
    """Check health of all agents"""
    results = {}
    for agent_name in ["writer", "reviewer", "tester", "analyzer"]:
        results[agent_name] = await agent_client.health_check(agent_name)
    return results


# ============ Workflow Execution ============

async def execute_workflow(task_id: str, request: WorkflowRequest):
    """Execute the full workflow pipeline"""
    try:
        wf = workflows[task_id]

        # Step 1: Code Generation (Writer)
        logger.info(f"[{task_id}] Step 1: Code Generation")
        wf["current_step"] = "code_generation"
        wf["status"] = "in_progress"

        writer_request = TaskRequest(
            task_id=task_id,
            workflow_step=WorkflowStep.CODE_GENERATION,
            payload={
                "description": request.details.get("description", "Generate code"),
                "requirements": request.details.get("requirements", []),
            },
            callback_url=f"http://localhost:8000/api/orchestrator/task_status",
        )

        writer_response = await agent_client.send_task(
            "writer",
            "/api/writer/generate_code",
            writer_request,
        )

        if writer_response.status == TaskStatus.FAILED:
            wf["status"] = "failed"
            return

        generated_code = writer_response.result.get("generated_code", "")

        # Step 2: Code Review (Reviewer)
        logger.info(f"[{task_id}] Step 2: Code Review")
        wf["current_step"] = "code_review"

        reviewer_request = TaskRequest(
            task_id=task_id,
            workflow_step=WorkflowStep.CODE_REVIEW,
            payload={
                "code": generated_code,
                "file_name": "generated_code.py",
            },
            callback_url=f"http://localhost:8000/api/orchestrator/task_status",
        )

        reviewer_response = await agent_client.send_task(
            "reviewer",
            "/api/reviewer/review_code",
            reviewer_request,
        )

        # Step 3: Test Execution (Tester)
        logger.info(f"[{task_id}] Step 3: Test Execution")
        wf["current_step"] = "test_execution"

        tester_request = TaskRequest(
            task_id=task_id,
            workflow_step=WorkflowStep.TEST_EXECUTION,
            payload={
                "code": generated_code,
            },
            callback_url=f"http://localhost:8000/api/orchestrator/task_status",
        )

        tester_response = await agent_client.send_task(
            "tester",
            "/api/tester/execute_tests",
            tester_request,
        )

        # Step 4: Analysis (Analyzer)
        logger.info(f"[{task_id}] Step 4: Analysis")
        wf["current_step"] = "analysis"

        analyzer_request = TaskRequest(
            task_id=task_id,
            workflow_step=WorkflowStep.ANALYSIS,
            payload={
                "workflow_data": {
                    "code": generated_code,
                    "review": reviewer_response.result,
                    "tests": tester_response.result,
                },
            },
            callback_url=f"http://localhost:8000/api/orchestrator/task_status",
        )

        analyzer_response = await agent_client.send_task(
            "analyzer",
            "/api/analyzer/analyze_report",
            analyzer_request,
        )

        # Workflow completed
        wf["status"] = "completed"
        wf["current_step"] = "completed"
        logger.info(f"[{task_id}] Workflow completed successfully")

    except Exception as e:
        logger.error(f"[{task_id}] Workflow failed: {e}")
        workflows[task_id]["status"] = "failed"
        workflows[task_id]["error"] = str(e)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
