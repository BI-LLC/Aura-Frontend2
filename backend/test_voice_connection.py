#!/usr/bin/env python3
"""
Simple test to verify ElevenLabs voice connection
"""

import asyncio
import httpx
import base64
import os
from pathlib import Path

async def test_elevenlabs_connection():
    """Test direct connection to ElevenLabs API"""
    
    print("🎤 TESTING ELEVENLABS CONNECTION")
    print("=" * 40)
    
    # Load from .env file
    from dotenv import load_dotenv
    load_dotenv()
    
    api_key = os.getenv("ELEVENLABS_API_KEY")
    voice_id = os.getenv("ELEVENLABS_VOICE_ID")
    
    print(f"API Key: {'✓ Found' if api_key else '❌ Missing'}")
    print(f"Voice ID: {voice_id if voice_id else '❌ Missing'}")
    
    if not api_key or not voice_id:
        print("❌ Missing API key or voice ID")
        return False
    
    # Test 1: Check if voice exists
    print("\n1️⃣ Checking if voice exists...")
    
    try:
        url = "https://api.elevenlabs.io/v1/voices"
        headers = {"xi-api-key": api_key}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                voices = data.get('voices', [])
                
                voice_found = False
                for voice in voices:
                    if voice.get('voice_id') == voice_id:
                        voice_found = True
                        print(f"✅ Voice found: {voice.get('name', 'Unknown')}")
                        print(f"   Category: {voice.get('category', 'Unknown')}")
                        break
                
                if not voice_found:
                    print(f"❌ Voice ID '{voice_id}' not found in your account")
                    print("Available voices:")
                    for voice in voices[:3]:
                        print(f"   - {voice.get('voice_id')} ({voice.get('name', 'Unknown')})")
                    return False
                    
            else:
                print(f"❌ API error: {response.status_code}")
                return False
                
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False
    
    # Test 2: Generate speech
    print("\n2️⃣ Testing speech generation...")
    
    try:
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": api_key
        }
        
        data = {
            "text": "Hello! This is a test of your custom voice. If you can hear this, everything is working perfectly!",
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=data, headers=headers, timeout=30)
            
            if response.status_code == 200:
                audio_data = response.content
                print(f"✅ Speech generated successfully!")
                print(f"   Audio size: {len(audio_data)} bytes")
                
                # Save audio file
                with open("test_custom_voice.mp3", "wb") as f:
                    f.write(audio_data)
                
                print("   📁 Saved as: test_custom_voice.mp3")
                print("   🔊 Play this file to hear your custom voice!")
                
                return True
            else:
                print(f"❌ Speech generation failed: {response.status_code}")
                print(f"   Error: {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ Speech generation error: {e}")
        return False

async def main():
    """Main test function"""
    
    success = await test_elevenlabs_connection()
    
    if success:
        print("\n🎉 SUCCESS! Your custom voice is working!")
        print("\nThe issue might be in the backend application setup.")
        print("Try:")
        print("1. python app/main.py")
        print("2. Check http://localhost:8000/voice/status")
        print("3. Test voice at http://localhost:8000/test")
    else:
        print("\n❌ Voice test failed")
        print("Check your API key and voice ID in the .env file")

if __name__ == "__main__":
    asyncio.run(main())
