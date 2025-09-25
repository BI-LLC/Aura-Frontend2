#!/usr/bin/env python3
"""
Real-time conversation test for AURA Voice AI
Uses your existing backend with OpenAI Whisper + ElevenLabs
"""

import pyaudio
import wave
import requests
import base64
import io
import time
import threading
import queue
import json
from datetime import datetime
import tempfile
import os

# For playing audio
try:
    import pygame
    pygame.mixer.init()
    USE_PYGAME = True
except:
    USE_PYGAME = False
    print("Install pygame for better audio playback: pip install pygame")

class AuraConversation:
    def __init__(self, backend_url="http://localhost:8000"):
        """Initialize AURA conversation client"""
        self.backend_url = backend_url
        self.is_recording = False
        self.audio_queue = queue.Queue()
        
        # Audio settings
        self.chunk = 1024
        self.format = pyaudio.paInt16
        self.channels = 1
        self.rate = 16000
        self.silence_threshold = 500  # Adjust based on your environment
        self.silence_duration = 1.5  # Seconds of silence to stop recording
        
        # Session management
        self.user_id = "test_user_realtime"
        self.session_id = None
        
        # Initialize PyAudio
        self.audio = pyaudio.PyAudio()
        
        # Check backend health
        self.check_backend()
        
        print("🎤 AURA Real-time Conversation Ready!")
        print("-" * 50)
        
    def check_backend(self):
        """Check if backend is running and configured"""
        try:
            response = requests.get(f"{self.backend_url}/health")
            data = response.json()
            
            print("✅ Backend Status:")
            print(f"   Voice Pipeline: {'Ready' if data.get('voice', {}).get('functional') else 'Not configured'}")
            print(f"   Memory System: {data.get('memory', 'unknown')}")
            print(f"   APIs: {data.get('healthy_apis', 'unknown')}")
            
            if not data.get('voice', {}).get('functional'):
                print("\n⚠️  Voice pipeline not fully configured!")
                print("   Make sure ELEVENLABS_API_KEY is in your .env file")
            
        except Exception as e:
            print(f"❌ Backend not running! Start it with: python -m app.main")
            exit(1)
    
    def is_silent(self, data_chunk):
        """Check if audio chunk is silent"""
        # Convert byte data to integers
        import array
        data = array.array('h', data_chunk)
        
        # Calculate RMS (Root Mean Square)
        if len(data) == 0:
            return True
            
        rms = sum(abs(sample) for sample in data) / len(data)
        return rms < self.silence_threshold
    
    def record_audio(self):
        """Record audio until silence is detected"""
        print("\n🎤 Listening... (speak now)")
        
        stream = self.audio.open(
            format=self.format,
            channels=self.channels,
            rate=self.rate,
            input=True,
            frames_per_buffer=self.chunk
        )
        
        frames = []
        silent_chunks = 0
        recording = False
        
        while True:
            try:
                data = stream.read(self.chunk, exception_on_overflow=False)
                
                if not self.is_silent(data):
                    recording = True
                    silent_chunks = 0
                    frames.append(data)
                elif recording:
                    frames.append(data)
                    silent_chunks += 1
                    
                    # Stop if silence for too long
                    silence_time = (silent_chunks * self.chunk) / self.rate
                    if silence_time > self.silence_duration:
                        break
                        
            except KeyboardInterrupt:
                break
        
        stream.stop_stream()
        stream.close()
        
        if frames:
            print("   Recording complete!")
            return b''.join(frames)
        return None
    
    def save_audio_to_wav(self, audio_data):
        """Convert raw audio to WAV format"""
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            wf = wave.open(tmp_file.name, 'wb')
            wf.setnchannels(self.channels)
            wf.setsampwidth(self.audio.get_sample_size(self.format))
            wf.setframerate(self.rate)
            wf.writeframes(audio_data)
            wf.close()
            return tmp_file.name
    
    def process_with_backend(self, audio_data):
        """Send audio to AURA backend for processing"""
        print("🤖 Processing with AURA...")
        
        # Save audio to temporary WAV file
        wav_file = self.save_audio_to_wav(audio_data)
        
        try:
            # Send to backend /voice/process endpoint
            with open(wav_file, 'rb') as f:
                files = {'audio': ('audio.wav', f, 'audio/wav')}
                data = {
                    'user_id': self.user_id,
                    'session_id': self.session_id or '',
                    'use_memory': 'true',
                    'document_id': 'default_document',  # Use default document
                    'organization': 'default_org'
                }
                
                response = requests.post(
                    f"{self.backend_url}/voice/process",
                    files=files,
                    data=data,
                    timeout=30
                )
            
            if response.status_code == 200:
                result = response.json()
                
                # Update session ID
                if result.get('session_id'):
                    self.session_id = result['session_id']
                
                # Display results
                print(f"\n👤 You said: {result.get('transcription', 'N/A')}")
                print(f"\n🤖 AURA ({result.get('model_used', 'AI')}): {result.get('response', 'N/A')}")
                
                # Play audio response
                if result.get('audio'):
                    self.play_audio(result['audio'])
                
                return result
            else:
                print(f"❌ Backend error: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ Error processing: {e}")
            return None
        finally:
            # Clean up temp file
            if os.path.exists(wav_file):
                os.remove(wav_file)
    
    def play_audio(self, audio_base64):
        """Play audio response"""
        try:
            # Decode base64 audio
            audio_bytes = base64.b64decode(audio_base64)
            
            if USE_PYGAME:
                # Use pygame for playback
                with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp_file:
                    tmp_file.write(audio_bytes)
                    tmp_file.flush()
                    
                    pygame.mixer.music.load(tmp_file.name)
                    pygame.mixer.music.play()
                    
                    # Wait for playback to complete
                    while pygame.mixer.music.get_busy():
                        time.sleep(0.1)
                    
                    os.remove(tmp_file.name)
            else:
                # Fallback: save and use system player
                with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp_file:
                    tmp_file.write(audio_bytes)
                    tmp_file.flush()
                    
                    # Try different players based on OS
                    import platform
                    system = platform.system()
                    
                    if system == "Darwin":  # macOS
                        os.system(f"afplay {tmp_file.name}")
                    elif system == "Windows":
                        os.system(f"start {tmp_file.name}")
                    else:  # Linux
                        os.system(f"mpg123 {tmp_file.name} 2>/dev/null || ffplay -nodisp -autoexit {tmp_file.name} 2>/dev/null")
                    
                    os.remove(tmp_file.name)
                    
        except Exception as e:
            print(f"⚠️  Could not play audio: {e}")
    
    def send_text_message(self, text):
        """Send a text message to the backend"""
        print(f"\n💬 Sending: {text}")
        
        try:
            response = requests.post(
                f"{self.backend_url}/api/chat",
                json={
                    "message": text,
                    "user_id": self.user_id,
                    "session_id": self.session_id,
                    "use_memory": True,
                    "document_id": "default_document",
                    "organization": "default_org"
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Update session ID
                if result.get('session_id'):
                    self.session_id = result['session_id']
                
                print(f"\n🤖 AURA ({result.get('model_used', 'AI')}): {result.get('response', 'N/A')}")
                
                # Now generate TTS for the response
                self.generate_tts(result.get('response', ''))
                
                return result
            else:
                print(f"❌ Error: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return None
    
    def generate_tts(self, text):
        """Generate and play TTS for text"""
        if not text:
            return
            
        try:
            response = requests.post(
                f"{self.backend_url}/voice/synthesize",
                data={
                    "text": text,
                    "stability": 0.5,
                    "similarity_boost": 0.75
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('audio'):
                    self.play_audio(result['audio'])
                    
        except Exception as e:
            print(f"⚠️  TTS failed: {e}")
    
    def start_conversation(self):
        """Start the conversation loop"""
        print("\n" + "=" * 50)
        print("🎙️  AURA REAL-TIME CONVERSATION")
        print("=" * 50)
        print("\nCommands:")
        print("  - Press Enter to start recording")
        print("  - Type 'text:' followed by message for text input")
        print("  - Type 'quit' to exit")
        print("  - Type 'clear' to reset session")
        print("-" * 50)
        
        # Initial greeting
        greeting = "Hello! I'm AURA, your AI assistant. How can I help you today?"
        print(f"\n🤖 AURA: {greeting}")
        self.generate_tts(greeting)
        
        while True:
            try:
                user_input = input("\n💭 Press Enter to speak (or type command): ").strip()
                
                if user_input.lower() == 'quit':
                    print("\n👋 Goodbye!")
                    break
                    
                elif user_input.lower() == 'clear':
                    self.session_id = None
                    print("✅ Session cleared!")
                    
                elif user_input.lower().startswith('text:'):
                    # Text mode
                    message = user_input[5:].strip()
                    if message:
                        self.send_text_message(message)
                        
                else:
                    # Voice mode
                    audio_data = self.record_audio()
                    if audio_data:
                        self.process_with_backend(audio_data)
                    else:
                        print("   No audio detected, try again.")
                        
            except KeyboardInterrupt:
                print("\n\n👋 Conversation ended!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")
                continue
    
    def cleanup(self):
        """Clean up resources"""
        self.audio.terminate()


def main():
    """Main entry point"""
    print("\n🚀 Starting AURA Real-time Conversation Test")
    print("-" * 50)
    
    # Create conversation instance
    aura = AuraConversation()
    
    try:
        # Start conversation
        aura.start_conversation()
    finally:
        # Clean up
        aura.cleanup()


if __name__ == "__main__":
    main()