"""
File-based Inter-Process Communication Manager
"""
import json
import logging
import shutil
from pathlib import Path
from typing import Optional, Tuple
from datetime import datetime

from .models import AgentName, AgentInput, AgentOutput

logger = logging.getLogger(__name__)


class FileIPCManager:
    """
    Manages file-based IPC for workflow steps.

    Directory structure per task:
    /base_run_dir/
    └── {task_id}/
        ├── task_definition.json
        ├── planner/
        │   ├── input.json
        │   ├── output.json
        │   └── stderr.log
        ├── writer/
        │   └── ...
        └── ...
    """

    def __init__(self, base_run_dir: Optional[Path] = None):
        if base_run_dir is None:
            base_run_dir = Path.home() / ".multi-agent-flow" / "runs"

        self.base_run_dir = Path(base_run_dir)
        self.base_run_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"FileIPCManager initialized: {self.base_run_dir}")

    def get_task_dir(self, task_id: str) -> Path:
        """Get the directory for a specific task"""
        return self.base_run_dir / task_id

    def get_step_dir(self, task_id: str, step: AgentName) -> Path:
        """Get the directory for a specific step"""
        step_dir = self.get_task_dir(task_id) / step.value
        step_dir.mkdir(parents=True, exist_ok=True)
        return step_dir

    def get_step_paths(self, task_id: str, step: AgentName) -> Tuple[Path, Path, Path]:
        """
        Get the paths for a step's input, output, and stderr files.

        Returns:
            Tuple of (input_path, output_path, stderr_path)
        """
        step_dir = self.get_step_dir(task_id, step)
        return (
            step_dir / "input.json",
            step_dir / "output.json",
            step_dir / "stderr.log",
        )

    def prepare_step_input(
        self,
        task_id: str,
        step: AgentName,
        data: AgentInput
    ) -> Path:
        """
        Create the input.json file for a step.

        Args:
            task_id: The task identifier
            step: The agent step
            data: The input data for the agent

        Returns:
            Path to the created input file
        """
        input_path, _, _ = self.get_step_paths(task_id, step)

        with open(input_path, 'w', encoding='utf-8') as f:
            json.dump(data.to_dict(), f, indent=2, ensure_ascii=False)

        logger.debug(f"Prepared input for {step.value}: {input_path}")
        return input_path

    def read_step_output(self, task_id: str, step: AgentName) -> Optional[AgentOutput]:
        """
        Read and validate the output.json file from a step.

        Args:
            task_id: The task identifier
            step: The agent step

        Returns:
            AgentOutput if file exists and is valid, None otherwise
        """
        _, output_path, _ = self.get_step_paths(task_id, step)

        if not output_path.exists():
            logger.warning(f"Output file not found: {output_path}")
            return None

        try:
            with open(output_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return AgentOutput.from_dict(data)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse output file {output_path}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error reading output file {output_path}: {e}")
            return None

    def read_step_stderr(self, task_id: str, step: AgentName) -> Optional[str]:
        """Read the stderr log from a step"""
        _, _, stderr_path = self.get_step_paths(task_id, step)

        if not stderr_path.exists():
            return None

        try:
            return stderr_path.read_text(encoding='utf-8')
        except Exception as e:
            logger.error(f"Error reading stderr file {stderr_path}: {e}")
            return None

    def write_step_stderr(self, task_id: str, step: AgentName, content: str) -> Path:
        """Write stderr content for a step"""
        _, _, stderr_path = self.get_step_paths(task_id, step)
        stderr_path.write_text(content, encoding='utf-8')
        return stderr_path

    def save_task_definition(self, task_id: str, task_description: str) -> Path:
        """Save the original task definition"""
        task_dir = self.get_task_dir(task_id)
        task_dir.mkdir(parents=True, exist_ok=True)

        definition_path = task_dir / "task_definition.json"
        data = {
            "task_id": task_id,
            "task_description": task_description,
            "created_at": datetime.utcnow().isoformat(),
        }

        with open(definition_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return definition_path

    def cleanup_task(self, task_id: str, keep_results: bool = True) -> None:
        """
        Clean up task directory.

        Args:
            task_id: The task identifier
            keep_results: If True, keep the final output files
        """
        task_dir = self.get_task_dir(task_id)

        if not task_dir.exists():
            return

        if keep_results:
            # Only remove input and stderr files, keep outputs
            for step_dir in task_dir.iterdir():
                if step_dir.is_dir():
                    for file in step_dir.iterdir():
                        if file.name in ("input.json", "stderr.log"):
                            file.unlink()
        else:
            # Remove entire task directory
            shutil.rmtree(task_dir)
            logger.info(f"Cleaned up task directory: {task_dir}")

    def get_all_step_outputs(self, task_id: str) -> dict:
        """Get all outputs from all steps for a task"""
        outputs = {}
        task_dir = self.get_task_dir(task_id)

        if not task_dir.exists():
            return outputs

        for step in AgentName:
            output = self.read_step_output(task_id, step)
            if output:
                outputs[step.value] = output.to_dict()

        return outputs

    def create_agent_prompt(
        self,
        task_id: str,
        step: AgentName,
        task_description: str,
        previous_output: Optional[dict] = None,
    ) -> str:
        """
        Create a prompt string for the agent CLI.

        This generates a formatted prompt that can be piped to the agent.
        """
        prompt_parts = [
            f"[Task ID: {task_id}]",
            f"[Step: {step.value.upper()}]",
            "",
            "## Task Description",
            task_description,
        ]

        if previous_output:
            prompt_parts.extend([
                "",
                "## Previous Step Output",
                json.dumps(previous_output, indent=2, ensure_ascii=False),
            ])

        prompt_parts.extend([
            "",
            "## Instructions",
            f"You are the {step.value.upper()} agent in a multi-agent workflow.",
        ])

        # Add step-specific instructions
        step_instructions = {
            AgentName.PLANNER: "Analyze the task and create a detailed implementation plan.",
            AgentName.WRITER: "Implement the code based on the plan provided.",
            AgentName.REVIEWER: "Review the code for quality, security, and best practices. "
                               "Output 'APPROVED' or 'REJECTED: <reason>' as your verdict.",
            AgentName.TESTER: "Write and execute tests for the implementation.",
            AgentName.ANALYZER: "Analyze the complete workflow results and provide a summary report.",
        }

        prompt_parts.append(step_instructions.get(step, "Complete your assigned task."))

        return "\n".join(prompt_parts)
