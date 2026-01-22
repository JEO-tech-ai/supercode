"""
WebSocket Connection Manager
"""
import asyncio
import logging
from typing import Dict, List, Set
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class Connection:
    """Represents a WebSocket connection"""
    websocket: any
    task_ids: Set[str] = field(default_factory=set)


class ConnectionManager:
    """
    Manages WebSocket connections for the dashboard.

    Features:
    - Per-task subscription (clients can subscribe to specific tasks)
    - Broadcast to all connections
    - Connection lifecycle management
    """

    def __init__(self):
        self._connections: List[Connection] = []
        self._task_subscriptions: Dict[str, Set[any]] = {}  # task_id -> websockets
        self._lock = asyncio.Lock()

    async def connect(self, websocket, task_id: str = None):
        """
        Register a new WebSocket connection.

        Args:
            websocket: The WebSocket connection
            task_id: Optional task ID to subscribe to
        """
        async with self._lock:
            conn = Connection(websocket=websocket)
            if task_id:
                conn.task_ids.add(task_id)
                if task_id not in self._task_subscriptions:
                    self._task_subscriptions[task_id] = set()
                self._task_subscriptions[task_id].add(websocket)

            self._connections.append(conn)
            logger.info(f"WebSocket connected (total: {len(self._connections)})")

    async def disconnect(self, websocket):
        """
        Remove a WebSocket connection.

        Args:
            websocket: The WebSocket connection to remove
        """
        async with self._lock:
            # Remove from connections list
            self._connections = [
                c for c in self._connections if c.websocket != websocket
            ]

            # Remove from task subscriptions
            for task_id, sockets in self._task_subscriptions.items():
                sockets.discard(websocket)

            logger.info(f"WebSocket disconnected (total: {len(self._connections)})")

    async def subscribe(self, websocket, task_id: str):
        """Subscribe a connection to a task"""
        async with self._lock:
            for conn in self._connections:
                if conn.websocket == websocket:
                    conn.task_ids.add(task_id)
                    break

            if task_id not in self._task_subscriptions:
                self._task_subscriptions[task_id] = set()
            self._task_subscriptions[task_id].add(websocket)

    async def unsubscribe(self, websocket, task_id: str):
        """Unsubscribe a connection from a task"""
        async with self._lock:
            for conn in self._connections:
                if conn.websocket == websocket:
                    conn.task_ids.discard(task_id)
                    break

            if task_id in self._task_subscriptions:
                self._task_subscriptions[task_id].discard(websocket)

    async def broadcast(self, message: str, task_id: str = None):
        """
        Broadcast a message to connected clients.

        Args:
            message: JSON message to broadcast
            task_id: If provided, only send to subscribers of this task
        """
        if task_id:
            # Send to task subscribers only
            websockets = self._task_subscriptions.get(task_id, set())
        else:
            # Send to all connections
            websockets = {c.websocket for c in self._connections}

        if not websockets:
            return

        # Send to all websockets concurrently
        send_tasks = []
        for ws in websockets:
            try:
                send_tasks.append(ws.send_text(message))
            except Exception as e:
                logger.warning(f"Failed to queue message: {e}")

        if send_tasks:
            results = await asyncio.gather(*send_tasks, return_exceptions=True)
            for result in results:
                if isinstance(result, Exception):
                    logger.warning(f"Broadcast error: {result}")

    @property
    def connection_count(self) -> int:
        """Get the number of active connections"""
        return len(self._connections)

    def get_subscribed_tasks(self, websocket) -> Set[str]:
        """Get the tasks a connection is subscribed to"""
        for conn in self._connections:
            if conn.websocket == websocket:
                return conn.task_ids
        return set()
