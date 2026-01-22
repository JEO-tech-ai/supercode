"""
Parallel Scheduler - Execute workflow steps concurrently
"""
import asyncio
import logging
from typing import Dict, Any, Optional, Set, Callable, Awaitable

from .graph import WorkflowGraph, StepStatus

logger = logging.getLogger(__name__)


class ParallelScheduler:
    """
    Scheduler for parallel workflow execution based on DAG dependencies.

    Features:
    - Automatic parallelization of independent steps
    - Dependency resolution
    - Concurrent execution with asyncio
    - Progress tracking
    """

    def __init__(
        self,
        graph: WorkflowGraph,
        step_executor: Callable[[str], Awaitable[Dict[str, Any]]],
        max_concurrent: int = 4,
    ):
        """
        Initialize the parallel scheduler.

        Args:
            graph: The workflow DAG
            step_executor: Async function to execute a step by name
            max_concurrent: Maximum concurrent step executions
        """
        self.graph = graph
        self.step_executor = step_executor
        self.max_concurrent = max_concurrent

        self._completed: Set[str] = set()
        self._failed: Set[str] = set()
        self._running: Set[str] = set()
        self._results: Dict[str, Any] = {}
        self._semaphore: Optional[asyncio.Semaphore] = None

    async def run(self) -> Dict[str, Any]:
        """
        Execute the entire workflow in parallel where possible.

        Returns:
            Dictionary of step results
        """
        self._semaphore = asyncio.Semaphore(self.max_concurrent)

        try:
            # Get parallel groups
            groups = self.graph.get_parallel_groups()
            logger.info(f"Parallel groups: {groups}")

            for group in groups:
                # Check if we should stop due to failures
                if self._failed:
                    logger.warning(f"Skipping remaining steps due to failures: {self._failed}")
                    break

                # Execute all steps in this group concurrently
                tasks = [
                    self._execute_step_with_semaphore(step_name)
                    for step_name in group
                    if step_name not in self._completed and step_name not in self._failed
                ]

                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)

        except Exception as e:
            logger.error(f"Parallel execution error: {e}")

        return {
            "results": self._results,
            "completed": list(self._completed),
            "failed": list(self._failed),
            "success": len(self._failed) == 0,
        }

    async def _execute_step_with_semaphore(self, step_name: str):
        """Execute a step with concurrency control"""
        async with self._semaphore:
            await self._execute_step(step_name)

    async def _execute_step(self, step_name: str):
        """Execute a single step"""
        self._running.add(step_name)
        self.graph.mark_running(step_name)

        logger.info(f"Starting step: {step_name}")

        try:
            result = await self.step_executor(step_name)
            self._results[step_name] = result
            self._completed.add(step_name)
            self.graph.mark_completed(step_name)
            logger.info(f"Completed step: {step_name}")

        except Exception as e:
            logger.error(f"Step {step_name} failed: {e}")
            self._failed.add(step_name)
            self.graph.mark_failed(step_name)
            self._results[step_name] = {"error": str(e)}

        finally:
            self._running.discard(step_name)

    @property
    def progress(self) -> Dict[str, Any]:
        """Get current execution progress"""
        total = len(self.graph)
        return {
            "total": total,
            "completed": len(self._completed),
            "failed": len(self._failed),
            "running": len(self._running),
            "pending": total - len(self._completed) - len(self._failed) - len(self._running),
            "percent": round(len(self._completed) / total * 100, 1) if total > 0 else 0,
        }


class AdaptiveScheduler(ParallelScheduler):
    """
    Adaptive scheduler that adjusts concurrency based on resource usage.

    Extends ParallelScheduler with:
    - Dynamic concurrency adjustment
    - Resource monitoring
    - Priority-based scheduling
    """

    def __init__(
        self,
        graph: WorkflowGraph,
        step_executor: Callable[[str], Awaitable[Dict[str, Any]]],
        min_concurrent: int = 1,
        max_concurrent: int = 4,
    ):
        super().__init__(graph, step_executor, max_concurrent)
        self.min_concurrent = min_concurrent
        self._current_concurrent = max_concurrent

    async def _adjust_concurrency(self):
        """Adjust concurrency based on resource usage (placeholder)"""
        # In production, this would check CPU/memory usage
        # and adjust self._current_concurrent accordingly
        pass


async def run_parallel_workflow(
    graph: WorkflowGraph,
    step_executor: Callable[[str], Awaitable[Dict[str, Any]]],
    max_concurrent: int = 4,
) -> Dict[str, Any]:
    """
    Convenience function to run a workflow in parallel.

    Args:
        graph: Workflow DAG
        step_executor: Function to execute steps
        max_concurrent: Max parallel executions

    Returns:
        Execution results
    """
    scheduler = ParallelScheduler(graph, step_executor, max_concurrent)
    return await scheduler.run()
