# Training Data API Endpoints
# Handles Q&A pairs, Logic Notes, and Reference Materials

from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form
from typing import Optional, List
import logging
from pydantic import BaseModel

from app.services.training_data_service import get_training_data_service
from app.services.intelligent_document_processor import get_intelligent_processor

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/training", tags=["training"])

# Request/Response models
class QAPairRequest(BaseModel):
    prompt: str
    response: str
    tags: Optional[List[str]] = []
    assistant_key: Optional[str] = None
    tenant_id: Optional[str] = None

class LogicNoteRequest(BaseModel):
    title: str
    content: str
    category: Optional[str] = "general"
    tags: Optional[List[str]] = []
    assistant_key: Optional[str] = None
    tenant_id: Optional[str] = None

class ReferenceMaterialRequest(BaseModel):
    title: str
    content: str
    category: Optional[str] = "general"
    tags: Optional[List[str]] = []
    assistant_key: Optional[str] = None
    tenant_id: Optional[str] = None

class TrainingResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
    error: Optional[str] = None

@router.post("/qa-pairs", response_model=TrainingResponse)
async def create_qa_pair(
    request: QAPairRequest,
    authorization: Optional[str] = Header(default=None)
):
    """Create new Q&A pair for training data"""
    try:
        training_service = get_training_data_service()
        
        result = await training_service.create_qa_pair(
            prompt=request.prompt,
            response=request.response,
            tags=request.tags,
            assistant_key=request.assistant_key,
            tenant_id=request.tenant_id
        )
        
        if result['success']:
            return TrainingResponse(
                success=True,
                message=f"Q&A pair created successfully",
                data=result['data']
            )
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating Q&A pair: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/logic-notes", response_model=TrainingResponse)
async def create_logic_note(
    request: LogicNoteRequest,
    authorization: Optional[str] = Header(default=None)
):
    """Create new logic note for training data"""
    try:
        training_service = get_training_data_service()
        
        result = await training_service.create_logic_note(
            title=request.title,
            content=request.content,
            category=request.category,
            tags=request.tags,
            assistant_key=request.assistant_key,
            tenant_id=request.tenant_id
        )
        
        if result['success']:
            return TrainingResponse(
                success=True,
                message=f"Logic note '{request.title}' created successfully",
                data=result['data']
            )
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating logic note: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reference-materials", response_model=TrainingResponse)
async def create_reference_material(
    request: ReferenceMaterialRequest,
    authorization: Optional[str] = Header(default=None)
):
    """Create new reference material for training data"""
    try:
        training_service = get_training_data_service()
        
        result = await training_service.create_reference_material(
            title=request.title,
            content=request.content,
            category=request.category,
            tags=request.tags,
            assistant_key=request.assistant_key,
            tenant_id=request.tenant_id
        )
        
        if result['success']:
            return TrainingResponse(
                success=True,
                message=f"Reference material '{request.title}' created successfully",
                data=result['data']
            )
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating reference material: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/context/{assistant_key}")
async def get_training_context(
    assistant_key: str,
    query: str,
    tenant_id: Optional[str] = None,
    authorization: Optional[str] = Header(default=None)
):
    """Get training context for a specific query and assistant"""
    try:
        training_service = get_training_data_service()
        
        context = await training_service.get_training_context(
            user_query=query,
            assistant_key=assistant_key,
            tenant_id=tenant_id
        )
        
        return {
            "success": True,
            "assistant_key": assistant_key,
            "query": query,
            "context": context,
            "has_context": bool(context.strip())
        }
        
    except Exception as e:
        logger.error(f"Error getting training context: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/qa-pairs")
async def list_qa_pairs(
    assistant_key: Optional[str] = None,
    tenant_id: Optional[str] = None,
    limit: int = 10,
    authorization: Optional[str] = Header(default=None)
):
    """List Q&A pairs for dashboard"""
    try:
        training_service = get_training_data_service()
        client = training_service.supabase_client.get_client()
        
        query = client.table('training_data').select('*').limit(limit)
        
        # Add filters if provided
        # Note: Add these filters if columns exist in your table
        # if assistant_key:
        #     query = query.eq('assistant_key', assistant_key)
        # if tenant_id:
        #     query = query.eq('tenant_id', tenant_id)
        
        result = query.execute()
        
        return {
            "success": True,
            "data": result.data or [],
            "count": len(result.data or [])
        }
        
    except Exception as e:
        logger.error(f"Error listing Q&A pairs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logic-notes")
async def list_logic_notes(
    assistant_key: Optional[str] = None,
    tenant_id: Optional[str] = None,
    limit: int = 10,
    authorization: Optional[str] = Header(default=None)
):
    """List logic notes for dashboard"""
    try:
        training_service = get_training_data_service()
        client = training_service.supabase_client.get_client()
        
        query = client.table('logic_notes').select('*').limit(limit)
        result = query.execute()
        
        return {
            "success": True,
            "data": result.data or [],
            "count": len(result.data or [])
        }
        
    except Exception as e:
        logger.error(f"Error listing logic notes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reference-materials")
async def list_reference_materials(
    assistant_key: Optional[str] = None,
    tenant_id: Optional[str] = None,
    limit: int = 10,
    authorization: Optional[str] = Header(default=None)
):
    """List reference materials for dashboard"""
    try:
        training_service = get_training_data_service()
        client = training_service.supabase_client.get_client()
        
        query = client.table('reference_materials').select('*').limit(limit)
        result = query.execute()
        
        return {
            "success": True,
            "data": result.data or [],
            "count": len(result.data or [])
        }
        
    except Exception as e:
        logger.error(f"Error listing reference materials: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-document")
async def upload_training_document(
    file: UploadFile = File(...),
    assistant_key: str = Form(...),
    tenant_id: Optional[str] = Form(default=None),
    authorization: Optional[str] = Header(default=None)
):
    """
    Upload a document and automatically convert it to training data
    Intelligently extracts Q&A pairs, logic notes, and reference materials
    """
    try:
        # Read file content
        content = await file.read()
        text_content = content.decode('utf-8')
        
        # Process with intelligent processor
        intelligent_processor = get_intelligent_processor()
        results = await intelligent_processor.process_uploaded_document(
            content=text_content,
            filename=file.filename,
            assistant_key=assistant_key,
            tenant_id=tenant_id
        )
        
        return {
            "success": True,
            "message": f"Document '{file.filename}' processed successfully",
            "results": {
                "qa_pairs_created": results['qa_pairs'],
                "logic_notes_created": results['logic_notes'],
                "reference_materials_created": results['reference_materials'],
                "total_items": results['qa_pairs'] + results['logic_notes'] + results['reference_materials']
            },
            "errors": results.get('errors', [])
        }
        
    except Exception as e:
        logger.error(f"Error processing uploaded document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/{assistant_key}")
async def get_training_stats(
    assistant_key: str,
    tenant_id: Optional[str] = None,
    authorization: Optional[str] = Header(default=None)
):
    """Get training data statistics for dashboard"""
    try:
        training_service = get_training_data_service()
        client = training_service.supabase_client.get_client()
        
        # Count Q&A pairs
        qa_result = client.table('training_data').select('id', count='exact').execute()
        qa_count = qa_result.count or 0
        
        # Count logic notes
        logic_result = client.table('logic_notes').select('id', count='exact').execute()
        logic_count = logic_result.count or 0
        
        # Count reference materials
        ref_result = client.table('reference_materials').select('id', count='exact').execute()
        ref_count = ref_result.count or 0
        
        return {
            "success": True,
            "assistant_key": assistant_key,
            "stats": {
                "qa_pairs": qa_count,
                "logic_notes": logic_count,
                "reference_materials": ref_count,
                "total_training_items": qa_count + logic_count + ref_count
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting training stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
