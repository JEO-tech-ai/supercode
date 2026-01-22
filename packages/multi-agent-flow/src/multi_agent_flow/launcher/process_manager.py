"""
Process Manager Module for Multi-Agent System
Handles agent process lifecycle and health monitoring
"""
import os
import signal
import time
import logging
import subprocess
from dataclasses import dataclass, field
from typing import Dict, Optional, Callable, Any
from datetime import datetime

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

logger = logging.getLogger(__name__)


@dataclass
class AgentProcess:
    """Represents a running agent process."""
    name: str
    agent_id: str
    command: str
    port: int
    model: str
    pid: Optional[int] = None
    process_obj: Optional[subprocess.Popen] = None
    status: str = "pending"  # pending, starting, running, stopped, error
    start_time: Optional[datetime] = None
    terminal_type: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "agent_id": self.agent_id,
            "port": self.port,
            "model": self.model,
            "pid": self.pid,
            "status": self.status,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "terminal_type": self.terminal_type,
        }


class ProcessManager:
    """Manages agent process lifecycle."""

    def __init__(self):
        self.agents: Dict[str, AgentProcess] = {}
        logger.info("ProcessManager initialized")

    def register_agent(
        self,
        name: str,
        agent_id: str,
        command: str,
        port: int,
        model: str,
    ) -> AgentProcess:
        """Register an agent (before starting)."""
        agent = AgentProcess(
            name=name,
            agent_id=agent_id,
            command=command,
            port=port,
            model=model,
        )
        self.agents[agent_id] = agent
        logger.info(f"Registered agent: {name} ({agent_id})")
        return agent

    def start_agent(
        self,
        agent_id: str,
        launcher_func: Callable,
        env: Optional[Dict[str, str]] = None,
    ) -> AgentProcess:
        """Start a registered agent using the provided launcher function."""
        if agent_id not in self.agents:
            raise ValueError(f"Agent {agent_id} not registered")

        agent = self.agents[agent_id]

        if self.is_running(agent_id):
            logger.warning(f"Agent {agent.name} is already running")
            return agent

        agent.status = "starting"
        logger.info(f"Starting agent: {agent.name} on port {agent.port}")

        # Prepare environment (only SUPERCODE-specific vars for terminal launch)
        process_env = {
            "PORT": str(agent.port),
            "SUPERCODE_AGENT_ID": agent_id,
            "SUPERCODE_MODEL": agent.model,
        }
        if env:
            # Only include SUPERCODE_ prefixed vars from env
            for k, v in env.items():
                if k.startswith("SUPERCODE"):
                    process_env[k] = v

        try:
            # Call the launcher function
            process_obj, pid = launcher_func(
                command=agent.command,
                agent_name=agent.name,
                port=agent.port,
                env=process_env,
            )

            agent.process_obj = process_obj
            agent.pid = pid
            agent.status = "running"
            agent.start_time = datetime.now()
            logger.info(f"Agent {agent.name} started (PID: {pid})")
            return agent

        except Exception as e:
            agent.status = "error"
            logger.error(f"Failed to start agent {agent.name}: {e}")
            raise

    def stop_agent(self, agent_id: str, timeout: float = 5.0) -> bool:
        """Stop an agent gracefully."""
        if agent_id not in self.agents:
            logger.warning(f"Agent {agent_id} not found")
            return False

        agent = self.agents[agent_id]

        if not self.is_running(agent_id):
            logger.info(f"Agent {agent.name} is not running")
            agent.status = "stopped"
            return True

        logger.info(f"Stopping agent {agent.name} (PID: {agent.pid})")

        try:
            # Try graceful termination first
            if agent.process_obj:
                agent.process_obj.terminate()
                try:
                    agent.process_obj.wait(timeout=timeout)
                except subprocess.TimeoutExpired:
                    logger.warning(f"Agent {agent.name} didn't stop gracefully, killing")
                    agent.process_obj.kill()
                    agent.process_obj.wait(timeout=2)
            elif agent.pid:
                os.kill(agent.pid, signal.SIGTERM)
                time.sleep(timeout)
                if self._pid_exists(agent.pid):
                    os.kill(agent.pid, signal.SIGKILL)

            agent.status = "stopped"
            agent.pid = None
            agent.process_obj = None
            logger.info(f"Agent {agent.name} stopped")
            return True

        except (ProcessLookupError, OSError) as e:
            logger.warning(f"Process already gone for {agent.name}: {e}")
            agent.status = "stopped"
            return True
        except Exception as e:
            logger.error(f"Error stopping agent {agent.name}: {e}")
            agent.status = "error"
            return False

    def stop_all(self) -> None:
        """Stop all agents."""
        logger.info("Stopping all agents...")
        for agent_id in list(self.agents.keys()):
            self.stop_agent(agent_id)
        logger.info("All agents stopped")

    def is_running(self, agent_id: str) -> bool:
        """Check if an agent is running."""
        if agent_id not in self.agents:
            return False

        agent = self.agents[agent_id]
        if not agent.pid:
            return False

        return self._pid_exists(agent.pid)

    def _pid_exists(self, pid: int) -> bool:
        """Check if a PID exists."""
        if PSUTIL_AVAILABLE:
            try:
                proc = psutil.Process(pid)
                return proc.is_running() and proc.status() != psutil.STATUS_ZOMBIE
            except psutil.NoSuchProcess:
                return False
        else:
            try:
                os.kill(pid, 0)
                return True
            except OSError:
                return False

    def get_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all agents."""
        status = {}
        for agent_id, agent in self.agents.items():
            is_running = self.is_running(agent_id)
            if is_running:
                agent.status = "running"
            elif agent.status == "running":
                agent.status = "stopped"

            status[agent_id] = {
                **agent.to_dict(),
                "is_running": is_running,
            }
        return status

    def get_agent(self, agent_id: str) -> Optional[AgentProcess]:
        """Get an agent by ID."""
        return self.agents.get(agent_id)

    def get_all_agents(self) -> Dict[str, AgentProcess]:
        """Get all agents."""
        return self.agents.copy()
