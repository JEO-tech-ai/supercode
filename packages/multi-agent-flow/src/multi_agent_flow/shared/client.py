"""
HTTP Client for inter-agent communication
"""
import httpx
import asyncio
import logging
from typing import Any, Dict, Optional
from .config import RETRY_CONFIG, TIMEOUT_CONFIG, get_agent_url
from .models import TaskRequest, TaskResponse

logger = logging.getLogger(__name__)


class AgentClient:
    """Async HTTP client for communicating with other agents"""

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    async def initialize(self):
        """Initialize the HTTP client"""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(
                    timeout=TIMEOUT_CONFIG["read"],  # default timeout
                    connect=TIMEOUT_CONFIG["connect"],
                )
            )

    async def close(self):
        """Close the HTTP client"""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def send_task(
        self,
        agent_name: str,
        endpoint: str,
        request: TaskRequest,
    ) -> TaskResponse:
        """Send a task to another agent with retry logic"""
        if self._client is None:
            await self.initialize()

        url = f"{get_agent_url(agent_name)}{endpoint}"

        for attempt in range(RETRY_CONFIG["max_retries"]):
            try:
                response = await self._client.post(
                    url,
                    json=request.model_dump(mode="json"),
                )
                response.raise_for_status()
                return TaskResponse(**response.json())

            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error on attempt {attempt + 1}: {e}")
                if attempt == RETRY_CONFIG["max_retries"] - 1:
                    raise

            except httpx.RequestError as e:
                logger.error(f"Request error on attempt {attempt + 1}: {e}")
                if attempt == RETRY_CONFIG["max_retries"] - 1:
                    raise

            # Exponential backoff
            delay = RETRY_CONFIG["retry_delay"] * (RETRY_CONFIG["backoff_multiplier"] ** attempt)
            await asyncio.sleep(delay)

        raise RuntimeError(f"Failed to send task to {agent_name} after {RETRY_CONFIG['max_retries']} attempts")

    async def health_check(self, agent_name: str) -> bool:
        """Check if an agent is healthy"""
        if self._client is None:
            await self.initialize()

        try:
            url = f"{get_agent_url(agent_name)}/health"
            response = await self._client.get(url, timeout=5.0)
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Health check failed for {agent_name}: {e}")
            return False

    async def send_callback(
        self,
        callback_url: str,
        response: TaskResponse,
    ) -> None:
        """Send task result to callback URL"""
        if self._client is None:
            await self.initialize()

        try:
            await self._client.post(
                callback_url,
                json=response.model_dump(mode="json"),
            )
        except Exception as e:
            logger.error(f"Failed to send callback: {e}")


# Global client instance
agent_client = AgentClient()
