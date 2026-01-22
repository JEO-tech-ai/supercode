"""
WebSocket Dashboard Server
"""
import asyncio
import json
import logging
from typing import Optional

from .connection_manager import ConnectionManager

logger = logging.getLogger(__name__)


class DashboardServer:
    """
    WebSocket server for real-time workflow monitoring.

    Uses FastAPI for WebSocket support.
    """

    def __init__(
        self,
        host: str = "0.0.0.0",
        port: int = 8100,
    ):
        self.host = host
        self.port = port
        self.manager = ConnectionManager()
        self._app = None
        self._server = None

    def create_app(self):
        """Create the FastAPI application"""
        try:
            from fastapi import FastAPI, WebSocket, WebSocketDisconnect
            from fastapi.middleware.cors import CORSMiddleware
        except ImportError:
            logger.error("FastAPI not installed. Run: pip install fastapi uvicorn")
            return None

        app = FastAPI(title="Multi-Agent Flow Dashboard")

        # CORS for web clients
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        @app.get("/health")
        async def health():
            return {
                "status": "healthy",
                "connections": self.manager.connection_count,
            }

        @app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            """Main WebSocket endpoint for all clients"""
            await websocket.accept()
            await self.manager.connect(websocket)

            try:
                while True:
                    # Receive messages from client
                    data = await websocket.receive_text()
                    message = json.loads(data)

                    # Handle subscription commands
                    if message.get("type") == "subscribe":
                        task_id = message.get("task_id")
                        if task_id:
                            await self.manager.subscribe(websocket, task_id)
                            await websocket.send_text(json.dumps({
                                "type": "subscribed",
                                "task_id": task_id,
                            }))

                    elif message.get("type") == "unsubscribe":
                        task_id = message.get("task_id")
                        if task_id:
                            await self.manager.unsubscribe(websocket, task_id)
                            await websocket.send_text(json.dumps({
                                "type": "unsubscribed",
                                "task_id": task_id,
                            }))

            except WebSocketDisconnect:
                await self.manager.disconnect(websocket)
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                await self.manager.disconnect(websocket)

        @app.websocket("/ws/{task_id}")
        async def websocket_task_endpoint(websocket: WebSocket, task_id: str):
            """WebSocket endpoint for a specific task"""
            await websocket.accept()
            await self.manager.connect(websocket, task_id)

            try:
                while True:
                    # Keep connection alive
                    await websocket.receive_text()
            except WebSocketDisconnect:
                await self.manager.disconnect(websocket)
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                await self.manager.disconnect(websocket)

        self._app = app
        return app

    async def broadcast(self, message: str, task_id: str = None):
        """Broadcast a message to connected clients"""
        await self.manager.broadcast(message, task_id)

    async def start(self):
        """Start the server"""
        try:
            import uvicorn
        except ImportError:
            logger.error("Uvicorn not installed. Run: pip install uvicorn")
            return

        if not self._app:
            self.create_app()

        if not self._app:
            return

        config = uvicorn.Config(
            app=self._app,
            host=self.host,
            port=self.port,
            log_level="info",
        )
        self._server = uvicorn.Server(config)
        logger.info(f"Starting dashboard server on {self.host}:{self.port}")
        await self._server.serve()

    def run(self):
        """Run the server (blocking)"""
        asyncio.run(self.start())


def run_server(host: str = "0.0.0.0", port: int = 8100):
    """Convenience function to run the server"""
    server = DashboardServer(host=host, port=port)
    server.run()
