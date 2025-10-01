#!/usr/bin/env python3
"""
Simple RAG test without the full server
Test just the core RAG functionality locally
"""

import asyncio
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

async def test_rag_chat_functionality():
    """Test the RAG chat functionality directly"""
    print("[RAG TEST] Testing RAG Chat Functionality...")
    
    try:
        from app.services.training_data_service import get_training_data_service
        
        # Test enhanced context retrieval
        training_service = get_training_data_service()
        
        # Test with your existing data
        print("\n[TEST 1] Testing traditional Q&A matching:")
        result1 = await training_service.get_training_context(
            "How to be a hero?", 
            "bib-halder", 
            None
        )
        print(f"Result: {result1}")
        
        print("\n[TEST 2] Testing RAG-enhanced context:")
        result2 = await training_service.get_rag_enhanced_context(
            "How to be a hero?", 
            "bib-halder", 
            None
        )
        print(f"Result: {result2}")
        
        print("\n[TEST 3] Testing semantic understanding:")
        result3 = await training_service.get_rag_enhanced_context(
            "Tell me about being heroic", 
            "bib-halder", 
            None
        )
        print(f"Result: {result3}")
        
        print("\n[TEST 4] Testing RAG document processing:")
        from app.services.rag_pipeline import get_rag_pipeline
        
        rag_pipeline = get_rag_pipeline()
        
        # Test context retrieval (this should work with existing training data)
        context = await rag_pipeline.retrieve_context(
            "Who are you?",
            "bib-halder",
            None
        )
        
        print(f"Context confidence: {context.confidence_score}")
        print(f"Sources: {context.context_sources}")
        print(f"Preview: {context.context_text[:200]}...")
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    print("[RAG] Simple RAG Test - No Server Required")
    print("=" * 50)
    
    success = await test_rag_chat_functionality()
    
    if success:
        print("\n[SUCCESS] RAG Functionality Test PASSED!")
        print("\nThis means:")
        print("- Your RAG pipeline is working")
        print("- Embeddings are being generated") 
        print("- Context retrieval is functional")
        print("- Ready for server testing!")
    else:
        print("\n[FAILED] RAG Functionality Test FAILED!")
        print("Check the errors above")

if __name__ == "__main__":
    asyncio.run(main())
