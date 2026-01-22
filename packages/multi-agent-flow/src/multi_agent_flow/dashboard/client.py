"""
Dashboard Client - Terminal UI for monitoring workflows
"""
import asyncio
import json
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class DashboardClient:
    """
    Terminal-based dashboard client for monitoring workflows.

    Uses Rich library for beautiful terminal output.
    """

    def __init__(
        self,
        server_url: str = "ws://localhost:8100/ws",
    ):
        self.server_url = server_url
        self._websocket = None
        self._running = False
        self._workflows: Dict[str, Dict[str, Any]] = {}

    async def connect(self, task_id: str = None):
        """Connect to the dashboard server"""
        try:
            import websockets
        except ImportError:
            logger.error("websockets not installed. Run: pip install websockets")
            return False

        url = f"{self.server_url}/{task_id}" if task_id else self.server_url
        try:
            self._websocket = await websockets.connect(url)
            logger.info(f"Connected to dashboard server: {url}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            return False

    async def disconnect(self):
        """Disconnect from the server"""
        if self._websocket:
            await self._websocket.close()
            self._websocket = None

    async def subscribe(self, task_id: str):
        """Subscribe to a specific task"""
        if self._websocket:
            await self._websocket.send(json.dumps({
                "type": "subscribe",
                "task_id": task_id,
            }))

    async def monitor(self, task_id: str = None):
        """
        Start monitoring workflows with Rich UI.

        Args:
            task_id: Optional specific task to monitor
        """
        try:
            from rich.console import Console
            from rich.live import Live
            from rich.table import Table
            from rich.panel import Panel
            from rich.layout import Layout
        except ImportError:
            logger.error("Rich not installed. Run: pip install rich")
            return

        if not await self.connect(task_id):
            return

        console = Console()
        self._running = True

        def create_display():
            """Create the dashboard display"""
            layout = Layout()

            # Header
            header = Panel(
                "[bold blue]Multi-Agent Flow Dashboard[/bold blue]",
                style="blue",
            )

            # Workflows table
            table = Table(title="Active Workflows")
            table.add_column("Task ID", style="cyan")
            table.add_column("Status", style="green")
            table.add_column("Current Step", style="yellow")
            table.add_column("Progress", style="magenta")

            for wf_id, wf_data in self._workflows.items():
                status = wf_data.get("status", "unknown")
                step = wf_data.get("current_step", "-")
                progress = wf_data.get("progress", "-")

                # Color code status
                if status == "completed":
                    status = f"[green]{status}[/green]"
                elif status == "failed":
                    status = f"[red]{status}[/red]"
                elif status.startswith("running"):
                    status = f"[yellow]{status}[/yellow]"

                table.add_row(wf_id[:12] + "...", status, step, progress)

            return Panel(table, title="Workflows")

        try:
            with Live(create_display(), refresh_per_second=4, console=console) as live:
                async for message in self._websocket:
                    if not self._running:
                        break

                    try:
                        event = json.loads(message)
                        self._process_event(event)
                        live.update(create_display())
                    except json.JSONDecodeError:
                        continue

        except Exception as e:
            logger.error(f"Monitor error: {e}")
        finally:
            await self.disconnect()
            self._running = False

    def _process_event(self, event: Dict[str, Any]):
        """Process a workflow event and update state"""
        task_id = event.get("task_id")
        event_type = event.get("event_type")
        payload = event.get("payload", {})

        if not task_id:
            return

        if task_id not in self._workflows:
            self._workflows[task_id] = {
                "status": "unknown",
                "current_step": None,
                "progress": "0/5",
                "steps": [],
            }

        wf = self._workflows[task_id]

        if event_type == "workflow_start":
            wf["status"] = "running"
            wf["description"] = payload.get("description")

        elif event_type == "workflow_end":
            wf["status"] = payload.get("status", "completed")
            wf["current_step"] = None

        elif event_type == "step_start":
            wf["current_step"] = event.get("step_name")
            wf["status"] = f"running:{wf['current_step']}"

        elif event_type == "step_end":
            step_name = event.get("step_name")
            status = payload.get("status")
            wf["steps"].append({"name": step_name, "status": status})
            wf["progress"] = f"{len(wf['steps'])}/5"

    def stop(self):
        """Stop monitoring"""
        self._running = False


def monitor_workflow(task_id: str = None, server_url: str = "ws://localhost:8100/ws"):
    """
    Convenience function to start monitoring.

    Args:
        task_id: Optional task ID to monitor
        server_url: Dashboard server WebSocket URL
    """
    client = DashboardClient(server_url=server_url)
    asyncio.run(client.monitor(task_id))


def print_simple_status(event: Dict[str, Any]):
    """Print a simple status line for an event"""
    event_type = event.get("event_type")
    task_id = event.get("task_id", "")[:8]
    step_name = event.get("step_name", "")
    payload = event.get("payload", {})

    icons = {
        "workflow_start": "🚀",
        "workflow_end": "✅" if payload.get("status") == "completed" else "❌",
        "step_start": "▶️",
        "step_end": "✓" if payload.get("status") == "success" else "✗",
        "step_log": "📝",
        "step_cache_hit": "💾",
        "error": "⚠️",
    }

    icon = icons.get(event_type, "•")
    print(f"{icon} [{task_id}] {event_type}: {step_name or payload.get('message', '')}")
