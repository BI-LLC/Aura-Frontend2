# Streaming router for AURA Voice AI
# WebSocket and SSE endpoints for streaming

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional, AsyncGenerator
import json
import asyncio
import logging
import time
import base64
import numpy as np

from app.services.streaming_handler import StreamingHandler
from app.services.smart_router import SmartRouter
from app.services.voice_pipeline import VoicePipeline
from app.services.memory_engine import MemoryEngine

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/stream", tags=["streaming"])

# Service instances (set from main)
streaming_handler = None
smart_router = None
voice_pipeline = None
memory_engine = None

def set_services(sr, vp, me):  # REMOVED TYPE HINTS, matches main.py call pattern
    """Set service instances from main app"""
    global streaming_handler, smart_router, voice_pipeline, memory_engine
    smart_router = sr
    voice_pipeline = vp
    memory_engine = me
    
    # Initialize StreamingHandler with voice_pipeline
    from app.services.streaming_handler import StreamingHandler
    streaming_handler = StreamingHandler(voice_pipeline)

@router.websocket("/voice")
async def websocket_voice_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time voice streaming
    Handles bidirectional audio streaming with proper buffering
    """
    await websocket.accept()
    logger.info("WebSocket voice connection established")
    
    # Audio buffering (extended for longer recordings)
    audio_buffer = bytearray()
    silence_threshold = 500
    silence_chunks = 0
    max_silence_chunks = 80  # ~2.5-3 seconds of silence before processing
    min_audio_length = int(2.0 * 16000 * 2)  # 2 seconds minimum
    max_audio_length = int(10.0 * 16000 * 2)  # 10 seconds maximum
    preferred_audio_length = int(5.0 * 16000 * 2)  # 5 seconds preferred length
    
    try:
        while True:
            # Receive data from client
            data = await websocket.receive_json()
            
            if data["type"] == "audio_chunk":
                # Process incoming audio chunk with buffering
                audio_data = data.get("audio")
                user_id = data.get("user_id")
                
                if audio_data:
                    # Decode base64 audio data
                    audio_bytes = base64.b64decode(audio_data)
                    audio_buffer.extend(audio_bytes)
                    
                    # Check for silence (simple volume-based detection)
                    try:
                        audio_array = np.frombuffer(audio_bytes, dtype=np.int16)
                        volume = np.abs(audio_array).mean() if len(audio_array) > 0 else 0
                        
                        if volume < silence_threshold:
                            silence_chunks += 1
                        else:
                            silence_chunks = 0
                            
                        # Check if we should process the buffered audio
                        # Prefer longer recordings for better transcription
                        should_process = (
                            # Process if we have enough audio and sufficient silence
                            (silence_chunks >= max_silence_chunks and len(audio_buffer) >= min_audio_length) or
                            # Process if we've reached the maximum length
                            len(audio_buffer) >= max_audio_length or
                            # Process if we've reached preferred length with some silence
                            (len(audio_buffer) >= preferred_audio_length and silence_chunks >= 20)
                        )
                        
                        if should_process:
                            logger.info(f"Processing buffered audio: {len(audio_buffer)} bytes")
                            
                            # Transcribe accumulated audio
                            transcription = await voice_pipeline.transcribe_audio(
                                bytes(audio_buffer), "raw"
                            )
                            
                            # Clear buffer
                            audio_buffer.clear()
                            silence_chunks = 0
                            
                    except Exception as e:
                        logger.error(f"Audio processing error: {e}")
                        transcription = None
                
                if transcription and transcription.text:
                    # Send transcription back
                    await websocket.send_json({
                        "type": "transcription",
                        "text": transcription.text,
                        "timestamp": time.time()
                    })
                    
                    # Get streaming LLM response
                    async def llm_stream():
                        # This would be enhanced to use actual streaming from LLM
                        response = await smart_router.route_message(transcription.text)
                        # Simulate streaming by yielding in chunks
                        words = response.content.split()
                        chunk_size = 5
                        for i in range(0, len(words), chunk_size):
                            chunk = " ".join(words[i:i+chunk_size])
                            yield chunk + " "
                            await asyncio.sleep(0.1)
                    
                    # Stream audio back
                    stream_count = 0
                    async for audio_chunk in streaming_handler.stream_llm_to_tts(
                        llm_stream(),
                        voice_id=data.get("voice_id")
                    ):
                        await websocket.send_json({
                            "type": "audio_stream",
                            "chunk": audio_chunk,
                            "stream_id": stream_count
                        })
                        stream_count += 1
            
            elif data["type"] == "end_of_speech":
                # Force process any remaining buffered audio
                if len(audio_buffer) >= min_audio_length:
                    logger.info(f"End of speech - processing remaining audio: {len(audio_buffer)} bytes")
                    
                    try:
                        transcription = await voice_pipeline.transcribe_audio(
                            bytes(audio_buffer), "raw"
                        )
                        
                        if transcription and transcription.text:
                            # Send transcription back
                            await websocket.send_json({
                                "type": "transcription",
                                "text": transcription.text,
                                "timestamp": time.time()
                            })
                            
                            # Process with LLM...
                            # (similar to above)
                            
                    except Exception as e:
                        logger.error(f"End of speech processing error: {e}")
                    
                    # Clear buffer
                    audio_buffer.clear()
                    silence_chunks = 0
            
            elif data["type"] == "end_stream":
                # Client ended the stream
                await websocket.send_json({
                    "type": "stream_complete",
                    "message": "Stream ended successfully"
                })
                break
            
            elif data["type"] == "ping":
                # Keep-alive ping
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })
    finally:
        logger.info("WebSocket connection closed")

@router.post("/chat")
async def streaming_chat(
    message: str,
    user_id: Optional[str] = None,
    voice_id: Optional[str] = None,
    streaming: bool = True
):
    """
    HTTP endpoint that returns streaming response
    Uses Server-Sent Events (SSE) for streaming
    """
    async def generate_stream():
        try:
            # Get LLM response (enhanced for streaming in future)
            response = await smart_router.route_message(message)
            
            if streaming:
                # Simulate streaming response
                words = response.content.split()
                chunk_size = 10
                
                for i in range(0, len(words), chunk_size):
                    chunk = " ".join(words[i:i+chunk_size])
                    
                    # Generate audio for chunk
                    if voice_pipeline and voice_id:
                        audio_result = await voice_pipeline.synthesize_speech(
                            chunk,
                            voice_id
                        )
                        
                        yield f"data: {json.dumps({'type': 'audio', 'text': chunk, 'audio': audio_result.audio_base64})}\n\n"
                    else:
                        yield f"data: {json.dumps({'type': 'text', 'text': chunk})}\n\n"
                    
                    await asyncio.sleep(0.1)
                
                yield f"data: {json.dumps({'type': 'complete', 'model': response.model_used})}\n\n"
            else:
                # Non-streaming response
                yield f"data: {json.dumps({'type': 'complete_response', 'text': response.content, 'model': response.model_used})}\n\n"
        
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no",  # Disable proxy buffering
        }
    )

@router.get("/stats")
async def get_streaming_stats():
    """Get streaming performance statistics"""
    if not streaming_handler:
        raise HTTPException(status_code=503, detail="Streaming handler not initialized")
    
    return streaming_handler.get_streaming_stats()

@router.post("/optimize")
async def optimize_streaming(target: str = "latency"):
    """
    Optimize streaming settings
    target: "latency" or "quality"
    """
    if not streaming_handler:
        raise HTTPException(status_code=503, detail="Streaming handler not initialized")
    
    if target == "latency":
        await streaming_handler.optimize_for_latency()
        return {"message": "Optimized for low latency", "settings": "min_chunk=30, max_chunk=100"}
    elif target == "quality":
        streaming_handler.min_chunk_size = 100
        streaming_handler.max_chunk_size = 300
        return {"message": "Optimized for quality", "settings": "min_chunk=100, max_chunk=300"}
    else:
        raise HTTPException(status_code=400, detail="Invalid target. Use 'latency' or 'quality'")

@router.get("/test")
async def test_streaming():
    """Test streaming functionality"""
    test_text = "Hello! This is a test of the streaming system. The audio should be generated in chunks for faster response times."
    
    async def simulate_stream():
        words = test_text.split()
        for word in words:
            yield word + " "
            await asyncio.sleep(0.1)
    
    chunks = []
    async for chunk in streaming_handler.stream_llm_to_tts(simulate_stream()):
        chunks.append(chunk)
    
    return {
        "success": True,
        "chunks_generated": len(chunks),
        "test_text": test_text
    }