# backend/app/routers/chat.py
"""
Chat router for AURA Voice AI
Handles document-based conversations and file uploads
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional, List
import logging
from pydantic import BaseModel

from app.services.smart_router import SmartRouter
from app.services.document_processor import DocumentProcessor
from app.services.memory_engine import MemoryEngine

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/chat", tags=["chat"])

# Initialize services
document_processor = None
smart_router = None
memory_engine = None

def set_services(dp: DocumentProcessor, sr: SmartRouter, me: MemoryEngine):
    """Set service instances from main app"""
    global document_processor, smart_router, memory_engine
    document_processor = dp
    smart_router = sr
    memory_engine = me

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    document_id: Optional[str] = None  # Specific document to use
    use_documents: bool = True  # Whether to search documents
    use_memory: bool = True
    assistant_key: Optional[str] = None  # NEW: For tenant-specific voice responses
    tenant_id: Optional[str] = None      # NEW: For tenant isolation

class ChatResponse(BaseModel):
    response: str
    model_used: str
    document_used: Optional[str] = None
    context_sources: List[str] = []
    response_time: float
    cost: float
    assistant_key: Optional[str] = None  # NEW: Echo back assistant key for frontend

@router.post("/message", response_model=ChatResponse)
async def chat_with_documents(request: ChatRequest):
    """Chat endpoint with document context support"""
    try:
        if not smart_router:
            raise HTTPException(status_code=503, detail="Services not initialized")
        
        # Build context from documents if requested
        document_context = ""
        document_used = None
        context_sources = []
        
        if request.use_documents and document_processor:
            # Get document context
            document_context = document_processor.get_context_for_query(
                request.message,
                doc_id=request.document_id,
                user_id=request.user_id
            )
            
            if document_context:
                # Track which documents were used
                if request.document_id:
                    doc = document_processor.get_document(request.document_id)
                    if doc:
                        document_used = doc.filename
                        context_sources.append(doc.filename)
                else:
                    # Get sources from search results
                    results = document_processor.search_documents(request.message, request.user_id)
                    context_sources = list(set([r['filename'] for r in results[:3]]))
        
        # Build the full prompt with document context
        full_prompt = ""
        if document_context:
            full_prompt = f"""You are a helpful AI assistant. Use the following document context to answer the user's question.
            
Document Context:
{document_context}

User Question: {request.message}

Please provide a comprehensive answer based on the document context provided. If the answer is not in the documents, say so."""
        else:
            # No document context, just use the message
            full_prompt = request.message
        
        # Add memory context if requested
        if request.use_memory and request.user_id and memory_engine:
            preferences = await memory_engine.get_user_preferences(request.user_id)
            if preferences:
                full_prompt = f"""User preferences:
- Communication style: {preferences.communication_style}
- Response pace: {preferences.response_pace}

{full_prompt}"""
        
        # Route to LLM
        response = await smart_router.route_message(full_prompt)
        
        if response.error:
            raise HTTPException(status_code=503, detail=f"LLM Error: {response.error}")
        
        return ChatResponse(
            response=response.content,
            model_used=response.model_used,
            document_used=document_used,
            context_sources=context_sources,
            response_time=response.response_time,
            cost=response.cost,
            assistant_key=request.assistant_key  # NEW: Echo back assistant key
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(default=None)
):
    """Upload a document for context"""
    try:
        if not document_processor:
            raise HTTPException(status_code=503, detail="Document processor not initialized")
        
        # Check file type
        allowed_types = ['txt', 'pdf', 'doc', 'docx', 'md']
        file_extension = file.filename.split('.')[-1].lower()
        
        if file_extension not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"File type not supported. Allowed: {', '.join(allowed_types)}"
            )
        
        # Check file size (limit to 10MB)
        file_data = await file.read()
        if len(file_data) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")
        
        # Process the document
        document = await document_processor.process_upload(
            file_data,
            file.filename,
            user_id
        )
        
        return {
            "success": True,
            "document_id": document.id,
            "filename": document.filename,
            "size": document.size,
            "content_length": len(document.content),
            "message": f"Document '{document.filename}' uploaded successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents")
async def list_documents(user_id: str):
    """List user's uploaded documents"""
    try:
        if not document_processor:
            raise HTTPException(status_code=503, detail="Document processor not initialized")
        
        documents = document_processor.get_user_documents(user_id)
        
        return {
            "documents": [
                {
                    "id": doc.id,
                    "filename": doc.filename,
                    "file_type": doc.file_type,
                    "size": doc.size,
                    "upload_time": doc.upload_time,
                    "content_preview": doc.content[:200] + "..." if len(doc.content) > 200 else doc.content
                }
                for doc in documents
            ],
            "count": len(documents)
        }
        
    except Exception as e:
        logger.error(f"List documents error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a specific document"""
    try:
        if not document_processor:
            raise HTTPException(status_code=503, detail="Document processor not initialized")
        
        doc = document_processor.get_document(document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Remove the document files
        import os
        os.remove(os.path.join(document_processor.storage_path, f"{doc.id}_{doc.filename}"))
        os.remove(os.path.join(document_processor.storage_path, f"{doc.id}_metadata.json"))
        
        # Remove from cache
        if doc.id in document_processor.documents:
            del document_processor.documents[doc.id]
        
        return {
            "success": True,
            "message": f"Document '{doc.filename}' deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete document error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search")
async def search_documents(query: str, user_id: Optional[str] = None):
    """Search through uploaded documents"""
    try:
        if not document_processor:
            raise HTTPException(status_code=503, detail="Document processor not initialized")
        
        results = document_processor.search_documents(query, user_id)
        
        return {
            "query": query,
            "results": results,
            "count": len(results)
        }
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))