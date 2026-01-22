"""
Agent Configuration Models
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from pathlib import Path


@dataclass
class AgentConfig:
    """Configuration for a single agent CLI tool"""
    name: str
    executable: str
    default_args: List[str] = field(default_factory=list)
    env_vars: Dict[str, str] = field(default_factory=dict)
    timeout_seconds: int = 300
    working_dir: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "executable": self.executable,
            "default_args": self.default_args,
            "env_vars": self.env_vars,
            "timeout_seconds": self.timeout_seconds,
            "working_dir": self.working_dir,
        }

    @classmethod
    def from_dict(cls, name: str, data: Dict) -> "AgentConfig":
        return cls(
            name=name,
            executable=data.get("executable", name),
            default_args=data.get("default_args", []),
            env_vars=data.get("env_vars", {}),
            timeout_seconds=data.get("timeout_seconds", 300),
            working_dir=data.get("working_dir"),
        )


@dataclass
class AgentsConfig:
    """Configuration for all agents"""
    agents: Dict[str, AgentConfig] = field(default_factory=dict)

    def get(self, name: str) -> Optional[AgentConfig]:
        return self.agents.get(name)

    def add(self, config: AgentConfig):
        self.agents[config.name] = config

    @classmethod
    def default(cls) -> "AgentsConfig":
        """Create default configuration for all supported agents"""
        config = cls()

        # Claude Code (Orchestrator, Reviewer)
        config.add(AgentConfig(
            name="claude",
            executable="claude",
            default_args=["--print"],
            timeout_seconds=600,
        ))

        # Codex (Writer, Tester)
        config.add(AgentConfig(
            name="codex",
            executable="codex",
            default_args=["--quiet"],
            timeout_seconds=300,
        ))

        # Gemini-CLI (Analyzer)
        config.add(AgentConfig(
            name="gemini",
            executable="gemini",
            default_args=[],
            timeout_seconds=600,
        ))

        # OpenCode (Planner)
        config.add(AgentConfig(
            name="opencode",
            executable="opencode",
            default_args=[],
            timeout_seconds=300,
        ))

        return config

    @classmethod
    def from_dict(cls, data: Dict) -> "AgentsConfig":
        config = cls()
        for name, agent_data in data.items():
            config.add(AgentConfig.from_dict(name, agent_data))
        return config

    def to_dict(self) -> Dict:
        return {name: config.to_dict() for name, config in self.agents.items()}
