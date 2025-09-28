# Streaming Handler for AURA Voice AI
# Real-time audio streaming for faster responses

import asyncio
import re
import logging
from typing import AsyncGenerator, Optional, List, Dict
from dataclasses import dataclass
import time
import json
from collections import deque

logger = logging.getLogger(__name__)

@dataclass
class StreamChunk:
    """Represents a chunk of streamed content"""
    text: str
    is_complete_sentence: bool
    timestamp: float
    chunk_id: int

class StreamingHandler:
    def __init__(self, voice_pipeline=None):
        """
        Initialize streaming handler
        Handles real-time streaming of LLM to TTS
        """
        self.voice_pipeline = voice_pipeline
        
        # Buffering settings
        self.min_chunk_size = 50  # Minimum characters before streaming
        self.max_chunk_size = 200  # Maximum characters per chunk
        self.sentence_buffer = ""  # Buffer for incomplete sentences
        self.audio_buffer = deque(maxlen=10)  # Audio chunks buffer
        
        # Sentence detection patterns
        self.sentence_endings = re.compile(r'[.!?]\s+')
        self.partial_sentence_endings = re.compile(r'[,;:]\s+')
        
        # Streaming state
        self.is_streaming = False
        self.stream_start_time = 0
        self.chunks_processed = 0
        
        logger.info("Streaming Handler initialized")
    
    def detect_sentence_boundary(self, text: str) -> List[str]:
        """
        Detect complete sentences in text
        Returns list of complete sentences and remaining partial
        """
        # Find all sentence boundaries
        sentences = []
        remaining = text
        
        # Look for complete sentences
        matches = list(self.sentence_endings.finditer(text))
        
        if matches:
            last_end = 0
            for match in matches:
                sentence = text[last_end:match.end()].strip()
                if sentence:
                    sentences.append(sentence)
                last_end = match.end()
            
            # Get remaining partial sentence
            remaining = text[last_end:].strip()
        
        return sentences, remaining
    
    async def stream_llm_to_tts(
        self, 
        llm_stream: AsyncGenerator[str, None],
        voice_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> AsyncGenerator[Dict, None]:
        """
        Stream LLM output to TTS in real-time
        Yields audio chunks as they're ready
        """
        self.is_streaming = True
        self.stream_start_time = time.time()
        self.chunks_processed = 0
        self.sentence_buffer = ""
        
        try:
            async for text_chunk in llm_stream:
                # Add chunk to buffer
                self.sentence_buffer += text_chunk
                
                # Check for complete sentences
                sentences, remaining = self.detect_sentence_boundary(self.sentence_buffer)
                self.sentence_buffer = remaining
                
                # Process complete sentences
                for sentence in sentences:
                    if len(sentence.strip()) > 0:
                        # Generate audio for sentence
                        audio_chunk = await self._generate_audio_chunk(
                            sentence, 
                            voice_id
                        )
                        
                        if audio_chunk:
                            self.chunks_processed += 1
                            yield {
                                "type": "audio",
                                "chunk_id": self.chunks_processed,
                                "text": sentence,
                                "audio": audio_chunk["audio_base64"],
                                "duration": audio_chunk.get("duration", 0)
                            }
                        
                        # Small delay to prevent overwhelming
                        await asyncio.sleep(0.1)
                
                # Check if buffer is getting too large
                if len(self.sentence_buffer) > self.max_chunk_size:
                    # Find a good break point (comma, semicolon, etc.)
                    partial_matches = list(self.partial_sentence_endings.finditer(self.sentence_buffer))
                    
                    if partial_matches and len(self.sentence_buffer) > self.min_chunk_size:
                        # Break at last comma/semicolon
                        break_point = partial_matches[-1].end()
                        chunk_to_process = self.sentence_buffer[:break_point].strip()
                        self.sentence_buffer = self.sentence_buffer[break_point:].strip()
                        
                        # Generate audio for partial
                        audio_chunk = await self._generate_audio_chunk(
                            chunk_to_process,
                            voice_id
                        )
                        
                        if audio_chunk:
                            self.chunks_processed += 1
                            yield {
                                "type": "audio",
                                "chunk_id": self.chunks_processed,
                                "text": chunk_to_process,
                                "audio": audio_chunk["audio_base64"],
                                "duration": audio_chunk.get("duration", 0),
                                "partial": True
                            }
            
            # Process any remaining text
            if self.sentence_buffer.strip():
                audio_chunk = await self._generate_audio_chunk(
                    self.sentence_buffer.strip(),
                    voice_id
                )
                
                if audio_chunk:
                    self.chunks_processed += 1
                    yield {
                        "type": "audio",
                        "chunk_id": self.chunks_processed,
                        "text": self.sentence_buffer.strip(),
                        "audio": audio_chunk["audio_base64"],
                        "duration": audio_chunk.get("duration", 0),
                        "final": True
                    }
            
            # Send completion signal
            yield {
                "type": "complete",
                "total_chunks": self.chunks_processed,
                "streaming_time": time.time() - self.stream_start_time
            }
            
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield {
                "type": "error",
                "error": str(e),
                "fallback": True
            }
        finally:
            self.is_streaming = False
    
    async def _generate_audio_chunk(
        self, 
        text: str, 
        voice_id: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Generate audio for a text chunk using TTS
        """
        if not self.voice_pipeline:
            logger.error("Voice pipeline not initialized")
            return None
        
        try:
            # Use faster settings for streaming
            voice_settings = {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True,
                "optimize_streaming_latency": 4  # ElevenLabs streaming optimization
            }
            
            result = await self.voice_pipeline.synthesize_speech(
                text,
                voice_id,
                voice_settings
            )
            
            if result.audio_base64:
                return {
                    "audio_base64": result.audio_base64,
                    "duration": result.duration,
                    "characters": result.characters_used
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Audio generation error: {e}")
            return None
    
    async def buffer_audio_stream(
        self,
        audio_stream: AsyncGenerator[Dict, None],
        buffer_size: int = 2
    ) -> AsyncGenerator[Dict, None]:
        """
        Buffer audio stream to prevent gaps
        Maintains 2-second buffer by default
        """
        buffer = []
        buffer_duration = 0.0
        
        async for chunk in audio_stream:
            if chunk["type"] == "audio":
                # Add to buffer
                buffer.append(chunk)
                buffer_duration += chunk.get("duration", 0)
                
                # If buffer is full enough, start yielding
                if buffer_duration >= buffer_size or chunk.get("final", False):
                    while buffer:
                        yield buffer.pop(0)
                
            else:
                # Pass through non-audio chunks immediately
                yield chunk
        
        # Yield any remaining buffered chunks
        while buffer:
            yield buffer.pop(0)
    
    def estimate_speaking_time(self, text: str) -> float:
        """
        Estimate how long it takes to speak text
        Average speaking rate: 150 words per minute
        """
        words = len(text.split())
        minutes = words / 150
        return minutes * 60  # Return seconds
    
    async def fallback_to_complete(
        self,
        text: str,
        voice_id: Optional[str] = None
    ) -> Dict:
        """
        Fallback to non-streaming mode if streaming fails
        """
        logger.info("Falling back to complete response mode")
        
        if not self.voice_pipeline:
            return {
                "type": "error",
                "error": "Voice pipeline not available"
            }
        
        try:
            # Generate complete audio
            result = await self.voice_pipeline.synthesize_speech(
                text,
                voice_id
            )
            
            if result.audio_base64:
                return {
                    "type": "complete_audio",
                    "text": text,
                    "audio": result.audio_base64,
                    "duration": result.duration,
                    "streaming": False
                }
            else:
                return {
                    "type": "error",
                    "error": "Failed to generate audio"
                }
                
        except Exception as e:
            logger.error(f"Fallback error: {e}")
            return {
                "type": "error",
                "error": str(e)
            }
    
    def get_streaming_stats(self) -> Dict:
        """
        Get streaming performance statistics
        """
        return {
            "is_streaming": self.is_streaming,
            "chunks_processed": self.chunks_processed,
            "buffer_size": len(self.audio_buffer),
            "streaming_time": time.time() - self.stream_start_time if self.is_streaming else 0
        }
    
    async def optimize_for_latency(self):
        """
        Optimize settings for minimum latency
        """
        # Reduce chunk sizes for faster processing
        self.min_chunk_size = 30
        self.max_chunk_size = 100
        
        logger.info("Optimized for low latency streaming")