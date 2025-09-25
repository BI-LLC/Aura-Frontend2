#!/usr/bin/env python3
"""
Simple text input with voice output
Bypasses Whisper transcription issues
"""

import requests
import base64
import pygame
import io
import json

pygame.mixer.init()

class TextToVoiceChat:
    def __init__(self):
        self.backend_url = "http://localhost:8000"
        self.session_id = None
        self.user_id = "text_voice_user"
        
    def chat_with_voice(self, message):
        """Send text message, get voice response"""
        
        print(f"\n💬 You: {message}")
        
        # Send to chat endpoint
        try:
            print(f"🔗 Sending to: {self.backend_url}/chat/")
            response = requests.post(
                f"{self.backend_url}/chat/",
                json={
                    "message": message,
                    "user_id": self.user_id,
                    "session_id": self.session_id,
                    "use_memory": True
                },
                timeout=30
            )
        except requests.exceptions.RequestException as e:
            print(f"❌ Connection error: {e}")
            return None
        
        print(f"📡 Response status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"📊 Response keys: {list(data.keys())}")
                
                # Update session
                self.session_id = data.get("session_id")
                
                # Print response
                model_used = data.get('model_used', 'unknown')
                response_text = data.get('response', 'No response')
                print(f"🤖 AURA ({model_used}): {response_text}")
                
                # Generate and play voice
                if response_text and response_text != 'No response':
                    self.speak(response_text)
                else:
                    print("⚠️ No response text to speak")
                
                return data
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                print(f"Raw response: {response.text[:500]}")
                return None
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Details: {error_data}")
            except:
                print(f"   Response: {response.text[:500]}")
            return None
    
    def speak(self, text):
        """Generate TTS and play immediately"""
        
        if not text:
            return
        
        print("🔊 Speaking...")
        
        # Limit text length for TTS
        text = text[:500]
        
        try:
            print(f"🔗 Sending TTS request to: {self.backend_url}/voice/synthesize")
            response = requests.post(
                f"{self.backend_url}/voice/synthesize",
                data={
                    "text": text,
                    "stability": 0.5,
                    "similarity_boost": 0.75
                },
                timeout=30
            )
        except requests.exceptions.RequestException as e:
            print(f"❌ TTS connection error: {e}")
            return
        
        print(f"📡 TTS Response status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"📊 TTS Response keys: {list(data.keys())}")
                
                if data.get("success") and data.get("audio"):
                    # Decode and play
                    audio_bytes = base64.b64decode(data["audio"])
                    print(f"🔊 Playing {len(audio_bytes)} bytes of audio")
                    
                    # Play with pygame (no file saving)
                    audio_io = io.BytesIO(audio_bytes)
                    pygame.mixer.music.load(audio_io)
                    pygame.mixer.music.play()
                    
                    # Wait for playback
                    while pygame.mixer.music.get_busy():
                        pygame.time.wait(100)
                    print("✅ Audio playback complete")
                else:
                    print("⚠️ TTS failed - no audio generated")
                    print(f"   Success: {data.get('success')}")
                    print(f"   Has audio: {bool(data.get('audio'))}")
            except json.JSONDecodeError as e:
                print(f"❌ TTS JSON decode error: {e}")
                print(f"Raw response: {response.text[:500]}")
        else:
            print(f"⚠️ TTS error: HTTP {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Details: {error_data}")
            except:
                print(f"   Response: {response.text[:500]}")
    
    def run(self):
        """Main conversation loop"""
        
        print("=" * 50)
        print("💬 AURA Text + Voice Chat")
        print("=" * 50)
        print("Type your message and hear AURA's voice response")
        print("Commands: 'quit' to exit, 'clear' to reset session")
        print("-" * 50)
        
        # Initial greeting
        self.speak("Hello! I'm AURA. Type your message and I'll respond with voice.")
        
        while True:
            try:
                user_input = input("\n💭 You: ").strip()
                
                if not user_input:
                    continue
                    
                if user_input.lower() == 'quit':
                    self.speak("Goodbye! Have a great day!")
                    break
                    
                if user_input.lower() == 'clear':
                    self.session_id = None
                    print("✅ Session cleared")
                    continue
                
                # Process message
                self.chat_with_voice(user_input)
                
            except KeyboardInterrupt:
                print("\n\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")


def test_backend_first():
    """Quick backend test"""
    try:
        response = requests.get("http://localhost:8000/health", timeout=2)
        data = response.json()
        
        print("✅ Backend Status:")
        print(f"   Overall: {data.get('status', 'unknown')}")
        print(f"   Voice: {data.get('voice', {})}")
        
        # Check if voice is configured
        voice_status = data.get('voice', {})
        if not voice_status.get('elevenlabs'):
            print("\n⚠️  ElevenLabs not configured!")
            print("   Voice responses won't work")
            print("   Add ELEVENLABS_API_KEY to your .env file")
            
        return True
        
    except Exception as e:
        print("❌ Backend not running!")
        print("   Start it with: cd backend && python -m app.main")
        return False


if __name__ == "__main__":
    print("\n🚀 AURA Text + Voice Chat")
    print("This version bypasses Whisper/transcription issues")
    print("-" * 50)
    
    if test_backend_first():
        chat = TextToVoiceChat()
        chat.run()
    else:
        print("\nPlease start the backend first")