"""
Writer Agent - Code generation
Port: 8001
"""
import logging
from datetime import datetime
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
    logger.info("Writer Agent starting up on port 8001...")
    await agent_client.initialize()
    yield
    await agent_client.close()


app = FastAPI(
    title="Writer Agent",
    description="Code generation agent",
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
    return HealthResponse(status="ok", agent="writer", port=8001)


@app.post("/api/writer/generate_code", response_model=TaskResponse)
async def generate_code(request: TaskRequest):
    """Generate code based on description"""
    logger.info(f"[{request.task_id}] Generating code...")

    try:
        description = request.payload.get("description", "")
        requirements = request.payload.get("requirements", [])

        # Simulate code generation (replace with actual LLM call)
        generated_code = f'''"""
Auto-generated code
Description: {description}
Requirements: {', '.join(requirements)}
"""

def main():
    """Main function"""
    print("Hello from generated code!")
    return True

if __name__ == "__main__":
    main()
'''

        response = TaskResponse(
            task_id=request.task_id,
            workflow_step=request.workflow_step,
            status=TaskStatus.COMPLETED,
            result={
                "generated_code": generated_code,
                "file_name": "generated_code.py",
                "lines": len(generated_code.split("\n")),
            },
            next_steps="code_review",
        )

        # Send callback if specified
        if request.callback_url:
            await agent_client.send_callback(request.callback_url, response)

        logger.info(f"[{request.task_id}] Code generated successfully")
        return response

    except Exception as e:
        logger.error(f"[{request.task_id}] Code generation failed: {e}")
        return TaskResponse(
            task_id=request.task_id,
            workflow_step=request.workflow_step,
            status=TaskStatus.FAILED,
            error={"code": "GEN001", "message": str(e)},
        )


@app.post("/api/writer/refactor_code", response_model=TaskResponse)
async def refactor_code(request: TaskRequest):
    """Refactor code based on feedback"""
    logger.info(f"[{request.task_id}] Refactoring code...")

    original_code = request.payload.get("original_code", "")
    feedback = request.payload.get("review_feedback", [])

    # Simulate refactoring
    refactored_code = original_code + "\n# Refactored based on feedback"

    return TaskResponse(
        task_id=request.task_id,
        workflow_step=request.workflow_step,
        status=TaskStatus.COMPLETED,
        result={
            "revised_code": refactored_code,
            "changes_summary": f"Applied {len(feedback)} feedback items",
        },
        next_steps="code_review",
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
