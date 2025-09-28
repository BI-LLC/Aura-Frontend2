#!/usr/bin/env python3
"""
Test script for AURA Voice AI streaming functionality
Tests OpenAI and Grok streaming for real-time voice conversation
"""

import asyncio
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

async def test_streaming():
    """Test streaming functionality"""
    print("🚀 Testing AURA Voice AI Streaming...")
    print("=" * 50)
    
    try:
        # Test 1: SmartRouter initialization
        print("1️⃣ Testing SmartRouter...")
        from app.services.smart_router import SmartRouter
        
        router = SmartRouter()
        print("   ✅ SmartRouter initialized successfully")
        print(f"   OpenAI key: {'✓' if router.openai_key else '✗'}")
        print(f"   Grok key: {'✓' if router.grok_key else '✗'}")
        
        # Test 2: Voice system prompt
        print("\n2️⃣ Testing voice system prompt...")
        prompt = router._get_voice_system_prompt()
        print(f"   ✅ Voice prompt generated: {len(prompt)} chars")
        print(f"   Content: {prompt[:100]}...")
        
        # Test 3: Test streaming (without actual API calls)
        print("\n3️⃣ Testing streaming infrastructure...")
        
        # Test message classification
        test_messages = [
            "What is the weather like?",
            "Can you analyze this complex problem step by step?",
            "Hello, how are you today?"
        ]
        
        for msg in test_messages:
            provider = router._classify_query(msg)
            print(f"   '{msg[:30]}...' → {provider}")
        
        # Test 4: Test streaming method (will fail gracefully if API keys are invalid)
        print("\n4️⃣ Testing streaming methods...")
        
        test_message = "Hello, this is a test message for streaming."
        
        # Test OpenAI streaming (will fail gracefully if key is invalid)
        print("   Testing OpenAI streaming...")
        try:
            chunk_count = 0
            async for chunk in router._stream_from_openai(test_message):
                chunk_count += 1
                if chunk_count <= 3:  # Only show first few chunks
                    print(f"      Chunk {chunk_count}: {chunk[:50]}...")
                elif chunk_count == 4:
                    print(f"      ... and {chunk_count - 3} more chunks")
                    break
            
            if chunk_count > 0:
                print(f"      ✅ OpenAI streaming successful: {chunk_count} chunks")
            else:
                print(f"      ⚠️ OpenAI streaming returned no chunks (API key issue?)")
                
        except Exception as e:
            if "401" in str(e) or "invalid" in str(e).lower():
                print(f"      ⚠️ OpenAI streaming failed: API key issue - {str(e)[:50]}...")
            else:
                print(f"      ❌ OpenAI streaming failed: {e}")
        
        # Test Grok streaming
        print("   Testing Grok streaming...")
        try:
            chunk_count = 0
            async for chunk in router._stream_from_grok(test_message):
                chunk_count += 1
                if chunk_count <= 3:  # Only show first few chunks
                    print(f"      Chunk {chunk_count}: {chunk[:50]}...")
                elif chunk_count == 4:
                    print(f"      ... and {chunk_count - 3} more chunks")
                    break
            
            if chunk_count > 0:
                print(f"      ✅ Grok streaming successful: {chunk_count} chunks")
            else:
                print(f"      ⚠️ Grok streaming returned no chunks")
                
        except Exception as e:
            print(f"      ❌ Grok streaming failed: {e}")
        
        print("\n🎉 Streaming test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_streaming())
    sys.exit(0 if success else 1)
