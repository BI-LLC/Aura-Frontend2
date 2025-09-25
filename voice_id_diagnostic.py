#!/usr/bin/env python3
"""
ElevenLabs Voice ID Diagnostic Tool
Identifies connection and configuration issues with custom voice ID
"""

import os
import sys
import asyncio
import httpx
import json
from pathlib import Path

# Add the backend app directory to the path
sys.path.insert(0, str(Path(__file__).parent / "backend" / "app"))

async def diagnose_voice_id_issue():
    """Comprehensive diagnosis of ElevenLabs voice ID issues"""
    
    print("🔍 ELEVENLABS VOICE ID DIAGNOSTIC")
    print("=" * 50)
    
    # Step 1: Check environment variables
    print("\n1️⃣ CHECKING ENVIRONMENT VARIABLES...")
    
    elevenlabs_key = os.getenv("ELEVENLABS_API_KEY", "")
    elevenlabs_voice_id = os.getenv("ELEVENLABS_VOICE_ID", "")
    
    print(f"   ELEVENLABS_API_KEY: {'✓ Found' if elevenlabs_key else '❌ Missing'}")
    if elevenlabs_key:
        print(f"      Length: {len(elevenlabs_key)} characters")
        print(f"      Starts with: {elevenlabs_key[:10]}...")
    
    print(f"   ELEVENLABS_VOICE_ID: {'✓ Found' if elevenlabs_voice_id else '❌ Missing'}")
    if elevenlabs_voice_id:
        print(f"      Voice ID: {elevenlabs_voice_id}")
        print(f"      Length: {len(elevenlabs_voice_id)} characters")
    
    # Step 2: Check config loading
    print("\n2️⃣ CHECKING CONFIG LOADING...")
    
    try:
        from config import settings
        print("   ✓ Config module loaded successfully")
        
        config_voice_id = getattr(settings, 'ELEVENLABS_VOICE_ID', '')
        config_api_key = getattr(settings, 'ELEVENLABS_API_KEY', '')
        
        print(f"   Config ELEVENLABS_API_KEY: {'✓ Found' if config_api_key else '❌ Missing'}")
        print(f"   Config ELEVENLABS_VOICE_ID: {'✓ Found' if config_voice_id else '❌ Missing'}")
        
        if config_voice_id:
            print(f"      Config Voice ID: {config_voice_id}")
            
    except Exception as e:
        print(f"   ❌ Config loading failed: {e}")
        return False
    
    # Step 3: Test API connectivity
    print("\n3️⃣ TESTING ELEVENLABS API CONNECTIVITY...")
    
    if not elevenlabs_key:
        print("   ❌ Cannot test API - no API key found")
        return False
    
    try:
        # Test basic API connection
        url = "https://api.elevenlabs.io/v1/voices"
        headers = {"xi-api-key": elevenlabs_key}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                print("   ✓ ElevenLabs API connection successful")
                
                # Get available voices
                data = response.json()
                voices = data.get('voices', [])
                print(f"   Found {len(voices)} available voices")
                
                # Check if our voice ID exists
                if elevenlabs_voice_id:
                    voice_found = False
                    for voice in voices:
                        if voice.get('voice_id') == elevenlabs_voice_id:
                            voice_found = True
                            print(f"   ✓ Custom voice ID found: {voice.get('name', 'Unknown')}")
                            print(f"      Category: {voice.get('category', 'Unknown')}")
                            break
                    
                    if not voice_found:
                        print(f"   ❌ Custom voice ID '{elevenlabs_voice_id}' NOT FOUND in available voices")
                        print("   Available voice IDs:")
                        for voice in voices[:5]:  # Show first 5
                            print(f"      - {voice.get('voice_id')} ({voice.get('name', 'Unknown')})")
                
            elif response.status_code == 401:
                print("   ❌ API key invalid or unauthorized")
                return False
            else:
                print(f"   ❌ API error: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        print(f"   ❌ API connection failed: {e}")
        return False
    
    # Step 4: Test voice pipeline initialization
    print("\n4️⃣ TESTING VOICE PIPELINE INITIALIZATION...")
    
    try:
        from services.voice_pipeline import VoicePipeline
        
        vp = VoicePipeline()
        print(f"   Voice pipeline initialized successfully")
        print(f"   ElevenLabs available: {vp.elevenlabs_available}")
        print(f"   Configured voice ID: {vp.elevenlabs_voice_id}")
        
        if vp.elevenlabs_available:
            print("   ✓ Voice pipeline ready for TTS")
        else:
            print("   ❌ Voice pipeline not properly configured")
            return False
            
    except Exception as e:
        print(f"   ❌ Voice pipeline initialization failed: {e}")
        return False
    
    # Step 5: Test actual TTS with custom voice
    print("\n5️⃣ TESTING TEXT-TO-SPEECH WITH CUSTOM VOICE...")
    
    try:
        test_text = "Hello, this is a test of your custom voice."
        
        result = await vp.synthesize_speech(
            text=test_text,
            voice_id=elevenlabs_voice_id or None
        )
        
        if result.audio_base64:
            print("   ✓ TTS generation successful")
            print(f"   Audio generated: {len(result.audio_base64)} characters (base64)")
            print(f"   Duration: {result.duration:.2f} seconds")
            print(f"   Characters used: {result.characters_used}")
        else:
            print("   ❌ TTS generation failed - no audio returned")
            return False
            
    except Exception as e:
        print(f"   ❌ TTS test failed: {e}")
        return False
    
    # Step 6: Check .env file
    print("\n6️⃣ CHECKING .ENV FILE CONFIGURATION...")
    
    env_files = [
        ".env",
        "backend/.env",
        "Aura-main/.env",
        "Aura-main/backend/.env"
    ]
    
    env_found = False
    for env_file in env_files:
        if Path(env_file).exists():
            env_found = True
            print(f"   ✓ Found .env file: {env_file}")
            
            # Read and check .env content
            with open(env_file, 'r') as f:
                content = f.read()
                
            has_api_key = "ELEVENLABS_API_KEY" in content
            has_voice_id = "ELEVENLABS_VOICE_ID" in content
            
            print(f"   Contains ELEVENLABS_API_KEY: {'✓' if has_api_key else '❌'}")
            print(f"   Contains ELEVENLABS_VOICE_ID: {'✓' if has_voice_id else '❌'}")
            
            if has_voice_id:
                # Extract voice ID from .env
                for line in content.split('\n'):
                    if line.startswith('ELEVENLABS_VOICE_ID='):
                        env_voice_id = line.split('=', 1)[1].strip().strip('"\'')
                        print(f"   Voice ID in .env: {env_voice_id}")
                        break
            break
    
    if not env_found:
        print("   ❌ No .env file found in expected locations")
        print("   Expected locations:")
        for env_file in env_files:
            print(f"      - {env_file}")
    
    print("\n" + "=" * 50)
    print("🎯 DIAGNOSIS COMPLETE")
    print("=" * 50)
    
    return True

async def main():
    """Main diagnostic function"""
    
    # Check if we're in the right directory
    if not Path("backend").exists():
        print("❌ Please run this script from the Aura-main directory")
        print("   Current directory:", os.getcwd())
        return
    
    await diagnose_voice_id_issue()
    
    print("\n🔧 COMMON SOLUTIONS:")
    print("1. Create/update .env file with:")
    print("   ELEVENLABS_API_KEY=your_api_key_here")
    print("   ELEVENLABS_VOICE_ID=your_custom_voice_id_here")
    print()
    print("2. Verify voice ID exists in your ElevenLabs account")
    print("3. Check API key permissions")
    print("4. Restart the backend server after updating .env")
    print()
    print("5. Test with: python test/test_voice.py")

if __name__ == "__main__":
    asyncio.run(main())
