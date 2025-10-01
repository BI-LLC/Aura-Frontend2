# RAG-Enhanced Chat Router for AURA Voice AI
# Advanced chat endpoint with full RAG pipeline integration

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Header
from fastapi.responses import JSONResponse
from typing import Optional, List
from pydantic import BaseModel
import logging
import time
from datetime import datetime

from app.services.training_data_service import get_training_data_service
from app.services.rag_pipeline import get_rag_pipeline
from app.services.smart_router import SmartRouter

logger = logging.getLogger(__name__)

# Set up API routes
router = APIRouter(prefix="/rag", tags=["rag-chat"])

# Smart router for LLM requests (injected from main app)
smart_router: Optional[SmartRouter] = None

class RAGChatRequest(BaseModel):
    message: str
    assistant_key: Optional[str] = None
    tenant_id: Optional[str] = None
    use_hybrid_search: bool = True
    max_context_chunks: int = 15
    session_id: Optional[str] = None

class RAGChatResponse(BaseModel):
    response: str
    sources_used: List[str]
    context_confidence: float
    processing_time: float
    cost: float
    rag_stats: dict
    assistant_key: Optional[str] = None
    timestamp: str

class RAGDocumentUploadRequest(BaseModel):
    filename: str
    assistant_key: str
    tenant_id: Optional[str] = None

@router.post("/chat", response_model=RAGChatResponse)
async def rag_enhanced_chat(request: RAGChatRequest):
    """
    RAG-Enhanced Chat Endpoint
    
    Features:
    - Semantic similarity search across documents
    - Hybrid vector + keyword search
    - Traditional training data integration
    - Confidence-based response routing
    - Comprehensive source attribution
    """
    start_time = time.time()
    
    try:
        if not smart_router:
            raise HTTPException(status_code=503, detail="Smart router not initialized")
        
        logger.info(f"RAG chat request: '{request.message[:50]}...' for assistant '{request.assistant_key}'")
        
        # Get RAG pipeline
        rag_pipeline = get_rag_pipeline()
        
        # 1. Retrieve comprehensive context using RAG
        rag_context = await rag_pipeline.retrieve_context(
            query=request.message,
            assistant_key=request.assistant_key,
            tenant_id=request.tenant_id,
            use_hybrid_search=request.use_hybrid_search,
            max_chunks=request.max_context_chunks
        )
        
        # 2. Build enhanced system prompt based on context quality
        if rag_context.context_text and rag_context.confidence_score >= 0.1:
            # High-confidence RAG response
            assistant_name = request.assistant_key or "AI Assistant"
            
            system_prompt = f"""You are {assistant_name}, an AI assistant with access to comprehensive knowledge sources.

CONTEXT SOURCES AVAILABLE:
{', '.join(rag_context.context_sources)}

KNOWLEDGE BASE (Use this information to answer questions):
{rag_context.context_text}

RESPONSE GUIDELINES:
1. Use the knowledge above to provide accurate, specific answers
2. Reference specific sources when possible (e.g., "According to the BIC Corporation document...")
3. If the information isn't in the knowledge base, clearly state: "I don't have specific information about that in my knowledge base"
4. Combine information from multiple sources when relevant
5. Be conversational but precise
6. Confidence level: {rag_context.confidence_score:.1%}

USER QUESTION: {request.message}

RESPONSE (be helpful and specific):"""

        else:
            # Low-confidence or no context - use fallback
            system_prompt = f"""You are an AI assistant. Based on the available information, I don't have specific details about '{request.message}' in my knowledge base. 

Please provide more context or try rephrasing your question. I'm designed to help with specific topics I've been trained on.

USER QUESTION: {request.message}

RESPONSE:"""
        
        # 3. Route to LLM with enhanced context
        llm_response = await smart_router.route_message(system_prompt)
        
        processing_time = time.time() - start_time
        
        # 4. Build comprehensive response
        response = RAGChatResponse(
            response=llm_response.content,
            sources_used=rag_context.context_sources,
            context_confidence=rag_context.confidence_score,
            processing_time=processing_time,
            cost=llm_response.cost,
            rag_stats={
                'chunks_retrieved': rag_context.source_count,
                'context_tokens': rag_context.token_count,
                'search_time': rag_context.processing_time,
                'model_used': llm_response.model_used
            },
            assistant_key=request.assistant_key,
            timestamp=datetime.now().isoformat()
        )
        
        logger.info(f"RAG chat completed - Confidence: {rag_context.confidence_score:.2f}, Sources: {len(rag_context.context_sources)}, Time: {processing_time:.2f}s")
        
        return response
        
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"RAG chat error: {e}")
        
        # Fallback error response
        return RAGChatResponse(
            response="I'm sorry, I'm experiencing technical difficulties. Please try again in a moment.",
            sources_used=[],
            context_confidence=0.0,
            processing_time=processing_time,
            cost=0.0,
            rag_stats={'error': str(e)},
            assistant_key=request.assistant_key,
            timestamp=datetime.now().isoformat()
        )

@router.post("/upload-document")
async def upload_rag_document(
    file: UploadFile = File(...),
    assistant_key: str = Form(...),
    tenant_id: Optional[str] = Form(default=None),
    authorization: Optional[str] = Header(default=None)
):
    """
    RAG Document Upload Endpoint
    
    Processes uploaded documents through complete RAG pipeline:
    1. Text extraction
    2. Intelligent chunking
    3. Embedding generation
    4. Vector storage in Supabase
    """
    start_time = time.time()
    
    try:
        logger.info(f"RAG document upload: {file.filename} for assistant {assistant_key}")
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Read file content
        content = await file.read()
        text_content = content.decode('utf-8')
        
        if not text_content.strip():
            raise HTTPException(status_code=400, detail="Document appears to be empty")
        
        # Get RAG pipeline
        rag_pipeline = get_rag_pipeline()
        
        # Process document through RAG pipeline
        processing_result = await rag_pipeline.process_document_upload(
            content=text_content,
            filename=file.filename,
            assistant_key=assistant_key,
            tenant_id=tenant_id,
            file_type=file.filename.split('.')[-1].lower()
        )
        
        processing_time = time.time() - start_time
        
        if processing_result.success:
            logger.info(f"RAG document processing successful: {file.filename}")
            
            return {
                "success": True,
                "message": f"Document '{file.filename}' processed successfully with RAG pipeline",
                "results": {
                    "doc_id": processing_result.doc_id,
                    "chunks_created": processing_result.chunks_created,
                    "chunks_stored": processing_result.chunks_stored,
                    "embeddings_generated": processing_result.embeddings_generated,
                    "processing_time": processing_result.processing_time,
                    "semantic_search_enabled": True
                },
                "rag_enabled": True,
                "next_steps": [
                    "Document is now available for semantic search",
                    "Try asking questions about the document content",
                    "The AI will use this document to answer relevant questions"
                ]
            }
        else:
            logger.error(f"RAG document processing failed: {processing_result.error_message}")
            raise HTTPException(
                status_code=500, 
                detail=f"Document processing failed: {processing_result.error_message}"
            )
        
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Unable to decode document. Please ensure it's a text file.")
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"RAG document upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/search")
async def semantic_search(
    query: str,
    assistant_key: Optional[str] = None,
    tenant_id: Optional[str] = None,
    limit: int = 10,
    use_hybrid: bool = True
):
    """
    Direct semantic search endpoint for testing and debugging
    
    Returns raw search results without LLM processing
    """
    try:
        logger.info(f"Semantic search: '{query}' for assistant '{assistant_key}'")
        
        # Get vector search service
        from app.services.vector_search_service import get_vector_search_service
        vector_search = get_vector_search_service()
        
        # Perform search
        if use_hybrid:
            results = await vector_search.hybrid_search(
                query=query,
                assistant_key=assistant_key,
                tenant_id=tenant_id,
                limit=limit
            )
        else:
            results = await vector_search.semantic_search(
                query=query,
                assistant_key=assistant_key,
                tenant_id=tenant_id,
                limit=limit
            )
        
        # Format results for response
        formatted_results = []
        for result in results:
            formatted_results.append({
                'content': result.content,
                'similarity': result.similarity,
                'source': result.source,
                'metadata': result.metadata,
                'chunk_type': result.chunk_type
            })
        
        return {
            'query': query,
            'results': formatted_results,
            'count': len(formatted_results),
            'search_method': 'hybrid' if use_hybrid else 'vector'
        }
        
    except Exception as e:
        logger.error(f"Semantic search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_rag_stats():
    """Get RAG pipeline statistics and health info"""
    try:
        rag_pipeline = get_rag_pipeline()
        stats = await rag_pipeline.get_pipeline_stats()
        
        # Add embedding service stats
        from app.services.embedding_service import get_embedding_service
        embedding_service = get_embedding_service()
        embedding_stats = embedding_service.get_cache_stats()
        
        return {
            'rag_pipeline': stats,
            'embedding_service': embedding_stats,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"RAG stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test")
async def test_rag_pipeline():
    """Test RAG pipeline with sample data"""
    try:
        # Simple test to verify RAG components are working
        rag_pipeline = get_rag_pipeline()
        
        # Test context retrieval (will use fallback if no DB)
        test_context = await rag_pipeline.retrieve_context(
            query="What is BIC?",
            assistant_key="bib-halder",
            tenant_id="test-tenant"
        )
        
        return {
            'status': 'operational',
            'test_query': 'What is BIC?',
            'context_found': bool(test_context.context_text),
            'confidence': test_context.confidence_score,
            'sources': test_context.context_sources,
            'processing_time': test_context.processing_time
        }
        
    except Exception as e:
        logger.error(f"RAG test error: {e}")
        return {
            'status': 'error',
            'error': str(e)
        }

# Dependency injection for smart router (called from main.py)
def set_smart_router(router_instance: SmartRouter):
    """Inject smart router dependency"""
    global smart_router
    smart_router = router_instance
    logger.info("RAG chat router: Smart router dependency injected")
