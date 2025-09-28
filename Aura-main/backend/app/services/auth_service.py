"""
Authentication system for multi-tenant AURA
Each client gets their own login portal
"""

import jwt
import bcrypt
from datetime import datetime, timedelta
from app.config import settings
import requests
from jwt import PyJWKClient
from typing import Optional, Dict
import os

class TenantAuthService:
    def __init__(self):
        self.secret_key = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
        self.algorithm = "HS256"
    
    async def create_tenant_admin(
        self,
        tenant_id: str,
        email: str,
        password: str,
        organization_name: str
    ) -> Dict:
        """
        Create admin account when client purchases AURA
        This happens automatically after purchase
        """
        # Hash password
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
        
        # Create admin user
        admin_user = {
            "user_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "email": email,
            "password_hash": hashed_password.decode('utf-8'),
            "role": "tenant_admin",
            "organization": organization_name,
            "created_at": datetime.now().isoformat()
        }
        
        # Store in database (tenant-specific)
        await self.store_user(admin_user)
        
        # Generate welcome token
        token = self.generate_token(admin_user)
        
        return {
            "admin_user": admin_user,
            "access_token": token,
            "login_url": f"https://{organization_name}.aura-ai.com/admin"  # Subdomain per client
        }
    
    def generate_token(self, user: Dict) -> str:
        """Generate JWT token with tenant isolation"""
        payload = {
            "user_id": user["user_id"],
            "tenant_id": user["tenant_id"],  # CRITICAL: Include tenant_id in token
            "role": user["role"],
            "organization": user["organization"],
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """Verify token and extract tenant information.

        Supports two token types:
        1) AURA internal JWT (signed with JWT_SECRET)
        2) Supabase session JWT (used by the frontend)

        For Supabase JWTs we do a relaxed decode (no signature verification) in
        development so we can read the claims and map them to our expected
        fields. For production you should validate against Supabase JWKS.
        """
        # 1) Try internal AURA token first
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            pass

        # 2) Supabase JWT verification (development mode - no signature verification)
        try:
            # For development, decode without signature verification
            supa = jwt.decode(token, options={"verify_signature": False})
            
            # Map Supabase claims to our expected format
            user_id = supa.get("sub") or supa.get("user_id")
            tenant_id = supa.get("tenant_id") or "default_tenant"
            organization = supa.get("organization") or "AURA"
            role = supa.get("role") or "user"
            
            if not user_id:
                logger.warning("No user_id found in Supabase token")
                return None
                
            return {
                "user_id": user_id,
                "tenant_id": tenant_id,
                "organization": organization,
                "role": role,
                "token_type": "supabase"
            }
            
        except Exception as e:
            logger.error(f"Supabase token decode error: {e}")
            return None
        return None
    
    async def login(self, email: str, password: str, tenant_id: str) -> Optional[Dict]:
        """
        Login with tenant isolation
        Users can only login to their own tenant
        """
        # Get user from tenant-specific database
        user = await self.get_user_by_email(email, tenant_id)
        
        if not user:
            return None
        
        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), user["password_hash"].encode('utf-8')):
            return None
        
        # Generate token
        token = self.generate_token(user)
        
        return {
            "access_token": token,
            "user": {
                "user_id": user["user_id"],
                "tenant_id": user["tenant_id"],
                "email": user["email"],
                "role": user["role"],
                "organization": user["organization"]
            }
        }