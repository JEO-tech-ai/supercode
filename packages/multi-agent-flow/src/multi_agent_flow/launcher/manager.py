"""
Launcher Manager - Main orchestration for multi-terminal agent launch
"""
import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
import yaml

from .port_allocator import PortAllocator
from .process_manager import ProcessManager, AgentProcess
from .platforms import get_launcher, detect_platform

logger = logging.getLogger(__name__)


@dataclass
class AgentConfig:
    """Configuration for an agent."""
    id: str
    name: str
    model: str
    command: str
    port: Optional[int] = None
    roles: List[str] = field(default_factory=list)
    env: Dict[str, str] = field(default_factory=dict)


# Default agent configurations
DEFAULT_AGENTS: Dict[str, AgentConfig] = {
    "orchestrator": AgentConfig(
        id="orchestrator",
        name="Orchestrator",
        model="claude",
        command="claude",
        port=8000,
        roles=["orchestrator", "reviewer"],
    ),
    "planner": AgentConfig(
        id="planner",
        name="Planner",
        model="opencode",
        command="opencode",
        port=8001,
        roles=["planner"],
    ),
    "writer": AgentConfig(
        id="writer",
        name="Writer",
        model="codex",
        command="codex",
        port=8002,
        roles=["writer"],
    ),
    "tester": AgentConfig(
        id="tester",
        name="Tester",
        model="codex",
        command="codex",
        port=8003,
        roles=["tester"],
    ),
    "analyzer": AgentConfig(
        id="analyzer",
        name="Analyzer",
        model="gemini",
        command="gemini",
        port=8004,
        roles=["analyzer"],
    ),
}


class LauncherManager:
    """
    Central manager for launching and coordinating AI agents.

    Usage:
        manager = LauncherManager()
        manager.start_all()
        manager.status()
        manager.stop_all()
    """

    def __init__(
        self,
        config_path: Optional[Path] = None,
        port_range: tuple = (8000, 8010),
        terminal_app: str = "Terminal",
        tmux_session: str = "supercode",
    ):
        self.port_allocator = PortAllocator(*port_range)
        self.process_manager = ProcessManager()
        self.platform = detect_platform()

        # Get platform-specific launcher
        if self.platform == "macos":
            self.launcher = get_launcher("macos", terminal_app=terminal_app)
        elif self.platform == "linux":
            self.launcher = get_launcher("linux", session_name=tmux_session)
        else:
            raise ValueError(f"Unsupported platform: {self.platform}")

        # Load or use default config
        self.agents_config = self._load_config(config_path)
        logger.info(f"LauncherManager initialized on {self.platform}")

    def _load_config(self, config_path: Optional[Path]) -> Dict[str, AgentConfig]:
        """Load agent configuration from file or use defaults."""
        if config_path and config_path.exists():
            with open(config_path) as f:
                data = yaml.safe_load(f)

            agents = {}
            for agent_id, agent_data in data.get("agents", {}).items():
                agents[agent_id] = AgentConfig(
                    id=agent_id,
                    name=agent_data.get("name", agent_id.title()),
                    model=agent_data.get("model", "claude"),
                    command=agent_data.get("command", agent_id),
                    port=agent_data.get("port"),
                    roles=agent_data.get("roles", [agent_id]),
                    env=agent_data.get("env", {}),
                )
            return agents
        return DEFAULT_AGENTS.copy()

    def start_agent(self, agent_id: str, **kwargs) -> AgentProcess:
        """Start a single agent."""
        if agent_id not in self.agents_config:
            raise ValueError(f"Unknown agent: {agent_id}")

        config = self.agents_config[agent_id]

        # Allocate port
        if config.port and self.port_allocator.allocate_specific_port(config.port):
            port = config.port
        else:
            port = self.port_allocator.get_available_port()

        # Register agent
        self.process_manager.register_agent(
            name=config.name,
            agent_id=agent_id,
            command=config.command,
            port=port,
            model=config.model,
        )

        # Prepare environment
        env = {
            **config.env,
            **kwargs.get("env", {}),
            "SUPERCODE_ROLES": ",".join(config.roles),
        }

        # Start using platform launcher
        def launcher_func(command, agent_name, port, env):
            return self.launcher.launch(command, agent_name, port, env)

        return self.process_manager.start_agent(
            agent_id=agent_id,
            launcher_func=launcher_func,
            env=env,
        )

    def start_all(self) -> Dict[str, AgentProcess]:
        """Start all configured agents."""
        logger.info("Starting all agents...")
        results = {}

        # Start in order: orchestrator first, then others
        order = ["orchestrator", "planner", "writer", "tester", "analyzer"]
        for agent_id in order:
            if agent_id in self.agents_config:
                try:
                    results[agent_id] = self.start_agent(agent_id)
                except Exception as e:
                    logger.error(f"Failed to start {agent_id}: {e}")
                    results[agent_id] = None

        logger.info("All agents started")
        return results

    def stop_agent(self, agent_id: str) -> bool:
        """Stop a single agent."""
        agent = self.process_manager.get_agent(agent_id)
        if agent:
            self.port_allocator.release_port(agent.port)
        return self.process_manager.stop_agent(agent_id)

    def stop_all(self) -> None:
        """Stop all agents."""
        logger.info("Stopping all agents...")
        self.process_manager.stop_all()
        self.port_allocator.release_all()

        # Kill tmux session on Linux
        if self.platform == "linux" and hasattr(self.launcher, "kill_session"):
            self.launcher.kill_session()

        logger.info("All agents stopped")

    def status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all agents."""
        return self.process_manager.get_status()

    def print_status(self) -> None:
        """Print formatted status to console."""
        status = self.status()

        print("\n" + "=" * 60)
        print("  SUPERCODE AGENT STATUS")
        print("=" * 60)

        for agent_id, info in status.items():
            icon = "\033[32m●\033[0m" if info["is_running"] else "\033[31m●\033[0m"
            status_text = "\033[32mRunning\033[0m" if info["is_running"] else f"\033[33m{info['status']}\033[0m"
            pid_text = f"PID: {info['pid']}" if info['pid'] else "PID: N/A"

            print(f"  {icon} {info['name']:20} {info['model']:10} Port: {info['port']}  {pid_text:15} {status_text}")

        print("=" * 60)

        running_count = sum(1 for info in status.values() if info["is_running"])
        print(f"  Running: {running_count}/{len(status)}")
        print("=" * 60 + "\n")

    def get_agent_url(self, agent_id: str) -> Optional[str]:
        """Get the URL for an agent."""
        agent = self.process_manager.get_agent(agent_id)
        if agent:
            return f"http://localhost:{agent.port}"
        return None
