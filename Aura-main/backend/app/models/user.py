# User data models for AURA Voice AI
# Pydantic schemas for user preferences, session context, and export/delete flows.

from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class UserPreferencesModel(BaseModel):
    # User preferences influencing response style and content
    user_id: str
    communication_style: str = Field(
        default="conversational",
        description="User's preferred communication style: direct, conversational, or technical"
    )
    response_pace: str = Field(
        default="normal",
        description="Preferred response detail level: fast, normal, or detailed"
    )
    expertise_areas: List[str] = Field(
        default_factory=list,
        max_items=5,
        description="User's areas of expertise or interest (max 5)"
    )
    preferred_examples: str = Field(
        default="general",
        description="Type of examples user prefers: business, technical, abstract, or general"
    )
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class UserPreferencesUpdate(BaseModel):
    # Partial update model for preferences (all fields optional)
    communication_style: Optional[str] = None
    response_pace: Optional[str] = None
    expertise_areas: Optional[List[str]] = None
    preferred_examples: Optional[str] = None

class SessionContext(BaseModel):
    # Session context for ongoing conversations
    session_id: str
    user_id: str
    messages: List[Dict[str, str]] = Field(default_factory=list)
    current_topic: Optional[str] = None
    context_summary: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

class ConversationSummaryModel(BaseModel):
    # Summary of a conversation session
    session_id: str
    user_id: str
    summary: str
    key_topics: List[str]
    timestamp: datetime
    message_count: int

class UserDataExport(BaseModel):
    # GDPR-compliant data export payload
    user_id: str
    preferences: Optional[UserPreferencesModel] = None
    conversation_summaries: List[ConversationSummaryModel] = Field(default_factory=list)
    export_date: datetime = Field(default_factory=datetime.now)

class DeleteUserDataRequest(BaseModel):
    # Request to delete user data (GDPR)
    user_id: str
    confirmation: bool = Field(
        ...,
        description="User must confirm deletion"
    )