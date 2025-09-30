#!/usr/bin/env python3
"""
Test script to verify API keys are working correctly
"""

import asyncio
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

async def test_api_keys():
    """Test if API keys are working"""
    print("🔑 Testing API Keys...")
    print("=" * 40)
    
    try:
        # Test 1: Check config loading
        print("1️⃣ Testing config loading...")
        from app.config import settings
        
        print(f"   OpenAI key: {'✓' if settings.OPENAI_API_KEY else '✗'}")
        if settings.OPENAI_API_KEY:
            print(f"      Length: {len(settings.OPENAI_API_KEY)}")
            print(f"      Starts with: {settings.OPENAI_API_KEY[:10]}...")
        
        print(f"   ElevenLabs key: {'✓' if settings.ELEVENLABS_API_KEY else '✗'}")
        if settings.ELEVENLABS_API_KEY:
            print(f"      Length: {len(settings.ELEVENLABS_API_KEY)}")
            print(f"      Starts with: {settings.ELEVENLABS_API_KEY[:10]}...")
        
        print(f"   Grok key: {'✓' if settings.GROK_API_KEY else '✗'}")
        if settings.GROK_API_KEY:
            print(f"      Length: {len(settings.GROK_API_KEY)}")
            print(f"      Starts with: {settings.GROK_API_KEY[:10]}...")
        
        # Test 2: Test VoicePipeline
        print("\n2️⃣ Testing VoicePipeline...")
        from app.services.voice_pipeline import VoicePipeline
        
        vp = VoicePipeline()
        print(f"   Whisper available: {vp.whisper_available}")
        print(f"   ElevenLabs available: {vp.elevenlabs_available}")
        
        # Test 3: Test actual API calls
        print("\n3️⃣ Testing actual API calls...")
        
        # Test ElevenLabs TTS (we know this works)
        print("   Testing ElevenLabs TTS...")
        try:
            test_text = "Hello, this is a test."
            result = await vp.synthesize_speech(test_text)
            print(f"      ✅ TTS successful: {len(result.audio_base64)} chars")
            print(f"      Duration: {result.duration} seconds")
        except Exception as e:
            print(f"      ❌ TTS failed: {e}")
        
        # Test OpenAI Whisper (this was failing before)
        print("   Testing OpenAI Whisper...")
        try:
            # Create a simple test audio (silence)
            test_audio = b'\x00\x00' * 1000  # 1 second of silence
            result = await vp.transcribe_audio(test_audio, "raw")
            if result.text:
                print(f"      ✅ Whisper successful: '{result.text}'")
            else:
                print(f"      ⚠️ Whisper returned empty text (expected for silence)")
        except Exception as e:
            print(f"      ❌ Whisper failed: {e}")
            if "401" in str(e):
                print("      💡 This suggests the API key is invalid or expired")
            elif "rate limit" in str(e).lower():
                print("      💡 This suggests rate limiting - key is valid!")
        
        print("\n🎉 API key test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_api_keys())
    sys.exit(0 if success else 1)
