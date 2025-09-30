#!/usr/bin/env python3
"""
Debug the system prompt to see what's actually being sent to the AI
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.services.data_ingestion import DataIngestionService

async def debug_document_content():
    """Debug what document content is being retrieved"""
    print("🔍 Debugging Document Content")
    print("=" * 50)
    
    # Initialize data service
    data_service = DataIngestionService()
    
    # Get documents
    documents = await data_service.get_tenant_documents("test_user")
    print(f"Found {len(documents)} documents")
    
    # Find Unitism manifesto
    unitism_doc = None
    for doc in documents:
        filename = doc.get('filename', '').lower()
        if 'manifesto' in filename or 'unitism' in filename or 'manisfesto' in filename:
            unitism_doc = doc
            break
    
    if unitism_doc:
        print(f"\n📄 Unitism Manifesto Document:")
        print(f"  ID: {unitism_doc.get('id')}")
        print(f"  Filename: {unitism_doc.get('filename')}")
        print(f"  Content length: {len(unitism_doc.get('content', ''))}")
        print(f"  Content preview: {unitism_doc.get('content', '')[:200]}")
        
        # Check if it contains the expected content
        content = unitism_doc.get('content', '').lower()
        if 'r.r.h' in content and 'c.h' in content:
            print("✅ Contains R.R.H and C.H")
        else:
            print("❌ Missing R.R.H and C.H")
            
        if 'unitism party' in content:
            print("✅ Contains 'Unitism Party'")
        else:
            print("❌ Missing 'Unitism Party'")
            
        if 'world without borders' in content:
            print("✅ Contains 'world without borders'")
        else:
            print("❌ Missing 'world without borders'")
    else:
        print("❌ Unitism manifesto not found")

if __name__ == "__main__":
    import asyncio
    asyncio.run(debug_document_content())
