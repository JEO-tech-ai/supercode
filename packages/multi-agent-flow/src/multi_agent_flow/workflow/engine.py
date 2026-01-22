"""
Workflow Engine - Core state machine for agent chaining
"""
import json
import logging
import subprocess
import time
from pathlib import Path
from datetime import datetime
from threading import Thread, Event
from typing import Optional, Dict, Any, Callable

from .models import (
    AgentName,
    WorkflowStatus,
    StepStatus,
    WorkflowState,
    StepResult,
    AgentInput,
    AgentOutput,
)
from .ipc import FileIPCManager

logger = logging.getLogger(__name__)


# Agent CLI command mapping
AGENT_COMMANDS = {
    AgentName.PLANNER: "opencode",
    AgentName.WRITER: "codex",
    AgentName.REVIEWER: "claude",
    AgentName.TESTER: "codex",
    AgentName.ANALYZER: "gemini",
}


class WorkflowEngine:
    """
    Core workflow engine that manages agent chaining and task execution.

    Features:
    - Sequential agent execution (Planner → Writer → Reviewer → Tester → Analyzer)
    - Feedback loop (Reviewer rejection → Writer rework)
    - Retry mechanism for failures
    - Dead Letter Queue for permanently failed tasks
    """

    def __init__(
        self,
        ipc_manager: Optional[FileIPCManager] = None,
        state_dir: Optional[Path] = None,
        max_retries: int = 3,
        max_reworks: int = 2,
        step_timeout: int = 300,  # 5 minutes per step
    ):
        self.ipc_manager = ipc_manager or FileIPCManager()
        self.state_dir = state_dir or Path.home() / ".multi-agent-flow" / "states"
        self.state_dir.mkdir(parents=True, exist_ok=True)

        self.max_retries = max_retries
        self.max_reworks = max_reworks
        self.step_timeout = step_timeout

        self._running = False
        self._stop_event = Event()
        self._workflows: Dict[str, WorkflowState] = {}

        # Callbacks
        self._on_step_complete: Optional[Callable[[str, StepResult], None]] = None
        self._on_workflow_complete: Optional[Callable[[WorkflowState], None]] = None

        logger.info(f"WorkflowEngine initialized (max_retries={max_retries}, max_reworks={max_reworks})")

    def set_callbacks(
        self,
        on_step_complete: Optional[Callable[[str, StepResult], None]] = None,
        on_workflow_complete: Optional[Callable[[WorkflowState], None]] = None,
    ):
        """Set callback functions for workflow events"""
        self._on_step_complete = on_step_complete
        self._on_workflow_complete = on_workflow_complete

    def load_state(self, task_id: str) -> Optional[WorkflowState]:
        """Load workflow state from file"""
        state_file = self.state_dir / f"{task_id}.json"
        if not state_file.exists():
            return None

        try:
            with open(state_file, 'r') as f:
                data = json.load(f)
            return WorkflowState.from_dict(data)
        except Exception as e:
            logger.error(f"Failed to load state for {task_id}: {e}")
            return None

    def save_state(self, state: WorkflowState):
        """Save workflow state to file"""
        state.update_timestamp()
        state_file = self.state_dir / f"{state.task_id}.json"

        with open(state_file, 'w') as f:
            json.dump(state.to_dict(), f, indent=2)

        self._workflows[state.task_id] = state
        logger.debug(f"Saved state for {state.task_id}: {state.status.value}")

    def start_workflow(self, task_id: str, task_description: str) -> WorkflowState:
        """
        Start a new workflow for a task.

        Args:
            task_id: Unique task identifier
            task_description: Description of what to accomplish

        Returns:
            The initial WorkflowState
        """
        # Check if workflow already exists
        existing = self.load_state(task_id)
        if existing and not existing.status.is_terminal():
            logger.warning(f"Workflow {task_id} already in progress")
            return existing

        # Create new workflow state
        state = WorkflowState(
            task_id=task_id,
            task_description=task_description,
            status=WorkflowStatus.QUEUED,
            current_step=AgentName.PLANNER,
        )

        # Save task definition
        self.ipc_manager.save_task_definition(task_id, task_description)
        self.save_state(state)

        logger.info(f"Started workflow {task_id}")
        return state

    def execute_workflow(self, task_id: str) -> WorkflowState:
        """
        Execute a complete workflow synchronously.

        Args:
            task_id: The task to execute

        Returns:
            Final WorkflowState
        """
        state = self.load_state(task_id)
        if not state:
            raise ValueError(f"Workflow {task_id} not found")

        state.status = WorkflowStatus.DISPATCHING
        self.save_state(state)

        # Execute each step in sequence
        chain = AgentName.get_chain_order()

        while state.current_step and not state.status.is_terminal():
            if self._stop_event.is_set():
                logger.info(f"Workflow {task_id} stopped by request")
                break

            step = state.current_step
            state.status = WorkflowStatus.for_agent(step)
            self.save_state(state)

            logger.info(f"[{task_id}] Executing step: {step.value}")

            # Execute the step
            result = self._execute_step(state, step)
            state.history.append(result)

            # Handle the result
            state = self._transition_state(state, result)
            self.save_state(state)

            # Callback
            if self._on_step_complete:
                self._on_step_complete(task_id, result)

        # Workflow complete callback
        if self._on_workflow_complete:
            self._on_workflow_complete(state)

        return state

    def _execute_step(self, state: WorkflowState, step: AgentName) -> StepResult:
        """Execute a single workflow step"""
        started_at = datetime.utcnow().isoformat()
        input_path, output_path, stderr_path = self.ipc_manager.get_step_paths(
            state.task_id, step
        )

        # Prepare input
        previous_output = state.get_last_output()
        agent_input = AgentInput(
            task_id=state.task_id,
            task_description=state.task_description,
            step_name=step.value,
            previous_step_output=previous_output,
        )
        self.ipc_manager.prepare_step_input(state.task_id, step, agent_input)

        # Create prompt for the agent
        prompt = self.ipc_manager.create_agent_prompt(
            task_id=state.task_id,
            step=step,
            task_description=state.task_description,
            previous_output=previous_output,
        )

        # Execute agent
        exit_code, stderr_content = self._run_agent(step, prompt, output_path)

        # Save stderr if any
        if stderr_content:
            self.ipc_manager.write_step_stderr(state.task_id, step, stderr_content)

        completed_at = datetime.utcnow().isoformat()

        # Read output
        output = self.ipc_manager.read_step_output(state.task_id, step)

        # Determine step status
        if exit_code != 0:
            step_status = StepStatus.FAILURE
        elif output is None:
            step_status = StepStatus.FAILURE
        elif output.is_rejected():
            step_status = StepStatus.REJECTED
        else:
            step_status = StepStatus.SUCCESS

        return StepResult(
            step_name=step,
            status=step_status,
            started_at=started_at,
            completed_at=completed_at,
            input_path=str(input_path),
            output_path=str(output_path),
            exit_code=exit_code,
            output_data=output.to_dict() if output else None,
            error_log_path=str(stderr_path) if stderr_content else None,
            error_message=stderr_content[:500] if stderr_content else None,
        )

    def _run_agent(
        self,
        step: AgentName,
        prompt: str,
        output_path: Path,
    ) -> tuple[int, str]:
        """
        Run an agent CLI with the given prompt.

        Since agents are interactive CLI tools, we'll use a simulated approach
        by writing the output directly for now. In production, this would
        integrate with the actual CLI tools.

        Returns:
            Tuple of (exit_code, stderr_content)
        """
        command = AGENT_COMMANDS.get(step)
        if not command:
            return (1, f"Unknown agent: {step.value}")

        logger.info(f"Running agent: {command}")

        # For now, simulate agent execution by creating a placeholder output
        # In production, this would actually invoke the CLI tool
        try:
            # Create a simulated output
            simulated_output = AgentOutput(
                status="success",
                payload={
                    "step": step.value,
                    "message": f"Completed {step.value} step (simulated)",
                    "timestamp": datetime.utcnow().isoformat(),
                },
                message=f"{step.value.capitalize()} completed successfully",
            )

            with open(output_path, 'w') as f:
                json.dump(simulated_output.to_dict(), f, indent=2)

            return (0, "")

        except Exception as e:
            return (1, str(e))

    def _transition_state(
        self,
        state: WorkflowState,
        result: StepResult
    ) -> WorkflowState:
        """
        Determine the next state based on step result.

        Handles:
        - Success → next step
        - Rejection → rework (Writer) or fail
        - Failure → retry or DLQ
        """
        if result.status == StepStatus.SUCCESS:
            # Move to next step
            next_step = result.step_name.next_agent()
            if next_step:
                state.current_step = next_step
                state.status = WorkflowStatus.DISPATCHING
                state.retry_count = 0  # Reset retry count for new step
            else:
                # Workflow complete
                state.status = WorkflowStatus.COMPLETED
                state.current_step = None
                logger.info(f"Workflow {state.task_id} completed successfully")

        elif result.status == StepStatus.REJECTED:
            # Reviewer rejection - send back to Writer
            if result.step_name == AgentName.REVIEWER:
                if state.rework_count < self.max_reworks:
                    state.rework_count += 1
                    state.current_step = AgentName.WRITER
                    state.status = WorkflowStatus.PENDING_REWORK
                    logger.info(
                        f"Workflow {state.task_id} sent back for rework "
                        f"({state.rework_count}/{self.max_reworks})"
                    )
                else:
                    state.status = WorkflowStatus.FAILED
                    state.current_step = None
                    logger.warning(
                        f"Workflow {state.task_id} failed: max reworks exceeded"
                    )
            else:
                # Other rejections treated as failures
                state = self._handle_failure(state)

        elif result.status in (StepStatus.FAILURE, StepStatus.TIMED_OUT):
            state = self._handle_failure(state)

        return state

    def _handle_failure(self, state: WorkflowState) -> WorkflowState:
        """Handle step failure with retry logic"""
        if state.retry_count < self.max_retries:
            state.retry_count += 1
            state.status = WorkflowStatus.DISPATCHING
            logger.info(
                f"Retrying workflow {state.task_id} "
                f"({state.retry_count}/{self.max_retries})"
            )
        else:
            state.status = WorkflowStatus.IN_DLQ
            state.current_step = None
            logger.warning(f"Workflow {state.task_id} moved to DLQ: max retries exceeded")

        return state

    def get_workflow_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get the current status of a workflow"""
        state = self.load_state(task_id)
        if not state:
            return None

        return {
            "task_id": state.task_id,
            "status": state.status.value,
            "current_step": state.current_step.value if state.current_step else None,
            "retry_count": state.retry_count,
            "rework_count": state.rework_count,
            "steps_completed": len([h for h in state.history if h.status == StepStatus.SUCCESS]),
            "total_steps": len(AgentName.get_chain_order()),
            "history": [
                {
                    "step": h.step_name.value,
                    "status": h.status.value,
                    "duration": h.completed_at,
                }
                for h in state.history
            ],
        }

    def list_workflows(self, status_filter: Optional[WorkflowStatus] = None) -> list:
        """List all workflows, optionally filtered by status"""
        workflows = []

        for state_file in self.state_dir.glob("*.json"):
            try:
                state = self.load_state(state_file.stem)
                if state:
                    if status_filter is None or state.status == status_filter:
                        workflows.append({
                            "task_id": state.task_id,
                            "status": state.status.value,
                            "current_step": state.current_step.value if state.current_step else None,
                            "created_at": state.created_at,
                            "last_updated": state.last_updated,
                        })
            except Exception as e:
                logger.error(f"Error loading state from {state_file}: {e}")

        return sorted(workflows, key=lambda x: x["last_updated"], reverse=True)

    def print_workflow_status(self, task_id: str):
        """Print a formatted workflow status"""
        status = self.get_workflow_status(task_id)
        if not status:
            print(f"Workflow {task_id} not found")
            return

        print("=" * 60)
        print(f"  WORKFLOW STATUS: {task_id}")
        print("=" * 60)
        print(f"  Status:       {status['status']}")
        print(f"  Current Step: {status['current_step'] or 'N/A'}")
        print(f"  Progress:     {status['steps_completed']}/{status['total_steps']} steps")
        print(f"  Retries:      {status['retry_count']}")
        print(f"  Reworks:      {status['rework_count']}")
        print("-" * 60)
        print("  HISTORY:")
        for h in status["history"]:
            icon = "✓" if h["status"] == "success" else "✗"
            print(f"    {icon} {h['step']:12} - {h['status']}")
        print("=" * 60)
