"""
Base Cache Interface
"""
import hashlib
from abc import ABC, abstractmethod
from typing import Optional


class BaseCache(ABC):
    """Abstract base class for cache implementations"""

    @abstractmethod
    async def get(self, key: str) -> Optional[str]:
        """
        Retrieve a value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value if found, None otherwise
        """
        pass

    @abstractmethod
    async def set(self, key: str, value: str, ttl_seconds: Optional[int] = None):
        """
        Store a value in cache.

        Args:
            key: Cache key
            value: Value to store
            ttl_seconds: Time to live in seconds (None for no expiry)
        """
        pass

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """
        Delete a value from cache.

        Args:
            key: Cache key

        Returns:
            True if deleted, False if not found
        """
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """
        Check if a key exists in cache.

        Args:
            key: Cache key

        Returns:
            True if exists, False otherwise
        """
        pass

    @abstractmethod
    async def clear(self):
        """Clear all cached values"""
        pass


def generate_cache_key(task_id: str, step_name: str, input_hash: str) -> str:
    """
    Generate a consistent cache key for a step execution.

    Args:
        task_id: Workflow task ID
        step_name: Step name in the workflow
        input_hash: Hash of the step input

    Returns:
        Cache key string
    """
    return f"maf:cache:{task_id}:{step_name}:{input_hash}"


def hash_input(input_data: str) -> str:
    """
    Generate a hash of input data for cache key generation.

    Args:
        input_data: Input string to hash

    Returns:
        SHA256 hash truncated to 16 characters
    """
    return hashlib.sha256(input_data.encode()).hexdigest()[:16]
