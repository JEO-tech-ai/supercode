"""
Reviewer Agent - Code review
Port: 8002
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware



from multi_agent_flow.shared.models import (
    TaskRequest, TaskResponse, TaskStatus, HealthResponse
)
from multi_agent_flow.shared.client import agent_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Reviewer Agent starting up on port 8002...")
    await agent_client.initialize()
    yield
    await agent_client.close()


app = FastAPI(
    title="Reviewer Agent",
    description="Code review agent",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok", agent="reviewer", port=8002)


@app.post("/api/reviewer/review_code", response_model=TaskResponse)
async def review_code(request: TaskRequest):
    """Review code and provide suggestions"""
    logger.info(f"[{request.task_id}] Reviewing code...")

    try:
        code = request.payload.get("code", "")
        file_name = request.payload.get("file_name", "unknown.py")
        review_level = request.payload.get("review_level", "standard")

        # Simulate code review (replace with actual LLM call)
        lines = code.split("\n")
        suggestions = []

        # Simple heuristic checks
        if not code.strip().startswith('"""') and not code.strip().startswith("'''"):
            suggestions.append({
                "line": 1,
                "severity": "warning",
                "message": "Missing module docstring",
            })

        if "def " in code and '"""' not in code.split("def ")[1].split(":")[0]:
            suggestions.append({
                "line": code.find("def ") + 1,
                "severity": "warning",
                "message": "Consider adding function docstrings",
            })

        overall_status = "approved" if len(suggestions) < 3 else "needs_revision"

        response = TaskResponse(
            task_id=request.task_id,
            workflow_step=request.workflow_step,
            status=TaskStatus.COMPLETED,
            result={
                "review_suggestions": suggestions,
                "overall_status": overall_status,
                "summary": f"Found {len(suggestions)} suggestions in {file_name}",
                "metrics": {
                    "lines_reviewed": len(lines),
                    "issues_found": len(suggestions),
                },
            },
            next_steps="test_execution" if overall_status == "approved" else "code_revision",
        )

        if request.callback_url:
            await agent_client.send_callback(request.callback_url, response)

        logger.info(f"[{request.task_id}] Review completed: {overall_status}")
        return response

    except Exception as e:
        logger.error(f"[{request.task_id}] Review failed: {e}")
        return TaskResponse(
            task_id=request.task_id,
            workflow_step=request.workflow_step,
            status=TaskStatus.FAILED,
            error={"code": "REV001", "message": str(e)},
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
