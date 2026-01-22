"""
Security Module - JWT Authentication and Rate Limiting
Multi-Agent Port Communication System
"""
import os
import time
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from functools import wraps
from collections import defaultdict

from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# JWT Configuration (simplified for demo - use python-jose in production)
JWT_SECRET = os.getenv("JWT_SECRET", "multi-agent-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Rate Limiting Configuration
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # seconds


class TokenPayload(BaseModel):
    """JWT Token Payload"""
    sub: str  # subject (agent name or user id)
    role: str  # agent, admin, user
    exp: float  # expiration timestamp
    iat: float  # issued at timestamp


class SimpleJWT:
    """
    Simplified JWT implementation for inter-agent communication.
    For production, use python-jose library.
    """

    @staticmethod
    def _base64url_encode(data: bytes) -> str:
        import base64
        return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

    @staticmethod
    def _base64url_decode(data: str) -> bytes:
        import base64
        padding = 4 - len(data) % 4
        if padding != 4:
            data += '=' * padding
        return base64.urlsafe_b64decode(data)

    @classmethod
    def create_token(cls, payload: Dict[str, Any], secret: str = JWT_SECRET) -> str:
        """Create a simple JWT token"""
        import json

        header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
        header_b64 = cls._base64url_encode(json.dumps(header).encode())
        payload_b64 = cls._base64url_encode(json.dumps(payload).encode())

        signature_input = f"{header_b64}.{payload_b64}"
        signature = hashlib.sha256(f"{signature_input}{secret}".encode()).hexdigest()
        signature_b64 = cls._base64url_encode(signature.encode())

        return f"{header_b64}.{payload_b64}.{signature_b64}"

    @classmethod
    def verify_token(cls, token: str, secret: str = JWT_SECRET) -> Optional[Dict[str, Any]]:
        """Verify and decode a JWT token"""
        import json

        try:
            parts = token.split('.')
            if len(parts) != 3:
                return None

            header_b64, payload_b64, signature_b64 = parts

            # Verify signature
            signature_input = f"{header_b64}.{payload_b64}"
            expected_signature = hashlib.sha256(f"{signature_input}{secret}".encode()).hexdigest()
            actual_signature = cls._base64url_decode(signature_b64).decode()

            if expected_signature != actual_signature:
                return None

            # Decode payload
            payload = json.loads(cls._base64url_decode(payload_b64))

            # Check expiration
            if payload.get('exp', 0) < time.time():
                return None

            return payload
        except Exception:
            return None


def create_agent_token(agent_name: str, role: str = "agent") -> str:
    """Create a JWT token for an agent"""
    now = datetime.utcnow()
    payload = {
        "sub": agent_name,
        "role": role,
        "iat": now.timestamp(),
        "exp": (now + timedelta(hours=JWT_EXPIRATION_HOURS)).timestamp(),
    }
    return SimpleJWT.create_token(payload)


class RateLimiter:
    """
    Simple in-memory rate limiter using sliding window.
    For production, use Redis-based rate limiting.
    """

    def __init__(self, max_requests: int = RATE_LIMIT_REQUESTS, window_seconds: int = RATE_LIMIT_WINDOW):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = defaultdict(list)

    def _get_client_id(self, request: Request) -> str:
        """Get client identifier from request"""
        # Use X-Forwarded-For if behind proxy, otherwise use client host
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _cleanup_old_requests(self, client_id: str):
        """Remove requests outside the current window"""
        current_time = time.time()
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if current_time - req_time < self.window_seconds
        ]

    def is_allowed(self, request: Request) -> bool:
        """Check if request is allowed under rate limit"""
        client_id = self._get_client_id(request)
        self._cleanup_old_requests(client_id)

        if len(self.requests[client_id]) >= self.max_requests:
            return False

        self.requests[client_id].append(time.time())
        return True

    def get_remaining(self, request: Request) -> int:
        """Get remaining requests in current window"""
        client_id = self._get_client_id(request)
        self._cleanup_old_requests(client_id)
        return max(0, self.max_requests - len(self.requests[client_id]))


# Global rate limiter instance
rate_limiter = RateLimiter()

# Security scheme
security_scheme = HTTPBearer(auto_error=False)


async def verify_jwt_token(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme)
) -> Optional[Dict[str, Any]]:
    """
    FastAPI dependency to verify JWT token.
    Returns None if no token provided (for optional auth).
    """
    if credentials is None:
        return None

    payload = SimpleJWT.verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload


async def require_jwt_token(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme)
) -> Dict[str, Any]:
    """
    FastAPI dependency to require JWT token.
    Raises 401 if no valid token provided.
    """
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    payload = SimpleJWT.verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload


async def rate_limit_check(request: Request):
    """
    FastAPI dependency for rate limiting.
    Raises 429 if rate limit exceeded.
    """
    if not rate_limiter.is_allowed(request):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": str(RATE_LIMIT_WINDOW)}
        )


def require_role(allowed_roles: list):
    """
    Decorator to require specific roles for endpoint access.
    Usage: @require_role(["admin", "agent"])
    """
    async def role_checker(
        payload: Dict[str, Any] = Depends(require_jwt_token)
    ) -> Dict[str, Any]:
        if payload.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return payload
    return role_checker


# Pre-generated tokens for inter-agent communication
AGENT_TOKENS = {
    "orchestrator": create_agent_token("orchestrator", "orchestrator"),
    "writer": create_agent_token("writer", "agent"),
    "reviewer": create_agent_token("reviewer", "agent"),
    "tester": create_agent_token("tester", "agent"),
    "analyzer": create_agent_token("analyzer", "agent"),
}


def get_agent_token(agent_name: str) -> str:
    """Get pre-generated token for an agent"""
    return AGENT_TOKENS.get(agent_name, create_agent_token(agent_name))
