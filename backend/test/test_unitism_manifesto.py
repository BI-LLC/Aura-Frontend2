#!/usr/bin/env python3
"""
Test with Unitism manifesto specific questions
"""

import requests
import json

def test_unitism_questions():
    """Test with Unitism manifesto specific questions"""
    backend_url = "http://localhost:8000"
    
    print("🧪 Testing Unitism Manifesto Questions")
    print("=" * 60)
    
    # Test questions about Unitism
    test_questions = [
        "What is Unitism?",
        "What is the Unitism Party?",
        "What does 'a world without borders' mean?",
        "Who wrote the Unitism manifesto?",
        "What is the ocean?",  # Off-topic question
        "What is nepotism protocol?"  # Off-topic question
    ]
    
    for question in test_questions:
        print(f"\n💬 Question: '{question}'")
        
        try:
            response = requests.post(
                f"{backend_url}/api/chat",
                json={
                    "message": question,
                    "user_id": "test_user",
                    "document_id": "default_document",
                    "organization": "default_org"
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"🤖 AI Response: {result.get('response', 'N/A')}")
                
                # Check if response is appropriate
                response_text = result.get('response', '').lower()
                
                if question.lower() in ["what is the ocean?", "what is nepotism protocol?"]:
                    # These should be redirected
                    if 'document content provided' in response_text or 'can only answer' in response_text:
                        print("✅ Correctly redirected off-topic question!")
                    else:
                        print("⚠️  Should have redirected off-topic question")
                else:
                    # These should contain Unitism content
                    if 'unitism' in response_text or 'manifesto' in response_text or 'borders' in response_text:
                        print("✅ Contains Unitism-related content!")
                    else:
                        print("⚠️  Should contain Unitism-related content")
                        
            else:
                print(f"❌ Request failed: {response.status_code}")
                print(f"Error: {response.text}")
                
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🚀 AURA Unitism Manifesto Test")
    print("=" * 60)
    
    test_unitism_questions()
    
    print("\n🏁 Unitism manifesto test completed!")
    print("=" * 60)
