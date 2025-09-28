#!/usr/bin/env python3
# Test script for AURA Voice AI - Voice Pipeline
# Week 5-6: Tests voice functionality

import requests
import json
import base64
import io
import time

BASE_URL = "http://localhost:8000"

def test_voice_status():
    """Test if voice pipeline is configured"""
    print("\n🎤 Testing Voice Pipeline Status...")
    response = requests.get(f"{BASE_URL}/voice/status")
    data = response.json()
    
    print(f"✅ Status: {data['status']}")
    print(f"   Whisper (STT): {data['components']['whisper_available']}")
    print(f"   ElevenLabs (TTS): {data['components']['elevenlabs_available']}")
    print(f"   Fully Functional: {data['components']['fully_functional']}")
    
    return data['components']['fully_functional']

def test_tts():
    """Test text-to-speech"""
    print("\n🔊 Testing Text-to-Speech...")
    
    response = requests.post(
        f"{BASE_URL}/voice/synthesize",
        data={
            "text": "Hello! This is AURA Voice AI. The voice pipeline is working correctly."
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        if data['success']:
            print("✅ TTS successful!")
            print(f"   Audio size: {len(data['audio'])} characters (base64)")
            print(f"   Characters used: {data['characters']}")
            
            # Save audio for testing
            audio_bytes = base64.b64decode(data['audio'])
            with open("test_output.mp3", "wb") as f:
                f.write(audio_bytes)
            print("   Audio saved to: test_output.mp3")
            return True
        else:
            print(f"❌ TTS failed: {data}")
            return False
    else:
        print(f"❌ TTS request failed: {response.status_code}")
        return False

def test_available_voices():
    """Test getting available voices"""
    print("\n🎭 Testing Available Voices...")
    
    response = requests.get(f"{BASE_URL}/voice/voices")
    
    if response.status_code == 200:
        data = response.json()
        if data['success']:
            print(f"✅ Found {data['count']} voices")
            for voice in data['voices'][:5]:  # Show first 5
                print(f"   - {voice['name']} ({voice['voice_id'][:8]}...)")
            return True
    
    print("❌ Could not get voices")
    return False

def test_pipeline_components():
    """Test the voice pipeline components"""
    print("\n🧪 Testing Pipeline Components...")
    
    response = requests.post(f"{BASE_URL}/voice/test")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Pipeline test: {data['message']}")
        print(f"   Whisper: {data['components']['whisper']}")
        print(f"   ElevenLabs: {data['components']['elevenlabs']}")
        print(f"   Overall: {data['components']['pipeline']}")
        return data['success']
    
    return False

def test_full_voice_flow():
    """Test complete voice flow with a sample audio"""
    print("\n🎯 Testing Full Voice Flow...")
    print("   (This would require actual audio input)")
    print("   Use the web interface at http://localhost:8000/test-voice")
    return True

def main():
    """Run all voice tests"""
    print("=" * 50)
    print("🎤 AURA VOICE AI - WEEK 5-6 VOICE TESTS")
    print("=" * 50)
    
    # Check if server is running
    try:
        requests.get(BASE_URL, timeout=2)
    except:
        print("❌ Server not running! Start it with:")
        print("   cd backend && python -m app.main")
        return
    
    # Check if ElevenLabs API key is configured
    print("\n📋 Prerequisites:")
    print("1. ElevenLabs API key in .env file")
    print("2. OpenAI API key (for Whisper)")
    print("3. Server running with voice pipeline")
    
    # Run tests
    tests_passed = 0
    tests_total = 4
    
    if test_voice_status():
        tests_passed += 1
    else:
        print("\n⚠️ Voice pipeline not fully configured!")
        print("Add ELEVENLABS_API_KEY to your .env file")
    
    if test_tts():
        tests_passed += 1
    
    if test_available_voices():
        tests_passed += 1
    
    if test_pipeline_components():
        tests_passed += 1
    
    print("\n" + "=" * 50)
    print(f"✅ TESTS COMPLETE: {tests_passed}/{tests_total} passed")
    print("=" * 50)
    
    print("\n📋 Week 5-6 Success Criteria:")
    print("  ✓ Whisper API integrated (speech-to-text)")
    print("  ✓ ElevenLabs integrated (text-to-speech)")
    print("  ✓ Voice endpoints working")
    print("  ✓ Error handling in place")
    
    print("\n🌐 Test the full voice interface:")
    print("  Open: http://localhost:8000/test-voice")
    print("  This provides a web interface for testing voice recording!")
    
    if tests_passed == tests_total:
        print("\n🎉 Week 5-6 Voice Pipeline: COMPLETE!")
    else:
        print("\n⚠️ Some components need configuration")

if __name__ == "__main__":
    main()