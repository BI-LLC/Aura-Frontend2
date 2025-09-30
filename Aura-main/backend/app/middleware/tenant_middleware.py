"""
Middleware to ensure tenant isolation on every request
"""

from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging

# Import auth service
from app.services.auth_service import TenantAuthService

logger = logging.getLogger(__name__)

class TenantMiddleware:
    def __init__(self, auth_service: TenantAuthService):
        self.auth_service = auth_service
        self.security = HTTPBearer()
    
    async def __call__(self, request: Request, call_next):
        """
        Extract tenant_id from every request
        Ensure all operations are scoped to the correct tenant
        """
        
        # Skip auth for public endpoints
        public_paths = ["/", "/health", "/login", "/signup"]
        if request.url.path in public_paths:
            return await call_next(request)
        
        # Get token from header
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing authentication")
        
        token = authorization.replace("Bearer ", "")
        
        # Verify token and extract tenant_id
        payload = self.auth_service.verify_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # CRITICAL: Set tenant_id in request state
        request.state.tenant_id = payload["tenant_id"]
        request.state.user_id = payload["user_id"]
        request.state.user_role = payload["role"]
        request.state.organization = payload["organization"]
        
        # Log for audit
        logger.info(f"Request from tenant: {payload['organization']} ({payload['tenant_id']})")
        
        # Continue with request
        response = await call_next(request)
        return response