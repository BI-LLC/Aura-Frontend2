#!/usr/bin/env python3
"""
Debug test to see exactly what's happening with off-topic questions
"""

import requests
import json

def test_with_detailed_logging():
    """Test with detailed request/response logging"""
    backend_url = "http://localhost:8000"
    
    print("🧪 Debug Test: Off-Topic Question with Detailed Logging")
    print("=" * 70)
    
    # Test with off-topic question
    test_message = "What is the ocean?"
    
    try:
        print(f"💬 Sending: '{test_message}'")
        print(f"📡 Request URL: {backend_url}/api/chat")
        print(f"📋 Request payload:")
        payload = {
            "message": test_message,
            "user_id": "test_user",
            "document_id": "default_document",
            "organization": "default_org"
        }
        print(json.dumps(payload, indent=2))
        
        response = requests.post(
            f"{backend_url}/api/chat",
            json=payload,
            timeout=30
        )
        
        print(f"\n📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Chat processing successful!")
            print(f"🤖 AI Response: {result.get('response', 'N/A')}")
            print(f"🔧 Model Used: {result.get('model_used', 'N/A')}")
            
            # Check if response redirects properly
            response_text = result.get('response', '').lower()
            redirect_indicators = [
                'document content provided',
                'can only answer',
                'not in the document',
                'ask me something about the document',
                'don\'t know that information from the document'
            ]
            
            found_redirect = any(indicator in response_text for indicator in redirect_indicators)
            
            if found_redirect:
                print("✅ Response properly redirects to document content!")
            else:
                print("⚠️  Response doesn't redirect properly")
                print("🔍 Looking for redirect indicators...")
                for indicator in redirect_indicators:
                    if indicator in response_text:
                        print(f"   ✅ Found: '{indicator}'")
                    else:
                        print(f"   ❌ Missing: '{indicator}'")
                
        else:
            print(f"❌ Chat processing failed: {response.status_code}")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_document_specific_question():
    """Test with a document-specific question for comparison"""
    backend_url = "http://localhost:8000"
    
    print("\n🧪 Debug Test: Document-Specific Question for Comparison")
    print("=" * 70)
    
    # Test with document-specific question
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
            
            # Check if response contains document content
            response_text = result.get('response', '').lower()
            if 'nepotism' in response_text or 'protocol' in response_text:
                print("✅ Response contains document-specific content!")
            else:
                print("⚠️  Response doesn't contain document-specific content")
                
        else:
            print(f"❌ Chat processing failed: {response.status_code}")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🚀 AURA Off-Topic Redirection Debug Test")
    print("=" * 70)
    
    # Test document-specific question first
    test_document_specific_question()
    
    # Test off-topic question
    test_with_detailed_logging()
    
    print("\n🏁 Debug test completed!")
    print("=" * 70)
