"""
File-based Cache Implementation
"""
import json
import logging
import os
import time
from pathlib import Path
from typing import Optional, Dict, Any

from .base import BaseCache

logger = logging.getLogger(__name__)


class FileCache(BaseCache):
    """
    File-based cache implementation.

    Stores cached values as JSON files in a directory structure.
    Supports TTL-based expiration.

    Directory structure:
        {cache_dir}/
        ├── {key_hash[:2]}/
        │   ├── {key_hash}.json
        │   └── ...
        └── ...
    """

    def __init__(self, cache_dir: Optional[Path] = None):
        """
        Initialize file cache.

        Args:
            cache_dir: Directory to store cache files.
                      Defaults to ~/.multi-agent-flow/cache
        """
        self.cache_dir = cache_dir or Path.home() / ".multi-agent-flow" / "cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"FileCache initialized: {self.cache_dir}")

    def _get_cache_path(self, key: str) -> Path:
        """Get the file path for a cache key"""
        import hashlib
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        # Use first 2 characters as subdirectory for better file distribution
        subdir = self.cache_dir / key_hash[:2]
        subdir.mkdir(exist_ok=True)
        return subdir / f"{key_hash}.json"

    def _read_cache_file(self, path: Path) -> Optional[Dict[str, Any]]:
        """Read and parse a cache file"""
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return None

    def _write_cache_file(self, path: Path, data: Dict[str, Any]):
        """Write data to a cache file"""
        with open(path, 'w') as f:
            json.dump(data, f)

    def _is_expired(self, data: Dict[str, Any]) -> bool:
        """Check if a cache entry is expired"""
        expires_at = data.get("expires_at")
        if expires_at is None:
            return False
        return time.time() > expires_at

    async def get(self, key: str) -> Optional[str]:
        """Retrieve a value from cache"""
        path = self._get_cache_path(key)
        data = self._read_cache_file(path)

        if data is None:
            logger.debug(f"Cache miss: {key}")
            return None

        if self._is_expired(data):
            logger.debug(f"Cache expired: {key}")
            await self.delete(key)
            return None

        logger.debug(f"Cache hit: {key}")
        return data.get("value")

    async def set(self, key: str, value: str, ttl_seconds: Optional[int] = None):
        """Store a value in cache"""
        path = self._get_cache_path(key)

        data = {
            "key": key,
            "value": value,
            "created_at": time.time(),
            "expires_at": time.time() + ttl_seconds if ttl_seconds else None,
        }

        self._write_cache_file(path, data)
        logger.debug(f"Cache set: {key} (ttl={ttl_seconds})")

    async def delete(self, key: str) -> bool:
        """Delete a value from cache"""
        path = self._get_cache_path(key)
        try:
            path.unlink()
            logger.debug(f"Cache deleted: {key}")
            return True
        except FileNotFoundError:
            return False

    async def exists(self, key: str) -> bool:
        """Check if a key exists in cache"""
        path = self._get_cache_path(key)
        if not path.exists():
            return False

        data = self._read_cache_file(path)
        if data is None or self._is_expired(data):
            return False

        return True

    async def clear(self):
        """Clear all cached values"""
        import shutil
        if self.cache_dir.exists():
            shutil.rmtree(self.cache_dir)
            self.cache_dir.mkdir(parents=True, exist_ok=True)
        logger.info("Cache cleared")

    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_files = 0
        total_size = 0
        expired_count = 0

        for subdir in self.cache_dir.iterdir():
            if subdir.is_dir():
                for cache_file in subdir.glob("*.json"):
                    total_files += 1
                    total_size += cache_file.stat().st_size

                    data = self._read_cache_file(cache_file)
                    if data and self._is_expired(data):
                        expired_count += 1

        return {
            "total_entries": total_files,
            "total_size_bytes": total_size,
            "expired_entries": expired_count,
            "cache_dir": str(self.cache_dir),
        }

    async def cleanup_expired(self) -> int:
        """Remove expired cache entries"""
        removed_count = 0

        for subdir in self.cache_dir.iterdir():
            if subdir.is_dir():
                for cache_file in subdir.glob("*.json"):
                    data = self._read_cache_file(cache_file)
                    if data and self._is_expired(data):
                        cache_file.unlink()
                        removed_count += 1

        logger.info(f"Cleaned up {removed_count} expired cache entries")
        return removed_count
