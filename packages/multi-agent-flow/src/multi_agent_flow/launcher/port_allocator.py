"""
Port Allocator Module for Multi-Agent System
Manages port allocation within a specified range (8000-8005)
"""
import socket
import logging
from typing import Set

logger = logging.getLogger(__name__)


class PortAllocator:
    """Manages port allocation for AI agents."""

    def __init__(self, start_port: int = 8000, end_port: int = 8005):
        if not (1024 <= start_port <= 65535 and 1024 <= end_port <= 65535):
            raise ValueError("Ports must be between 1024-65535")
        if start_port > end_port:
            raise ValueError("start_port must be <= end_port")

        self.start_port = start_port
        self.end_port = end_port
        self.allocated_ports: Set[int] = set()
        logger.info(f"PortAllocator initialized: {start_port}-{end_port}")

    def _is_port_in_use(self, port: int) -> bool:
        """Check if port is currently in use on the system."""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return False
            except OSError:
                return True

    def get_available_port(self) -> int:
        """Find and reserve the next available port."""
        for port in range(self.start_port, self.end_port + 1):
            if port not in self.allocated_ports and not self._is_port_in_use(port):
                self.allocated_ports.add(port)
                logger.info(f"Allocated port: {port}")
                return port
        raise RuntimeError(f"No available ports in range {self.start_port}-{self.end_port}")

    def allocate_specific_port(self, port: int) -> bool:
        """Try to allocate a specific port."""
        if port < self.start_port or port > self.end_port:
            logger.warning(f"Port {port} is outside range")
            return False
        if port in self.allocated_ports:
            logger.warning(f"Port {port} already allocated internally")
            return False
        if self._is_port_in_use(port):
            logger.warning(f"Port {port} is in use by another process")
            return False

        self.allocated_ports.add(port)
        logger.info(f"Allocated specific port: {port}")
        return True

    def release_port(self, port: int) -> None:
        """Release an allocated port."""
        if port in self.allocated_ports:
            self.allocated_ports.remove(port)
            logger.info(f"Released port: {port}")

    def release_all(self) -> None:
        """Release all allocated ports."""
        self.allocated_ports.clear()
        logger.info("Released all ports")

    def get_allocated_ports(self) -> Set[int]:
        """Return set of currently allocated ports."""
        return self.allocated_ports.copy()
