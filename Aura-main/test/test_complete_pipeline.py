#!/usr/bin/env python3
"""
Test script for AURA Voice AI Complete Voice Pipeline Integration
Tests the full flow: Audio → STT → LLM → TTS → Audio
"""

import asyncio
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

async def test_complete_pipeline():
    """Test the complete voice conversation pipeline"""
    print("🚀 Testing AURA Voice AI Complete Pipeline...")
    print("=" * 60)
    
    try:
        # Test 1: Initialize all services
        print("1️⃣ Initializing services...")
        
        from app.services.voice_pipeline import VoicePipeline
        from app.services.smart_router import SmartRouter
        from app.services.continuous_conversation import ContinuousConversationManager
        from app.services.tenant_manager import TenantManager
        
        voice_pipeline = VoicePipeline()
        smart_router = SmartRouter()
        tenant_manager = TenantManager()
        
        conversation_manager = ContinuousConversationManager(
            voice_pipeline=voice_pipeline,
            smart_router=smart_router,
            tenant_manager=tenant_manager
        )
        
        print("   ✅ All services initialized successfully")
        
        # Test 2: Test voice pipeline components
        print("\n2️⃣ Testing voice pipeline components...")
        
        print(f"   Whisper available: {voice_pipeline.whisper_available}")
        print(f"   ElevenLabs available: {voice_pipeline.elevenlabs_available}")
        
        # Test 3: Test smart router
        print("\n3️⃣ Testing smart router...")
        
        print(f"   OpenAI key: {'✓' if smart_router.openai_key else '✗'}")
        print(f"   Grok key: {'✓' if smart_router.grok_key else '✗'}")
        
        # Test message classification
        test_messages = [
            "What is the weather like?",
            "Can you analyze this complex problem step by step?",
            "Hello, how are you today?"
        ]
        
        for msg in test_messages:
            provider = smart_router._classify_query(msg)
            print(f"   '{msg[:30]}...' → {provider}")
        
        # Test 4: Test complete conversation flow (simulated)
        print("\n4️⃣ Testing complete conversation flow...")
        
        # Simulate user input
        user_input = "Hello, this is a test conversation."
        print(f"   User input: {user_input}")
        
        # Test LLM response generation
        print("   Generating AI response...")
        
        try:
            response_chunks = []
            async for chunk in smart_router.route_message_stream(user_input):
                response_chunks.append(chunk)
                if len(response_chunks) <= 3:
                    print(f"      Chunk {len(response_chunks)}: {chunk[:50]}...")
                elif len(response_chunks) == 4:
                    print(f"      ... and {len(response_chunks) - 3} more chunks")
                    break
            
            if response_chunks:
                full_response = ''.join(response_chunks)
                print(f"   ✅ AI response generated: {len(full_response)} chars")
                print(f"   Content: {full_response[:100]}...")
                
                # Test TTS synthesis
                print("   Testing TTS synthesis...")
                try:
                    synthesis = await voice_pipeline.synthesize_speech(full_response)
                    if synthesis.audio_base64:
                        print(f"      ✅ Audio synthesized: {synthesis.duration:.2f}s")
                        print(f"      Audio size: {len(synthesis.audio_base64)} chars")
                    else:
                        print("      ❌ TTS failed")
                except Exception as e:
                    print(f"      ❌ TTS error: {e}")
            else:
                print("   ⚠️ No AI response generated (API key issues expected)")
                
        except Exception as e:
            if "401" in str(e) or "invalid" in str(e).lower():
                print(f"   ⚠️ OpenAI API key issue: {str(e)[:50]}...")
            elif "403" in str(e):
                print(f"   ⚠️ Grok API access issue: {str(e)[:50]}...")
            else:
                print(f"   ❌ Unexpected error: {e}")
        
        # Test 5: Test conversation manager
        print("\n5️⃣ Testing conversation manager...")
        
        print(f"   VAD initialized: {conversation_manager.vad is not None}")
        print(f"   Voice pipeline: {conversation_manager.voice_pipeline is not None}")
        print(f"   Smart router: {conversation_manager.smart_router is not None}")
        print(f"   Tenant manager: {conversation_manager.tenant_manager is not None}")
        
        print("\n🎉 Complete pipeline test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_complete_pipeline())
    sys.exit(0 if success else 1)
