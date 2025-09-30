#!/usr/bin/env python3
"""
Test off-topic questions to see if post-processing works
"""

import requests
import json

def test_off_topic():
    """Test off-topic questions"""
    backend_url = "http://localhost:8000"
    
    print("🔍 Testing Off-Topic Questions")
    print("=" * 50)
    
    # Test off-topic questions
    off_topic_questions = [
        "What is the ocean?",
        "What is nepotism protocol?",
        "What is the weather?",
        "Tell me about Google"
    ]
    
    for question in off_topic_questions:
        print(f"\n💬 Question: '{question}'")
        
        payload = {
            "message": question,
            "user_id": "test_user",
            "document_id": "default_document",
            "organization": "default_org"
        }
        
        try:
            response = requests.post(
                f"{backend_url}/api/chat",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result.get('response', 'No response')
                print(f"🤖 AI Response: {ai_response}")
                
                # Check if it's properly redirected
                if 'document content provided' in ai_response.lower():
                    print("✅ Correctly redirected off-topic question!")
                else:
                    print("⚠️  Should have redirected off-topic question")
            else:
                print(f"❌ Request failed: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_off_topic()


