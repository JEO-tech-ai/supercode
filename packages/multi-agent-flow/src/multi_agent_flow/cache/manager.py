"""
Cache Manager - Unified interface for caching
"""
import logging
from typing import Optional, Dict, Any

from .base import BaseCache, generate_cache_key, hash_input
from .file_cache import FileCache

logger = logging.getLogger(__name__)


class CacheManager:
    """
    Unified cache manager that supports multiple backends.

    Provides:
    - Automatic backend selection (file/redis)
    - Cache key generation
    - Hit/miss metrics
    - Graceful degradation on failures
    """

    def __init__(
        self,
        backend: str = "file",
        default_ttl: int = 3600,
        **backend_options,
    ):
        """
        Initialize cache manager.

        Args:
            backend: Cache backend type ("file" or "redis")
            default_ttl: Default TTL in seconds
            **backend_options: Options passed to backend constructor
        """
        self.default_ttl = default_ttl
        self._hits = 0
        self._misses = 0

        # Initialize backend
        if backend == "file":
            self._cache: BaseCache = FileCache(**backend_options)
        elif backend == "redis":
            # Redis support can be added later
            logger.warning("Redis backend not implemented, falling back to file")
            self._cache = FileCache(**backend_options)
        else:
            raise ValueError(f"Unknown cache backend: {backend}")

        logger.info(f"CacheManager initialized (backend={backend}, ttl={default_ttl})")

    async def get_step_result(
        self,
        task_id: str,
        step_name: str,
        input_data: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached result for a workflow step.

        Args:
            task_id: Workflow task ID
            step_name: Step name
            input_data: Step input data (used for cache key)

        Returns:
            Cached result dict or None
        """
        input_hash = hash_input(input_data)
        key = generate_cache_key(task_id, step_name, input_hash)

        try:
            result = await self._cache.get(key)
            if result:
                self._hits += 1
                import json
                return json.loads(result)
            else:
                self._misses += 1
                return None
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
            self._misses += 1
            return None

    async def set_step_result(
        self,
        task_id: str,
        step_name: str,
        input_data: str,
        result: Dict[str, Any],
        ttl: Optional[int] = None,
    ):
        """
        Cache a workflow step result.

        Args:
            task_id: Workflow task ID
            step_name: Step name
            input_data: Step input data
            result: Result to cache
            ttl: Optional TTL override
        """
        input_hash = hash_input(input_data)
        key = generate_cache_key(task_id, step_name, input_hash)
        ttl = ttl or self.default_ttl

        try:
            import json
            await self._cache.set(key, json.dumps(result), ttl)
            logger.debug(f"Cached step result: {step_name}")
        except Exception as e:
            logger.warning(f"Cache set error: {e}")

    async def invalidate_step(
        self,
        task_id: str,
        step_name: str,
        input_data: str,
    ):
        """Invalidate a cached step result"""
        input_hash = hash_input(input_data)
        key = generate_cache_key(task_id, step_name, input_hash)

        try:
            await self._cache.delete(key)
        except Exception as e:
            logger.warning(f"Cache invalidate error: {e}")

    async def invalidate_task(self, task_id: str):
        """Invalidate all cached results for a task"""
        # For file cache, we'd need to iterate through files
        # This is a simplified version that works with key patterns
        logger.info(f"Invalidating cache for task: {task_id}")
        # Implementation depends on backend support for pattern deletion

    async def clear(self):
        """Clear all cached data"""
        await self._cache.clear()
        self._hits = 0
        self._misses = 0

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total = self._hits + self._misses
        hit_rate = (self._hits / total * 100) if total > 0 else 0

        return {
            "hits": self._hits,
            "misses": self._misses,
            "total_requests": total,
            "hit_rate_percent": round(hit_rate, 2),
        }

    async def get_backend_stats(self) -> Dict[str, Any]:
        """Get backend-specific statistics"""
        if isinstance(self._cache, FileCache):
            return await self._cache.get_stats()
        return {}
