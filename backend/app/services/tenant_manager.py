# Tenant management service for multi-tenant isolation

import os
import logging
from typing import Optional, Dict, List
from datetime import datetime
import asyncio
import json

from app.models.tenant import TenantModel, TenantUserModel

logger = logging.getLogger(__name__)

class TenantManager:
    def __init__(self):
        # Initialize tenant management system
        self.tenants = {}  # In production, use database
        self.tenant_storage = {}  # Separate storage per tenant
        self.users = {}  # Store tenant users
        logger.info("Tenant Manager initialized")
    
    async def create_tenant(
        self,
        organization_name: str,
        admin_email: str,
        subscription_tier: str = "standard"
    ) -> TenantModel:
        # Create new tenant organization
        tenant = TenantModel(
            organization_name=organization_name,
            admin_email=admin_email,
            subscription_tier=subscription_tier
        )
        
        # Create isolated storage directories
        tenant_storage_path = f"data/tenants/{tenant.tenant_id}"
        os.makedirs(f"{tenant_storage_path}/documents", exist_ok=True)
        os.makedirs(f"{tenant_storage_path}/models", exist_ok=True)
        os.makedirs(f"{tenant_storage_path}/audio", exist_ok=True)
        
        # Initialize tenant-specific database schema
        await self._initialize_tenant_database(tenant.tenant_id)
        
        # Store tenant
        self.tenants[tenant.tenant_id] = tenant
        
        logger.info(f"Created tenant: {organization_name} ({tenant.tenant_id})")
        return tenant
    
    async def get_tenant_context(self, tenant_id: str) -> Dict:
        """
        Get all context for a tenant
        This is used to isolate AI responses to only use this tenant's data
        """
        tenant = self.tenants.get(tenant_id)
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found")
        
        # Get tenant-specific data
        context = {
            "tenant_id": tenant_id,
            "organization": tenant.organization_name,
            "settings": tenant.custom_settings,
            "documents": await self._get_tenant_documents(tenant_id),
            "users": await self._get_tenant_users(tenant_id),
            "knowledge_base": await self._get_tenant_knowledge(tenant_id)
        }
        
        return context
    
    async def _initialize_tenant_database(self, tenant_id: str):
        """Create tenant-specific database schema"""
        # In production, create separate schema or database per tenant
        # For now, we'll use prefixed tables
        pass
    
    async def _get_tenant_documents(self, tenant_id: str) -> List[Dict]:
        """Get all documents for a specific tenant"""
        tenant_docs_path = f"data/tenants/{tenant_id}/documents"
        documents = []
        
        if os.path.exists(tenant_docs_path):
            for filename in os.listdir(tenant_docs_path):
                doc_path = os.path.join(tenant_docs_path, filename)
                with open(doc_path, 'r') as f:
                    documents.append(json.load(f))
        
        return documents
    
    async def _get_tenant_users(self, tenant_id: str) -> List[Dict]:
        """Get all users for a tenant"""
        # Filter users by tenant_id
        return [user for user in self.users.values() 
                if user.get("tenant_id") == tenant_id]
    
    async def _get_tenant_knowledge(self, tenant_id: str) -> Dict:
        """Get aggregated knowledge base for tenant"""
        documents = await self._get_tenant_documents(tenant_id)
        
        # Aggregate all knowledge
        knowledge = {
            "total_documents": len(documents),
            "topics": [],
            "content_snippets": []
        }
        
        for doc in documents:
            # Extract key information
            if "content" in doc:
                knowledge["content_snippets"].append(doc["content"][:500])
            if "topics" in doc:
                knowledge["topics"].extend(doc["topics"])
        
        return knowledge
    
    def validate_tenant_access(
        self,
        tenant_id: str,
        user_id: str,
        resource: str
    ) -> bool:
        """
        Validate that a user has access to a resource within their tenant
        CRITICAL: This prevents cross-tenant data access
        """
        # Check tenant exists
        tenant = self.tenants.get(tenant_id)
        if not tenant or not tenant.is_active:
            return False
        
        # Check user belongs to tenant
        user = self.get_user(user_id)
        if not user or user.tenant_id != tenant_id:
            return False
        
        # Check resource permissions
        if resource == "documents" and not user.can_upload_documents:
            return False
        
        if resource == "ai_settings" and not user.can_modify_ai_settings:
            return False
        
        return True
    
    def get_tenant_storage_path(self, tenant_id: str, resource_type: str) -> str:
        """Get isolated storage path for tenant"""
        # Match the actual storage structure used by the system
        if resource_type == "documents":
            return f"data/documents/{tenant_id}"
        else:
            base_path = f"data/tenants/{tenant_id}"
            paths = {
                "audio": f"{base_path}/audio",
                "models": f"{base_path}/models",
                "chat_history": f"{base_path}/chat_history"
            }
            return paths.get(resource_type, base_path)