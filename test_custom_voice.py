#!/usr/bin/env python3
"""
Test script to verify your custom ElevenLabs voice ID is working
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the backend app directory to the path
sys.path.insert(0, str(Path(__file__).parent / "backend" / "app"))

async def test_custom_voice():
    """Test the custom voice ID"""
    
    print("🎤 TESTING YOUR CUSTOM ELEVENLABS VOICE")
    print("=" * 50)
    
    # Load the voice pipeline with proper config
    from services.voice_pipeline import VoicePipeline
    
    print("1️⃣ Initializing Voice Pipeline...")
    vp = VoicePipeline()
    
    print(f"   ElevenLabs available: {vp.elevenlabs_available}")
    print(f"   Your custom voice ID: {vp.elevenlabs_voice_id}")
    
    if not vp.elevenlabs_available:
        print("   ❌ ElevenLabs not available - check API key")
        return False
    
    print("\n2️⃣ Testing Text-to-Speech with your custom voice...")
    
    test_text = "Hello! This is a test of your custom voice. If you can hear this, your voice ID is working perfectly!"
    
    try:
        result = await vp.synthesize_speech(test_text)
        
        if result.audio_base64:
            print("   ✅ SUCCESS! Your custom voice is working!")
            print(f"   Audio generated: {len(result.audio_base64)} characters")
            print(f"   Duration: {result.duration:.2f} seconds")
            
            # Save the audio to a file for testing
            import base64
            audio_data = base64.b64decode(result.audio_base64)
            
            with open("test_voice_output.mp3", "wb") as f:
                f.write(audio_data)
            
            print("   📁 Audio saved as: test_voice_output.mp3")
            print("   🔊 Play this file to hear your custom voice!")
            
            return True
        else:
            print("   ❌ No audio generated")
            return False
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

async def main():
    """Main test function"""
    
    if not Path("backend").exists():
        print("❌ Please run from Aura-main directory")
        return
    
    success = await test_custom_voice()
    
    if success:
        print("\n🎉 YOUR CUSTOM VOICE IS WORKING!")
        print("The issue might be in the frontend connection or WebSocket setup.")
        print("\nNext steps:")
        print("1. Start the backend: cd backend && python app/main.py")
        print("2. Test the voice interface at: http://localhost:8000/test")
        print("3. Check browser console for WebSocket errors")
    else:
        print("\n❌ Voice test failed")
        print("Check your ElevenLabs API key and voice ID")

if __name__ == "__main__":
    asyncio.run(main())
