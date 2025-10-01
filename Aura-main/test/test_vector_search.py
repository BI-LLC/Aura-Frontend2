"""Test vector search directly"""
import sys
import os
import asyncio

os.chdir('/root/Aura/backend')
sys.path.insert(0, '/root/Aura/backend')

from dotenv import load_dotenv
load_dotenv('/root/Aura/backend/.env')

from app.supabase_client import get_supabase_client
from app.services.embedding_service import embedding_service

async def test_vector_search():
    print("=== TESTING VECTOR SEARCH ===\n")
    
    # Get Supabase client
    supabase_service = get_supabase_client()
    client = supabase_service.get_client(admin=True)
    
    # 1. Check if chunks exist
    print("1. Checking document chunks...")
    chunks_result = client.table('document_chunks').select('chunk_id, doc_id, chunk_text, metadata').limit(5).execute()
    
    if not chunks_result.data:
        print("❌ No chunks found in database!")
        return
    
    print(f"✅ Found {len(chunks_result.data)} chunks")
    for chunk in chunks_result.data:
        print(f"   - Chunk {chunk['chunk_id']}: {chunk['chunk_text'][:100]}...")
        print(f"     Metadata: {chunk['metadata']}")
    
    # 2. Test vector search function
    print("\n2. Testing vector search function...")
    query = "Who is Bibhrajit Halder?"
    
    # Generate query embedding
    print(f"   Generating embedding for: '{query}'")
    query_embedding = await embedding_service.generate_embedding(query)
    print(f"   ✅ Generated embedding: {len(query_embedding)} dimensions")
    
    # Call the RPC function
    print("   Calling match_document_chunks RPC...")
    try:
        result = client.rpc('match_document_chunks', {
            'query_embedding': query_embedding,
            'match_threshold': 0.5,  # Lower threshold for testing
            'match_count': 10,
            'tenant_filter': '00000000-0000-0000-0000-000000000001',
            'assistant_key_filter': 'bib-halder'
        }).execute()
        
        if result.data:
            print(f"   ✅ Found {len(result.data)} matches!")
            for i, match in enumerate(result.data):
                print(f"     Match {i+1}: similarity={match['similarity']:.3f}")
                print(f"       Text: {match['chunk_text'][:100]}...")
        else:
            print("   ❌ No matches found")
            
    except Exception as e:
        print(f"   ❌ Error calling RPC: {e}")
    
    # 3. Test direct query
    print("\n3. Testing direct database query...")
    try:
        # Query chunks with embeddings
        chunks_with_embeddings = client.table('document_chunks').select(
            'chunk_id, doc_id, chunk_text, metadata'
        ).not_.is_('embedding', 'null').limit(5).execute()
        
        if chunks_with_embeddings.data:
            print(f"   ✅ Found {len(chunks_with_embeddings.data)} chunks with embeddings")
        else:
            print("   ❌ No chunks with embeddings found")
            
    except Exception as e:
        print(f"   ❌ Error querying chunks: {e}")

if __name__ == "__main__":
    asyncio.run(test_vector_search())
