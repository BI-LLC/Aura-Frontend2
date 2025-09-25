"""
Continuous Conversation Manager
Handles natural back-and-forth dialogue without button pressing
"""

import asyncio
import logging
from typing import AsyncGenerator, Optional, Dict, List
from datetime import datetime
import json
import time
from .enhanced_voice_activity_detector import create_voice_activity_detector
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ContinuousConversationManager:
    def __init__(
        self,
        voice_pipeline,
        smart_router,
        tenant_manager=None
    ):
        """Initialize continuous conversation system with enhanced VAD"""
        self.voice_pipeline = voice_pipeline
        self.smart_router = smart_router
        self.tenant_manager = tenant_manager
        
        # Initialize enhanced VAD
        self.vad = create_voice_activity_detector(
            sample_rate=16000,
            adaptive=True,
            aggressiveness=2
        )
        
        # Conversation state
        self.active_sessions = {}
        
        # Interruption handling
        self.allow_interruptions = True
        self.ai_speaking = False
        
        logger.info("Continuous conversation manager initialized with enhanced VAD")
    
    async def start_continuous_session(
        self,
        websocket,
        user_id: str,
        tenant_id: Optional[str] = None
    ):
        """
        Start a continuous voice conversation session
        No buttons - just natural talking
        """
        session_id = f"voice_{user_id}_{datetime.now().timestamp()}"
        
        # Initialize session state
        session = {
            "session_id": session_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "start_time": datetime.now(),
            "conversation_history": [],
            "context": {},
            "is_ai_speaking": False,
            "audio_buffer": [],
            "last_activity": time.time()
        }
        
        # Load tenant context if multi-tenant
        if tenant_id and self.tenant_manager:
            session["context"] = await self.tenant_manager.get_tenant_context(tenant_id)
        
        self.active_sessions[session_id] = session
        
        try:
            # Send initial greeting
            await self._send_greeting(websocket, session)
            
            # Main conversation loop
            await self._conversation_loop(websocket, session)
            
        except Exception as e:
            logger.error(f"Conversation error: {e}")
        finally:
            # Cleanup
            await self._end_session(session_id)
    
    async def _conversation_loop(self, websocket, session: Dict):
        """
        Main conversation loop - simple and reliable
        """
        logger.info(f"Starting continuous conversation for user {session['user_id']}")
        
        try:
            # Simple loop: receive and process audio
            while True:
                try:
                    # Receive data from WebSocket
                    data = await websocket.receive()
                    
                    if "text" in data:
                        # Handle JSON messages
                        message = json.loads(data["text"])
                        if message.get("type") == "audio_chunk":
                            # Process audio immediately
                            audio_base64 = message.get("audio")
                            if audio_base64:
                                try:
                                    import base64
                                    audio_bytes = base64.b64decode(audio_base64)
                                    await self._process_audio_immediately(websocket, session, audio_bytes)
                                except Exception as e:
                                    logger.error(f"Audio processing error: {e}")
                        elif message.get("type") == "end_call":
                            break
                            
                except Exception as e:
                    logger.error(f"Conversation loop error: {e}")
                    break
                    
        except Exception as e:
            logger.error(f"Conversation loop failed: {e}")
    
    async def _process_audio_immediately(self, websocket: WebSocket, session: Dict, audio_bytes: bytes):
        """
        Process audio immediately when received
        """
        try:
            # Transcribe audio
            transcription = await self.voice_pipeline.transcribe_audio(audio_bytes, "raw")
            if not transcription or not transcription.text.strip():
                return
            
            user_text = transcription.text.strip()
            logger.info(f"User said: {user_text}")
            
            # Send transcript to frontend
            await websocket.send_json({
                "type": "user_transcript",
                "text": user_text
            })
            
            # Generate AI response
            await self._generate_ai_response(websocket, session, user_text)
            
        except Exception as e:
            logger.error(f"Audio processing error: {e}")
            await websocket.send_json({
                "type": "error",
                "message": "Failed to process audio"
            })
    
    async def _generate_ai_response(self, websocket: WebSocket, session: Dict, user_text: str):
        """
        Generate AI response and send audio back
        """
        try:
            # Simple AI response generation
            import openai
            from app.config import settings
            
            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are AURA, a helpful AI assistant. Be concise and friendly."},
                    {"role": "user", "content": user_text}
                ],
                max_tokens=200,
                temperature=0.7
            )
            
            ai_text = response.choices[0].message.content
            
            # Synthesize speech
            synthesis = await self.voice_pipeline.synthesize_speech(ai_text)
            
            if synthesis.audio_base64:
                await websocket.send_json({
                    "type": "ai_audio",
                    "audio": synthesis.audio_base64,
                    "text": ai_text
                })
            else:
                await websocket.send_json({
                    "type": "ai_text",
                    "text": ai_text
                })
                
        except Exception as e:
            logger.error(f"AI response error: {e}")
            await websocket.send_json({
                "type": "error",
                "message": "Failed to generate response"
            })
    
    
    async def _handle_user_speech(
        self,
        websocket,
        session: Dict,
        audio_data: bytes
    ):
        """
        Handle complete user speech input
        """
        try:
            # Transcribe user's speech
            transcription = await self.voice_pipeline.transcribe_audio(
                audio_data,
                audio_format="raw"
            )
            
            if not transcription.text:
                return
            
            logger.info(f"User said: {transcription.text}")
            
            # Add to conversation history
            session["conversation_history"].append({
                "role": "user",
                "content": transcription.text,
                "timestamp": datetime.now().isoformat()
            })
            
            # Send transcription to frontend (optional)
            await websocket.send_json({
                "type": "user_transcript",
                "text": transcription.text
            })
            
            # Generate AI response
            await self._generate_and_speak_response(
                websocket,
                session,
                transcription.text
            )
            
        except Exception as e:
            logger.error(f"Speech handling error: {e}")
    
    async def _generate_and_speak_response(
        self,
        websocket,
        session: Dict,
        user_input: str
    ):
        """
        Generate AI response and speak it with document context
        """
        session["is_ai_speaking"] = True
        
        try:
            # Get document context if available
            document_context = ""
            if session.get("tenant_id") and session.get("user_id"):
                try:
                    # Import the data service from main
                    from app.main import data_service, tenant_aware_services
                    
                    # Try to use tenant-aware service first, fallback to basic data_service
                    service_to_use = None
                    if "data_ingestion" in tenant_aware_services and tenant_aware_services["data_ingestion"] is not None:
                        service_to_use = tenant_aware_services["data_ingestion"]
                        logger.info("Using tenant-aware data ingestion service for document context")
                    elif data_service is not None:
                        service_to_use = data_service
                        logger.info("Using basic data ingestion service for document context")
                    
                    if service_to_use:
                        # Get document content for context
                        organization = session.get("context", {}).get("organization", "default_org")
                        documents = await service_to_use.get_tenant_documents(session["user_id"], organization)
                        logger.info(f"Retrieved {len(documents) if documents else 0} documents")
                        if documents:
                            # Get the full content of the first document
                            doc_content = documents[0].get('content', '')
                            logger.info(f"First document content preview: {doc_content[:100] if doc_content else 'NO CONTENT'}")
                            if doc_content:
                                # Use full content for document-specific responses
                                document_context = f"Document context: {doc_content}"
                                logger.info(f"Document context length: {len(doc_content)} characters")
                            else:
                                logger.warning("Document found but no content available")
                                document_context = ""
                        else:
                            logger.warning("No documents found")
                except Exception as e:
                    logger.error(f"Could not get document context: {e}")
                    import traceback
                    logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Build context from conversation history
            context = self._build_conversation_context(session)
            
            # Add tenant context if available
            if session.get("context"):
                context += f"\nOrganization Context: {session['context'].get('organization', '')}"
            
            # Create system prompt with document constraints
            if document_context and "Document context:" in document_context:
                organization = session.get("context", {}).get("organization", "default_org")
                system_prompt = f"""You are a document-reading assistant. You can ONLY read and respond based on the document provided below. You have NO other knowledge.

DOCUMENT TO READ:
{document_context}

ROLE: You are a document reader. You can ONLY use information from the document above.

STRICT RULES:
1. If the question is about something NOT in the document, say: "I can only answer questions based on the document content provided. Please ask me something about the document."
2. If you don't know something from the document, say: "I don't know that information from the document. Could you ask about something else in the document?"
3. NEVER use knowledge outside the document

EXAMPLES:
User: "What is the ocean?" 
You: "I can only answer questions based on the document content provided. Please ask me something about the document."

User: "What is Unitism?"
You: [Read the document and answer based ONLY on what it says]

User: "What is the weather?"
You: "I can only answer questions based on the document content provided. Please ask me something about the document."

You are a document reader. You can ONLY read the document above."""
            else:
                system_prompt = f"""You are AURA, a helpful AI assistant for {session.get('context', {}).get('organization', 'default_org')}.
                
                {document_context}
                
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
                        {"role": "user", "content": user_input}
                    ],
                    max_tokens=500,
                    temperature=0.7
                )
                
                response_text = response.choices[0].message.content
                
            except Exception as e:
                logger.error(f"OpenAI call error: {e}")
                # Fallback to smart router
                full_prompt = f"{context}\n\nUser: {user_input}\n\nAssistant:"
                
                # Get streaming response from LLM
                response_text = ""
                async for chunk in self.smart_router.route_message_stream(full_prompt):
                    if not session["is_ai_speaking"]:
                        # User interrupted
                        break
                    response_text += chunk
            
            # Synthesize and send the complete response
            if response_text.strip():
                audio_result = await self.voice_pipeline.synthesize_speech(response_text.strip())
                
                # Send audio to user
                await websocket.send_json({
                    "type": "ai_audio",
                    "audio": audio_result.audio_base64,
                    "text": response_text.strip()
                })
            
            # Add to conversation history
            session["conversation_history"].append({
                "role": "assistant",
                "content": response_text,
                "timestamp": datetime.now().isoformat()
            })
            
            # Mark AI as done speaking
            session["is_ai_speaking"] = False
            
            # Send completion signal
            await websocket.send_json({
                "type": "ai_complete",
                "full_response": response_text
            })
            
        except Exception as e:
            logger.error(f"Response generation error: {e}")
            session["is_ai_speaking"] = False
    
    async def _handle_interruption(self, websocket, session: Dict):
        """
        Handle user interrupting AI
        """
        logger.info("User interrupted AI")
        
        # Stop AI from speaking
        session["is_ai_speaking"] = False
        
        # Send interruption signal
        await websocket.send_json({
            "type": "ai_interrupted",
            "message": "AI stopped speaking"
        })
        
        # Clear any pending audio
        session["audio_buffer"].clear()
    
    def _build_conversation_context(self, session: Dict) -> str:
        """
        Build context from recent conversation
        """
        # Get last 5 exchanges
        recent_history = session["conversation_history"][-10:]
        
        if not recent_history:
            return "This is the start of the conversation."
        
        context = "Recent conversation:\n"
        for msg in recent_history:
            role = "User" if msg["role"] == "user" else "AI"
            context += f"{role}: {msg['content']}\n"
        
        return context
    
    async def _send_greeting(self, websocket, session: Dict):
        """
        Send initial greeting when call starts
        """
        greeting = "Hello! I'm AURA, your AI assistant. How can I help you today?"
        
        if session.get("context") and session["context"].get("organization"):
            greeting = f"Hello! I'm AURA, your {session['context']['organization']} assistant. How can I help you today?"
        
        # Synthesize greeting
        audio_result = await self.voice_pipeline.synthesize_speech(greeting)
        
        # Send to user
        await websocket.send_json({
            "type": "greeting",
            "text": greeting,
            "audio": audio_result.audio_base64
        })
        
        # Add to history
        session["conversation_history"].append({
            "role": "assistant",
            "content": greeting,
            "timestamp": datetime.now().isoformat()
        })
    
    async def _send_keepalive(self, websocket):
        """
        Send keepalive ping to maintain connection
        """
        await websocket.send_json({
            "type": "ping",
            "timestamp": datetime.now().isoformat()
        })
    
    async def _end_session(self, session_id: str):
        """
        Clean up session when call ends
        """
        if session_id in self.active_sessions:
            session = self.active_sessions[session_id]
            
            # Save conversation summary
            summary = {
                "session_id": session_id,
                "user_id": session["user_id"],
                "duration": (datetime.now() - session["start_time"]).total_seconds(),
                "message_count": len(session["conversation_history"]),
                "conversation": session["conversation_history"]
            }
            
            # Save to database/storage
            await self._save_conversation_summary(summary)
            
            # Remove from active sessions
            del self.active_sessions[session_id]
            
            logger.info(f"Session {session_id} ended")
    
    async def _save_conversation_summary(self, summary: Dict):
        """
        Save conversation summary for future reference
        """
        # Save to database or file system
        # This would integrate with your memory engine
        pass