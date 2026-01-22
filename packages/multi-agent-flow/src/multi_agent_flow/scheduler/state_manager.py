"""
Agent State Manager - Persists agent states to JSON file
"""
import json
import logging
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime
from threading import RLock

from .task import AgentState, AgentStatus

logger = logging.getLogger(__name__)


class AgentStateManager:
    """
    Manages agent states with file-based persistence.
    Thread-safe with in-process locking.
    """

    def __init__(self, state_file: Optional[Path] = None):
        if state_file is None:
            state_file = Path.home() / ".multi-agent-flow" / "agent_status.json"

        self.state_file = Path(state_file)
        self.state_file.parent.mkdir(parents=True, exist_ok=True)

        self._lock = RLock()  # Reentrant lock to allow nested locking
        self._states: Dict[str, AgentState] = {}

        logger.info(f"AgentStateManager initialized: {self.state_file}")

    def load(self) -> Dict[str, AgentState]:
        """Load agent states from file."""
        with self._lock:
            if not self.state_file.exists():
                logger.info("No state file found, starting fresh")
                return {}

            try:
                with open(self.state_file, 'r') as f:
                    data = json.load(f)

                self._states = {}
                for agent_id, state_data in data.get("agents", {}).items():
                    try:
                        self._states[agent_id] = AgentState.from_dict(state_data)
                    except Exception as e:
                        logger.warning(f"Failed to load state for {agent_id}: {e}")

                logger.info(f"Loaded {len(self._states)} agent states")
                return self._states.copy()

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse state file: {e}")
                return {}

    def save(self, states: Optional[Dict[str, AgentState]] = None) -> None:
        """Save agent states to file."""
        if states is not None:
            self._states = states

        with self._lock:
            data = {
                "last_updated": datetime.utcnow().isoformat(),
                "agents": {
                    agent_id: state.to_dict()
                    for agent_id, state in self._states.items()
                }
            }

            with open(self.state_file, 'w') as f:
                json.dump(data, f, indent=2)

            logger.debug(f"Saved {len(self._states)} agent states")

    def get_state(self, agent_id: str) -> Optional[AgentState]:
        """Get state for a specific agent."""
        with self._lock:
            return self._states.get(agent_id)

    def update_state(self, agent_id: str, **updates) -> Optional[AgentState]:
        """
        Update specific fields of an agent's state.
        Returns the updated state or None if agent not found.
        """
        with self._lock:
            if agent_id not in self._states:
                return None

            state = self._states[agent_id]

            for key, value in updates.items():
                if hasattr(state, key):
                    setattr(state, key, value)

            state.last_seen = datetime.utcnow().isoformat()
            self.save()
            return state

    def set_agent_working(self, agent_id: str, task_id: str) -> Optional[AgentState]:
        """Mark an agent as working on a task."""
        return self.update_state(
            agent_id,
            status=AgentStatus.WORKING,
            current_task_id=task_id
        )

    def set_agent_idle(self, agent_id: str, task_completed: bool = True) -> Optional[AgentState]:
        """Mark an agent as idle (finished task)."""
        state = self._states.get(agent_id)
        if state:
            if task_completed:
                state.tasks_completed += 1
            return self.update_state(
                agent_id,
                status=AgentStatus.IDLE,
                current_task_id=None
            )
        return None

    def set_agent_error(self, agent_id: str, error_message: str) -> Optional[AgentState]:
        """Mark an agent as having an error."""
        state = self._states.get(agent_id)
        if state:
            state.tasks_failed += 1
            return self.update_state(
                agent_id,
                status=AgentStatus.ERROR,
                error_message=error_message
            )
        return None

    def register_agent(self, agent_state: AgentState) -> None:
        """Register a new agent or update existing."""
        with self._lock:
            self._states[agent_state.id] = agent_state
            self.save()
            logger.info(f"Registered agent: {agent_state.id}")

    def get_available_agents(self, role: Optional[str] = None) -> list[AgentState]:
        """Get all available (IDLE) agents, optionally filtered by role."""
        with self._lock:
            available = []
            for state in self._states.values():
                if state.status != AgentStatus.IDLE:
                    continue
                if role and not state.can_handle_role(role):
                    continue
                available.append(state)
            return available

    def get_all_states(self) -> Dict[str, AgentState]:
        """Get all agent states."""
        with self._lock:
            return self._states.copy()

    def print_status(self) -> str:
        """Get formatted status string for all agents."""
        lines = []
        lines.append("=" * 60)
        lines.append("  AGENT STATUS")
        lines.append("=" * 60)

        for agent_id, state in self._states.items():
            status_icon = {
                AgentStatus.IDLE: "\033[32m●\033[0m",      # Green
                AgentStatus.WORKING: "\033[33m●\033[0m",   # Yellow
                AgentStatus.ERROR: "\033[31m●\033[0m",     # Red
                AgentStatus.OFFLINE: "\033[90m●\033[0m",   # Gray
                AgentStatus.UNKNOWN: "\033[90m●\033[0m",   # Gray
            }.get(state.status, "●")

            task_info = f"Task: {state.current_task_id}" if state.current_task_id else ""
            lines.append(
                f"  {status_icon} {state.name:15} {state.model:10} "
                f"Port: {state.port}  {state.status.value:8} {task_info}"
            )

        lines.append("=" * 60)

        working = sum(1 for s in self._states.values() if s.status == AgentStatus.WORKING)
        idle = sum(1 for s in self._states.values() if s.status == AgentStatus.IDLE)
        lines.append(f"  Working: {working}  |  Idle: {idle}  |  Total: {len(self._states)}")
        lines.append("=" * 60)

        return "\n".join(lines)
