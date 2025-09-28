"""
Admin endpoints with tenant isolation
Each admin only sees their own organization's data
"""

from fastapi import APIRouter, Depends, Request, HTTPException, File, UploadFile
from typing import List, Dict

router = APIRouter(prefix="/admin", tags=["tenant-admin"])

@router.get("/dashboard")
async def get_admin_dashboard(request: Request):
    """Get dashboard for THIS tenant only"""
    tenant_id = request.state.tenant_id
    
    # Get ONLY this tenant's data
    stats = {
        "organization": request.state.organization,
        "users": await get_tenant_users(tenant_id),
        "documents": await get_tenant_documents(tenant_id),
        "usage": await get_tenant_usage(tenant_id),
        "ai_conversations": await get_tenant_conversations(tenant_id)
    }
    
    return stats

@router.post("/upload")
async def upload_document(
    request: Request,
    file: UploadFile = File(...)
):
    """Upload document to THIS tenant's knowledge base"""
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    
    # Store in tenant-specific location
    storage_path = f"data/tenants/{tenant_id}/documents/"
    
    # Process and store
    document = await data_ingestion.ingest_file(
        file,
        tenant_id=tenant_id,
        user_id=user_id
    )
    
    return {"success": True, "doc_id": document.doc_id}

@router.get("/documents")
async def get_documents(request: Request):
    """Get ONLY this tenant's documents"""
    tenant_id = request.state.tenant_id
    
    documents = await data_service.get_tenant_documents(tenant_id)
    
    return {"documents": documents, "tenant": request.state.organization}
