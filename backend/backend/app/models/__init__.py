# AURA Voice AI - Data Models
"""Pydantic models and data structures"""

# Import tenant models
from .tenant import TenantModel, TenantUserModel

# Try to import optional models
try:
    from .conversation import ConversationModel, ChatMessage
except ImportError:
    ConversationModel = None
    ChatMessage = None

try:
    from .user import UserModel, UserPreferences
except ImportError:
    UserModel = None
    UserPreferences = None

__all__ = [
    'TenantModel',
    'TenantUserModel', 
    'ConversationModel',
    'ChatMessage',
    'UserModel',
    'UserPreferences'
]
