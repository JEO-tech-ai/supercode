"""Dashboard module for real-time workflow monitoring"""
from .server import DashboardServer
from .client import DashboardClient
from .notifications import NotificationManager

__all__ = ["DashboardServer", "DashboardClient", "NotificationManager"]
