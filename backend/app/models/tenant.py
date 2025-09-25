"""
Tenant (Client) Management Models
Each client who purchases AURA gets their own isolated workspace
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
import uuid

class TenantModel(BaseModel):
    """Represents a client organization that purchased AURA"""
    tenant_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_name: str
    admin_email: str
    subscription_tier: str = "standard"  # standard, premium, enterprise
    created_at: datetime = Field(default_factory=datetime.now)
    
    # Limits based on subscription
    max_users: int = 10
    max_storage_gb: int = 10
    max_api_calls_monthly: int = 10000
    
    # Custom settings per tenant
    custom_settings: Dict = Field(default_factory=dict)
    api_keys: Dict = Field(default_factory=dict)  # Their own API keys
    
    # Branding
    custom_logo: Optional[str] = None
    brand_colors: Optional[Dict] = None
    
    # Status
    is_active: bool = True
    expires_at: Optional[datetime] = None

class TenantUserModel(BaseModel):
    """Users within a tenant organization"""
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str  # Links to tenant
    email: str
    role: str = "user"  # admin, manager, user
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    
    # User's personal AI settings
    persona_settings: Dict = Field(default_factory=dict)
    voice_preference: Optional[str] = None
    
    # Access control
    can_upload_documents: bool = True
    can_modify_ai_settings: bool = False
    can_view_analytics: bool = False