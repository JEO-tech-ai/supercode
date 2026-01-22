"""
Platform-Specific Terminal Launchers
Supports macOS (iTerm2, Terminal.app) and Linux (tmux)
"""
import os
import subprocess
import time
import logging
import platform
from typing import Tuple, Optional, Dict

logger = logging.getLogger(__name__)

# Try to import psutil for better process detection
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False


def detect_platform() -> str:
    """Detect the current platform."""
    system = platform.system()
    if system == "Darwin":
        return "macos"
    elif system == "Linux":
        return "linux"
    elif system == "Windows":
        return "windows"
    return "unknown"


class MacOSLauncher:
    """Launches terminals on macOS using AppleScript."""

    def __init__(self, terminal_app: str = "Terminal"):
        self.terminal_app = terminal_app
        logger.info(f"MacOSLauncher initialized with {terminal_app}")

    def launch(
        self,
        command: str,
        agent_name: str,
        port: int,
        env: Dict[str, str],
    ) -> Tuple[Optional[subprocess.Popen], Optional[int]]:
        """Launch a command in a new terminal window."""
        logger.info(f"Launching {agent_name} in {self.terminal_app}")

        # Just use the command directly - keep it simple
        full_command = command

        if self.terminal_app == "iTerm2":
            script = self._iterm2_script(full_command, agent_name, port)
        else:
            script = self._terminal_app_script(full_command, agent_name, port)

        try:
            subprocess.run(["osascript", "-e", script], check=True)
            time.sleep(2)  # Wait for terminal to start

            # Try to find the PID
            pid = self._find_process_pid(command, port)
            logger.info(f"Launched {agent_name}, PID: {pid}")
            return None, pid

        except subprocess.CalledProcessError as e:
            logger.error(f"AppleScript failed for {agent_name}: {e}")
            raise

    def _iterm2_script(self, command: str, name: str, port: int) -> str:
        return f'''
        tell application "iTerm2"
            create window with default profile
            tell current session of current window
                write text "{command}"
                set name to "{name} (:{port})"
            end tell
        end tell
        '''

    def _terminal_app_script(self, command: str, name: str, port: int) -> str:
        return f'''
        tell application "Terminal"
            do script "{command}"
            set custom title of front window to "{name} (:{port})"
            activate
        end tell
        '''

    def _find_process_pid(self, command: str, port: int) -> Optional[int]:
        """Try to find the PID of a launched process."""
        if not PSUTIL_AVAILABLE:
            return None

        try:
            for proc in psutil.process_iter(['pid', 'cmdline', 'connections']):
                try:
                    cmdline = " ".join(proc.cmdline())
                    # Check if this process is related to our command
                    if any(cmd_part in cmdline for cmd_part in command.split()[:2]):
                        # Check if it's listening on our port
                        for conn in proc.connections(kind='inet'):
                            if conn.laddr and conn.laddr.port == port:
                                return proc.pid
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as e:
            logger.debug(f"Error finding PID: {e}")
        return None


class LinuxLauncher:
    """Launches terminals on Linux using tmux."""

    def __init__(self, session_name: str = "supercode"):
        self.session_name = session_name
        self._session_created = False
        logger.info(f"LinuxLauncher initialized with session: {session_name}")

    def launch(
        self,
        command: str,
        agent_name: str,
        port: int,
        env: Dict[str, str],
    ) -> Tuple[Optional[subprocess.Popen], Optional[int]]:
        """Launch a command in a tmux window."""
        logger.info(f"Launching {agent_name} in tmux session {self.session_name}")

        window_name = agent_name.replace(" ", "-").lower()
        env_str = " ".join([f'{k}="{v}"' for k, v in env.items()])
        full_command = f"{env_str} {command}"

        try:
            # Ensure session exists
            if not self._session_exists():
                self._create_session(window_name, full_command)
            else:
                self._create_window(window_name, full_command)

            time.sleep(1)
            pid = self._get_window_pid(window_name)
            logger.info(f"Launched {agent_name} in tmux, PID: {pid}")
            return None, pid

        except subprocess.CalledProcessError as e:
            logger.error(f"tmux command failed for {agent_name}: {e}")
            raise

    def _session_exists(self) -> bool:
        """Check if the tmux session exists."""
        result = subprocess.run(
            ["tmux", "has-session", "-t", self.session_name],
            capture_output=True
        )
        return result.returncode == 0

    def _create_session(self, window_name: str, command: str) -> None:
        """Create a new tmux session with the first window."""
        subprocess.run(
            ["tmux", "new-session", "-d", "-s", self.session_name, "-n", window_name],
            check=True
        )
        subprocess.run(
            ["tmux", "send-keys", "-t", f"{self.session_name}:{window_name}", command, "C-m"],
            check=True
        )
        self._session_created = True

    def _create_window(self, window_name: str, command: str) -> None:
        """Create a new window in the existing session."""
        subprocess.run(
            ["tmux", "new-window", "-t", self.session_name, "-n", window_name],
            check=True
        )
        subprocess.run(
            ["tmux", "send-keys", "-t", f"{self.session_name}:{window_name}", command, "C-m"],
            check=True
        )

    def _get_window_pid(self, window_name: str) -> Optional[int]:
        """Get the PID of a process in a tmux window."""
        try:
            result = subprocess.run(
                ["tmux", "display-message", "-p", "-t", f"{self.session_name}:{window_name}", "#{pane_pid}"],
                capture_output=True,
                text=True,
                check=True
            )
            shell_pid = int(result.stdout.strip())

            # Try to find child process
            if PSUTIL_AVAILABLE:
                try:
                    parent = psutil.Process(shell_pid)
                    children = parent.children(recursive=True)
                    for child in children:
                        if any(exe in " ".join(child.cmdline()) for exe in ["node", "npm", "python"]):
                            return child.pid
                except psutil.NoSuchProcess:
                    pass

            return shell_pid
        except Exception as e:
            logger.debug(f"Error getting tmux PID: {e}")
            return None

    def kill_session(self) -> None:
        """Kill the entire tmux session."""
        subprocess.run(
            ["tmux", "kill-session", "-t", self.session_name],
            capture_output=True
        )
        self._session_created = False


def get_launcher(platform_name: Optional[str] = None, **kwargs):
    """Factory function to get the appropriate launcher."""
    if platform_name is None:
        platform_name = detect_platform()

    if platform_name == "macos":
        terminal_app = kwargs.get("terminal_app", "iTerm2")
        return MacOSLauncher(terminal_app)
    elif platform_name == "linux":
        session_name = kwargs.get("session_name", "supercode")
        return LinuxLauncher(session_name)
    else:
        raise ValueError(f"Unsupported platform: {platform_name}")
