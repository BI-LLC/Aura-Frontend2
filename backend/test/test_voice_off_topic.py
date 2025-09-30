#!/usr/bin/env python3
"""
Test voice endpoint for off-topic redirection
"""

import requests
import base64
import tempfile
import wave
import numpy as np

def create_test_audio(text="What is the ocean?"):
    """Create a simple test audio file"""
    # Create a simple sine wave as test audio
    sample_rate = 16000
    duration = 2  # seconds
    frequency = 440  # Hz
    
    # Generate sine wave
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    audio_data = np.sin(2 * np.pi * frequency * t) * 0.3
    
    # Convert to 16-bit integers
    audio_data = (audio_data * 32767).astype(np.int16)
    
    # Save as WAV file
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
        with wave.open(tmp_file.name, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_data.tobytes())
        return tmp_file.name

def test_voice_off_topic():
    """Test voice endpoint with off-topic question"""
    backend_url = "http://localhost:8000"
    
    print("🧪 Testing Voice Endpoint - Off-Topic Question")
    print("=" * 60)
    
    # Create test audio
    print("📝 Creating test audio...")
    audio_file = create_test_audio("What is the ocean?")
    
    try:
        # Test voice processing with document context
        print("🎤 Sending voice request with document context...")
        
        with open(audio_file, 'rb') as f:
            response = requests.post(
                f"{backend_url}/voice/process",
                files={'audio': ('test.wav', f, 'audio/wav')},
                data={
                    'user_id': 'test_user',
                    'document_id': 'default_document',
                    'organization': 'default_org'
                },
                timeout=30
            )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Voice processing successful!")
            print(f"📝 Transcription: {result.get('transcription', 'N/A')}")
            print(f"🤖 AI Response: {result.get('response', 'N/A')}")
            print(f"🔧 Model Used: {result.get('model_used', 'N/A')}")
            
            # Check if response redirects properly
            response_text = result.get('response', '').lower()
            redirect_indicators = [
                'document content provided',
                'can only answer',
                'not in the document',
                'ask me something about the document',
                'don\'t know that information from the document'
            ]
            
            found_redirect = any(indicator in response_text for indicator in redirect_indicators)
            
            if found_redirect:
                print("✅ Response properly redirects to document content!")
            else:
                print("⚠️  Response doesn't redirect properly")
                print("🔍 Looking for redirect indicators...")
                for indicator in redirect_indicators:
                    if indicator in response_text:
                        print(f"   ✅ Found: '{indicator}'")
                    else:
                        print(f"   ❌ Missing: '{indicator}'")
                
        else:
            print(f"❌ Voice processing failed: {response.status_code}")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        # Clean up
        import os
        if os.path.exists(audio_file):
            os.remove(audio_file)

def test_voice_document_question():
    """Test voice endpoint with document-specific question"""
    backend_url = "http://localhost:8000"
    
    print("\n🧪 Testing Voice Endpoint - Document Question")
    print("=" * 60)
    
    # Create test audio
    print("📝 Creating test audio...")
    audio_file = create_test_audio("What is nepotism protocol?")
    
    try:
        # Test voice processing with document context
        print("🎤 Sending voice request with document context...")
        
        with open(audio_file, 'rb') as f:
            response = requests.post(
                f"{backend_url}/voice/process",
                files={'audio': ('test.wav', f, 'audio/wav')},
                data={
                    'user_id': 'test_user',
                    'document_id': 'default_document',
                    'organization': 'default_org'
                },
                timeout=30
            )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Voice processing successful!")
            print(f"📝 Transcription: {result.get('transcription', 'N/A')}")
            print(f"🤖 AI Response: {result.get('response', 'N/A')}")
            print(f"🔧 Model Used: {result.get('model_used', 'N/A')}")
            
            # Check if response contains document-specific information
            response_text = result.get('response', '').lower()
            if 'nepotism' in response_text or 'protocol' in response_text or 'conflict' in response_text:
                print("✅ Response contains document-specific content!")
            else:
                print("⚠️  Response doesn't contain document-specific content")
                
        else:
            print(f"❌ Voice processing failed: {response.status_code}")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        # Clean up
        import os
        if os.path.exists(audio_file):
            os.remove(audio_file)

if __name__ == "__main__":
    print("🚀 AURA Voice Endpoint Off-Topic Test")
    print("=" * 60)
    
    # Test document-specific question first
    test_voice_document_question()
    
    # Test off-topic question
    test_voice_off_topic()
    
    print("\n🏁 Voice endpoint test completed!")
    print("=" * 60)
