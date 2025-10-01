"""Debug the RAG pipeline to find why chunks_retrieved is 0"""
import sys
import os

os.chdir('/root/Aura/backend')
sys.path.insert(0, '/root/Aura/backend')

from dotenv import load_dotenv
load_dotenv('/root/Aura/backend/.env')

from app.services.rag_pipeline import get_rag_pipeline
from app.services.vector_search_service import get_vector_search_service
import asyncio

async def debug_rag_pipeline():
    print("=== DEBUGGING RAG PIPELINE ===\n")
    
    # Get services
    rag_pipeline = get_rag_pipeline()
    vector_service = get_vector_search_service()
    
    query = "Who is Bibhrajit Halder?"
    assistant_key = "bib-halder"
    tenant_id = "00000000-0000-0000-0000-000000000001"
    
    print(f"Query: {query}")
    print(f"Assistant Key: {assistant_key}")
    print(f"Tenant ID: {tenant_id}\n")
    
    # Test 1: Direct vector search
    print("1. Testing direct vector search...")
    vector_results = await vector_service.semantic_search(
        query=query,
        assistant_key=assistant_key,
        tenant_id=tenant_id,
        limit=5,
        similarity_threshold=0.3
    )
    print(f"   Vector search results: {len(vector_results)}")
    for i, result in enumerate(vector_results):
        print(f"     {i+1}. Similarity: {result.similarity:.3f}, Source: {result.source}")
        print(f"        Content: {result.content[:100]}...")
    
    # Test 2: Hybrid search
    print("\n2. Testing hybrid search...")
    hybrid_results = await vector_service.hybrid_search(
        query=query,
        assistant_key=assistant_key,
        tenant_id=tenant_id,
        limit=5,
        vector_weight=0.7,
        keyword_weight=0.3
    )
    print(f"   Hybrid search results: {len(hybrid_results)}")
    for i, result in enumerate(hybrid_results):
        print(f"     {i+1}. Similarity: {result.similarity:.3f}, Source: {result.source}")
        print(f"        Content: {result.content[:100]}...")
    
    # Test 3: RAG pipeline retrieve_context
    print("\n3. Testing RAG pipeline retrieve_context...")
    rag_context = await rag_pipeline.retrieve_context(
        query=query,
        assistant_key=assistant_key,
        tenant_id=tenant_id,
        use_hybrid_search=True,
        max_chunks=5
    )
    
    print(f"   RAG Context Results:")
    print(f"     Retrieved chunks: {len(rag_context.retrieved_chunks)}")
    print(f"     Source count: {rag_context.source_count}")
    print(f"     Context sources: {rag_context.context_sources}")
    print(f"     Confidence score: {rag_context.confidence_score:.3f}")
    print(f"     Context text length: {len(rag_context.context_text)}")
    print(f"     Processing time: {rag_context.processing_time:.3f}s")
    
    if rag_context.retrieved_chunks:
        print(f"   Retrieved chunks details:")
        for i, chunk in enumerate(rag_context.retrieved_chunks):
            print(f"     {i+1}. Similarity: {chunk.similarity:.3f}, Source: {chunk.source}")
            print(f"        Content: {chunk.content[:100]}...")
    else:
        print("   ❌ No chunks retrieved by RAG pipeline!")
    
    # Test 4: Check context text
    print(f"\n4. Context text preview:")
    print(f"   {rag_context.context_text[:500]}...")
    
    print("\n=== DEBUG COMPLETE ===")

if __name__ == "__main__":
    asyncio.run(debug_rag_pipeline())
