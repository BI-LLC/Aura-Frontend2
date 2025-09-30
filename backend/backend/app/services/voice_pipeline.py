# Voice processing pipeline
# Handles converting speech to text and back again

import io
import base64
import logging
from typing import Optional, Dict, Any
import httpx
import openai
from dataclasses import dataclass
import json
import asyncio
import os

logger = logging.getLogger(__name__)

@dataclass
class AudioTranscription:
    # What we got back from transcription
    text: str
    language: str = "en"
    duration: float = 0.0
    confidence: float = 0.0

@dataclass
class AudioSynthesis:
    # Audio file we generated
    audio_base64: str
    content_type: str = "audio/mpeg"
    duration: float = 0.0
    characters_used: int = 0

class VoicePipeline:
    def __init__(self):
        # Use centralized config instead of loading .env files directly
        try:
            from app.config import settings
            # Get API keys from centralized config
            self.openai_key = settings.OPENAI_API_KEY
            self.elevenlabs_key = settings.ELEVENLABS_API_KEY
            self.elevenlabs_voice_id = settings.ELEVENLABS_VOICE_ID
            logger.info("✅ VoicePipeline using centralized config")
        except ImportError:
            # Fallback to environment variables if config not available
            import os
            self.openai_key = os.getenv("OPENAI_API_KEY", "")
            self.elevenlabs_key = os.getenv("ELEVENLABS_API_KEY", "")
            self.elevenlabs_voice_id = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
            logger.warning("⚠️ VoicePipeline using environment variables (config not available)")
        
        self.elevenlabs_model = "eleven_monolingual_v1"
        
        # Validate API keys
        self.whisper_available = bool(self.openai_key)
        self.elevenlabs_available = bool(self.elevenlabs_key)
        
        logger.info(f"Voice Pipeline initialized")
        logger.info(f"Whisper (STT) available: {self.whisper_available}")
        logger.info(f"ElevenLabs (TTS) available: {self.elevenlabs_available}")
        
        # Debug: Show API key status
        if self.openai_key:
            logger.info(f"OpenAI key loaded: {self.openai_key[:10]}...")
        else:
            logger.warning("OpenAI key not loaded")
            
        if self.elevenlabs_key:
            logger.info(f"ElevenLabs key loaded: {self.elevenlabs_key[:10]}...")
        else:
            logger.warning("ElevenLabs key not loaded")
    
    async def transcribe_audio(self, audio_data: bytes, audio_format: str = "raw") -> AudioTranscription:
        """
        Turn audio into text using Whisper
        Pass in the audio file as bytes
        """
        if not self.whisper_available:
            logger.error("Whisper API not configured (missing OPENAI_API_KEY)")
            return AudioTranscription(text="", language="en")
        
        try:
            logger.info(f"Transcribing audio ({len(audio_data)} bytes, format: {audio_format})")
            
            # Check minimum audio length (OpenAI requires at least 0.1 seconds)
            min_bytes_16khz = int(0.1 * 16000 * 2)  # 0.1 seconds * 16kHz * 2 bytes per sample
            preferred_bytes_16khz = int(2.0 * 16000 * 2)  # 2 seconds preferred minimum
            
            if len(audio_data) < min_bytes_16khz:
                logger.warning(f"Audio too short ({len(audio_data)} bytes < {min_bytes_16khz} bytes minimum)")
                return AudioTranscription(text="", language="en")
            elif len(audio_data) < preferred_bytes_16khz:
                logger.info(f"Audio is short ({len(audio_data)} bytes, prefer {preferred_bytes_16khz}+ bytes for better results)")
            else:
                logger.info(f"Good audio length: {len(audio_data)} bytes ({len(audio_data)/(16000*2):.1f} seconds)")
            
            # For raw PCM data, we need to convert to WAV format for Whisper
            if audio_format == "raw":
                # Convert raw PCM to WAV format
                audio_file = self._convert_raw_to_wav(audio_data)
            else:
                # Use as-is for other formats
                audio_file = io.BytesIO(audio_data)
                audio_file.name = f"audio.{audio_format}"
            
            # Call Whisper to transcribe
            client = openai.OpenAI(api_key=self.openai_key)
            
            response = await asyncio.to_thread(
                client.audio.transcriptions.create,
                model="whisper-1",
                file=audio_file,
                response_format="json",
                language="en"  # Could detect language automatically later
            )
            
            logger.info(f"Transcription successful: {response.text[:50]}...")
            
            return AudioTranscription(
                text=response.text,
                language="en",
                duration=0.0,  # Whisper doesn't return duration
                confidence=0.95  # Whisper doesn't return confidence, using default
            )
            
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return AudioTranscription(text="", language="en")
    
    async def synthesize_speech(
        self, 
        text: str, 
        voice_id: Optional[str] = None,
        voice_settings: Optional[Dict] = None
    ) -> AudioSynthesis:
        """
        Convert text to speech using ElevenLabs
        Returns audio as base64 encoded string
        """
        if not self.elevenlabs_available:
            logger.error("ElevenLabs API not configured (missing ELEVENLABS_API_KEY)")
            return AudioSynthesis(audio_base64="", content_type="audio/mpeg")
        
        try:
            logger.info(f"Synthesizing speech ({len(text)} characters)")
            
            # Use provided voice or default
            voice_id = voice_id or self.elevenlabs_voice_id
            
            # Default voice settings (can be customized)
            if voice_settings is None:
                voice_settings = {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "style": 0.0,
                    "use_speaker_boost": True
                }
            
            # ElevenLabs API endpoint
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
            
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": self.elevenlabs_key
            }
            
            data = {
                "text": text,
                "model_id": self.elevenlabs_model,
                "voice_settings": voice_settings
            }
            
            # Make async request to ElevenLabs
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=data,
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    # Convert audio bytes to base64
                    audio_bytes = response.content
                    audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                    
                    logger.info(f"Speech synthesis successful ({len(audio_bytes)} bytes)")
                    
                    return AudioSynthesis(
                        audio_base64=audio_base64,
                        content_type="audio/mpeg",
                        duration=len(audio_bytes) / 16000,  # Rough estimate
                        characters_used=len(text)
                    )
                else:
                    logger.error(f"ElevenLabs API error: {response.status_code} - {response.text}")
                    return AudioSynthesis(audio_base64="", content_type="audio/mpeg")
                    
        except Exception as e:
            logger.error(f"Speech synthesis error: {e}")
            return AudioSynthesis(audio_base64="", content_type="audio/mpeg")
    
    async def get_available_voices(self) -> list:
        """
        Get list of available ElevenLabs voices
        """
        if not self.elevenlabs_available:
            return []
        
        try:
            url = "https://api.elevenlabs.io/v1/voices"
            headers = {"xi-api-key": self.elevenlabs_key}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    voices = [
                        {
                            "voice_id": voice["voice_id"],
                            "name": voice["name"],
                            "category": voice.get("category", "unknown")
                        }
                        for voice in data.get("voices", [])
                    ]
                    logger.info(f"Found {len(voices)} available voices")
                    return voices
                else:
                    logger.error(f"Failed to get voices: {response.status_code}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error getting voices: {e}")
            return []
    
    async def process_voice_message(
        self, 
        audio_data: bytes, 
        audio_format: str = "webm"
    ) -> Dict[str, Any]:
        """
        Complete voice processing pipeline:
        1. Speech to text
        2. Process with LLM (handled externally)
        3. Text to speech
        """
        # Step 1: Transcribe audio to text
        transcription = await self.transcribe_audio(audio_data, audio_format)
        
        if not transcription.text:
            return {
                "success": False,
                "error": "Failed to transcribe audio",
                "transcription": None,
                "audio_response": None
            }
        
        return {
            "success": True,
            "transcription": {
                "text": transcription.text,
                "language": transcription.language,
                "confidence": transcription.confidence
            },
            "audio_response": None  # Will be added after LLM processing
        }
    
    def get_pipeline_status(self) -> Dict[str, bool]:
        """
        Get status of voice pipeline components
        """
        return {
            "whisper_available": self.whisper_available,
            "elevenlabs_available": self.elevenlabs_available,
            "fully_functional": self.whisper_available and self.elevenlabs_available
        }
    
    async def test_pipeline(self) -> Dict[str, Any]:
        """
        Test the voice pipeline with a simple message
        """
        test_results = {
            "whisper": False,
            "elevenlabs": False,
            "pipeline": False
        }
        
        # Test ElevenLabs (easier to test)
        if self.elevenlabs_available:
            try:
                result = await self.synthesize_speech("Hello, this is a test of the voice system.")
                if result.audio_base64:
                    test_results["elevenlabs"] = True
                    logger.info("ElevenLabs test passed")
            except Exception as e:
                logger.error(f"ElevenLabs test failed: {e}")
        
        # Test Whisper (would need actual audio file)
        test_results["whisper"] = self.whisper_available
        
        # Overall pipeline status
        test_results["pipeline"] = test_results["whisper"] and test_results["elevenlabs"]
        
        return test_results
    
    def _convert_raw_to_wav(self, raw_audio: bytes) -> io.BytesIO:
        """
        Convert raw PCM audio data to WAV format for Whisper
        """
        try:
            # Assuming 16-bit PCM, 16kHz, mono
            sample_rate = 16000
            channels = 1
            bits_per_sample = 16
            
            # WAV header structure
            header_size = 44
            data_size = len(raw_audio)
            file_size = header_size + data_size - 8
            
            # Create WAV header
            wav_header = bytearray()
            
            # RIFF header
            wav_header.extend(b'RIFF')
            wav_header.extend(file_size.to_bytes(4, 'little'))
            wav_header.extend(b'WAVE')
            
            # Format chunk
            wav_header.extend(b'fmt ')
            wav_header.extend((16).to_bytes(4, 'little'))  # Chunk size
            wav_header.extend((1).to_bytes(2, 'little'))   # Audio format (PCM)
            wav_header.extend(channels.to_bytes(2, 'little'))
            wav_header.extend(sample_rate.to_bytes(4, 'little'))
            wav_header.extend((sample_rate * channels * bits_per_sample // 8).to_bytes(4, 'little'))  # Byte rate
            wav_header.extend((channels * bits_per_sample // 8).to_bytes(2, 'little'))  # Block align
            wav_header.extend(bits_per_sample.to_bytes(2, 'little'))
            
            # Data chunk
            wav_header.extend(b'data')
            wav_header.extend(data_size.to_bytes(4, 'little'))
            
            # Combine header and audio data
            wav_data = wav_header + raw_audio
            
            # Create BytesIO object
            wav_file = io.BytesIO(wav_data)
            wav_file.name = "audio.wav"
            
            logger.info(f"Converted raw audio to WAV: {len(raw_audio)} bytes -> {len(wav_data)} bytes")
            return wav_file
            
        except Exception as e:
            logger.error(f"Error converting raw audio to WAV: {e}")
            # Fallback: return raw audio as-is
            audio_file = io.BytesIO(raw_audio)
            audio_file.name = "audio.raw"
            return audio_file