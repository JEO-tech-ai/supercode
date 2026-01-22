"""
CLI for Multi-Agent Flow System

Usage:
    maf start     - Start all agents
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
from pathlib import Path
from typing import Optional

import httpx

# Agent configuration
AGENTS = {
    "orchestrator": {"port": 8000, "module": "multi_agent_flow.orchestrator.main:app"},
    "writer": {"port": 8001, "module": "multi_agent_flow.agents.writer.main:app"},
    "reviewer": {"port": 8002, "module": "multi_agent_flow.agents.reviewer.main:app"},
    "tester": {"port": 8003, "module": "multi_agent_flow.agents.tester.main:app"},
    "analyzer": {"port": 8004, "module": "multi_agent_flow.agents.analyzer.main:app"},
}

# Colors
GREEN = "\033[0;32m"
RED = "\033[0;31m"
YELLOW = "\033[1;33m"
BLUE = "\033[0;34m"
NC = "\033[0m"

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
    """Start a single agent"""
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
        print(f"{GREEN}✓ {name} started (PID: {process.pid}, Port: {port}){NC}")
        return True
    else:
        print(f"{RED}✗ Failed to start {name}{NC}")
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
        print(f"{GREEN}✓ {name} stopped{NC}")
        return True
    except Exception as e:
        print(f"{RED}Failed to stop {name}: {e}{NC}")
        return False

def start():
    """Start all agents"""
    print(f"{BLUE}========================================{NC}")
    print(f"{BLUE}  Multi-Agent Flow - Starting{NC}")
    print(f"{BLUE}========================================{NC}\n")

    for name, config in AGENTS.items():
        start_agent(name, config)

    print(f"\n{BLUE}Waiting for agents to be ready...{NC}")
    time.sleep(3)

    print(f"\n{BLUE}Health checks:{NC}")
    all_healthy = True
    for name, config in AGENTS.items():
        healthy = check_health(config["port"])
        if healthy:
            print(f"{GREEN}✓ {name} is healthy{NC}")
        else:
            print(f"{RED}✗ {name} is unhealthy{NC}")
            all_healthy = False

    if all_healthy:
        print(f"\n{GREEN}All agents started successfully!{NC}")
        print(f"\nOrchestrator API: http://localhost:8000/docs")
        print(f"Start workflow:   maf workflow \"your task description\"")
    else:
        print(f"\n{RED}Some agents failed to start. Check logs: {get_log_dir()}{NC}")

def stop():
    """Stop all agents"""
    print(f"{BLUE}========================================{NC}")
    print(f"{BLUE}  Multi-Agent Flow - Stopping{NC}")
    print(f"{BLUE}========================================{NC}\n")

    for name in reversed(list(AGENTS.keys())):
        stop_agent(name)

    print(f"\n{GREEN}All agents stopped.{NC}")

def status():
    """Check status of all agents"""
    print(f"{BLUE}========================================{NC}")
    print(f"{BLUE}  Multi-Agent Flow - Status{NC}")
    print(f"{BLUE}========================================{NC}\n")

    for name, config in AGENTS.items():
        pid = is_agent_running(name)
        port = config["port"]
        healthy = check_health(port) if pid else False

        status_icon = f"{GREEN}●{NC}" if pid else f"{RED}●{NC}"
        health_status = f"{GREEN}healthy{NC}" if healthy else f"{RED}unhealthy{NC}"
        pid_str = str(pid) if pid else "N/A"

        print(f"  {status_icon} {name:15} Port: {port}  PID: {pid_str:8}  Health: {health_status}")

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

def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="Multi-Agent Flow - AI agents collaborating via HTTP",
        prog="maf"
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # start command
    subparsers.add_parser("start", help="Start all agents")

    # stop command
    subparsers.add_parser("stop", help="Stop all agents")

    # status command
    subparsers.add_parser("status", help="Check agent status")

    # workflow command
    workflow_parser = subparsers.add_parser("workflow", help="Start a workflow")
    workflow_parser.add_argument("task", help="Task description")

    args = parser.parse_args()

    if args.command == "start":
        start()
    elif args.command == "stop":
        stop()
    elif args.command == "status":
        status()
    elif args.command == "workflow":
        workflow(args.task)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
