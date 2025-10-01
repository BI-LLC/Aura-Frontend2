# Document Processing Router
# Automatically process uploaded documents for RAG

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import logging
from typing import Optional
from pydantic import BaseModel

from app.supabase_client import get_supabase_client
from app.services.chunk_processor import chunk_processor
from app.services.embedding_service import embedding_service

router = APIRouter(prefix="/api/process", tags=["document_processing"])
logger = logging.getLogger(__name__)

class ProcessDocumentRequest(BaseModel):
    doc_id: str
    tenant_id: Optional[str] = None

async def process_document_background(doc_id: str, tenant_id: Optional[str] = None):
    """
    Background task to process a document:
    1. Fetch from reference_materials
    2. Download content from storage if needed
    3. Chunk the text
    4. Generate embeddings
    5. Store in document_chunks table
    """
    try:
        # Get Supabase client with admin access
        supabase_service = get_supabase_client()
        client = supabase_service.get_client(admin=True)
        
        # Fetch the reference material
        logger.info(f"Processing document: {doc_id}")
        result = client.table('reference_materials').select('*').eq('id', doc_id).execute()
        
        if not result.data:
            logger.error(f"Document {doc_id} not found")
            return
        
        material = result.data[0]
        filename = material.get('original_filename', material.get('filename', 'unknown'))
        storage_path = material.get('filename')
        content = material.get('content', '')
        file_type = material.get('file_type', 'text/plain')
        material_tenant_id = material.get('tenant_id')
        assistant_key = material.get('assistant_key')
        
        logger.info(f"Processing: {filename}")
        
        # Download from storage if content not in DB
        if not content or len(content) < 10:
            if storage_path and file_type in ['text/plain', 'text/markdown']:
                try:
                    logger.info(f"Downloading from storage: {storage_path}")
                    file_data = client.storage.from_('reference-materials').download(storage_path)
                    content = file_data.decode('utf-8')
                    logger.info(f"Downloaded {len(content)} chars")
                except Exception as e:
                    logger.error(f"Error downloading: {e}")
                    return
        
        if not content or len(content) < 10:
            logger.error(f"No content available for {filename}")
            return
        
        # Check if already processed
        existing_chunks = client.table('document_chunks').select('chunk_id').eq(
            'doc_id', doc_id
        ).limit(1).execute()
        
        if existing_chunks.data:
            logger.info(f"Document {filename} already processed")
            return
        
        # Create document record if not exists
        existing_doc = client.table('documents').select('doc_id').eq('doc_id', doc_id).execute()
        
        if not existing_doc.data:
            doc_record = {
                'doc_id': doc_id,
                'tenant_id': material_tenant_id or tenant_id,
                'user_id': material.get('uploaded_by', 'default_user'),
                'filename': filename,
                'file_size': material.get('file_size', len(content)),
                'file_type': file_type,
                'content_preview': content[:1000],
                'is_processed': False,
                'processing_status': 'processing'
            }
            client.table('documents').insert(doc_record).execute()
            logger.info(f"Document record created for {filename}")
        
        # Chunk the content
        logger.info(f"Chunking content...")
        chunks = chunk_processor.smart_chunk_document(
            content,
            metadata={
                'source': 'reference_material',
                'source_id': doc_id,
                'filename': filename,
                'assistant_key': assistant_key,
                'tenant_id': material_tenant_id or tenant_id
            }
        )
        logger.info(f"Created {len(chunks)} chunks")
        
        # Generate embeddings
        logger.info(f"Generating embeddings...")
        chunk_texts = [chunk.text for chunk in chunks]
        embeddings = await embedding_service.generate_batch_embeddings(chunk_texts)
        logger.info(f"Generated {len(embeddings)} embeddings")
        
        # Store chunks
        logger.info(f"Storing chunks in database...")
        chunk_records = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            chunk_record = {
                'doc_id': doc_id,
                'tenant_id': material_tenant_id or tenant_id,
                'chunk_text': chunk.text,
                'chunk_index': i,
                'embedding': embedding,
                'metadata': {
                    **chunk.metadata,
                    'chunk_type': chunk.chunk_type,
                    'token_count': chunk.token_count
                }
            }
            chunk_records.append(chunk_record)
        
        # Insert in batches
        batch_size = 50
        for i in range(0, len(chunk_records), batch_size):
            batch = chunk_records[i:i+batch_size]
            client.table('document_chunks').insert(batch).execute()
            logger.info(f"Inserted batch {i//batch_size + 1}")
        
        # Update document status
        client.table('documents').update({
            'is_processed': True,
            'processing_status': 'completed',
            'chunks_count': len(chunks)
        }).eq('doc_id', doc_id).execute()
        
        logger.info(f"✅ Successfully processed {filename}!")
        
    except Exception as e:
        logger.error(f"Error processing document {doc_id}: {e}")
        import traceback
        traceback.print_exc()
        
        # Update status to failed
        try:
            client = get_supabase_client().get_client(admin=True)
            client.table('documents').update({
                'is_processed': False,
                'processing_status': 'failed'
            }).eq('doc_id', doc_id).execute()
        except:
            pass

@router.post("/document")
async def process_document(
    request: ProcessDocumentRequest,
    background_tasks: BackgroundTasks
):
    """
    Trigger document processing (chunking and embedding generation)
    Can be called after upload or manually to reprocess
    """
    try:
        # Add to background tasks
        background_tasks.add_task(
            process_document_background,
            request.doc_id,
            request.tenant_id
        )
        
        return {
            "success": True,
            "message": f"Document processing started for {request.doc_id}",
            "doc_id": request.doc_id
        }
        
    except Exception as e:
        logger.error(f"Error starting document processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/all-unprocessed")
async def process_all_unprocessed(background_tasks: BackgroundTasks):
    """
    Process all unprocessed documents in reference_materials
    Useful for bulk processing or recovery
    """
    try:
        supabase_service = get_supabase_client()
        client = supabase_service.get_client(admin=True)
        
        # Get all reference materials
        result = client.table('reference_materials').select('id, original_filename').execute()
        
        if not result.data:
            return {
                "success": True,
                "message": "No documents found",
                "processed_count": 0
            }
        
        # Check which ones are not processed
        unprocessed = []
        for material in result.data:
            doc_id = material['id']
            chunks = client.table('document_chunks').select('chunk_id').eq(
                'doc_id', doc_id
            ).limit(1).execute()
            
            if not chunks.data:
                unprocessed.append(doc_id)
                background_tasks.add_task(process_document_background, doc_id)
        
        return {
            "success": True,
            "message": f"Processing {len(unprocessed)} unprocessed documents",
            "total_documents": len(result.data),
            "unprocessed_count": len(unprocessed),
            "unprocessed_ids": unprocessed
        }
        
    except Exception as e:
        logger.error(f"Error processing all documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{doc_id}")
async def get_processing_status(doc_id: str):
    """
    Check the processing status of a document
    """
    try:
        supabase_service = get_supabase_client()
        client = supabase_service.get_client(admin=True)
        
        # Check if document exists
        doc_result = client.table('documents').select(
            'doc_id, filename, is_processed, processing_status, chunks_count'
        ).eq('doc_id', doc_id).execute()
        
        if not doc_result.data:
            return {
                "success": False,
                "message": "Document not found",
                "status": "not_found"
            }
        
        doc = doc_result.data[0]
        
        # Count actual chunks
        chunks_result = client.table('document_chunks').select(
            'chunk_id', count='exact'
        ).eq('doc_id', doc_id).execute()
        
        actual_chunks = chunks_result.count if chunks_result.count else 0
        
        return {
            "success": True,
            "doc_id": doc_id,
            "filename": doc.get('filename'),
            "is_processed": doc.get('is_processed'),
            "processing_status": doc.get('processing_status'),
            "chunks_count": actual_chunks,
            "chunks_stored": doc.get('chunks_count')
        }
        
    except Exception as e:
        logger.error(f"Error checking status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

