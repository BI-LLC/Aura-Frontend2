#!/usr/bin/env python3
"""
Debug test to see what's happening with document context
"""

import requests
import json

def test_document_context_debug():
    """Test with more specific debugging"""
    backend_url = "http://localhost:8000"
    
    print("🧪 Debug Test: Document Context")
    print("=" * 60)
    
    # Test with a specific question about the document content
    test_message = "What is nepotism protocol?"
    
    try:
        print(f"💬 Sending: '{test_message}'")
        
        response = requests.post(
            f"{backend_url}/api/chat",
            json={
                "message": test_message,
                "user_id": "test_user",
                "document_id": "default_document",
                "organization": "default_org"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Chat processing successful!")
            print(f"🤖 AI Response: {result.get('response', 'N/A')}")
            print(f"🔧 Model Used: {result.get('model_used', 'N/A')}")
            
            # Check if response contains specific document content
            response_text = result.get('response', '').lower()
            if 'nepotism' in response_text or 'protocol' in response_text or 'conflict' in response_text:
                print("✅ Response contains document-specific content!")
            else:
                print("⚠️  Response doesn't contain document-specific content")
                
        else:
            print(f"❌ Chat processing failed: {response.status_code}")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_off_topic_debug():
    """Test off-topic question with debugging"""
    backend_url = "http://localhost:8000"
    
    print("\n🧪 Debug Test: Off-Topic Question")
    print("=" * 60)
    
    # Test with off-topic question
    test_message = "What is the ocean?"
    
    try:
        print(f"💬 Sending: '{test_message}'")
        
        response = requests.post(
            f"{backend_url}/api/chat",
            json={
                "message": test_message,
                "user_id": "test_user",
                "document_id": "default_document",
                "organization": "default_org"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Chat processing successful!")
            print(f"🤖 AI Response: {result.get('response', 'N/A')}")
            
            # Check if response redirects properly
            response_text = result.get('response', '').lower()
            if 'document' in response_text or 'don\'t know' in response_text or 'can only' in response_text or 'not in the document' in response_text:
                print("✅ Response properly redirects to document content!")
            else:
                print("⚠️  Response doesn't redirect properly")
                
        else:
            print(f"❌ Chat processing failed: {response.status_code}")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🚀 AURA Document Context Debug Test")
    print("=" * 60)
    
    # Test document-specific question
    test_document_context_debug()
    
    # Test off-topic question
    test_off_topic_debug()
    
    print("\n🏁 Debug test completed!")
    print("=" * 60)
