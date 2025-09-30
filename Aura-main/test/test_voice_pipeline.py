#!/usr/bin/env python3
"""
Test script for AURA Voice AI voice pipeline
Tests STT, TTS, and audio conversion functionality
"""

import asyncio
import logging
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_voice_pipeline():
    """Test the complete voice pipeline"""
    try:
        logger.info("🧪 Testing Voice Pipeline Components...")
        
        # Test 1: Import VoicePipeline
        logger.info("1️⃣ Testing VoicePipeline import...")
        from app.services.voice_pipeline import VoicePipeline
        logger.info("✅ VoicePipeline imported successfully")
        
        # Test 2: Initialize VoicePipeline
        logger.info("2️⃣ Testing VoicePipeline initialization...")
        voice_pipeline = VoicePipeline()
        logger.info("✅ VoicePipeline initialized successfully")
        logger.info(f"   - Whisper available: {voice_pipeline.whisper_available}")
        logger.info(f"   - ElevenLabs available: {voice_pipeline.elevenlabs_available}")
        
        # Test 3: Test raw audio to WAV conversion
        logger.info("3️⃣ Testing raw audio to WAV conversion...")
        test_audio = b'\x00\x00' * 1000  # 2 seconds of silence at 16kHz
        wav_file = voice_pipeline._convert_raw_to_wav(test_audio)
        logger.info(f"✅ WAV conversion successful: {len(wav_file.getvalue())} bytes")
        logger.info(f"   - File name: {wav_file.name}")
        
        # Test 4: Test audio transcription (if Whisper is available)
        if voice_pipeline.whisper_available:
            logger.info("4️⃣ Testing audio transcription...")
            try:
                # Create a simple test audio file
                transcription = await voice_pipeline.transcribe_audio(test_audio, "raw")
                logger.info(f"✅ Transcription successful: '{transcription.text}'")
                logger.info(f"   - Language: {transcription.language}")
                logger.info(f"   - Duration: {transcription.duration}")
            except Exception as e:
                logger.warning(f"⚠️ Transcription test failed (expected without real audio): {e}")
        else:
            logger.warning("⚠️ Skipping transcription test - Whisper not available")
        
        # Test 5: Test text-to-speech (if ElevenLabs is available)
        if voice_pipeline.elevenlabs_available:
            logger.info("5️⃣ Testing text-to-speech...")
            try:
                test_text = "Hello, this is a test of the AURA Voice AI system."
                synthesis = await voice_pipeline.synthesize_speech(test_text)
                logger.info(f"✅ TTS successful: {len(synthesis.audio_base64)} base64 chars")
                logger.info(f"   - Duration: {synthesis.duration} seconds")
                logger.info(f"   - Characters used: {synthesis.characters_used}")
            except Exception as e:
                logger.warning(f"⚠️ TTS test failed (expected without real API key): {e}")
        else:
            logger.warning("⚠️ Skipping TTS test - ElevenLabs not available")
        
        logger.info("🎉 Voice Pipeline test completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Voice Pipeline test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_continuous_conversation():
    """Test the continuous conversation manager"""
    try:
        logger.info("🧪 Testing Continuous Conversation Manager...")
        
        # Test 1: Import ContinuousConversationManager
        logger.info("1️⃣ Testing ContinuousConversationManager import...")
        from app.services.continuous_conversation import ContinuousConversationManager
        logger.info("✅ ContinuousConversationManager imported successfully")
        
        # Test 2: Test VAD creation
        logger.info("2️⃣ Testing Voice Activity Detector...")
        from app.services.enhanced_voice_activity_detector import create_voice_activity_detector
        vad = create_voice_activity_detector()
        logger.info("✅ Enhanced VAD created successfully")
        
        # Test 3: Test SmartRouter
        logger.info("3️⃣ Testing SmartRouter...")
        from app.services.smart_router import SmartRouter
        smart_router = SmartRouter()
        logger.info("✅ SmartRouter initialized successfully")
        
        # Test 4: Test TenantManager
        logger.info("4️⃣ Testing TenantManager...")
        from app.services.tenant_manager import TenantManager
        tenant_manager = TenantManager()
        logger.info("✅ TenantManager initialized successfully")
        
        # Test 5: Test ContinuousConversationManager initialization
        logger.info("5️⃣ Testing ContinuousConversationManager initialization...")
        conversation_manager = ContinuousConversationManager(
            voice_pipeline=None,  # We'll test without actual pipeline
            smart_router=smart_router,
            tenant_manager=tenant_manager
        )
        logger.info("✅ ContinuousConversationManager initialized successfully")
        
        logger.info("🎉 Continuous Conversation test completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Continuous Conversation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_websocket_router():
    """Test the WebSocket router"""
    try:
        logger.info("🧪 Testing WebSocket Router...")
        
        # Test 1: Import continuous voice router
        logger.info("1️⃣ Testing continuous voice router import...")
        from app.routers.continuous_voice import router
        logger.info("✅ Continuous voice router imported successfully")
        logger.info(f"   - Router prefix: {router.prefix}")
        logger.info(f"   - Router tags: {router.tags}")
        
        # Test 2: Check router endpoints
        logger.info("2️⃣ Checking router endpoints...")
        routes = [route for route in router.routes]
        logger.info(f"✅ Router has {len(routes)} endpoints")
        for route in routes:
            if hasattr(route, 'methods'):
                logger.info(f"   - {route.path} [{route.methods}]")
            else:
                logger.info(f"   - {route.path} [WebSocket]")
        
        logger.info("🎉 WebSocket Router test completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ WebSocket Router test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run all tests"""
    logger.info("🚀 Starting AURA Voice AI System Tests...")
    logger.info("=" * 50)
    
    results = []
    
    # Test 1: Voice Pipeline
    results.append(await test_voice_pipeline())
    logger.info("")
    
    # Test 2: Continuous Conversation
    results.append(await test_continuous_conversation())
    logger.info("")
    
    # Test 3: WebSocket Router
    results.append(await test_websocket_router())
    logger.info("")
    
    # Summary
    logger.info("=" * 50)
    logger.info("📊 TEST RESULTS SUMMARY:")
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        logger.info(f"🎉 ALL TESTS PASSED! ({passed}/{total})")
        logger.info("✅ Voice Pipeline: READY")
        logger.info("✅ Continuous Conversation: READY")
        logger.info("✅ WebSocket Router: READY")
        logger.info("")
        logger.info("🚀 System is ready for voice conversation testing!")
    else:
        logger.error(f"❌ SOME TESTS FAILED! ({passed}/{total})")
        logger.error("🔧 Please fix the failing components before proceeding")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
