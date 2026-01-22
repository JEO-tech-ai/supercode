"""
Task Scheduler - Main orchestration logic for multi-agent task execution
"""
import logging
import threading
import time
from pathlib import Path
from typing import Dict, Optional, Callable, Any
from datetime import datetime

from .task import Task, TaskStatus, TaskPriority, AgentState, AgentStatus
from .queue import InMemoryTaskQueue
from .state_manager import AgentStateManager

logger = logging.getLogger(__name__)


class TaskScheduler:
    """
    Central task scheduler for multi-agent system.

    Features:
    - Priority-based task queue
    - Dependency resolution
    - Parallel task execution
    - Agent state management
    - File-based state persistence
    """

    def __init__(
        self,
        state_file: Optional[Path] = None,
        max_queue_size: int = 100,
        poll_interval: float = 2.0,
    ):
        self.queue = InMemoryTaskQueue(max_size=max_queue_size)
        self.state_manager = AgentStateManager(state_file)
        self.poll_interval = poll_interval

        self._running = False
        self._scheduler_thread: Optional[threading.Thread] = None
        self._task_handlers: Dict[str, Callable] = {}

        logger.info("TaskScheduler initialized")

    def register_agents_from_config(self, agents_config: Dict[str, Any]) -> None:
        """
        Register agents from LauncherManager configuration.
        """
        for agent_id, config in agents_config.items():
            agent_state = AgentState(
                id=agent_id,
                name=config.name,
                port=config.port,
                roles=config.roles,
                model=config.model,
                status=AgentStatus.IDLE,
            )
            self.state_manager.register_agent(agent_state)

        logger.info(f"Registered {len(agents_config)} agents")

    def register_task_handler(self, role: str, handler: Callable[[Task, AgentState], Any]) -> None:
        """
        Register a handler function for a specific role.
        The handler is called when a task is dispatched to an agent with that role.
        """
        self._task_handlers[role] = handler
        logger.info(f"Registered task handler for role: {role}")

    def submit_task(
        self,
        description: str,
        target_role: str,
        priority: TaskPriority = TaskPriority.NORMAL,
        dependencies: list[str] = None,
        metadata: Dict[str, Any] = None,
    ) -> Task:
        """
        Submit a new task to the scheduler.

        Args:
            description: Task description
            target_role: Role required to execute (planner, writer, tester, etc.)
            priority: Task priority level
            dependencies: List of task IDs that must complete first
            metadata: Additional task metadata

        Returns:
            The created Task object
        """
        task = Task(
            description=description,
            target_role=target_role,
            priority=priority,
            dependencies=dependencies or [],
            metadata=metadata or {},
        )
        self.queue.submit(task)
        logger.info(f"Task submitted: {task.id} -> {target_role}")
        return task

    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a task."""
        task = self.queue.get_task(task_id)
        if task:
            return task.to_dict()
        return None

    def cancel_task(self, task_id: str) -> bool:
        """Cancel a pending task."""
        task = self.queue.get_task(task_id)
        if task and task.status == TaskStatus.PENDING:
            task.status = TaskStatus.CANCELLED
            task.updated_at = datetime.utcnow().isoformat()
            self.queue.update_task(task)
            logger.info(f"Task cancelled: {task_id}")
            return True
        return False

    def _find_agent_for_task(self, task: Task) -> Optional[AgentState]:
        """Find an available agent that can handle the task's role."""
        available = self.state_manager.get_available_agents(role=task.target_role)
        if available:
            return available[0]  # Return first available agent
        return None

    def _dispatch_task(self, task: Task, agent: AgentState) -> None:
        """Dispatch a task to an agent."""
        logger.info(f"Dispatching task {task.id} to agent {agent.id}")

        # Update task status
        task.status = TaskStatus.RUNNING
        task.assigned_agent_id = agent.id
        task.started_at = datetime.utcnow().isoformat()
        task.updated_at = task.started_at
        self.queue.update_task(task)

        # Update agent status
        self.state_manager.set_agent_working(agent.id, task.id)

        # Execute task in a separate thread
        def execute():
            try:
                result = self._execute_task(task, agent)
                self._complete_task(task.id, result)
            except Exception as e:
                logger.error(f"Task {task.id} failed: {e}")
                self._fail_task(task.id, str(e))

        thread = threading.Thread(target=execute, daemon=True)
        thread.start()

    def _execute_task(self, task: Task, agent: AgentState) -> Dict[str, Any]:
        """
        Execute a task. Override this method or register handlers for custom execution.
        """
        handler = self._task_handlers.get(task.target_role)

        if handler:
            return handler(task, agent)

        # Default: simulate task execution
        logger.info(f"Executing task {task.id} on agent {agent.id}")
        time.sleep(1)  # Simulate work

        return {
            "status": "completed",
            "message": f"Task executed by {agent.id}",
            "timestamp": datetime.utcnow().isoformat(),
        }

    def _complete_task(self, task_id: str, result: Dict[str, Any]) -> None:
        """Mark a task as completed."""
        task = self.queue.get_task(task_id)
        if not task:
            return

        task.status = TaskStatus.COMPLETED
        task.result = result
        task.completed_at = datetime.utcnow().isoformat()
        task.updated_at = task.completed_at
        self.queue.update_task(task)

        if task.assigned_agent_id:
            self.state_manager.set_agent_idle(task.assigned_agent_id, task_completed=True)

        logger.info(f"Task completed: {task_id}")

    def _fail_task(self, task_id: str, error: str) -> None:
        """Mark a task as failed."""
        task = self.queue.get_task(task_id)
        if not task:
            return

        task.status = TaskStatus.FAILED
        task.error = error
        task.completed_at = datetime.utcnow().isoformat()
        task.updated_at = task.completed_at
        self.queue.update_task(task)

        if task.assigned_agent_id:
            self.state_manager.set_agent_error(task.assigned_agent_id, error)

        logger.error(f"Task failed: {task_id} - {error}")

    def _process_queue(self) -> int:
        """
        Process the task queue. Returns number of tasks dispatched.
        """
        dispatched = 0
        runnable_tasks = self.queue.get_runnable_tasks()

        for task in runnable_tasks:
            agent = self._find_agent_for_task(task)
            if agent:
                self._dispatch_task(task, agent)
                dispatched += 1

        return dispatched

    def start(self) -> None:
        """Start the scheduler loop in a background thread."""
        if self._running:
            logger.warning("Scheduler is already running")
            return

        self._running = True

        def scheduler_loop():
            logger.info("Scheduler loop started")
            while self._running:
                try:
                    self._process_queue()
                except Exception as e:
                    logger.error(f"Scheduler error: {e}")
                time.sleep(self.poll_interval)
            logger.info("Scheduler loop stopped")

        self._scheduler_thread = threading.Thread(target=scheduler_loop, daemon=True)
        self._scheduler_thread.start()
        logger.info("TaskScheduler started")

    def stop(self) -> None:
        """Stop the scheduler loop."""
        self._running = False
        if self._scheduler_thread:
            self._scheduler_thread.join(timeout=5.0)
        logger.info("TaskScheduler stopped")

    def get_status(self) -> Dict[str, Any]:
        """Get overall scheduler status."""
        queue_stats = self.queue.stats()
        agent_states = self.state_manager.get_all_states()

        return {
            "running": self._running,
            "queue": queue_stats,
            "agents": {
                agent_id: state.to_dict()
                for agent_id, state in agent_states.items()
            },
            "timestamp": datetime.utcnow().isoformat(),
        }

    def print_status(self) -> None:
        """Print formatted status to console."""
        status = self.get_status()
        queue = status["queue"]

        print("\n" + "=" * 60)
        print("  TASK SCHEDULER STATUS")
        print("=" * 60)
        print(f"  Running: {'Yes' if status['running'] else 'No'}")
        print(f"  Tasks - Pending: {queue['pending']} | Running: {queue['running']} | "
              f"Completed: {queue['completed']} | Failed: {queue['failed']}")
        print("=" * 60)
        print(self.state_manager.print_status())
