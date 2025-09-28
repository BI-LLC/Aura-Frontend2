#!/usr/bin/env python3
"""
Test document retrieval directly
"""

import sys
import os
sys.path.append('backend')

from app.services.data_ingestion import DataIngestionService
import asyncio

async def test_document_retrieval():
    """Test document retrieval directly"""
    print("🧪 Testing Document Retrieval Directly")
    print("=" * 50)
    
    # Create data service
    data_service = DataIngestionService()
    
    # Test document retrieval
    documents = await data_service.get_tenant_documents("test_user", "default_org")
    
    print(f"📄 Found {len(documents)} documents")
    
    if documents:
        print("\n📋 Document details:")
        for i, doc in enumerate(documents[:3]):  # Show first 3
            print(f"  {i+1}. {doc.get('filename', 'Unknown')}")
            print(f"     Content length: {len(doc.get('content', ''))}")
            print(f"     Content preview: {doc.get('content', '')[:100]}...")
            print()
    else:
        print("❌ No documents found!")
    
    return documents

if __name__ == "__main__":
    documents = asyncio.run(test_document_retrieval())
