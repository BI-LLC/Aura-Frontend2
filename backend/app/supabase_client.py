# Supabase client for AURA Voice AI backend
# Handles database connections and operations

import os
from supabase import create_client, Client
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class SupabaseClient:
    def __init__(self):
        """Initialize Supabase client with environment variables"""
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_ANON_KEY")
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY")  # For admin operations
        
        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
        
        # Create client for regular operations
        self.client: Client = create_client(self.url, self.key)
        
        # Create admin client for service operations
        if self.service_key:
            self.admin_client: Client = create_client(self.url, self.service_key)
        else:
            self.admin_client = self.client
            logger.warning("SUPABASE_SERVICE_KEY not set, using anon key for admin operations")
    
    def get_client(self, admin: bool = False) -> Client:
        """Get Supabase client (admin or regular)"""
        return self.admin_client if admin else self.client
    
    async def create_tenant(self, tenant_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new tenant organization"""
        try:
            result = self.admin_client.table("tenants").insert(tenant_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating tenant: {e}")
            raise
    
    async def get_tenant_by_id(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        """Get tenant by ID"""
        try:
            result = self.client.table("tenants").select("*").eq("tenant_id", tenant_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting tenant: {e}")
            return None
    
    async def get_tenant_by_subdomain(self, subdomain: str) -> Optional[Dict[str, Any]]:
        """Get tenant by subdomain (organization name)"""
        try:
            result = self.client.table("tenants").select("*").eq("organization_name", subdomain).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting tenant by subdomain: {e}")
            return None
    
    async def create_tenant_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a user within a tenant"""
        try:
            result = self.admin_client.table("tenant_users").insert(user_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating tenant user: {e}")
            raise
    
    async def get_tenant_users(self, tenant_id: str) -> List[Dict[str, Any]]:
        """Get all users for a tenant"""
        try:
            result = self.client.table("tenant_users").select("*").eq("tenant_id", tenant_id).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error getting tenant users: {e}")
            return []
    
    async def create_document(self, doc_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new document record"""
        try:
            result = self.client.table("documents").insert(doc_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating document: {e}")
            raise
    
    async def get_tenant_documents(self, tenant_id: str, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get documents for a tenant (optionally filtered by user)"""
        try:
            query = self.client.table("documents").select("*").eq("tenant_id", tenant_id)
            if user_id:
                query = query.eq("user_id", user_id)
            
            result = query.execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error getting tenant documents: {e}")
            return []
    
    async def create_document_chunks(self, chunks_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Create document chunks for semantic search"""
        try:
            result = self.client.table("document_chunks").insert(chunks_data).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error creating document chunks: {e}")
            raise
    
    async def search_document_chunks(self, tenant_id: str, query_embedding: List[float], limit: int = 5) -> List[Dict[str, Any]]:
        """Search document chunks using vector similarity"""
        try:
            # Use Supabase's vector search functionality
            result = self.client.rpc(
                "match_document_chunks",
                {
                    "query_embedding": query_embedding,
                    "match_threshold": 0.7,
                    "match_count": limit,
                    "tenant_id": tenant_id
                }
            ).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error searching document chunks: {e}")
            return []
    
    async def create_user_preferences(self, preferences_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update user preferences"""
        try:
            result = self.client.table("user_preferences").upsert(preferences_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating user preferences: {e}")
            raise
    
    async def get_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user preferences"""
        try:
            result = self.client.table("user_preferences").select("*").eq("user_id", user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting user preferences: {e}")
            return None
    
    async def create_conversation_summary(self, summary_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a conversation summary"""
        try:
            result = self.client.table("conversation_summaries").insert(summary_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating conversation summary: {e}")
            raise
    
    async def get_conversation_summaries(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get conversation summaries for a user"""
        try:
            result = self.client.table("conversation_summaries").select("*").eq("user_id", user_id).order("timestamp", desc=True).limit(limit).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error getting conversation summaries: {e}")
            return []
    
    async def track_api_usage(self, usage_data: Dict[str, Any]) -> Dict[str, Any]:
        """Track API usage for billing and monitoring"""
        try:
            result = self.client.table("api_usage").insert(usage_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error tracking API usage: {e}")
            raise
    
    async def get_tenant_storage(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        """Get tenant storage information"""
        try:
            result = self.client.table("tenant_storage").select("*").eq("tenant_id", tenant_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting tenant storage: {e}")
            return None
    
    async def update_tenant_storage(self, tenant_id: str, storage_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update tenant storage information"""
        try:
            result = self.client.table("tenant_storage").update(storage_data).eq("tenant_id", tenant_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error updating tenant storage: {e}")
            raise

# Global Supabase client instance
supabase_client = None

def get_supabase_client() -> SupabaseClient:
    """Get the global Supabase client instance"""
    global supabase_client
    if supabase_client is None:
        supabase_client = SupabaseClient()
    return supabase_client
