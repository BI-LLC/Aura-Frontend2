"""
Services that keep each tenant's data separate
"""

import os
from typing import Optional, Dict, List, AsyncGenerator
from datetime import datetime

# Import required classes
from .tenant_manager import TenantManager
from .smart_router import SmartRouter, LLMResponse
from .data_ingestion import Document

class TenantAwareDataIngestion:
    """File processing that keeps each organization's data separate"""
    
    def __init__(self, tenant_manager: TenantManager):
        self.tenant_manager = tenant_manager
    
    async def ingest_file(
        self,
        file_path: str,
        tenant_id: str,
        user_id: str,
        metadata: Optional[Dict] = None
    ) -> Document:
        """Add a file to one organization's knowledge base"""
        
        # Make sure this user can access this tenant
        if not self.tenant_manager.validate_tenant_access(
            tenant_id, user_id, "documents"
        ):
            raise PermissionError("Access denied")
        
        # Find where this tenant's files go
        storage_path = self.tenant_manager.get_tenant_storage_path(
            tenant_id, "documents"
        )
        
        # Process and store in tenant's isolated space
        doc_id = self._generate_doc_id(tenant_id, user_id, file_path)
        
        # ... rest of processing ...
        
        # Store with tenant isolation
        doc_path = os.path.join(storage_path, f"{doc_id}.json")
        
        return document
    
    async def search_documents(
        self,
        query: str,
        tenant_id: str,
        user_id: str,
        limit: int = 5
    ) -> List[Dict]:
        """Search ONLY within tenant's documents"""
        
        # Validate access
        if not self.tenant_manager.validate_tenant_access(
            tenant_id, user_id, "documents"
        ):
            return []
        
        # Search only in tenant's storage
        storage_path = self.tenant_manager.get_tenant_storage_path(
            tenant_id, "documents"
        )
        
        # ... search logic that ONLY looks in tenant's documents ...
        
        return results
    
    async def get_tenant_documents(self, user_id: str, organization: str = None) -> List[Dict]:
        """Get all documents for a user (compatible with main.py interface)"""
        import json
        import logging
        
        logger = logging.getLogger(__name__)
        
        try:
            # For backward compatibility, use user_id as tenant_id if organization not provided
            tenant_id = organization if organization else 'default_tenant'
            
            # Get documents from tenant's storage
            storage_path = self.tenant_manager.get_tenant_storage_path(
                tenant_id, "documents"
            )
            
            documents = []
            if os.path.exists(storage_path):
                for filename in os.listdir(storage_path):
                    if filename.endswith('.json'):
                        file_path = os.path.join(storage_path, filename)
                        try:
                            with open(file_path, 'r') as f:
                                doc_data = json.load(f)
                                documents.append({
                                    'id': doc_data.get('doc_id', filename),
                                    'filename': doc_data.get('filename', filename),
                                    'content': doc_data.get('content', ''),  # Include content for context
                                    'upload_time': doc_data.get('upload_time', ''),
                                    'doc_type': doc_data.get('doc_type', ''),
                                    'uploaded_at': doc_data.get('uploaded_at', ''),
                                    'file_size': doc_data.get('file_size', 0)
                                })
                        except Exception as e:
                            logger.warning(f"Error reading document {filename}: {e}")
            
            return documents
            
        except Exception as e:
            logger.error(f"Error getting tenant documents: {e}")
            return []

class TenantAwareSmartRouter:
    """LLM routing that includes tenant context"""
    
    def __init__(self, tenant_manager: TenantManager):
        self.tenant_manager = tenant_manager
        self.original_router = SmartRouter()
    
    async def route_message(
        self,
        message: str,
        tenant_id: str,
        user_id: str
    ) -> LLMResponse:
        """Route message with tenant-specific context"""
        
        # Get tenant's knowledge base
        tenant_context = await self.tenant_manager.get_tenant_context(tenant_id)
        
        # Inject tenant context into prompt
        enhanced_message = f"""
        [TENANT CONTEXT - Use ONLY this information]
        Organization: {tenant_context['organization']}
        Available Knowledge: {len(tenant_context['documents'])} documents
        
        Knowledge snippets:
        {self._format_knowledge_snippets(tenant_context['knowledge_base'])}
        
        User Query: {message}
        
        IMPORTANT: Only use information from the tenant context above.
        Do not use general knowledge unless specifically asked.
        """
        
        # Route with tenant context
        response = await self.original_router.route_message(enhanced_message)
        
        return response
    
    def _format_knowledge_snippets(self, knowledge: Dict) -> str:
        """Format tenant's knowledge for LLM context"""
        snippets = knowledge.get("content_snippets", [])[:3]
        return "\n".join(f"- {s[:200]}..." for s in snippets)

class TenantAwareVoicePipeline:
    """Voice pipeline with continuous conversation using tenant's data"""
    
    def __init__(self, tenant_manager: TenantManager):
        self.tenant_manager = tenant_manager
        self.sessions = {}  # Track continuous conversations
    
    async def process_continuous_voice(
        self,
        audio_stream: AsyncGenerator,
        tenant_id: str,
        user_id: str,
        session_id: str
    ) -> AsyncGenerator:
        """
        Process continuous voice conversation
        Maintains context across the entire call
        """
        
        # Get or create session
        session_key = f"{tenant_id}_{user_id}_{session_id}"
        
        if session_key not in self.sessions:
            # Initialize session with tenant context
            tenant_context = await self.tenant_manager.get_tenant_context(tenant_id)
            
            self.sessions[session_key] = {
                "tenant_id": tenant_id,
                "user_id": user_id,
                "context": tenant_context,
                "conversation_history": [],
                "start_time": datetime.now()
            }
        
        session = self.sessions[session_key]
        
        # Process continuous audio stream
        async for audio_chunk in audio_stream:
            # Transcribe
            text = await self.transcribe_chunk(audio_chunk)
            
            if text:
                # Add to conversation history
                session["conversation_history"].append({
                    "role": "user",
                    "content": text,
                    "timestamp": datetime.now()
                })
                
                # Generate response using ONLY tenant's data
                response = await self.generate_contextual_response(
                    text,
                    session["context"],
                    session["conversation_history"]
                )
                
                # Add AI response to history
                session["conversation_history"].append({
                    "role": "assistant",
                    "content": response,
                    "timestamp": datetime.now()
                })
                
                # Convert to speech and stream back
                audio_response = await self.synthesize_speech(response)
                
                yield {
                    "type": "audio",
                    "data": audio_response,
                    "transcript": response,
                    "context_used": True
                }
    
    async def generate_contextual_response(
        self,
        user_input: str,
        tenant_context: Dict,
        conversation_history: List[Dict]
    ) -> str:
        """
        Generate response using ONLY the tenant's uploaded data
        This ensures each client's AI is unique to their content
        """
        
        # Build context from tenant's documents
        relevant_docs = self._find_relevant_documents(
            user_input,
            tenant_context["documents"]
        )
        
        # Create prompt with tenant-specific knowledge
        prompt = f"""
        You are an AI assistant for {tenant_context['organization']}.
        You have access to their specific knowledge base and should ONLY use that information.
        
        Relevant Information from their documents:
        {self._format_documents(relevant_docs)}
        
        Recent Conversation:
        {self._format_history(conversation_history[-5:])}
        
        User: {user_input}
        
        Respond naturally and conversationally, using ONLY the information from their documents.
        If you don't know something from their data, say so politely.
        """
        
        # Get response from LLM
        response = await self.llm.generate(prompt)
        
        return response