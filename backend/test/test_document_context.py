#!/usr/bin/env python3
"""
Test script to verify document context is working in voice conversations
"""

import requests
import json
import base64
import tempfile
import wave
import pyaudio
import numpy as np

def create_test_audio(text="Can you tell me more about the document?"):
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

def test_voice_with_document_context():
    """Test voice processing with document context"""
    backend_url = "http://localhost:8000"
    
    print("🧪 Testing Voice Processing with Document Context")
    print("=" * 60)
    
    # Create test audio
    print("📝 Creating test audio...")
    audio_file = create_test_audio()
    
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
            if 'document' in response_text or 'content' in response_text:
                print("✅ Response appears to reference document content!")
            else:
                print("⚠️  Response doesn't seem to reference document content")
                
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

def test_chat_with_document_context():
    """Test chat processing with document context"""
    backend_url = "http://localhost:8000"
    
    print("\n🧪 Testing Chat Processing with Document Context")
    print("=" * 60)
    
    try:
        # Test chat with document context
        print("💬 Sending chat request with document context...")
        
        response = requests.post(
            f"{backend_url}/api/chat",
            json={
                "message": "Can you tell me more about the document?",
                "user_id": "test_user",
                "document_id": "default_document",
                "organization": "default_org"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Chat processing successful!")
            print(f"🤖 AI Response: {result.get('response', 'N/A')}")
            print(f"🔧 Model Used: {result.get('model_used', 'N/A')}")
            
            # Check if response contains document-specific information
            response_text = result.get('response', '').lower()
            if 'document' in response_text or 'content' in response_text:
                print("✅ Response appears to reference document content!")
            else:
                print("⚠️  Response doesn't seem to reference document content")
                
        else:
            print(f"❌ Chat processing failed: {response.status_code}")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_off_topic_question():
    """Test with an off-topic question to see if it redirects properly"""
    backend_url = "http://localhost:8000"
    
    print("\n🧪 Testing Off-Topic Question Handling")
    print("=" * 60)
    
    try:
        # Test with off-topic question
        print("💬 Sending off-topic question...")
        
        response = requests.post(
            f"{backend_url}/api/chat",
            json={
                "message": "What is the ocean?",
                "user_id": "test_user",
                "document_id": "default_document",
                "organization": "default_org"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Chat processing successful!")
            print(f"🤖 AI Response: {result.get('response', 'N/A')}")
            
            # Check if response redirects back to document
            response_text = result.get('response', '').lower()
            if 'document' in response_text or 'don\'t know' in response_text or 'can only' in response_text:
                print("✅ Response properly redirects to document content!")
            else:
                print("⚠️  Response doesn't seem to redirect properly")
                
        else:
            print(f"❌ Chat processing failed: {response.status_code}")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🚀 AURA Document Context Test")
    print("=" * 60)
    print("This test verifies that the AI uses document context properly")
    print("and redirects off-topic questions back to the document.")
    print()
    
    # Test chat with document context
    test_chat_with_document_context()
    
    # Test off-topic question
    test_off_topic_question()
    
    # Test voice with document context
    test_voice_with_document_context()
    
    print("\n🏁 Test completed!")
    print("=" * 60)
