"""
Task Queue Implementation for Multi-Agent Scheduler
Supports in-memory queue with priority ordering.
"""
from abc import ABC, abstractmethod
from collections import deque
from typing import Optional, List, Dict
from threading import Lock
import heapq
import logging

from .task import Task, TaskStatus, TaskPriority

logger = logging.getLogger(__name__)


class TaskQueue(ABC):
    """Abstract base class for task queues."""

    @abstractmethod
    def submit(self, task: Task) -> None:
        """Add a task to the queue."""
        pass

    @abstractmethod
    def get_pending_tasks(self) -> List[Task]:
        """Get all pending tasks."""
        pass

    @abstractmethod
    def get_task(self, task_id: str) -> Optional[Task]:
        """Get a task by ID."""
        pass

    @abstractmethod
    def update_task(self, task: Task) -> None:
        """Update a task in the queue."""
        pass

    @abstractmethod
    def get_runnable_tasks(self) -> List[Task]:
        """Get tasks that are ready to run (dependencies met)."""
        pass


class InMemoryTaskQueue(TaskQueue):
    """
    Thread-safe in-memory task queue with priority support.
    Tasks are ordered by priority (HIGH > NORMAL > LOW) and creation time.
    """

    PRIORITY_MAP = {
        TaskPriority.HIGH: 0,
        TaskPriority.NORMAL: 1,
        TaskPriority.LOW: 2,
    }

    def __init__(self, max_size: int = 100):
        self._tasks: Dict[str, Task] = {}
        self._lock = Lock()
        self._max_size = max_size
        logger.info(f"InMemoryTaskQueue initialized (max_size={max_size})")

    def submit(self, task: Task) -> None:
        """Add a task to the queue."""
        with self._lock:
            if len(self._tasks) >= self._max_size:
                raise RuntimeError(f"Task queue is full (max={self._max_size})")

            self._tasks[task.id] = task
            logger.info(f"Task submitted: {task.id} ({task.description[:50]}...)")

    def get_pending_tasks(self) -> List[Task]:
        """Get all pending tasks, sorted by priority."""
        with self._lock:
            pending = [t for t in self._tasks.values() if t.status == TaskStatus.PENDING]
            return self._sort_by_priority(pending)

    def get_task(self, task_id: str) -> Optional[Task]:
        """Get a task by ID."""
        with self._lock:
            return self._tasks.get(task_id)

    def update_task(self, task: Task) -> None:
        """Update a task in the queue."""
        with self._lock:
            if task.id in self._tasks:
                self._tasks[task.id] = task
                logger.debug(f"Task updated: {task.id} -> {task.status}")

    def get_runnable_tasks(self) -> List[Task]:
        """
        Get tasks that are ready to run.
        A task is runnable if:
        1. Status is PENDING
        2. All dependencies are COMPLETED
        """
        with self._lock:
            runnable = []
            for task in self._tasks.values():
                if task.status != TaskStatus.PENDING:
                    continue

                # Check if all dependencies are completed
                deps_met = all(
                    self._tasks.get(dep_id) and
                    self._tasks[dep_id].status == TaskStatus.COMPLETED
                    for dep_id in task.dependencies
                )

                if deps_met:
                    runnable.append(task)

            return self._sort_by_priority(runnable)

    def get_all_tasks(self) -> List[Task]:
        """Get all tasks in the queue."""
        with self._lock:
            return list(self._tasks.values())

    def get_tasks_by_status(self, status: TaskStatus) -> List[Task]:
        """Get all tasks with a specific status."""
        with self._lock:
            return [t for t in self._tasks.values() if t.status == status]

    def remove_task(self, task_id: str) -> bool:
        """Remove a task from the queue."""
        with self._lock:
            if task_id in self._tasks:
                del self._tasks[task_id]
                logger.info(f"Task removed: {task_id}")
                return True
            return False

    def clear_completed(self) -> int:
        """Remove all completed tasks. Returns count of removed tasks."""
        with self._lock:
            completed_ids = [
                t.id for t in self._tasks.values()
                if t.status in (TaskStatus.COMPLETED, TaskStatus.CANCELLED)
            ]
            for task_id in completed_ids:
                del self._tasks[task_id]
            logger.info(f"Cleared {len(completed_ids)} completed tasks")
            return len(completed_ids)

    def _sort_by_priority(self, tasks: List[Task]) -> List[Task]:
        """Sort tasks by priority (HIGH first) and creation time."""
        return sorted(
            tasks,
            key=lambda t: (self.PRIORITY_MAP[t.priority], t.created_at)
        )

    def stats(self) -> Dict[str, int]:
        """Get queue statistics."""
        with self._lock:
            stats = {
                "total": len(self._tasks),
                "pending": 0,
                "running": 0,
                "completed": 0,
                "failed": 0,
            }
            for task in self._tasks.values():
                if task.status == TaskStatus.PENDING:
                    stats["pending"] += 1
                elif task.status == TaskStatus.RUNNING:
                    stats["running"] += 1
                elif task.status == TaskStatus.COMPLETED:
                    stats["completed"] += 1
                elif task.status == TaskStatus.FAILED:
                    stats["failed"] += 1
            return stats
