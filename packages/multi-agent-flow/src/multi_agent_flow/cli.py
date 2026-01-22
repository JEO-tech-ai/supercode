"""
CLI for Multi-Agent Flow System (v2.0)

Usage:
    maf launch    - Launch all AI agents in separate terminals
    maf start     - Start all backend agents (uvicorn)
    maf stop      - Stop all agents
    maf status    - Check agent status
    maf workflow  - Start a workflow
"""
import os
import sys
import time
import signal
import subprocess
import argparse
import json
import logging
from pathlib import Path
from typing import Optional

import httpx

# Setup logging - suppress verbose output in CLI mode
logging.basicConfig(level=logging.WARNING, format='%(message)s')
logger = logging.getLogger(__name__)

# Colors
GREEN = "\033[0;32m"
RED = "\033[0;31m"
YELLOW = "\033[1;33m"
BLUE = "\033[0;34m"
CYAN = "\033[0;36m"
MAGENTA = "\033[0;35m"
NC = "\033[0m"
BOLD = "\033[1m"

# Agent configuration for backend mode
BACKEND_AGENTS = {
    "orchestrator": {"port": 8000, "module": "multi_agent_flow.orchestrator.main:app"},
    "writer": {"port": 8001, "module": "multi_agent_flow.agents.writer.main:app"},
    "reviewer": {"port": 8002, "module": "multi_agent_flow.agents.reviewer.main:app"},
    "tester": {"port": 8003, "module": "multi_agent_flow.agents.tester.main:app"},
    "analyzer": {"port": 8004, "module": "multi_agent_flow.agents.analyzer.main:app"},
}


def get_pid_dir() -> Path:
    """Get PID directory path"""
    pid_dir = Path.home() / ".multi-agent-flow" / "pids"
    pid_dir.mkdir(parents=True, exist_ok=True)
    return pid_dir


def get_log_dir() -> Path:
    """Get log directory path"""
    log_dir = Path.home() / ".multi-agent-flow" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def get_config_path() -> Path:
    """Get config file path"""
    # Check in order: local, package, default
    local_config = Path.cwd() / "config.yaml"
    if local_config.exists():
        return local_config

    package_config = Path(__file__).parent.parent.parent.parent / "config.yaml"
    if package_config.exists():
        return package_config

    return local_config  # Will use defaults if not found


def is_agent_running(name: str) -> Optional[int]:
    """Check if agent is running and return PID"""
    pid_file = get_pid_dir() / f"{name}.pid"
    if pid_file.exists():
        pid = int(pid_file.read_text().strip())
        try:
            os.kill(pid, 0)
            return pid
        except OSError:
            pid_file.unlink()
    return None


def check_health(port: int) -> bool:
    """Check agent health endpoint"""
    try:
        response = httpx.get(f"http://localhost:{port}/health", timeout=2.0)
        return response.status_code == 200
    except Exception:
        return False


def start_agent(name: str, config: dict) -> bool:
    """Start a single backend agent"""
    pid = is_agent_running(name)
    if pid:
        print(f"{YELLOW}{name} is already running (PID: {pid}){NC}")
        return True

    port = config["port"]
    module = config["module"]
    log_file = get_log_dir() / f"{name}.log"
    pid_file = get_pid_dir() / f"{name}.pid"

    print(f"{YELLOW}Starting {name} on port {port}...{NC}")

    with open(log_file, "w") as log:
        process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", module, "--host", "0.0.0.0", "--port", str(port)],
            stdout=log,
            stderr=log,
            start_new_session=True,
        )

    pid_file.write_text(str(process.pid))
    time.sleep(1)

    if process.poll() is None:
        print(f"{GREEN}  {name} started (PID: {process.pid}, Port: {port}){NC}")
        return True
    else:
        print(f"{RED}  Failed to start {name}{NC}")
        return False


def stop_agent(name: str) -> bool:
    """Stop a single agent"""
    pid = is_agent_running(name)
    if not pid:
        print(f"{YELLOW}{name} is not running{NC}")
        return True

    print(f"{YELLOW}Stopping {name} (PID: {pid})...{NC}")

    try:
        os.kill(pid, signal.SIGTERM)
        for _ in range(10):
            time.sleep(0.5)
            try:
                os.kill(pid, 0)
            except OSError:
                break
        else:
            os.kill(pid, signal.SIGKILL)

        pid_file = get_pid_dir() / f"{name}.pid"
        pid_file.unlink(missing_ok=True)
        print(f"{GREEN}  {name} stopped{NC}")
        return True
    except Exception as e:
        print(f"{RED}Failed to stop {name}: {e}{NC}")
        return False


def print_banner():
    """Print the Supercode banner"""
    banner = f"""
{CYAN}{BOLD}
  ███████╗██╗   ██╗██████╗ ███████╗██████╗  ██████╗ ██████╗ ██████╗ ███████╗
  ██╔════╝██║   ██║██╔══██╗██╔════╝██╔══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝
  ███████╗██║   ██║██████╔╝█████╗  ██████╔╝██║     ██║   ██║██║  ██║█████╗
  ╚════██║██║   ██║██╔═══╝ ██╔══╝  ██╔══██╗██║     ██║   ██║██║  ██║██╔══╝
  ███████║╚██████╔╝██║     ███████╗██║  ██║╚██████╗╚██████╔╝██████╔╝███████╗
  ╚══════╝ ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
{NC}
{MAGENTA}  Multi-Agent AI System v2.0{NC}
{BLUE}  ═══════════════════════════════════════════════════════════════════════{NC}
"""
    print(banner)


def launch():
    """Launch all AI agents in separate terminal windows (Phase 1)"""
    print_banner()
    print(f"{BLUE}  Launching AI Agents in Terminal Windows...{NC}\n")

    try:
        from multi_agent_flow.launcher import LauncherManager
    except ImportError as e:
        print(f"{RED}Error: Could not import LauncherManager: {e}{NC}")
        print(f"{YELLOW}Make sure the package is installed: pip install -e .{NC}")
        return

    config_path = get_config_path()

    try:
        manager = LauncherManager(
            config_path=config_path if config_path.exists() else None,
            port_range=(8000, 8010),
            terminal_app="Terminal",
        )

        print(f"{CYAN}  Platform: {manager.platform}{NC}")
        print(f"{CYAN}  Config: {config_path if config_path.exists() else 'Using defaults'}{NC}")
        print()

        # Start all agents
        results = manager.start_all()

        print()
        manager.print_status()

        # Count successes
        success_count = sum(1 for r in results.values() if r is not None)
        total = len(results)

        if success_count == total:
            print(f"{GREEN}  All {total} agents launched successfully!{NC}")
        else:
            print(f"{YELLOW}  Launched {success_count}/{total} agents.{NC}")

        print(f"\n{BLUE}  Agent URLs:{NC}")
        for agent_id in results:
            url = manager.get_agent_url(agent_id)
            if url:
                print(f"    {agent_id}: {url}")

        print(f"\n{CYAN}  Commands:{NC}")
        print(f"    maf status  - Check agent status")
        print(f"    maf stop    - Stop all agents")

    except Exception as e:
        print(f"{RED}  Failed to launch agents: {e}{NC}")
        import traceback
        traceback.print_exc()


def start():
    """Start all backend agents (uvicorn mode)"""
    print_banner()
    print(f"{BLUE}  Starting Backend Agents...{NC}\n")

    for name, config in BACKEND_AGENTS.items():
        start_agent(name, config)

    print(f"\n{BLUE}  Waiting for agents to be ready...{NC}")
    time.sleep(3)

    print(f"\n{BLUE}  Health checks:{NC}")
    all_healthy = True
    for name, config in BACKEND_AGENTS.items():
        healthy = check_health(config["port"])
        if healthy:
            print(f"{GREEN}    {name} is healthy{NC}")
        else:
            print(f"{RED}    {name} is unhealthy{NC}")
            all_healthy = False

    if all_healthy:
        print(f"\n{GREEN}  All agents started successfully!{NC}")
        print(f"\n  Orchestrator API: http://localhost:8000/docs")
        print(f"  Start workflow:   maf workflow \"your task description\"")
    else:
        print(f"\n{RED}  Some agents failed to start. Check logs: {get_log_dir()}{NC}")


def stop():
    """Stop all agents"""
    print_banner()
    print(f"{BLUE}  Stopping All Agents...{NC}\n")

    # Try to stop launcher-managed agents first
    try:
        from multi_agent_flow.launcher import LauncherManager

        manager = LauncherManager(port_range=(8000, 8010))
        manager.stop_all()
        print(f"{GREEN}  Terminal agents stopped.{NC}")
    except ImportError:
        pass
    except Exception as e:
        logger.debug(f"Launcher stop failed: {e}")

    # Stop backend agents
    for name in reversed(list(BACKEND_AGENTS.keys())):
        stop_agent(name)

    print(f"\n{GREEN}  All agents stopped.{NC}")


def status():
    """Check status of all agents"""
    print_banner()
    print(f"{BLUE}  Agent Status{NC}\n")

    # Check launcher-managed agents
    try:
        from multi_agent_flow.launcher import LauncherManager

        manager = LauncherManager(port_range=(8000, 8010))
        manager.print_status()
        return
    except ImportError:
        pass
    except Exception:
        pass

    # Fallback to backend agent status
    print(f"  {CYAN}Backend Agents:{NC}\n")
    for name, config in BACKEND_AGENTS.items():
        pid = is_agent_running(name)
        port = config["port"]
        healthy = check_health(port) if pid else False

        status_icon = f"{GREEN}●{NC}" if pid else f"{RED}●{NC}"
        health_status = f"{GREEN}healthy{NC}" if healthy else f"{RED}unhealthy{NC}"
        pid_str = str(pid) if pid else "N/A"

        print(f"    {status_icon} {name:15} Port: {port}  PID: {pid_str:8}  Health: {health_status}")

    print()


def workflow(task_description: str):
    """Start a workflow"""
    print(f"{BLUE}Starting workflow...{NC}\n")

    try:
        response = httpx.post(
            "http://localhost:8000/api/orchestrator/start_workflow",
            json={"workflow_type": "code_generation", "details": {"task_description": task_description}},
            timeout=10.0,
        )
        result = response.json()
        print(f"{GREEN}Workflow started:{NC}")
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"{RED}Failed to start workflow: {e}{NC}")
        print(f"Make sure agents are running: maf start")


def task_submit(description: str, role: str, priority: str = "NORMAL"):
    """Submit a task to the scheduler"""
    print_banner()
    print(f"{BLUE}  Submitting Task...{NC}\n")

    try:
        from multi_agent_flow.scheduler import TaskScheduler, TaskPriority
        from multi_agent_flow.launcher import LauncherManager

        # Initialize scheduler with launcher config
        manager = LauncherManager(port_range=(8000, 8010))
        scheduler = TaskScheduler()
        scheduler.register_agents_from_config(manager.agents_config)

        # Map priority string to enum
        priority_map = {
            "HIGH": TaskPriority.HIGH,
            "NORMAL": TaskPriority.NORMAL,
            "LOW": TaskPriority.LOW,
        }
        task_priority = priority_map.get(priority.upper(), TaskPriority.NORMAL)

        # Submit task
        task = scheduler.submit_task(description, role, task_priority)

        print(f"{GREEN}  Task submitted successfully!{NC}")
        print(f"\n  Task ID:     {task.id}")
        print(f"  Description: {task.description}")
        print(f"  Target Role: {task.target_role}")
        print(f"  Priority:    {task.priority.value}")
        print(f"  Status:      {task.status.value}")

    except Exception as e:
        print(f"{RED}  Failed to submit task: {e}{NC}")
        import traceback
        traceback.print_exc()


def queue_status():
    """Show task queue status"""
    print_banner()
    print(f"{BLUE}  Task Queue Status{NC}\n")

    try:
        from multi_agent_flow.scheduler import TaskScheduler
        from multi_agent_flow.launcher import LauncherManager

        manager = LauncherManager(port_range=(8000, 8010))
        scheduler = TaskScheduler()
        scheduler.register_agents_from_config(manager.agents_config)

        scheduler.print_status()

    except Exception as e:
        print(f"{RED}  Failed to get queue status: {e}{NC}")


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="Supercode Multi-Agent Flow - AI agents collaborating in terminals",
        prog="maf",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  maf launch              Launch all AI agents in terminal windows
  maf status              Check status of all agents
  maf stop                Stop all agents
  maf task "desc" writer  Submit a task to an agent role
  maf queue               Show task queue status

Phase 1 (launch):
  Opens separate terminal windows for each AI agent:
  - Orchestrator (Claude) on port 8000
  - Planner (OpenCode) on port 8001
  - Writer (Codex) on port 8002
  - Tester (Codex) on port 8003
  - Analyzer (Gemini) on port 8004

Phase 2 (scheduler):
  Submit tasks to the scheduler queue:
  - maf task "Generate API" writer --priority HIGH
  - maf queue (view queue status)
"""
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # launch command (new - multi-terminal)
    launch_parser = subparsers.add_parser("launch", help="Launch AI agents in terminal windows")
    launch_parser.add_argument("-c", "--config", help="Path to config.yaml", type=Path)

    # start command (old - uvicorn backend)
    subparsers.add_parser("start", help="Start backend agents (uvicorn mode)")

    # stop command
    subparsers.add_parser("stop", help="Stop all agents")

    # status command
    subparsers.add_parser("status", help="Check agent status")

    # workflow command
    workflow_parser = subparsers.add_parser("workflow", help="Start a workflow")
    workflow_parser.add_argument("task", help="Task description")

    # task command (Phase 2 - scheduler)
    task_parser = subparsers.add_parser("task", help="Submit a task to the scheduler")
    task_parser.add_argument("description", help="Task description")
    task_parser.add_argument("role", choices=["planner", "writer", "reviewer", "tester", "analyzer"],
                            help="Target agent role")
    task_parser.add_argument("-p", "--priority", choices=["HIGH", "NORMAL", "LOW"],
                            default="NORMAL", help="Task priority (default: NORMAL)")

    # queue command (Phase 2 - scheduler)
    subparsers.add_parser("queue", help="Show task queue status")

    args = parser.parse_args()

    if args.command == "launch":
        launch()
    elif args.command == "start":
        start()
    elif args.command == "stop":
        stop()
    elif args.command == "status":
        status()
    elif args.command == "workflow":
        workflow(args.task)
    elif args.command == "task":
        task_submit(args.description, args.role, args.priority)
    elif args.command == "queue":
        queue_status()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
