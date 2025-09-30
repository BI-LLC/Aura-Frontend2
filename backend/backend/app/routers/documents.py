"""
Document management router for AURA Voice AI
Handles file uploads, document management, and knowledge base queries
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional
import logging

from app.services.document_processor import DocumentProcessor

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/documents", tags=["documents"])

# Initialize document processor
doc_processor = DocumentProcessor()

# Helper function to get user_id (simplified for prototype)
def get_current_user_id() -> str:
    """Get current user ID - simplified for prototype"""
    # In production, this would extract from JWT token or session
    return "default_user"

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id)
):
    """
    Upload a document to the knowledge base
    Supports PDF, DOCX, TXT, MD files up to 10MB
    """
    try:
        # Validate file type
        allowed_extensions = ['pdf', 'docx', 'doc', 'txt', 'md']
        file_ext = file.filename.lower().split('.')[-1]
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Read file content
        content = await file.read()
        
        # Check file size (10MB limit)
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="File too large. Maximum size is 10MB"
            )
        
        # Process document
        logger.info(f"Processing document: {file.filename} for user {user_id}")
        document = await doc_processor.process_document(
            file_content=content,
            filename=file.filename,
            user_id=user_id
        )
        
        return {
            "success": True,
            "message": f"Document '{file.filename}' processed successfully",
            "document": {
                "id": document.document_id,
                "filename": document.filename,
                "chunks": len(document.chunks),
                "tokens": document.total_tokens,
                "processed_at": document.processed_at
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_documents(user_id: str = Depends(get_current_user_id)):
    """
    Get list of all documents in user's knowledge base
    """
    try:
        documents = doc_processor.get_user_documents(user_id)
        
        return {
            "success": True,
            "count": len(documents),
            "documents": documents
        }
        
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Delete a document from the knowledge base
    """
    try:
        success = doc_processor.delete_document(document_id, user_id)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Document not found or you don't have permission to delete it"
            )
        
        return {
            "success": True,
            "message": f"Document {document_id} deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search")
async def search_documents(
    query: str,
    top_k: int = 3,
    user_id: str = Depends(get_current_user_id)
):
    """
    Search documents for relevant information
    Uses semantic search if embeddings are available
    """
    try:
        if not query or len(query.strip()) < 2:
            raise HTTPException(status_code=400, detail="Query too short")
        
        results = await doc_processor.search_documents(
            query=query,
            user_id=user_id,
            top_k=top_k
        )
        
        return {
            "success": True,
            "query": query,
            "results": results,
            "count": len(results)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_knowledge_base_stats(user_id: str = Depends(get_current_user_id)):
    """
    Get statistics about user's knowledge base
    """
    try:
        documents = doc_processor.get_user_documents(user_id)
        
        total_chunks = 0
        total_tokens = 0
        file_types = {}
        
        for doc in documents:
            total_chunks += doc.get('chunk_count', 0)
            total_tokens += doc.get('total_tokens', 0)
            
            file_type = doc.get('file_type', 'unknown')
            file_types[file_type] = file_types.get(file_type, 0) + 1
        
        return {
            "success": True,
            "stats": {
                "total_documents": len(documents),
                "total_chunks": total_chunks,
                "total_tokens": total_tokens,
                "estimated_cost": total_tokens * 0.000002,  # Rough embedding cost estimate
                "file_types": file_types,
                "storage_used_mb": round(total_tokens * 0.004 / 1024, 2)  # Rough estimate
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))