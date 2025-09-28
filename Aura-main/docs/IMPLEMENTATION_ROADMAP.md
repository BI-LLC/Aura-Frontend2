# 🚀 AURA Voice AI - Implementation Roadmap

## 📋 **Current Status Assessment**

### **✅ What's Working:**
- ✅ Basic WebSocket connection established
- ✅ Audio capture from frontend working
- ✅ Whisper STT integration functional
- ✅ ElevenLabs TTS integration working
- ✅ Multi-tenant architecture foundation
- ✅ Smart routing between OpenAI/Grok APIs

### **❌ Critical Issues to Fix:**
- ❌ Voice Activity Detection incomplete/broken
- ❌ No streaming LLM responses (high latency)
- ❌ Audio pipeline not optimized (6-11s total latency)
- ❌ WebSocket protocol mismatches
- ❌ No proper interruption handling
- ❌ Error recovery mechanisms missing
- ❌ Session state management incomplete

## 🎯 **Implementation Strategy**

### **Phase 1: Foundation Fixes** ⏱️ *Days 1-3*

#### **Priority 1: Fix Voice Activity Detection**
```python
# File: backend/app/services/voice_activity_detector.py

class EnhancedVAD:
    def __init__(self, sample_rate=16000, frame_duration=30):
        self.vad = webrtcvad.Vad(2)  # Moderate aggressiveness
        self.sample_rate = sample_rate
        self.frame_duration = frame_duration
        self.frame_length = int(sample_rate * frame_duration / 1000)
        
        # Enhanced buffering
        self.ring_buffer = collections.deque(maxlen=50)  # Increased buffer
        self.speech_frames = []
        self.silence_frames = []
        
        # Thresholds
        self.speech_threshold = 0.6  # 60% frames must be speech
        self.silence_threshold = 0.8  # 80% frames must be silence
        self.min_speech_frames = 10   # Minimum frames for valid speech
        
    def process_audio_chunk(self, audio_chunk: bytes) -> Tuple[bool, bool, Optional[bytes]]:
        """
        Enhanced VAD with better speech detection
        Returns: (is_speaking, speech_complete, accumulated_audio)
        """
        # Ensure proper frame size
        if len(audio_chunk) != self.frame_length * 2:  # 16-bit samples
            return False, False, None
            
        # Check if frame contains speech
        try:
            is_speech = self.vad.is_speech(audio_chunk, self.sample_rate)
        except Exception:
            return False, False, None
            
        self.ring_buffer.append(1 if is_speech else 0)
        
        if len(self.ring_buffer) < 10:  # Need minimum buffer
            return False, False, None
            
        # Calculate speech percentage
        speech_ratio = sum(self.ring_buffer) / len(self.ring_buffer)
        
        # State machine for speech detection
        if not self.speech_frames:  # Not currently in speech
            if speech_ratio > self.speech_threshold:
                # Start of speech detected
                self.speech_frames = [audio_chunk]
                self.silence_frames = []
                return True, False, None
        else:  # Currently in speech
            if speech_ratio > self.silence_threshold:
                # Continue speech
                self.speech_frames.append(audio_chunk)
                self.silence_frames = []
                return True, False, None
            else:
                # Potential end of speech
                self.silence_frames.append(audio_chunk)
                
                if len(self.silence_frames) > 15:  # 450ms of silence
                    # End of speech confirmed
                    if len(self.speech_frames) >= self.min_speech_frames:
                        complete_audio = b''.join(self.speech_frames)
                        self.speech_frames = []
                        self.silence_frames = []
                        return False, True, complete_audio
                    else:
                        # Too short, ignore
                        self.speech_frames = []
                        self.silence_frames = []
                        
        return False, False, None
```

#### **Priority 2: Implement Streaming LLM Responses**
```python
# File: backend/app/services/smart_router.py

async def route_message_stream(self, message: str, user_context: Optional[Dict] = None):
    """
    Stream LLM responses token by token for real-time conversation
    """
    self.total_requests += 1
    
    # Determine provider
    preferred_provider = self._classify_query(message)
    providers_to_try = ["openai", "grok"] if preferred_provider == "openai" else ["grok", "openai"]
    
    for provider in providers_to_try:
        if not self._is_provider_healthy(provider):
            continue
            
        try:
            if provider == "grok":
                async for chunk in self._stream_from_grok(message, user_context):
                    yield chunk
                return
            else:
                async for chunk in self._stream_from_openai(message, user_context):
                    yield chunk
                return
        except Exception as e:
            logger.error(f"Streaming error from {provider}: {e}")
            continue
    
    # Fallback
    yield "I'm experiencing technical difficulties. Please try again."

async def _stream_from_openai(self, message: str, user_context: Optional[Dict] = None):
    """Stream from OpenAI with proper error handling"""
    try:
        client = openai.AsyncOpenAI(api_key=self.openai_key)
        
        messages = [
            {"role": "system", "content": "You are AURA, a helpful AI assistant."},
            {"role": "user", "content": message}
        ]
        
        if user_context:
            messages.insert(1, {"role": "system", "content": f"Context: {user_context}"})
        
        stream = await client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            stream=True,
            temperature=0.7,
            max_tokens=500
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
                
    except Exception as e:
        logger.error(f"OpenAI streaming error: {e}")
        raise

async def _stream_from_grok(self, message: str, user_context: Optional[Dict] = None):
    """Stream from Grok API"""
    try:
        # Implement Grok streaming API call
        headers = {
            "Authorization": f"Bearer {self.grok_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "messages": [
                {"role": "system", "content": "You are AURA, a helpful AI assistant."},
                {"role": "user", "content": message}
            ],
            "model": "grok-beta",
            "stream": True,
            "temperature": 0.7,
            "max_tokens": 500
        }
        
        if user_context:
            data["messages"].insert(1, {"role": "system", "content": f"Context: {user_context}"})
        
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST", 
                "https://api.x.ai/v1/chat/completions",
                headers=headers,
                json=data
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk_data = json.loads(data)
                            if chunk_data["choices"][0]["delta"].get("content"):
                                yield chunk_data["choices"][0]["delta"]["content"]
                        except json.JSONDecodeError:
                            continue
                            
    except Exception as e:
        logger.error(f"Grok streaming error: {e}")
        raise
```

#### **Priority 3: Optimize Audio Pipeline**
```python
# File: backend/app/services/optimized_voice_pipeline.py

class OptimizedVoicePipeline(VoicePipeline):
    def __init__(self):
        super().__init__()
        self.audio_queue = asyncio.Queue(maxsize=100)
        self.processing_task = None
        self.is_processing = False
        
    async def start_continuous_processing(self):
        """Start continuous audio processing task"""
        if not self.processing_task:
            self.processing_task = asyncio.create_task(self._continuous_processor())
    
    async def _continuous_processor(self):
        """Continuously process audio chunks from queue"""
        while self.is_processing:
            try:
                audio_chunk = await asyncio.wait_for(
                    self.audio_queue.get(), 
                    timeout=1.0
                )
                
                # Process audio chunk immediately
                result = await self._process_audio_chunk_fast(audio_chunk)
                
                if result:
                    # Send result back via WebSocket
                    await self._send_processing_result(result)
                    
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Audio processing error: {e}")
    
    async def _process_audio_chunk_fast(self, audio_chunk: bytes):
        """Fast audio processing with optimizations"""
        # Use smaller audio chunks for faster processing
        if len(audio_chunk) < 8000:  # Skip very small chunks
            return None
            
        # Quick transcription with Whisper
        try:
            transcription = await self.transcribe_audio(audio_chunk, "raw")
            if transcription.text and len(transcription.text.strip()) > 0:
                return {
                    "type": "transcription",
                    "text": transcription.text,
                    "confidence": transcription.confidence
                }
        except Exception as e:
            logger.error(f"Fast transcription error: {e}")
        
        return None
    
    async def add_audio_chunk(self, audio_chunk: bytes):
        """Add audio chunk to processing queue"""
        try:
            self.audio_queue.put_nowait(audio_chunk)
        except asyncio.QueueFull:
            # Drop oldest chunk if queue is full
            try:
                self.audio_queue.get_nowait()
                self.audio_queue.put_nowait(audio_chunk)
            except asyncio.QueueEmpty:
                pass
```

### **Phase 2: Real-time Features** ⏱️ *Days 4-6*

#### **Priority 4: Streaming Response Handler**
```python
# File: backend/app/services/streaming_response_handler.py

class StreamingResponseHandler:
    def __init__(self, voice_pipeline, websocket):
        self.voice_pipeline = voice_pipeline
        self.websocket = websocket
        self.sentence_buffer = ""
        self.word_buffer = []
        self.is_speaking = False
        
    async def process_streaming_response(self, text_stream):
        """Process streaming text and generate audio in real-time"""
        self.is_speaking = True
        
        try:
            async for text_chunk in text_stream:
                if not self.is_speaking:  # User interrupted
                    break
                    
                self.word_buffer.append(text_chunk)
                self.sentence_buffer += text_chunk
                
                # Check for sentence completion
                if self._is_sentence_complete(self.sentence_buffer):
                    sentence = self.sentence_buffer.strip()
                    
                    # Generate audio for complete sentence
                    audio_result = await self.voice_pipeline.synthesize_speech(sentence)
                    
                    # Send audio chunk to user
                    await self.websocket.send_json({
                        "type": "ai_audio_chunk",
                        "text": sentence,
                        "audio": audio_result.audio_base64,
                        "is_complete": False
                    })
                    
                    # Clear buffer
                    self.sentence_buffer = ""
                    self.word_buffer = []
                    
                    # Small delay to prevent overwhelming
                    await asyncio.sleep(0.1)
            
            # Send any remaining text
            if self.sentence_buffer.strip():
                sentence = self.sentence_buffer.strip()
                audio_result = await self.voice_pipeline.synthesize_speech(sentence)
                
                await self.websocket.send_json({
                    "type": "ai_audio_chunk",
                    "text": sentence,
                    "audio": audio_result.audio_base64,
                    "is_complete": True
                })
                
        except Exception as e:
            logger.error(f"Streaming response error: {e}")
        finally:
            self.is_speaking = False
            await self.websocket.send_json({
                "type": "ai_response_complete"
            })
    
    def _is_sentence_complete(self, text: str) -> bool:
        """Check if text contains a complete sentence"""
        sentence_endings = ['.', '!', '?', ':', ';']
        return any(ending in text for ending in sentence_endings) and len(text.strip()) > 10
    
    def interrupt(self):
        """Handle user interruption"""
        self.is_speaking = False
        self.sentence_buffer = ""
        self.word_buffer = []
```

#### **Priority 5: Enhanced Continuous Conversation Manager**
```python
# File: backend/app/services/enhanced_continuous_conversation.py

class EnhancedContinuousConversationManager:
    def __init__(self, voice_pipeline, smart_router, tenant_manager=None):
        self.voice_pipeline = OptimizedVoicePipeline()
        self.smart_router = smart_router
        self.tenant_manager = tenant_manager
        self.vad = EnhancedVAD()
        
        # Enhanced session management
        self.active_sessions = {}
        self.session_locks = {}
        
    async def start_continuous_session(self, websocket, user_id: str, tenant_id: Optional[str] = None):
        """Start enhanced continuous conversation session"""
        session_id = f"voice_{user_id}_{datetime.now().timestamp()}"
        
        # Create session with enhanced state
        session = {
            "session_id": session_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "websocket": websocket,
            "start_time": datetime.now(),
            "conversation_history": [],
            "context": {},
            "is_ai_speaking": False,
            "audio_buffer": asyncio.Queue(maxsize=50),
            "last_activity": time.time(),
            "vad_state": "idle",  # idle, listening, speaking
            "response_handler": None
        }
        
        # Load tenant context
        if tenant_id and self.tenant_manager:
            session["context"] = await self.tenant_manager.get_tenant_context(tenant_id)
        
        self.active_sessions[session_id] = session
        self.session_locks[session_id] = asyncio.Lock()
        
        try:
            # Send initial greeting
            await self._send_enhanced_greeting(websocket, session)
            
            # Start optimized conversation loop
            await self._enhanced_conversation_loop(websocket, session)
            
        except Exception as e:
            logger.error(f"Enhanced conversation error: {e}")
        finally:
            await self._cleanup_session(session_id)
    
    async def _enhanced_conversation_loop(self, websocket, session: Dict):
        """Enhanced conversation loop with better concurrency"""
        logger.info(f"Starting enhanced conversation for user {session['user_id']}")
        
        # Start audio processing task
        await self.voice_pipeline.start_continuous_processing()
        
        # Create concurrent tasks
        tasks = [
            asyncio.create_task(self._receive_audio_stream(websocket, session)),
            asyncio.create_task(self._process_audio_queue(session)),
            asyncio.create_task(self._session_keepalive(session))
        ]
        
        try:
            await asyncio.gather(*tasks, return_exceptions=True)
        except Exception as e:
            logger.error(f"Enhanced conversation loop error: {e}")
        finally:
            # Cancel all tasks
            for task in tasks:
                if not task.done():
                    task.cancel()
    
    async def _process_audio_queue(self, session: Dict):
        """Process audio queue with enhanced VAD"""
        while session["session_id"] in self.active_sessions:
            try:
                # Get audio chunk from queue
                if not session["audio_buffer"].empty():
                    audio_chunk = await session["audio_buffer"].get()
                    
                    # Process with enhanced VAD
                    is_speaking, speech_complete, complete_audio = self.vad.process_audio_chunk(audio_chunk)
                    
                    if speech_complete and complete_audio:
                        # User finished speaking
                        await self._handle_complete_user_speech(session, complete_audio)
                    elif is_speaking and session["is_ai_speaking"]:
                        # User is interrupting AI
                        await self._handle_user_interruption(session)
                
                await asyncio.sleep(0.01)  # Small delay
                
            except Exception as e:
                logger.error(f"Audio queue processing error: {e}")
    
    async def _handle_complete_user_speech(self, session: Dict, audio_data: bytes):
        """Handle complete user speech with streaming response"""
        try:
            # Transcribe user speech
            transcription = await self.voice_pipeline.transcribe_audio(audio_data, "raw")
            
            if not transcription.text or len(transcription.text.strip()) < 2:
                return
            
            logger.info(f"User said: {transcription.text}")
            
            # Add to conversation history
            session["conversation_history"].append({
                "role": "user",
                "content": transcription.text,
                "timestamp": datetime.now().isoformat()
            })
            
            # Send transcription to frontend
            await session["websocket"].send_json({
                "type": "user_transcript",
                "text": transcription.text
            })
            
            # Generate streaming AI response
            await self._generate_streaming_response(session, transcription.text)
            
        except Exception as e:
            logger.error(f"Complete speech handling error: {e}")
    
    async def _generate_streaming_response(self, session: Dict, user_input: str):
        """Generate streaming AI response"""
        session["is_ai_speaking"] = True
        
        try:
            # Build context
            context = self._build_enhanced_context(session)
            
            # Create streaming response handler
            response_handler = StreamingResponseHandler(
                self.voice_pipeline, 
                session["websocket"]
            )
            session["response_handler"] = response_handler
            
            # Get streaming response from LLM
            full_prompt = f"{context}\n\nUser: {user_input}\n\nAssistant:"
            text_stream = self.smart_router.route_message_stream(full_prompt)
            
            # Process streaming response
            await response_handler.process_streaming_response(text_stream)
            
        except Exception as e:
            logger.error(f"Streaming response error: {e}")
        finally:
            session["is_ai_speaking"] = False
            session["response_handler"] = None
    
    async def _handle_user_interruption(self, session: Dict):
        """Handle user interrupting AI response"""
        logger.info("User interrupted AI")
        
        # Stop AI from speaking
        session["is_ai_speaking"] = False
        
        # Interrupt response handler
        if session["response_handler"]:
            session["response_handler"].interrupt()
        
        # Send interruption signal
        await session["websocket"].send_json({
            "type": "ai_interrupted",
            "message": "AI stopped speaking due to user interruption"
        })
    
    def _build_enhanced_context(self, session: Dict) -> str:
        """Build enhanced context with conversation history"""
        # Get recent conversation (last 10 exchanges)
        recent_history = session["conversation_history"][-20:]
        
        context = "You are AURA, a helpful AI assistant. Respond naturally and conversationally.\n\n"
        
        if session.get("context") and session["context"].get("organization"):
            context += f"Organization: {session['context']['organization']}\n\n"
        
        if recent_history:
            context += "Recent conversation:\n"
            for msg in recent_history:
                role = "User" if msg["role"] == "user" else "AURA"
                context += f"{role}: {msg['content']}\n"
            context += "\n"
        
        return context
```

### **Phase 3: Testing & Optimization** ⏱️ *Days 7-9*

#### **Priority 6: Comprehensive Testing Suite**
```python
# File: backend/tests/test_voice_system.py

import pytest
import asyncio
import websockets
import json
from unittest.mock import Mock, AsyncMock

class TestVoiceSystem:
    @pytest.mark.asyncio
    async def test_websocket_connection(self):
        """Test WebSocket connection establishment"""
        # Test connection with valid token
        # Test connection with invalid token
        # Test connection handling
        
    @pytest.mark.asyncio
    async def test_voice_activity_detection(self):
        """Test VAD functionality"""
        # Test speech detection
        # Test silence detection
        # Test speech completion
        
    @pytest.mark.asyncio
    async def test_streaming_llm_response(self):
        """Test streaming LLM responses"""
        # Test OpenAI streaming
        # Test Grok streaming
        # Test fallback handling
        
    @pytest.mark.asyncio
    async def test_audio_pipeline(self):
        """Test audio processing pipeline"""
        # Test STT processing
        # Test TTS generation
        # Test audio format conversion
        
    @pytest.mark.asyncio
    async def test_interruption_handling(self):
        """Test user interruption scenarios"""
        # Test AI interruption
        # Test state cleanup
        # Test resume functionality
        
    @pytest.mark.asyncio
    async def test_multi_tenant_isolation(self):
        """Test multi-tenant data isolation"""
        # Test tenant context separation
        # Test data leakage prevention
        # Test session isolation
```

## 📊 **Implementation Timeline**

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| **Phase 1** | VAD, Streaming LLM, Audio Pipeline | 3 days | WebRTC, OpenAI/Grok APIs |
| **Phase 2** | Real-time Features, Enhanced Manager | 3 days | Phase 1 completion |
| **Phase 3** | Testing, Optimization, Documentation | 3 days | Phase 1-2 completion |
| **Total** | **Complete Implementation** | **9 days** | All dependencies |

## 🎯 **Success Metrics**

### **Performance Targets:**
- **Total Response Time**: <2s (currently 6-11s)
- **STT Latency**: <300ms (currently 1-2s)
- **LLM Response**: <1s (currently 2-4s)
- **TTS Generation**: <400ms (currently 1-2s)

### **Quality Targets:**
- **Conversation Success Rate**: >95%
- **Audio Processing Errors**: <1%
- **User Interruption Success**: >90%
- **Multi-tenant Isolation**: 100%

## 🚀 **Deployment Strategy**

### **Development Environment:**
```bash
# Install enhanced dependencies
pip install -r requirements.txt

# Run enhanced test suite
pytest backend/tests/ -v

# Start development server
python -m uvicorn app.main:app --reload --port 8000
```

### **Production Deployment:**
```bash
# Build production image
docker build -t aura-voice-ai:latest .

# Deploy with scaling
docker-compose -f docker-compose.prod.yml up --scale voice-service=3
```

## 📋 **Next Steps**

1. **Start Phase 1**: Implement enhanced VAD and streaming LLM
2. **Test Continuously**: Run tests after each component
3. **Monitor Performance**: Track latency improvements
4. **Document Changes**: Update documentation as you go
5. **Deploy Incrementally**: Test each phase before proceeding

---

**🎯 This roadmap provides a systematic approach to implementing a world-class continuous voice AI system that will rival OpenAI's Realtime API performance while leveraging the best of both OpenAI and Grok capabilities.**
