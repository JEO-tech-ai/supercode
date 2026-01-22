"""
Agent Runner - Execute CLI agents as subprocesses
"""
import asyncio
import json
import logging
import os
import shutil
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, Callable

from .config import AgentConfig, AgentsConfig

logger = logging.getLogger(__name__)


@dataclass
class AgentResult:
    """Result of agent execution"""
    stdout: str
    stderr: str
    return_code: int
    timed_out: bool
    duration_seconds: float
    agent_name: str

    @property
    def success(self) -> bool:
        return self.return_code == 0 and not self.timed_out

    def to_dict(self) -> Dict[str, Any]:
        return {
            "stdout": self.stdout,
            "stderr": self.stderr,
            "return_code": self.return_code,
            "timed_out": self.timed_out,
            "duration_seconds": self.duration_seconds,
            "agent_name": self.agent_name,
            "success": self.success,
        }


class AgentRunner:
    """
    Executes AI CLI agents as subprocesses.

    Supports:
    - claude (Claude Code)
    - codex (Codex CLI)
    - gemini (Gemini CLI)
    - opencode (OpenCode)
    """

    def __init__(
        self,
        config: Optional[AgentsConfig] = None,
        working_dir: Optional[Path] = None,
        on_output: Optional[Callable[[str, str], None]] = None,
    ):
        self.config = config or AgentsConfig.default()
        self.working_dir = working_dir or Path.cwd()
        self.on_output = on_output  # Callback for streaming output

    def _find_executable(self, agent_name: str) -> Optional[str]:
        """Find the executable path for an agent"""
        agent_config = self.config.get(agent_name)
        if not agent_config:
            return None

        # Check if executable exists in PATH
        executable = shutil.which(agent_config.executable)
        if executable:
            return executable

        # Check common locations
        common_paths = [
            Path.home() / ".local" / "bin" / agent_config.executable,
            Path("/usr/local/bin") / agent_config.executable,
        ]

        for path in common_paths:
            if path.exists():
                return str(path)

        return None

    async def run(
        self,
        agent_name: str,
        prompt: str,
        *extra_args: str,
        timeout_override: Optional[int] = None,
    ) -> AgentResult:
        """
        Execute an agent CLI with the given prompt.

        Args:
            agent_name: Name of the agent (claude, codex, gemini, opencode)
            prompt: The prompt to send to the agent
            extra_args: Additional command-line arguments
            timeout_override: Override default timeout

        Returns:
            AgentResult with stdout, stderr, and execution info
        """
        agent_config = self.config.get(agent_name)
        if not agent_config:
            return AgentResult(
                stdout="",
                stderr=f"Unknown agent: {agent_name}",
                return_code=-1,
                timed_out=False,
                duration_seconds=0,
                agent_name=agent_name,
            )

        executable = self._find_executable(agent_name)
        if not executable:
            return AgentResult(
                stdout="",
                stderr=f"Agent executable not found: {agent_config.executable}",
                return_code=-1,
                timed_out=False,
                duration_seconds=0,
                agent_name=agent_name,
            )

        timeout = timeout_override or agent_config.timeout_seconds

        # Build command with prompt as argument (not stdin)
        cmd = [executable, *agent_config.default_args, *extra_args]

        # Add prompt as command-line argument (for arg style)
        if agent_config.prompt_style == "arg":
            cmd.append(prompt)

        # Prepare environment
        env = {**os.environ, **agent_config.env_vars}

        # Working directory
        cwd = agent_config.working_dir or str(self.working_dir)

        logger.info(f"Running agent: {agent_name} (timeout={timeout}s)")
        logger.debug(f"Command: {' '.join(cmd[:3])}... (prompt truncated)")

        start_time = datetime.now()

        try:
            # Create subprocess based on prompt style
            if agent_config.prompt_style == "arg":
                # Prompt passed as command-line argument
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    env=env,
                    cwd=cwd,
                )
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=timeout,
                )
            else:
                # Prompt passed via stdin
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    env=env,
                    cwd=cwd,
                )
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(input=prompt.encode()),
                    timeout=timeout,
                )

            duration = (datetime.now() - start_time).total_seconds()

            result = AgentResult(
                stdout=stdout.decode(),
                stderr=stderr.decode(),
                return_code=proc.returncode or 0,
                timed_out=False,
                duration_seconds=duration,
                agent_name=agent_name,
            )

            logger.info(
                f"Agent {agent_name} completed: "
                f"return_code={result.return_code}, "
                f"duration={result.duration_seconds:.2f}s"
            )

            return result

        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            duration = (datetime.now() - start_time).total_seconds()

            logger.warning(f"Agent {agent_name} timed out after {timeout}s")

            return AgentResult(
                stdout="",
                stderr=f"Process timed out after {timeout} seconds",
                return_code=-1,
                timed_out=True,
                duration_seconds=duration,
                agent_name=agent_name,
            )

        except FileNotFoundError as e:
            logger.error(f"Agent executable not found: {e}")
            return AgentResult(
                stdout="",
                stderr=f"Executable not found: {executable}",
                return_code=-1,
                timed_out=False,
                duration_seconds=0,
                agent_name=agent_name,
            )

        except Exception as e:
            logger.error(f"Agent execution error: {e}")
            return AgentResult(
                stdout="",
                stderr=str(e),
                return_code=-1,
                timed_out=False,
                duration_seconds=0,
                agent_name=agent_name,
            )

    async def run_with_streaming(
        self,
        agent_name: str,
        prompt: str,
        *extra_args: str,
        timeout_override: Optional[int] = None,
    ) -> AgentResult:
        """
        Execute an agent with real-time output streaming.

        Uses self.on_output callback to stream output as it arrives.
        """
        agent_config = self.config.get(agent_name)
        if not agent_config:
            return AgentResult(
                stdout="",
                stderr=f"Unknown agent: {agent_name}",
                return_code=-1,
                timed_out=False,
                duration_seconds=0,
                agent_name=agent_name,
            )

        executable = self._find_executable(agent_name)
        if not executable:
            return AgentResult(
                stdout="",
                stderr=f"Agent executable not found: {agent_config.executable}",
                return_code=-1,
                timed_out=False,
                duration_seconds=0,
                agent_name=agent_name,
            )

        timeout = timeout_override or agent_config.timeout_seconds
        cmd = [executable, *agent_config.default_args, *extra_args]
        env = {**os.environ, **agent_config.env_vars}
        cwd = agent_config.working_dir or str(self.working_dir)

        start_time = datetime.now()
        stdout_buffer = []
        stderr_buffer = []

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
                cwd=cwd,
            )

            # Write prompt to stdin
            proc.stdin.write(prompt.encode())
            await proc.stdin.drain()
            proc.stdin.close()

            async def read_stream(stream, buffer, stream_name):
                """Read from stream and call callback"""
                while True:
                    line = await stream.readline()
                    if not line:
                        break
                    decoded = line.decode()
                    buffer.append(decoded)
                    if self.on_output:
                        self.on_output(stream_name, decoded)

            try:
                await asyncio.wait_for(
                    asyncio.gather(
                        read_stream(proc.stdout, stdout_buffer, "stdout"),
                        read_stream(proc.stderr, stderr_buffer, "stderr"),
                    ),
                    timeout=timeout,
                )
                await proc.wait()

                duration = (datetime.now() - start_time).total_seconds()

                return AgentResult(
                    stdout="".join(stdout_buffer),
                    stderr="".join(stderr_buffer),
                    return_code=proc.returncode or 0,
                    timed_out=False,
                    duration_seconds=duration,
                    agent_name=agent_name,
                )

            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                duration = (datetime.now() - start_time).total_seconds()

                return AgentResult(
                    stdout="".join(stdout_buffer),
                    stderr=f"Process timed out after {timeout} seconds",
                    return_code=-1,
                    timed_out=True,
                    duration_seconds=duration,
                    agent_name=agent_name,
                )

        except Exception as e:
            return AgentResult(
                stdout="",
                stderr=str(e),
                return_code=-1,
                timed_out=False,
                duration_seconds=0,
                agent_name=agent_name,
            )

    def check_agent_available(self, agent_name: str) -> bool:
        """Check if an agent CLI is available on the system"""
        return self._find_executable(agent_name) is not None

    def list_available_agents(self) -> Dict[str, bool]:
        """List all configured agents and their availability"""
        return {
            name: self.check_agent_available(name)
            for name in self.config.agents.keys()
        }
