# Voice processing endpoints
# Speech-to-text and text-to-speech API routes

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Header
from fastapi.responses import JSONResponse
from typing import Optional, Dict
import base64
import logging

from app.supabase_client import get_supabase_client
from app.services.voice_pipeline import VoicePipeline, AudioTranscription, AudioSynthesis
from app.services.smart_router import SmartRouter
from app.services.memory_engine import MemoryEngine
from app.services.voice_service import voice_service

logger = logging.getLogger(__name__)

# Set up API routes
router = APIRouter(prefix="/voice", tags=["voice"])

# Voice processing services
voice_pipeline = VoicePipeline()
smart_router = None  # Gets injected from main app
memory_engine = None  # Gets injected from main app

def set_services(sr: SmartRouter, me: MemoryEngine):
    """Set service instances from main app"""
    global smart_router, memory_engine
    smart_router = sr
    memory_engine = me

def normalize_assistant_key(key: str) -> str:
    """Convert assistant key between underscore and slug formats"""
    if '_' in key:
        return key.replace('_', '-')
    return key.replace('-', '_')

async def get_voice_id_for_assistant(assistant_key: str, tenant_id: Optional[str] = None) -> Optional[str]:
    """Get voice ID for assistant from Supabase, supporting both underscore and slug variants"""
    try:
        supabase_client = get_supabase_client()
        
        # Try original key first
        voice_prefs = await voice_service.get_voice_preferences(
            supabase_client.get_client(), assistant_key, tenant_id
        )
        
        if not voice_prefs:
            # Try normalized key (underscore <-> slug)
            normalized_key = normalize_assistant_key(assistant_key)
            voice_prefs = await voice_service.get_voice_preferences(
                supabase_client.get_client(), normalized_key, tenant_id
            )
        
        return voice_prefs['voice_id'] if voice_prefs else None
        
    except Exception as e:
        logger.error(f"Error getting voice ID for assistant {assistant_key}: {e}")
        return None

async def validate_supabase_token(authorization: Optional[str]) -> Optional[Dict]:
    """Validate Supabase bearer token and return user info"""
    if not authorization:
        return None
    
    try:
        if not authorization.startswith("Bearer "):
            return None
            
        token = authorization[7:]  # Remove "Bearer " prefix
        
        # Use Supabase client to validate token
        supabase_client = get_supabase_client()
        client = supabase_client.get_client()
        
        # Set the auth token and get user
        client.auth.set_session(token)
        user = client.auth.get_user()
        
        if user and user.user:
            return {
                "user_id": user.user.id,
                "email": user.user.email
            }
        
        return None
        
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        return None

@router.get("/status")
async def get_voice_status():
    """Check voice pipeline status"""
    status = voice_pipeline.get_pipeline_status()
    return {
        "status": "operational" if status["fully_functional"] else "partial",
        "components": status,
        "message": "Voice pipeline ready" if status["fully_functional"] else "Some components missing"
    }

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form(default="en"),
    assistant_key: Optional[str] = Form(default=None),
    tenant_id: Optional[str] = Form(default=None),
    authorization: Optional[str] = Header(default=None)
):
    """
    Convert speech to text
    Accepts audio file (webm, wav, mp3, etc.)
    Supports tenant-specific voice processing with assistant_key
    """
    try:
        # Validate token if provided (optional for transcription)
        user_info = await validate_supabase_token(authorization)
        
        # Read audio data
        audio_data = await audio.read()
        
        # Get file extension
        audio_format = audio.filename.split('.')[-1] if '.' in audio.filename else 'webm'
        
        logger.info(f"Received audio for transcription: {len(audio_data)} bytes, format: {audio_format}")
        if assistant_key:
            logger.info(f"Assistant key: {assistant_key}")
        
        # Transcribe
        result = await voice_pipeline.transcribe_audio(audio_data, audio_format)
        
        if not result.text:
            raise HTTPException(status_code=400, detail="Failed to transcribe audio")
        
        response_data = {
            "success": True,
            "text": result.text,
            "language": result.language,
            "confidence": result.confidence
        }
        
        # Add assistant info if provided
        if assistant_key:
            response_data["assistant_key"] = assistant_key
            
        return response_data
        
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/synthesize")
async def synthesize_speech(
    text: str = Form(...),
    voice_id: Optional[str] = Form(default=None),
    stability: float = Form(default=0.5),
    similarity_boost: float = Form(default=0.75),
    assistant_key: Optional[str] = Form(default=None),
    tenant_id: Optional[str] = Form(default=None),
    authorization: Optional[str] = Header(default=None)
):
    """
    Convert text to speech using tenant-specific voice settings
    Supports Supabase-backed voice preferences per assistant_key
    """
    try:
        # Validate token if provided (recommended for synthesis)
        user_info = await validate_supabase_token(authorization)
        
        logger.info(f"Synthesizing speech for text: {text[:50]}...")
        if assistant_key:
            logger.info(f"Looking up voice for assistant: {assistant_key}")

        # Enhanced voice ID lookup with normalization support
        if not voice_id and assistant_key:
            voice_id = await get_voice_id_for_assistant(assistant_key, tenant_id)
            if voice_id:
                logger.info(f"Found voice ID from Supabase: {voice_id}")

        if not voice_id:
            raise HTTPException(
                status_code=400, 
                detail="No voice_id found. Either pass voice_id directly or configure assistant_voice_prefs in Supabase for this assistant_key."
            )

        voice_settings = {
            "stability": stability,
            "similarity_boost": similarity_boost,
            "style": 0.0,
            "use_speaker_boost": True
        }

        result = await voice_pipeline.synthesize_speech(text, voice_id, voice_settings)
        if not result.audio_base64:
            raise HTTPException(status_code=400, detail="Failed to synthesize speech")

        response_data = {
            "success": True,
            "audio": result.audio_base64,
            "content_type": result.content_type,
            "characters": result.characters_used
        }
        
        # Add assistant info if provided
        if assistant_key:
            response_data["assistant_key"] = assistant_key
            response_data["voice_id"] = voice_id
            
        return response_data
        
    except Exception as e:
        logger.error(f"Synthesis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process")
async def process_voice_message(
    audio: UploadFile = File(...),
    user_id: Optional[str] = Form(default=None),
    session_id: Optional[str] = Form(default=None),
    use_memory: bool = Form(default=True),
    voice_id: Optional[str] = Form(default=None),
    assistant_key: Optional[str] = Form(default=None),   # NEW
    tenant_id: Optional[str] = Form(default=None)        # NEW
):
    try:
        if not smart_router:
            raise HTTPException(status_code=503, detail="Services not initialized")

        # Step 1: Transcribe
        audio_data = await audio.read()
        audio_format = audio.filename.split('.')[-1] if '.' in audio.filename else 'webm'
        transcription = await voice_pipeline.transcribe_audio(audio_data, audio_format)
        if not transcription.text:
            raise HTTPException(status_code=400, detail="Failed to transcribe audio")

        logger.info(f"Transcribed: {transcription.text[:50]}...")

        # Step 2: LLM
        message_text = transcription.text
        if use_memory and user_id and memory_engine:
            preferences = await memory_engine.get_user_preferences(user_id)
            if preferences:
                context_prompt = f"""
                User preferences:
                - Communication style: {preferences.communication_style}
                - Response pace: {preferences.response_pace}

                User said: {message_text}

                Please respond according to the user's preferences.
                """
                message_text = context_prompt

        llm_response = await smart_router.route_message(message_text)
        if llm_response.error:
            raise HTTPException(status_code=503, detail=f"LLM Error: {llm_response.error}")

        logger.info(f"LLM response: {llm_response.content[:50]}...")

        # ---- Enhanced voice lookup for synthesis step ----
        if not voice_id and assistant_key:
            voice_id = await get_voice_id_for_assistant(assistant_key, tenant_id)
            if voice_id:
                logger.info(f"Found voice ID for assistant {assistant_key}: {voice_id}")

        # Step 3: TTS
        audio_synthesis = await voice_pipeline.synthesize_speech(llm_response.content, voice_id)

        # Store session context (unchanged) …
        if user_id and memory_engine:
            session_id = session_id or memory_engine.generate_session_id(user_id)
            await memory_engine.store_session_context(
                session_id, user_id,
                {
                    "voice_input": transcription.text,
                    "llm_response": llm_response.content[:500],
                    "model_used": llm_response.model_used
                }
            )

        return {
            "success": True,
            "transcription": transcription.text,
            "response": llm_response.content,
            "audio": audio_synthesis.audio_base64,
            "model_used": llm_response.model_used,
            "response_time": llm_response.response_time,
            "cost": llm_response.cost,
            "session_id": session_id if user_id else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/voices")
async def get_available_voices():
    """Get list of available voices from ElevenLabs"""
    try:
        voices = await voice_pipeline.get_available_voices()
        return {
            "success": True,
            "voices": voices,
            "count": len(voices)
        }
    except Exception as e:
        logger.error(f"Error getting voices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test")
async def test_voice_pipeline():
    """Test the voice pipeline components"""
    try:
        results = await voice_pipeline.test_pipeline()
        return {
            "success": results["pipeline"],
            "components": results,
            "message": "All components working" if results["pipeline"] else "Some components not configured"
        }
    except Exception as e:
        logger.error(f"Test error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
