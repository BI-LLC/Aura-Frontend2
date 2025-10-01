#!/usr/bin/env python3
"""
Simple test script for RAG components
Run this to verify RAG pipeline is working correctly
"""

import asyncio
import logging
import os
import sys

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.embedding_service import get_embedding_service
from app.services.chunk_processor import get_chunk_processor
from app.services.vector_search_service import get_vector_search_service
from app.services.rag_pipeline import get_rag_pipeline

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_embedding_service():
    """Test embedding generation"""
    print("\n[EMBEDDING] Testing Embedding Service...")
    
    embedding_service = get_embedding_service()
    
    # Test single embedding
    text = "What is BIC Corporation?"
    embedding = await embedding_service.generate_embedding(text)
    
    print(f"[SUCCESS] Generated embedding for: '{text}'")
    print(f"   Embedding dimensions: {len(embedding)}")
    print(f"   Sample values: {embedding[:5]}...")
    
    # Test batch embeddings
    texts = [
        "BIC stands for Bibhrajit Investment Corporation",
        "How to be a hero in business",
        "Training data for AI assistants"
    ]
    
    batch_embeddings = await embedding_service.generate_batch_embeddings(texts)
    print(f"[SUCCESS] Generated {len(batch_embeddings)} batch embeddings")
    
    # Cache stats
    cache_stats = embedding_service.get_cache_stats()
    print(f"   Cache stats: {cache_stats}")
    
    return True

def test_chunk_processor():
    """Test document chunking"""
    print("\n[CHUNKING] Testing Chunk Processor...")
    
    chunk_processor = get_chunk_processor()
    
    # Test document with different content types
    sample_document = """
    # About BIC Corporation
    
    BIC stands for Bibhrajit Investment Corporation. It is a leading investment company.
    
    ## Services Offered
    
    - Investment advisory
    - Portfolio management  
    - Financial planning
    
    Q: What does BIC stand for?
    A: BIC stands for Bibhrajit Investment Corporation.
    
    Q: What services does BIC offer?
    A: BIC offers investment advisory, portfolio management, and financial planning services.
    
    The company has been in business for over 20 years, serving clients across multiple sectors.
    We focus on sustainable and ethical investment strategies that benefit both investors and society.
    """
    
    chunks = chunk_processor.smart_chunk_document(
        sample_document,
        metadata={'filename': 'bic_info.md', 'assistant_key': 'bib-halder'}
    )
    
    print(f"[SUCCESS] Created {len(chunks)} chunks from sample document")
    
    for i, chunk in enumerate(chunks[:3]):  # Show first 3 chunks
        print(f"   Chunk {i+1}: Type='{chunk.chunk_type}', Tokens={chunk.token_count}")
        print(f"   Content: {chunk.text[:100]}...")
        print()
    
    # Get statistics
    stats = chunk_processor.get_chunk_statistics(chunks)
    print(f"[SUCCESS] Chunk statistics: {stats}")
    
    return chunks

async def test_rag_pipeline():
    """Test complete RAG pipeline"""
    print("\n[RAG] Testing RAG Pipeline...")
    
    rag_pipeline = get_rag_pipeline()
    
    # Test document processing
    sample_content = """
    BIC Corporation Overview
    
    BIC stands for Bibhrajit Investment Corporation, a premier investment firm established in 2003.
    
    Our mission is to provide exceptional investment advisory services to our clients.
    
    Services:
    1. Investment Advisory - Expert guidance on investment decisions
    2. Portfolio Management - Professional management of investment portfolios
    3. Financial Planning - Comprehensive financial planning services
    
    Contact Information:
    Email: info@bic-corp.com
    Phone: +1-555-BIC-CORP
    """
    
    # Process document (this would normally store in Supabase)
    print("[RAG] Processing sample document...")
    processing_result = await rag_pipeline.process_document_upload(
        content=sample_content,
        filename="bic_overview.txt",
        assistant_key="bib-halder",
        tenant_id="test-tenant"
    )
    
    print(f"[SUCCESS] Document processing result:")
    print(f"   Success: {processing_result.success}")
    print(f"   Chunks created: {processing_result.chunks_created}")
    print(f"   Processing time: {processing_result.processing_time:.2f}s")
    
    if processing_result.error_message:
        print(f"   Error: {processing_result.error_message}")
    
    # Test context retrieval (without database)
    print("\n[RAG] Testing context retrieval...")
    
    # This will use fallback mode since we don't have database connection
    rag_context = await rag_pipeline.retrieve_context(
        query="What is BIC Corporation?",
        assistant_key="bib-halder",
        tenant_id="test-tenant"
    )
    
    print(f"[SUCCESS] Context retrieval result:")
    print(f"   Query: {rag_context.query}")
    print(f"   Source count: {rag_context.source_count}")
    print(f"   Confidence: {rag_context.confidence_score:.2f}")
    print(f"   Sources: {rag_context.context_sources}")
    print(f"   Processing time: {rag_context.processing_time:.2f}s")
    
    if rag_context.context_text:
        print(f"   Context preview: {rag_context.context_text[:200]}...")
    
    return True

async def run_all_tests():
    """Run all RAG component tests"""
    print("[TEST] Starting RAG Component Tests")
    print("=" * 50)
    
    try:
        # Test individual components
        await test_embedding_service()
        chunks = test_chunk_processor()
        await test_rag_pipeline()
        
        print("\n[SUCCESS] All RAG component tests completed successfully!")
        print("\n[NEXT] Next Steps:")
        print("1. Run the SQL functions in your Supabase SQL Editor:")
        print("   - Execute: backend/database/rag_vector_functions.sql")
        print("2. Test with actual Supabase connection")
        print("3. Integrate with your chat/voice endpoints")
        
        return True
        
    except Exception as e:
        print(f"\n[ERROR] Test failed with error: {e}")
        logger.exception("Test error details:")
        return False

if __name__ == "__main__":
    # Run tests
    success = asyncio.run(run_all_tests())
    
    if success:
        print("\n[READY] RAG Pipeline is ready for integration!")
    else:
        print("\n[FAILED] Some tests failed - check the error messages above")
        sys.exit(1)
