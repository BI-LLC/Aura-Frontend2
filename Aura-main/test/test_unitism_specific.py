#!/usr/bin/env python3
"""
Test Unitism-specific questions to verify document content responses
"""

import requests
import json

def test_unitism_questions():
    """Test with Unitism-specific questions"""
    backend_url = "http://localhost:8000"
    print("🧪 Testing Unitism-Specific Questions")
    print("=" * 60)
    
    # Test questions about Unitism from the document
    test_questions = [
        "What is Unitism?",
        "What does 'a world without borders' mean?",
        "Who wrote the Unitism manifesto?",
        "What is the Unitism Party?",
        "What does 'Initium' mean?",
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
                ai_response = result.get('response', 'No response')
                print(f"🤖 AI Response: {ai_response}")
                
                # Check if response is appropriate
                response_text = ai_response.lower()
                
                if question.lower() in ["what is the ocean?", "what is nepotism protocol?"]:
                    # These should be redirected
                    if 'document content provided' in response_text or 'can only answer' in response_text:
                        print("✅ Correctly redirected off-topic question!")
                    else:
                        print("⚠️  Should have redirected off-topic question")
                else:
                    # These should contain Unitism content
                    if 'unitism' in response_text or 'manifesto' in response_text or 'borders' in response_text or 'initium' in response_text:
                        print("✅ Contains Unitism-related content!")
                    else:
                        print("⚠️  Should contain Unitism-related content")
            else:
                print(f"❌ Request failed: {response.status_code}")
                print(f"Error: {response.text}")
                    
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🚀 AURA Unitism-Specific Test")
    print("=" * 60)
    
    test_unitism_questions()
    
    print("\n🏁 Unitism-specific test completed!")
    print("=" * 60)
