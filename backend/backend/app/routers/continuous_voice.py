"""
WebSocket routes for continuous natural voice conversation
No push-to-talk - flows like a real phone call
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
import logging
import json
import asyncio
from typing import Optional

from app.services.continuous_conversation import ContinuousConversationManager
from app.services.voice_pipeline import VoicePipeline
from app.services.smart_router import SmartRouter
from app.services.tenant_manager import TenantManager
from app.services.auth_service import TenantAuthService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws/voice", tags=["continuous-voice"])

# Service instances (set from main)
conversation_manager = None
auth_service = None

def set_services(cm: ContinuousConversationManager, auth: TenantAuthService):
    """Set service instances from main app"""
    global conversation_manager, auth_service
    conversation_manager = cm
    auth_service = auth

@router.websocket("/continuous")
async def continuous_voice_conversation(
    websocket: WebSocket,
    token: str = Query(...)  # Auth token as query param
):
    """
    WebSocket endpoint for continuous natural voice conversation
    - No push-to-talk needed
    - Natural turn-taking
    - Interruption support
    - Context maintained throughout call
    """
    session = None
    user_id = None
    
    try:
        # Accept WebSocket connection first
        await websocket.accept()
        logger.info("WebSocket connection accepted")
        
        # Verify authentication
        if not auth_service:
            logger.error("Auth service not initialized")
            await websocket.send_json({
                "type": "error",
                "message": "Authentication service not available"
            })
            await websocket.close(code=1008, reason="Service unavailable")
            return
        
        # Verify token with better error handling
        try:
            payload = auth_service.verify_token(token)
            if not payload:
                logger.warning("Invalid or expired token")
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid or expired authentication token"
                })
                await websocket.close(code=1008, reason="Invalid token")
                return
        except Exception as auth_error:
            logger.error(f"Token verification error: {auth_error}")
            await websocket.send_json({
                "type": "error",
                "message": "Authentication failed"
            })
            await websocket.close(code=1008, reason="Auth error")
            return
        
        # Extract user info
        user_id = payload.get("user_id")
        tenant_id = payload.get("tenant_id")
        organization = payload.get("organization", "AURA")
        
        if not user_id:
            logger.error("No user_id in token payload")
            await websocket.send_json({
                "type": "error",
                "message": "Invalid user information"
            })
            await websocket.close(code=1008, reason="Invalid user")
            return
        
        logger.info(f"Continuous voice call started: User {user_id} from {organization}")
        
        # Check if conversation manager is available
        if not conversation_manager:
            logger.error("Conversation manager not initialized")
            await websocket.send_json({
                "type": "error",
                "message": "Voice service not available"
            })
            await websocket.close(code=1008, reason="Service unavailable")
            return
        
        # Start continuous conversation session
        await conversation_manager.start_continuous_session(
            websocket=websocket,
            user_id=user_id,
            tenant_id=tenant_id
        )
        
    except WebSocketDisconnect:
        logger.info(f"Voice call disconnected by client for user {user_id}")
    except Exception as e:
        logger.error(f"Voice call error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"Connection error: {str(e)}"
            })
        except:
            pass
    finally:
        logger.info(f"Voice call ended for user {user_id if user_id else 'unknown'}")