# Memory Engine for AURA Voice AI
# Provides user preference storage, session context, and conversation summary
# management using Redis with an in-memory fallback for development.

import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import redis.asyncio as redis
import logging
from dataclasses import dataclass, asdict
import hashlib

logger = logging.getLogger(__name__)

@dataclass
class UserPreferences:
    # User preference record (limited to a small set of fields)
    user_id: str
    communication_style: str = "conversational"  # direct | conversational | technical
    response_pace: str = "normal"  # fast | normal | detailed
    expertise_areas: List[str] = None  # Up to 5 domains
    preferred_examples: str = "general"  # business | technical | abstract | general
    created_at: str = None
    updated_at: str = None
    
    def __post_init__(self):
        if self.expertise_areas is None:
            self.expertise_areas = []
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()
        if self.updated_at is None:
            self.updated_at = datetime.now().isoformat()

@dataclass
class ConversationSummary:
    # Summary of a conversation session
    session_id: str
    user_id: str
    summary: str
    key_topics: List[str]
    timestamp: str
    message_count: int

class MemoryEngine:
    def __init__(self):
        # Initialize Redis connection handle (connect on first use)
        self.redis_client = None
        self.connected = False
        
        # In-memory fallback if Redis is not available
        self.fallback_memory = {}
        self.use_fallback = False
        
        logger.info("Memory Engine initialized")
    
    async def connect(self):
        # Connect to Redis (or use in-memory if Redis is not available)
        try:
            # Try to connect to Redis; host and port are currently static
            self.redis_client = redis.Redis(
                host='localhost',
                port=6379,
                db=0,
                decode_responses=True
            )
            # Test connection
            await self.redis_client.ping()
            self.connected = True
            logger.info("Connected to Redis for memory storage")
        except Exception as e:
            logger.warning(f"Redis not available: {e}")
            logger.info("Using in-memory storage (data will not persist between restarts)")
            self.use_fallback = True
            self.connected = True
    
    async def ensure_connected(self):
        # Ensure a connection (or fallback) is available before operations
        if not self.connected:
            await self.connect()
    
    def _get_user_key(self, user_id: str) -> str:
        # Redis key for user preferences
        return f"user:preferences:{user_id}"
    
    def _get_session_key(self, session_id: str) -> str:
        # Redis key for session data
        return f"session:{session_id}"
    
    def _get_conversation_key(self, user_id: str) -> str:
        # Redis key for conversation history
        return f"user:conversations:{user_id}"
    
    async def get_user_preferences(self, user_id: str) -> Optional[UserPreferences]:
        # Retrieve user preferences; returns defaults if none exist
        await self.ensure_connected()
        
        try:
            if self.use_fallback:
                # Use in-memory storage
                data = self.fallback_memory.get(self._get_user_key(user_id))
            else:
                # Use Redis
                data = await self.redis_client.get(self._get_user_key(user_id))
            
            if data:
                if isinstance(data, str):
                    data = json.loads(data)
                return UserPreferences(**data)
            
            # Return default preferences if none exist
            return UserPreferences(user_id=user_id)
            
        except Exception as e:
            logger.error(f"Error getting user preferences: {e}")
            return UserPreferences(user_id=user_id)
    
    async def save_user_preferences(self, preferences: UserPreferences) -> bool:
        # Save user preferences with a rolling expiration
        await self.ensure_connected()
        
        try:
            # Update timestamp
            preferences.updated_at = datetime.now().isoformat()
            
            # Convert to JSON
            data = json.dumps(asdict(preferences))
            
            if self.use_fallback:
                # Save to in-memory
                self.fallback_memory[self._get_user_key(preferences.user_id)] = data
            else:
                # Save to Redis with 90-day expiration (as per spec)
                await self.redis_client.setex(
                    self._get_user_key(preferences.user_id),
                    timedelta(days=90),
                    data
                )
            
            logger.info(f"Saved preferences for user {preferences.user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving user preferences: {e}")
            return False
    
    async def store_session_context(self, session_id: str, user_id: str, context: Dict) -> bool:
        # Store session context with a 24-hour expiration
        await self.ensure_connected()
        
        try:
            session_data = {
                "session_id": session_id,
                "user_id": user_id,
                "context": context,
                "timestamp": datetime.now().isoformat()
            }
            
            data = json.dumps(session_data)
            
            if self.use_fallback:
                # Store in memory
                self.fallback_memory[self._get_session_key(session_id)] = data
                # Simple cleanup - remove old sessions after 24h
                asyncio.create_task(self._cleanup_session_fallback(session_id))
            else:
                # Store in Redis with 24h expiration
                await self.redis_client.setex(
                    self._get_session_key(session_id),
                    timedelta(hours=24),
                    data
                )
            
            return True
            
        except Exception as e:
            logger.error(f"Error storing session context: {e}")
            return False
    
    async def get_session_context(self, session_id: str) -> Optional[Dict]:
        # Retrieve session context by session identifier
        await self.ensure_connected()
        
        try:
            if self.use_fallback:
                data = self.fallback_memory.get(self._get_session_key(session_id))
            else:
                data = await self.redis_client.get(self._get_session_key(session_id))
            
            if data:
                if isinstance(data, str):
                    data = json.loads(data)
                return data.get("context", {})
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting session context: {e}")
            return None
    
    async def add_conversation_summary(self, user_id: str, summary: ConversationSummary) -> bool:
        # Add a conversation summary; keep only the most recent 20 per user
        await self.ensure_connected()
        
        try:
            # Get existing summaries
            if self.use_fallback:
                data = self.fallback_memory.get(self._get_conversation_key(user_id), "[]")
            else:
                data = await self.redis_client.get(self._get_conversation_key(user_id)) or "[]"
            
            summaries = json.loads(data) if isinstance(data, str) else data
            
            # Add new summary
            summaries.append(asdict(summary))
            
            # Keep only last 20 summaries
            summaries = summaries[-20:]
            
            # Save back
            data = json.dumps(summaries)
            
            if self.use_fallback:
                self.fallback_memory[self._get_conversation_key(user_id)] = data
            else:
                await self.redis_client.setex(
                    self._get_conversation_key(user_id),
                    timedelta(days=90),
                    data
                )
            
            return True
            
        except Exception as e:
            logger.error(f"Error adding conversation summary: {e}")
            return False
    
    async def get_conversation_summaries(self, user_id: str, limit: int = 10) -> List[ConversationSummary]:
        # Get recent conversation summaries capped by limit
        await self.ensure_connected()
        
        try:
            if self.use_fallback:
                data = self.fallback_memory.get(self._get_conversation_key(user_id), "[]")
            else:
                data = await self.redis_client.get(self._get_conversation_key(user_id)) or "[]"
            
            summaries = json.loads(data) if isinstance(data, str) else data
            
            # Return last N summaries
            return [ConversationSummary(**s) for s in summaries[-limit:]]
            
        except Exception as e:
            logger.error(f"Error getting conversation summaries: {e}")
            return []
    
    async def delete_user_data(self, user_id: str) -> bool:
        # Delete all user data (GDPR) for a given user identifier
        await self.ensure_connected()
        
        try:
            keys_to_delete = [
                self._get_user_key(user_id),
                self._get_conversation_key(user_id)
            ]
            
            if self.use_fallback:
                # Delete from in-memory
                for key in keys_to_delete:
                    self.fallback_memory.pop(key, None)
                # Also delete any sessions for this user
                session_keys = [k for k in self.fallback_memory.keys() 
                              if k.startswith("session:") and user_id in self.fallback_memory.get(k, "")]
                for key in session_keys:
                    self.fallback_memory.pop(key, None)
            else:
                # Delete from Redis
                for key in keys_to_delete:
                    await self.redis_client.delete(key)
                # Delete sessions
                cursor = 0
                while True:
                    cursor, keys = await self.redis_client.scan(
                        cursor, match=f"session:*", count=100
                    )
                    for key in keys:
                        data = await self.redis_client.get(key)
                        if data and user_id in data:
                            await self.redis_client.delete(key)
                    if cursor == 0:
                        break
            
            logger.info(f"Deleted all data for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting user data: {e}")
            return False
    
    async def get_user_data_export(self, user_id: str) -> Dict:
        # Export all user data (GDPR) for a given user identifier
        await self.ensure_connected()
        
        try:
            preferences = await self.get_user_preferences(user_id)
            summaries = await self.get_conversation_summaries(user_id, limit=20)
            
            return {
                "user_id": user_id,
                "preferences": asdict(preferences) if preferences else None,
                "conversation_summaries": [asdict(s) for s in summaries],
                "export_date": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error exporting user data: {e}")
            return {"error": str(e)}
    
    async def _cleanup_session_fallback(self, session_id: str):
        # Clean up session from fallback memory after 24 hours
        await asyncio.sleep(86400)  # 24 hours
        self.fallback_memory.pop(self._get_session_key(session_id), None)
    
    def generate_session_id(self, user_id: str = None) -> str:
        # Generate a unique session identifier (md5 hash of timestamp and user)
        timestamp = datetime.now().isoformat()
        if user_id:
            return hashlib.md5(f"{user_id}:{timestamp}".encode()).hexdigest()[:16]
        return hashlib.md5(timestamp.encode()).hexdigest()[:16]