#!/usr/bin/env python3
"""
Test Production Voice Chat Endpoints
Following BIC.py and Demo.py patterns
"""

import requests
import json
import time

def test_voice_endpoints():
    """Test the direct voice endpoints used by production voice chat"""
    print("🧪 Testing Production Voice Endpoints")
    print("=" * 50)
    
    base_url = "http://localhost:8000"
    
    # Test 1: Health check
    print("1. Testing backend health...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend healthy: {data.get('status')}")
            print(f"   Voice services: {data.get('services', {}).get('voice', False)}")
            print(f"   Conversation manager: {data.get('services', {}).get('conversation_manager', False)}")
        else:
            print(f"❌ Backend unhealthy: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend connection failed: {e}")
        return False
    
    # Test 2: Voice synthesize endpoint
    print("\n2. Testing voice synthesis...")
    try:
        response = requests.post(
            f"{base_url}/voice/synthesize",
            data={
                "text": "Hello, this is a test of the voice synthesis system.",
                "stability": "0.5",
                "similarity_boost": "0.75"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("audio"):
                print("✅ Voice synthesis working")
                print(f"   Audio data length: {len(data['audio'])} characters")
            else:
                print("❌ Voice synthesis failed - no audio data")
                return False
        else:
            print(f"❌ Voice synthesis failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Voice synthesis error: {e}")
        return False
    
    # Test 3: Chat endpoint
    print("\n3. Testing chat endpoint...")
    try:
        response = requests.post(
            f"{base_url}/api/chat",
            json={
                "message": "Hello, can you help me?",
                "user_id": "test_user",
                "organization": "AURA",
                "use_memory": True,
                "search_knowledge": True
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("response"):
                print("✅ Chat endpoint working")
                print(f"   Response: {data['response'][:100]}...")
            else:
                print("❌ Chat endpoint failed - no response")
                return False
        else:
            print(f"❌ Chat endpoint failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Chat endpoint error: {e}")
        return False
    
    print("\n✅ All production voice endpoints are working!")
    return True

def test_complete_voice_flow():
    """Test complete voice flow: chat -> synthesize"""
    print("\n🔄 Testing Complete Voice Flow")
    print("=" * 40)
    
    base_url = "http://localhost:8000"
    
    try:
        # Step 1: Get AI response
        print("1. Getting AI response...")
        chat_response = requests.post(
            f"{base_url}/api/chat",
            json={
                "message": "Tell me a short joke",
                "user_id": "test_user",
                "organization": "AURA",
                "use_memory": False,
                "search_knowledge": False
            },
            timeout=10
        )
        
        if chat_response.status_code != 200:
            print(f"❌ Chat failed: {chat_response.status_code}")
            return False
            
        chat_data = chat_response.json()
        ai_response = chat_data.get("response", "")
        print(f"✅ AI Response: {ai_response[:100]}...")
        
        # Step 2: Synthesize speech
        print("2. Synthesizing speech...")
        synth_response = requests.post(
            f"{base_url}/voice/synthesize",
            data={
                "text": ai_response[:200],  # Limit text length
                "stability": "0.5",
                "similarity_boost": "0.75"
            },
            timeout=15
        )
        
        if synth_response.status_code != 200:
            print(f"❌ Synthesis failed: {synth_response.status_code}")
            return False
            
        synth_data = synth_response.json()
        if synth_data.get("success") and synth_data.get("audio"):
            print("✅ Speech synthesis successful")
            print(f"   Audio data: {len(synth_data['audio'])} characters")
            return True
        else:
            print("❌ No audio data returned")
            return False
            
    except Exception as e:
        print(f"❌ Voice flow error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Production Voice Chat Test")
    print("=" * 50)
    
    # Test individual endpoints
    endpoints_ok = test_voice_endpoints()
    
    if endpoints_ok:
        # Test complete flow
        flow_ok = test_complete_voice_flow()
        
        if flow_ok:
            print("\n🎉 Production voice chat is ready!")
            print("   Frontend can now use: /voice")
            print("   Direct endpoints working: /voice/synthesize, /api/chat")
        else:
            print("\n❌ Voice flow needs fixes")
    else:
        print("\n❌ Voice endpoints need fixes")
