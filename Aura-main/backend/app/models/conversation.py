"""
Pydantic models used for conversation-related payloads in the API layer.
Note: `services.smart_router` defines its own dataclass `LLMResponse` for
internal routing responses; the names overlap but are not interchanged.
"""

from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = datetime.now()

class LLMResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    content: str
    model_used: str
    response_time: float
    cost: float
    sources: list = []  # Add missing sources field
    error: Optional[str] = None

class HealthStatus(BaseModel):
    provider: str
    status: str  # "healthy", "degraded", "down"
    response_time: float
    last_check: datetime
    error_rate: float