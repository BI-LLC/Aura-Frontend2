# Memory router for AURA Voice AI
# Exposes REST endpoints for managing user preferences, sessions, and
# conversation summaries, as well as GDPR export/delete operations.

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

from app.models.user import (
    UserPreferencesModel,
    UserPreferencesUpdate,
    UserDataExport,
    DeleteUserDataRequest
)
from app.services.memory_engine import MemoryEngine

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/memory", tags=["memory"])

# Initialize memory engine
memory_engine = MemoryEngine()

@router.get("/preferences/{user_id}", response_model=UserPreferencesModel)
async def get_user_preferences(user_id: str):
    # Get user preferences
    try:
        preferences = await memory_engine.get_user_preferences(user_id)
        if not preferences:
            raise HTTPException(status_code=404, detail="User preferences not found")
        
        return UserPreferencesModel(
            user_id=preferences.user_id,
            communication_style=preferences.communication_style,
            response_pace=preferences.response_pace,
            expertise_areas=preferences.expertise_areas,
            preferred_examples=preferences.preferred_examples,
            created_at=preferences.created_at,
            updated_at=preferences.updated_at
        )
    except Exception as e:
        logger.error(f"Error getting preferences: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/preferences/{user_id}", response_model=UserPreferencesModel)
async def update_user_preferences(
    user_id: str,
    updates: UserPreferencesUpdate
):
    # Update user preferences
    try:
        # Get existing preferences
        preferences = await memory_engine.get_user_preferences(user_id)
        
        # Update fields that were provided
        if updates.communication_style:
            preferences.communication_style = updates.communication_style
        if updates.response_pace:
            preferences.response_pace = updates.response_pace
        if updates.expertise_areas is not None:
            preferences.expertise_areas = updates.expertise_areas[:5]  # Max 5
        if updates.preferred_examples:
            preferences.preferred_examples = updates.preferred_examples
        
        # Save updated preferences
        success = await memory_engine.save_user_preferences(preferences)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save preferences")
        
        return UserPreferencesModel(
            user_id=preferences.user_id,
            communication_style=preferences.communication_style,
            response_pace=preferences.response_pace,
            expertise_areas=preferences.expertise_areas,
            preferred_examples=preferences.preferred_examples,
            created_at=preferences.created_at,
            updated_at=preferences.updated_at
        )
    except Exception as e:
        logger.error(f"Error updating preferences: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export/{user_id}", response_model=UserDataExport)
async def export_user_data(user_id: str):
    # GDPR compliance - export user data
    try:
        data = await memory_engine.get_user_data_export(user_id)
        if "error" in data:
            raise HTTPException(status_code=500, detail=data["error"])
        
        return UserDataExport(**data)
    except Exception as e:
        logger.error(f"Error exporting user data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{user_id}")
async def delete_user_data(request: DeleteUserDataRequest):
    # GDPR compliance - delete user data
    try:
        if not request.confirmation:
            raise HTTPException(
                status_code=400,
                detail="Confirmation required to delete user data"
            )
        
        success = await memory_engine.delete_user_data(request.user_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete user data")
        
        return {
            "message": f"All data for user {request.user_id} has been deleted",
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Error deleting user data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}")
async def get_session_context(session_id: str):
    # Get session context
    try:
        context = await memory_engine.get_session_context(session_id)
        if not context:
            return {"session_id": session_id, "context": None}
        
        return {"session_id": session_id, "context": context}
    except Exception as e:
        logger.error(f"Error getting session context: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations/{user_id}")
async def get_conversation_history(
    user_id: str,
    limit: int = Query(default=10, le=20)
):
    # Get conversation summaries
    try:
        summaries = await memory_engine.get_conversation_summaries(user_id, limit)
        return {
            "user_id": user_id,
            "conversations": [
                {
                    "session_id": s.session_id,
                    "summary": s.summary,
                    "key_topics": s.key_topics,
                    "timestamp": s.timestamp,
                    "message_count": s.message_count
                }
                for s in summaries
            ]
        }
    except Exception as e:
        logger.error(f"Error getting conversation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))