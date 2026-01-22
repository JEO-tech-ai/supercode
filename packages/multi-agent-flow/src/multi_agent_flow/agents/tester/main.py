"""
Tester Agent - Test execution
Port: 8003
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
    logger.info("Tester Agent starting up on port 8003...")
    await agent_client.initialize()
    yield
    await agent_client.close()


app = FastAPI(
    title="Tester Agent",
    description="Test execution agent",
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
    return HealthResponse(status="ok", agent="tester", port=8003)


@app.post("/api/tester/execute_tests", response_model=TaskResponse)
async def execute_tests(request: TaskRequest):
    """Execute tests on provided code"""
    logger.info(f"[{request.task_id}] Executing tests...")

    try:
        code = request.payload.get("code", "")
        test_code = request.payload.get("test_code", "")

        # Simulate test execution (replace with actual test runner)
        test_results = {
            "total_tests": 5,
            "passed": 5,
            "failed": 0,
            "skipped": 0,
            "coverage": "85%",
            "execution_time": "0.23s",
            "test_log": [
                {"test": "test_main_exists", "status": "PASSED"},
                {"test": "test_main_returns_true", "status": "PASSED"},
                {"test": "test_no_exceptions", "status": "PASSED"},
                {"test": "test_code_style", "status": "PASSED"},
                {"test": "test_imports", "status": "PASSED"},
            ],
        }

        overall_status = "passed" if test_results["failed"] == 0 else "failed"

        response = TaskResponse(
            task_id=request.task_id,
            workflow_step=request.workflow_step,
            status=TaskStatus.COMPLETED,
            result={
                "test_results": test_results,
                "overall_status": overall_status,
                "summary": f"Tests: {test_results['passed']}/{test_results['total_tests']} passed",
            },
            next_steps="analysis" if overall_status == "passed" else "code_revision",
        )

        if request.callback_url:
            await agent_client.send_callback(request.callback_url, response)

        logger.info(f"[{request.task_id}] Tests completed: {overall_status}")
        return response

    except Exception as e:
        logger.error(f"[{request.task_id}] Test execution failed: {e}")
        return TaskResponse(
            task_id=request.task_id,
            workflow_step=request.workflow_step,
            status=TaskStatus.FAILED,
            error={"code": "TEST001", "message": str(e)},
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
