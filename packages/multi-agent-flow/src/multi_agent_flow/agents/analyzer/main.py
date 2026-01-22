"""
Analyzer Agent - Analysis and reporting
Port: 8004
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
    logger.info("Analyzer Agent starting up on port 8004...")
    await agent_client.initialize()
    yield
    await agent_client.close()


app = FastAPI(
    title="Analyzer Agent",
    description="Analysis and reporting agent",
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
    return HealthResponse(status="ok", agent="analyzer", port=8004)


@app.post("/api/analyzer/analyze_report", response_model=TaskResponse)
async def analyze_report(request: TaskRequest):
    """Analyze workflow data and generate report"""
    logger.info(f"[{request.task_id}] Generating analysis report...")

    try:
        workflow_data = request.payload.get("workflow_data", {})
        report_type = request.payload.get("report_type", "summary")

        code = workflow_data.get("code", "")
        review = workflow_data.get("review", {})
        tests = workflow_data.get("tests", {})

        # Generate comprehensive report
        report = {
            "task_id": request.task_id,
            "generated_at": datetime.utcnow().isoformat(),
            "summary": "Workflow completed successfully",
            "metrics": {
                "code_lines": len(code.split("\n")) if code else 0,
                "review_issues": len(review.get("review_suggestions", [])) if review else 0,
                "test_coverage": tests.get("test_results", {}).get("coverage", "N/A") if tests else "N/A",
                "tests_passed": tests.get("test_results", {}).get("passed", 0) if tests else 0,
            },
            "recommendations": [
                "Consider adding more comprehensive tests",
                "Add type hints for better code quality",
                "Document public APIs",
            ],
            "quality_score": 85,  # Out of 100
        }

        # Detailed report if requested
        if report_type == "detailed":
            report["detailed_analysis"] = {
                "code_structure": "Well-organized with clear function definitions",
                "review_summary": review,
                "test_summary": tests,
            }

        response = TaskResponse(
            task_id=request.task_id,
            workflow_step=request.workflow_step,
            status=TaskStatus.COMPLETED,
            result={
                "report": report,
                "report_type": report_type,
            },
            next_steps=None,  # Final step
        )

        if request.callback_url:
            await agent_client.send_callback(request.callback_url, response)

        logger.info(f"[{request.task_id}] Analysis completed with score: {report['quality_score']}")
        return response

    except Exception as e:
        logger.error(f"[{request.task_id}] Analysis failed: {e}")
        return TaskResponse(
            task_id=request.task_id,
            workflow_step=request.workflow_step,
            status=TaskStatus.FAILED,
            error={"code": "ANL001", "message": str(e)},
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
