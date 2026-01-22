"""
Configuration for Multi-Agent Port Communication System
"""
from dataclasses import dataclass
from typing import Dict


@dataclass
class AgentConfig:
    """Configuration for a single agent"""
    name: str
    port: int
    host: str = "localhost"

    @property
    def base_url(self) -> str:
        return f"http://{self.host}:{self.port}"


# Agent configurations
AGENTS: Dict[str, AgentConfig] = {
    "orchestrator": AgentConfig(name="orchestrator", port=8000),
    "writer": AgentConfig(name="writer", port=8001),
    "reviewer": AgentConfig(name="reviewer", port=8002),
    "tester": AgentConfig(name="tester", port=8003),
    "analyzer": AgentConfig(name="analyzer", port=8004),
}


# Retry configuration
RETRY_CONFIG = {
    "max_retries": 3,
    "retry_delay": 1.0,  # seconds
    "backoff_multiplier": 2.0,
}


# Timeout configuration (seconds)
TIMEOUT_CONFIG = {
    "connect": 5.0,
    "read": 30.0,
    "write": 30.0,
}


def get_agent_url(agent_name: str) -> str:
    """Get base URL for an agent"""
    if agent_name not in AGENTS:
        raise ValueError(f"Unknown agent: {agent_name}")
    return AGENTS[agent_name].base_url
