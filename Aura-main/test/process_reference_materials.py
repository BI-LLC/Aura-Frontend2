"""
Process uploaded reference materials that are in Supabase but not yet chunked/embedded
Run this on the server to process existing uploads
"""
import sys
import os
import asyncio

# Set working directory to backend
os.chdir('/root/Aura/backend')
sys.path.insert(0, '/root/Aura/backend')

from dotenv import load_dotenv
load_dotenv('/root/Aura/backend/.env')

from app.supabase_client import get_supabase_client
from app.services.chunk_processor import chunk_processor
from app.services.embedding_service import embedding_service

async def process_reference_materials():
    """Process all reference materials that don't have chunks yet"""
    
    print("=" * 60)
    print("Processing Reference Materials")
    print("=" * 60)
    
    # Get Supabase client with admin access (service key)
    supabase_service = get_supabase_client()
    client = supabase_service.get_client(admin=True)  # Use service key for admin access
    
    # Fetch all reference materials
    print("\n1. Fetching reference materials...")
    result = client.table('reference_materials').select('*').execute()
    
    if not result.data:
        print("No reference materials found!")
        return
    
    print(f"Found {len(result.data)} reference materials")
    
    for material in result.data:
        material_id = material.get('id')
        filename = material.get('original_filename', material.get('filename', 'unknown'))
        storage_path = material.get('filename')  # This is the storage path
        content = material.get('content', '')
        file_type = material.get('file_type', 'text/plain')
        tenant_id = material.get('tenant_id')
        assistant_key = material.get('assistant_key')
        
        print(f"\n2. Processing: {filename}")
        print(f"   - ID: {material_id}")
        print(f"   - Content length: {len(content)} chars")
        print(f"   - Tenant: {tenant_id}")
        print(f"   - Assistant: {assistant_key}")
        
        # If no content in DB, try to download from storage
        if not content or len(content) < 10:
            if storage_path and file_type in ['text/plain', 'text/markdown']:
                try:
                    print(f"   📥 Downloading from storage: {storage_path}")
                    file_data = client.storage.from_('reference-materials').download(storage_path)
                    content = file_data.decode('utf-8')
                    print(f"   ✅ Downloaded {len(content)} chars from storage")
                except Exception as e:
                    print(f"   ❌ Error downloading from storage: {e}")
                    continue
            else:
                print(f"   ⚠️  Skipping - no text content available and cannot download")
                continue
        
        if not content or len(content) < 10:
            print(f"   ⚠️  Skipping - content too short")
            continue
        
        # Check if already processed (chunks exist)
        existing_chunks = client.table('document_chunks').select('chunk_id').eq(
            'metadata->>source_id', material_id
        ).limit(1).execute()
        
        if existing_chunks.data:
            print(f"   ✅ Already processed - {len(existing_chunks.data)} chunks exist")
            continue
        
        try:
            # Create a document record first (required for foreign key)
            print(f"   📝 Creating document record...")
            doc_record = {
                'doc_id': material_id,
                'tenant_id': tenant_id,
                'user_id': material.get('uploaded_by', 'default_user'),
                'filename': filename,
                'file_size': material.get('file_size', len(content)),
                'file_type': file_type,
                'content_preview': content[:1000] if len(content) > 1000 else content,
                'is_processed': False,
                'processing_status': 'processing'
            }
            
            # Check if document already exists
            existing_doc = client.table('documents').select('doc_id').eq('doc_id', material_id).execute()
            if not existing_doc.data:
                client.table('documents').insert(doc_record).execute()
                print(f"   ✅ Document record created")
            else:
                print(f"   ℹ️  Document record already exists")
            
            # Chunk the content
            print(f"   📄 Chunking content...")
            chunks = chunk_processor.smart_chunk_document(
                content,
                metadata={
                    'source': 'reference_material',
                    'source_id': material_id,
                    'filename': filename,
                    'assistant_key': assistant_key,
                    'tenant_id': tenant_id
                }
            )
            print(f"   ✅ Created {len(chunks)} chunks")
            
            # Generate embeddings for chunks
            print(f"   🔢 Generating embeddings...")
            chunk_texts = [chunk.text for chunk in chunks]  # DocumentChunk objects have .text attribute
            embeddings = await embedding_service.generate_batch_embeddings(chunk_texts)
            print(f"   ✅ Generated {len(embeddings)} embeddings")
            
            # Store chunks in database
            print(f"   💾 Storing chunks in database...")
            chunk_records = []
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                chunk_record = {
                    'doc_id': material_id,
                    'tenant_id': tenant_id,
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
            
            # Insert in batches of 50
            batch_size = 50
            for i in range(0, len(chunk_records), batch_size):
                batch = chunk_records[i:i+batch_size]
                insert_result = client.table('document_chunks').insert(batch).execute()
                if not insert_result.data:
                    print(f"   ❌ Error inserting batch {i//batch_size + 1}")
                else:
                    print(f"   ✅ Inserted batch {i//batch_size + 1} ({len(batch)} chunks)")
            
            print(f"   🎉 Successfully processed {filename}!")
            
        except Exception as e:
            print(f"   ❌ Error processing {filename}: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("Processing Complete!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(process_reference_materials())

