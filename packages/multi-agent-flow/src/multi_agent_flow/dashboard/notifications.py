"""
Notification Manager - Dispatches workflow events
"""
import asyncio
import json
import logging
from typing import Optional, List, Callable, Any

from ..shared.events import WorkflowEvent, EventType

logger = logging.getLogger(__name__)


class NotificationManager:
    """
    Central notification dispatcher for workflow events.

    Supports multiple notification channels:
    - WebSocket (real-time dashboard)
    - Callbacks (for in-process handlers)
    - File logging (for audit trail)
    """

    def __init__(self):
        self._websocket_sender: Optional[Callable[[str, str], Any]] = None
        self._callbacks: List[Callable[[WorkflowEvent], None]] = []
        self._event_log: List[WorkflowEvent] = []
        self._log_events = False

    def set_websocket_sender(self, sender: Callable[[str, str], Any]):
        """
        Set the WebSocket broadcast function.

        Args:
            sender: Async function that sends messages (message, task_id) -> None
        """
        self._websocket_sender = sender

    def add_callback(self, callback: Callable[[WorkflowEvent], None]):
        """Add a callback for event notifications"""
        self._callbacks.append(callback)

    def remove_callback(self, callback: Callable[[WorkflowEvent], None]):
        """Remove a callback"""
        self._callbacks = [c for c in self._callbacks if c != callback]

    def enable_logging(self, enabled: bool = True):
        """Enable/disable event logging"""
        self._log_events = enabled

    async def notify(self, event: WorkflowEvent):
        """
        Send a notification for a workflow event.

        Args:
            event: The workflow event to broadcast
        """
        # Log event
        if self._log_events:
            self._event_log.append(event)

        logger.debug(
            f"Event: {event.event_type.value} "
            f"task={event.task_id} step={event.step_name}"
        )

        # Send to WebSocket
        if self._websocket_sender:
            try:
                message = json.dumps(event.to_dict())
                await self._websocket_sender(message, event.task_id)
            except Exception as e:
                logger.warning(f"WebSocket notification failed: {e}")

        # Call callbacks
        for callback in self._callbacks:
            try:
                result = callback(event)
                # Handle async callbacks
                if asyncio.iscoroutine(result):
                    await result
            except Exception as e:
                logger.warning(f"Callback notification failed: {e}")

    # Convenience methods for common events

    async def workflow_started(self, task_id: str, description: str):
        """Notify workflow start"""
        event = WorkflowEvent.workflow_start(task_id, description)
        await self.notify(event)

    async def workflow_ended(self, task_id: str, status: str, summary: dict = None):
        """Notify workflow end"""
        event = WorkflowEvent.workflow_end(task_id, status, summary or {})
        await self.notify(event)

    async def step_started(self, task_id: str, step_name: str):
        """Notify step start"""
        event = WorkflowEvent.step_start(task_id, step_name)
        await self.notify(event)

    async def step_log(self, task_id: str, step_name: str, message: str, level: str = "info"):
        """Send step log message"""
        event = WorkflowEvent.step_log(task_id, step_name, message, level)
        await self.notify(event)

    async def step_ended(self, task_id: str, step_name: str, status: str, output: dict = None):
        """Notify step end"""
        event = WorkflowEvent.step_end(task_id, step_name, status, output)
        await self.notify(event)

    async def cache_hit(self, task_id: str, step_name: str, cache_key: str):
        """Notify cache hit"""
        event = WorkflowEvent.step_cache_hit(task_id, step_name, cache_key)
        await self.notify(event)

    async def error(self, task_id: str, message: str, step_name: str = None):
        """Notify error"""
        event = WorkflowEvent.error(task_id, message, step_name)
        await self.notify(event)

    def get_event_log(self, task_id: str = None) -> List[WorkflowEvent]:
        """
        Get logged events.

        Args:
            task_id: Filter by task ID (None for all events)

        Returns:
            List of events
        """
        if task_id:
            return [e for e in self._event_log if e.task_id == task_id]
        return list(self._event_log)

    def clear_event_log(self):
        """Clear the event log"""
        self._event_log.clear()
