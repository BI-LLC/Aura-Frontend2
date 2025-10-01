"""Test the fixed vector search service"""
import sys
import os

os.chdir('/root/Aura/backend')
sys.path.insert(0, '/root/Aura/backend')

from dotenv import load_dotenv
load_dotenv('/root/Aura/backend/.env')

from app.services.vector_search_service import get_vector_search_service
import asyncio

async def test_vector_search():
    print("=== TESTING FIXED VECTOR SEARCH ===\n")
    
    # Get the vector search service
    vector_service = get_vector_search_service()
    
    # Test query
    query = "Who is Bibhrajit Halder?"
    print(f"Query: {query}")
    
    # Perform search
    results = await vector_service.semantic_search(
        query=query,
        assistant_key="bib-halder",
        tenant_id="00000000-0000-0000-0000-000000000001",
        limit=5,
        similarity_threshold=0.3  # Lower threshold for testing
    )
    
    print(f"\nFound {len(results)} results:")
    for i, result in enumerate(results):
        print(f"\nResult {i+1}:")
        print(f"  Similarity: {result.similarity:.3f}")
        print(f"  Source: {result.source}")
        print(f"  Content: {result.content[:100]}...")
        print(f"  Metadata: {result.metadata}")

if __name__ == "__main__":
    asyncio.run(test_vector_search())
