# backend/app/routers/voice.py
# Enhanced with real-time streaming support

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Optional, Dict, AsyncGenerator
import base64
import logging
import json
import asyncio
import io

from app.services.voice_pipeline import VoicePipeline, AudioTranscription, AudioSynthesis
from app.services.smart_router import SmartRouter
from app.services.memory_engine import MemoryEngine

logger = logging.getLogger(__name__)

def post_process_response(content: str, context: str, message: str) -> str:
    """Post-process AI response to ensure it uses document content correctly"""
    
    # If we have document context, check if the response should be corrected
    if context and "Document context:" in context:
        message_lower = message.lower()
        content_lower = content.lower()
        
        # Check for off-topic questions that should be redirected
        off_topic_indicators = [
            "ocean", "weather", "sports", "news", "politics", "movie", "music", 
            "recipe", "travel", "vacation", "medical", "doctor", "health",
            "mountain", "animal", "planet", "universe", "philosophy", "birds",
            "google", "apple", "microsoft", "amazon", "meta", "tesla", "openai",
            "philippine", "bluegrass", "sky", "region", "location", "here"
        ]
        
        # Check if this is an off-topic question
        is_off_topic = any(indicator in message_lower for indicator in off_topic_indicators)
        
        if is_off_topic:
            # If the response is providing general knowledge instead of redirecting
            if len(content) > 50 and "document content provided" not in content_lower:
                return "I can only answer questions based on the document content provided. Please ask me something about the document."
        
        # Check for general knowledge responses that should be redirected
        general_knowledge_indicators = [
            "is a person who", "is a thing that", "refers to", "typically refers",
            "generally means", "usually means", "is defined as", "can be described as",
            "is known for", "is famous for", "is located in", "is found in"
        ]
        
        if any(indicator in content_lower for indicator in general_knowledge_indicators):
            return "I can only answer questions based on the document content provided. Please ask me something about the document."
        
        # Check if the response seems to be using general knowledge instead of document content
        if len(content) > 100 and not any(word in content_lower for word in ["document", "manuscript", "text", "content"]):
            # Check if the question is asking for specific information that should be in the document
            specific_question_indicators = ["who wrote", "what is", "when was", "where is", "how does", "who is", "author"]
            if any(indicator in message_lower for indicator in specific_question_indicators):
                # The AI might be hallucinating - try to redirect
                return "I can only answer questions based on the document content provided. Please ask me something about the document."
    
    return content

# Set up API routes
router = APIRouter(prefix="/voice", tags=["voice"])

# Voice processing services
voice_pipeline = None  # Gets injected from main app
smart_router = None  # Gets injected from main app
memory_engine = None  # Gets injected from main app

def set_services(sr: SmartRouter, me: MemoryEngine, vp: VoicePipeline):
    """Set service instances from main app"""
    global smart_router, memory_engine, voice_pipeline
    smart_router = sr
    memory_engine = me
    voice_pipeline = vp
    logger.info(f"Voice router services set - voice_pipeline: {voice_pipeline is not None}")

# === EXISTING ENDPOINTS (keep all your current endpoints) ===

@router.get("/status")
async def get_voice_status():
    """Check voice pipeline status"""
    if not voice_pipeline:
        return {
            "status": "error",
            "message": "Voice pipeline not initialized"
        }
    status = voice_pipeline.get_pipeline_status()
    return {
        "status": "operational" if status["fully_functional"] else "partial",
        "components": status,
        "message": "Voice pipeline ready" if status["fully_functional"] else "Some components missing"
    }

# === NEW STREAMING ENDPOINTS ===

@router.websocket("/stream")
async def websocket_streaming_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time voice streaming
    Handles continuous audio chunks and streams responses
    """
    await websocket.accept()
    logger.info("WebSocket streaming connection established")
    
    audio_buffer = bytearray()
    user_id = None
    session_id = None
    
    try:
        while True:
            # Receive message from client
            message = await websocket.receive_text()
            data = json.loads(message)
            
            if data["type"] == "audio_chunk":
                # Add audio to buffer
                audio_bytes = base64.b64decode(data["audio"])
                audio_buffer.extend(audio_bytes)
                
                # Set user info
                if not user_id:
                    user_id = data.get("user_id", "anonymous")
                
            elif data["type"] == "end_of_speech":
                # Process accumulated audio
                if len(audio_buffer) > 0:
                    # Transcribe
                    transcription = await voice_pipeline.transcribe_audio(
                        bytes(audio_buffer), 
                        audio_format="wav"
                    )
                    
                    if transcription.text:
                        # Send transcription back
                        await websocket.send_text(json.dumps({
                            "type": "transcription",
                            "text": transcription.text
                        }))
                        
                        # Get LLM response with streaming
                        response_generator = smart_router.route_message_stream(
                            transcription.text,
                            {"user_id": user_id} if user_id else None
                        )
                        
                        # Stream response chunks
                        full_response = ""
                        async for chunk in response_generator:
                            full_response += chunk
                            
                            # Generate TTS for chunk (if it's a complete sentence)
                            if any(punct in chunk for punct in ['.', '!', '?']):
                                audio_result = await voice_pipeline.synthesize_speech(
                                    chunk,
                                    voice_settings={
                                        "stability": 0.5,
                                        "similarity_boost": 0.75,
                                        "optimize_streaming_latency": 4
                                    }
                                )
                                
                                if audio_result.audio_base64:
                                    await websocket.send_text(json.dumps({
                                        "type": "audio_stream",
                                        "chunk": audio_result.audio_base64
                                    }))
                        
                        # Send completion
                        await websocket.send_text(json.dumps({
                            "type": "stream_complete",
                            "full_response": full_response
                        }))
                    
                    # Clear buffer
                    audio_buffer.clear()
            
            elif data["type"] == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": str(e)
        }))

@router.post("/stream/process")
async def streaming_voice_process(
    audio: UploadFile = File(...),
    user_id: Optional[str] = Form(default=None)
):
    """
    Process voice with streaming response
    Returns Server-Sent Events stream
    """
    async def generate():
        try:
            # Read and transcribe audio
            audio_data = await audio.read()
            audio_format = audio.filename.split('.')[-1] if '.' in audio.filename else 'wav'
            
            transcription = await voice_pipeline.transcribe_audio(audio_data, audio_format)
            
            # Send transcription
            yield f"data: {json.dumps({'type': 'transcription', 'text': transcription.text})}\n\n"
            
            # Stream LLM response
            response_text = ""
            async for chunk in smart_router.route_message_stream(transcription.text):
                response_text += chunk
                
                # Send text chunk
                yield f"data: {json.dumps({'type': 'text_chunk', 'text': chunk})}\n\n"
                
                # Generate TTS for complete sentences
                if any(punct in chunk for punct in ['.', '!', '?']):
                    audio_result = await voice_pipeline.synthesize_speech(chunk)
                    if audio_result.audio_base64:
                        yield f"data: {json.dumps({'type': 'audio_chunk', 'audio': audio_result.audio_base64})}\n\n"
            
            # Send completion
            yield f"data: {json.dumps({'type': 'complete', 'full_text': response_text})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

# === KEEP ALL YOUR EXISTING ENDPOINTS BELOW ===

@router.options("/transcribe")
async def transcribe_audio_options():
    """Handle CORS preflight for transcribe endpoint"""
    return JSONResponse(
        content={"message": "CORS preflight"},
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    )

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form(default="en")
):
    """Convert speech to text"""
    logger.info(f"Transcribe endpoint called - voice_pipeline: {voice_pipeline is not None}")
    if not voice_pipeline:
        raise HTTPException(status_code=503, detail="Voice pipeline not initialized")
    try:
        audio_data = await audio.read()
        audio_format = audio.filename.split('.')[-1] if '.' in audio.filename else 'webm'
        logger.info(f"Received audio for transcription: {len(audio_data)} bytes, format: {audio_format}")
        
        result = await voice_pipeline.transcribe_audio(audio_data, audio_format)
        
        if not result.text:
            raise HTTPException(status_code=400, detail="Failed to transcribe audio")
        
        response = JSONResponse({
            "success": True,
            "text": result.text,
            "language": result.language,
            "confidence": result.confidence
        })
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        return response
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.options("/synthesize")
async def synthesize_speech_options():
    """Handle CORS preflight for synthesize endpoint"""
    return JSONResponse(
        content={"message": "CORS preflight"},
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    )

@router.post("/synthesize")
async def synthesize_speech(
    text: str = Form(...),
    voice_id: Optional[str] = Form(default=None),
    stability: float = Form(default=0.5),
    similarity_boost: float = Form(default=0.75)
):
    """Convert text to speech"""
    # ... (keep your existing implementation)
    try:
        logger.info(f"Synthesizing speech for text: {text[:50]}...")
        
        voice_settings = {
            "stability": stability,
            "similarity_boost": similarity_boost,
            "style": 0.0,
            "use_speaker_boost": True
        }
        
        result = await voice_pipeline.synthesize_speech(text, voice_id, voice_settings)
        
        if not result.audio_base64:
            raise HTTPException(status_code=400, detail="Failed to synthesize speech")
        
        response = JSONResponse({
            "success": True,
            "audio": result.audio_base64,
            "content_type": result.content_type,
            "characters": result.characters_used
        })
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        return response
    except Exception as e:
        logger.error(f"Synthesis error: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process")
async def process_voice_message(
    audio: UploadFile = File(...),
    user_id: Optional[str] = Form(default=None),
    session_id: Optional[str] = Form(default=None),
    use_memory: bool = Form(default=True),
    voice_id: Optional[str] = Form(default=None),
    document_id: Optional[str] = Form(default=None),
    organization: Optional[str] = Form(default="default_org")
):
    """Complete voice processing with document context support"""
    try:
        if not smart_router:
            raise HTTPException(status_code=503, detail="Services not initialized")
        
        audio_data = await audio.read()
        audio_format = audio.filename.split('.')[-1] if '.' in audio.filename else 'webm'
        
        transcription = await voice_pipeline.transcribe_audio(audio_data, audio_format)
        
        if not transcription.text:
            raise HTTPException(status_code=400, detail="Failed to transcribe audio")
        
        logger.info(f"Transcribed: {transcription.text[:50]}...")
        
        message_text = transcription.text
        
        # Get document context if available
        context = ""
        if document_id and user_id:
            try:
                # Import the data service from main
                from app.main import data_service, tenant_aware_services
                
                # Initialize services if not available
                if not tenant_aware_services and not data_service:
                    logger.info("Services not initialized, creating data service directly")
                    from app.services.data_ingestion import DataIngestionService
                    data_service = DataIngestionService()
                
                # Try to use tenant-aware service first, fallback to basic data_service
                service_to_use = None
                if tenant_aware_services and "data_ingestion" in tenant_aware_services and tenant_aware_services["data_ingestion"] is not None:
                    service_to_use = tenant_aware_services["data_ingestion"]
                    logger.info("Using tenant-aware data ingestion service for document context")
                elif data_service is not None:
                    service_to_use = data_service
                    logger.info("Using basic data ingestion service for document context")
                
                if service_to_use:
                    # Get document content for context
                    documents = await service_to_use.get_tenant_documents(user_id, organization)
                    logger.info(f"Retrieved {len(documents) if documents else 0} documents")
                    if documents:
                        # Find the most relevant document or use a specific one
                        selected_doc = None
                        
                        # If document_id is specified, try to find it
                        if document_id and document_id != "default_document":
                            for doc in documents:
                                if doc.get('id') == document_id or doc.get('filename', '').lower() in document_id.lower():
                                    selected_doc = doc
                                    break
                        
                        # If no specific document found, look for the Unitism manifesto document
                        if not selected_doc:
                            for doc in documents:
                                filename = doc.get('filename', '').lower()
                                if 'manifesto' in filename or 'unitism' in filename or 'manisfesto' in filename:
                                    selected_doc = doc
                                    break
                        
                        # If still no document found, look for the nepotism protocol document
                        if not selected_doc:
                            for doc in documents:
                                filename = doc.get('filename', '').lower()
                                if 'nepotism' in filename or 'conflict' in filename or 'protocol' in filename:
                                    selected_doc = doc
                                    break
                        
                        # Fallback to first document if no specific document found
                        if not selected_doc:
                            selected_doc = documents[0]
                        
                        doc_content = selected_doc.get('content', '')
                        logger.info(f"Selected document: {selected_doc.get('filename', 'Unknown')}")
                        logger.info(f"Document content preview: {doc_content[:100] if doc_content else 'NO CONTENT'}")
                        if doc_content:
                            # Limit content to avoid token limit (keep first 8000 characters)
                            max_content_length = 8000
                            if len(doc_content) > max_content_length:
                                doc_content = doc_content[:max_content_length] + "... [Content truncated]"
                                logger.info(f"Document content truncated to {max_content_length} characters")
                            
                            # Use content for document-specific responses
                            context = f"Document context: {doc_content}"
                            logger.info(f"Document context length: {len(doc_content)} characters")
                        else:
                            logger.warning("Document found but no content available")
                            context = ""
                    else:
                        logger.warning("No documents found")
            except Exception as e:
                logger.error(f"Could not get document context: {e}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Create system prompt with document constraints
        if context and "Document context:" in context:
                    system_prompt = f"""You are a document-only assistant. You have NO general knowledge. You can ONLY answer based on the document below.

DOCUMENT:
{context}

CRITICAL RULES:
1. You have NO knowledge outside this document
2. If asked about anything NOT in the document, respond: "I can only answer questions based on the document content provided. Please ask me something about the document."
3. If you don't know something from the document, say: "I don't know that information from the document. Could you ask about something else in the document?"
4. NEVER provide general knowledge, definitions, or information not in the document
5. NEVER make up information or hallucinate

EXAMPLES:
User: "What is the ocean?" → You: "I can only answer questions based on the document content provided. Please ask me something about the document."
User: "Who is the author?" → You: [Look in the document for author information, if not found say "I don't know that information from the document"]
User: "What is the weather?" → You: "I can only answer questions based on the document content provided. Please ask me something about the document."

You are a document-only assistant with NO other knowledge."""
        else:
            system_prompt = f"""You are AURA, a helpful AI assistant for {organization}.
            
            {context}
            
            Be helpful, concise, and friendly. If you have document context, use it to answer questions."""
        
        # Use direct OpenAI call with document context
        try:
            import openai
            from app.config import settings
            
            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message_text}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            content = response.choices[0].message.content
            
            # Post-process the response to ensure it uses document content
            content = post_process_response(content, context, message)
            
            from app.models.conversation import LLMResponse
            llm_response = LLMResponse(
                content=content,
                model_used="gpt-3.5-turbo",
                response_time=0.0,
                cost=0.0
            )
            
        except Exception as e:
            logger.error(f"OpenAI call error: {e}")
            # Fallback to smart router
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
        
        audio_synthesis = await voice_pipeline.synthesize_speech(llm_response.content, voice_id)
        
        if user_id and memory_engine:
            session_id = session_id or memory_engine.generate_session_id(user_id)
            await memory_engine.store_session_context(
                session_id,
                user_id,
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


@router.websocket("/stream/voice")
async def stream_voice_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time voice streaming
    Handles continuous audio chunks and streams responses
    """
    await websocket.accept()
    logger.info("WebSocket streaming connection established")
    
    audio_buffer = bytearray()
    user_id = None
    session_id = None
    
    try:
        while True:
            # Receive message from client
            message = await websocket.receive_text()
            data = json.loads(message)
            
            if data["type"] == "audio_chunk":
                # Add audio to buffer
                audio_bytes = base64.b64decode(data["audio"])
                audio_buffer.extend(audio_bytes)
                
                # Set user info
                if not user_id:
                    user_id = data.get("user_id", "anonymous")
                
            elif data["type"] == "end_of_speech":
                # Process accumulated audio
                if len(audio_buffer) > 0:
                    # Transcribe
                    transcription = await voice_pipeline.transcribe_audio(
                        bytes(audio_buffer), 
                        audio_format="wav"
                    )
                    
                    if transcription.text:
                        # Send transcription back
                        await websocket.send_text(json.dumps({
                            "type": "transcription",
                            "text": transcription.text
                        }))
                        
                        # Get LLM response with streaming
                        if smart_router:
                            response_generator = smart_router.route_message_stream(
                                transcription.text,
                                {"user_id": user_id} if user_id else None
                            )
                            
                            # Stream response chunks
                            full_response = ""
                            async for chunk in response_generator:
                                full_response += chunk
                                
                                # Generate TTS for chunk (if it's a complete sentence)
                                if any(punct in chunk for punct in ['.', '!', '?']):
                                    audio_result = await voice_pipeline.synthesize_speech(
                                        chunk,
                                        voice_settings={
                                            "stability": 0.5,
                                            "similarity_boost": 0.75,
                                            "optimize_streaming_latency": 4
                                        }
                                    )
                                    
                                    if audio_result.audio_base64:
                                        await websocket.send_text(json.dumps({
                                            "type": "audio_stream",
                                            "chunk": audio_result.audio_base64
                                        }))
                            
                            # Send completion
                            await websocket.send_text(json.dumps({
                                "type": "stream_complete",
                                "full_response": full_response
                            }))
                        else:
                            # Fallback if smart_router not available
                            await websocket.send_text(json.dumps({
                                "type": "error",
                                "message": "Smart router not available"
                            }))
                    
                    # Clear buffer
                    audio_buffer.clear()
            
            elif data["type"] == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": str(e)
        }))