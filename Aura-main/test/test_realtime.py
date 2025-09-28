#!/usr/bin/env python3
"""
Real-time streaming voice conversation for AURA
Speaks immediately without file conversion
"""

import sys
import os

# Add backend directory to Python path
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, backend_path)

import asyncio
import pyaudio
import websocket
import json
import base64
import threading
import queue
import numpy as np
from typing import Optional
import time
import io
import struct

# For streaming audio playback
import sounddevice as sd
import soundfile as sf

class StreamingAuraVoice:
    def __init__(self, backend_url="http://localhost:8000"):
        """Initialize streaming voice client"""
        self.backend_url = backend_url
        self.ws_url = backend_url.replace("http", "ws") + "/stream/voice"
        
        # Audio settings
        self.sample_rate = 16000
        self.channels = 1
        self.chunk_size = 1024
        self.format = pyaudio.paInt16
        
        # Queues for streaming
        self.audio_input_queue = queue.Queue()
        self.audio_output_queue = queue.Queue()
        
        # State management
        self.is_recording = False
        self.is_playing = False
        self.session_active = False
        
        # PyAudio setup
        self.p = pyaudio.PyAudio()
        
        # WebSocket connection
        self.ws = None
        self.ws_thread = None
        
        print("🎤 AURA Streaming Voice Ready!")
        print("-" * 50)
    
    def start_websocket(self):
        """Start WebSocket connection for streaming"""
        def on_message(ws, message):
            """Handle incoming messages"""
            try:
                print(f"📨 Received: {message[:100]}...")
                data = json.loads(message)
                
                if data["type"] == "audio_stream":
                    # Decode and queue audio for playback
                    audio_chunk = base64.b64decode(data["chunk"])
                    self.audio_output_queue.put(audio_chunk)
                    print("🔊 Audio chunk received")
                    
                elif data["type"] == "transcription":
                    print(f"\n📝 You said: {data['text']}")
                    
                elif data["type"] == "stream_complete":
                    print(f"\n✅ Response complete: {data.get('full_response', 'N/A')}")
                    
                elif data["type"] == "error":
                    print(f"\n❌ Server error: {data.get('message', 'Unknown error')}")
                    
                else:
                    print(f"📨 Unknown message type: {data.get('type', 'unknown')}")
                    
            except Exception as e:
                print(f"❌ Message error: {e}")
                print(f"Raw message: {message}")
        
        def on_error(ws, error):
            print(f"WebSocket error: {error}")
        
        def on_close(ws, close_status_code, close_msg):
            print("WebSocket closed")
        
        def on_open(ws):
            print("✅ Connected to AURA streaming")
            self.session_active = True
        
        # Connect to WebSocket
        self.ws = websocket.WebSocketApp(
            self.ws_url,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close
        )
        
        # Run in separate thread
        self.ws_thread = threading.Thread(target=self.ws.run_forever)
        self.ws_thread.daemon = True
        self.ws_thread.start()
        
        # Wait for connection
        time.sleep(1)
    
    def stream_microphone_audio(self):
        """Stream microphone audio to server"""
        stream = self.p.open(
            format=self.format,
            channels=self.channels,
            rate=self.sample_rate,
            input=True,
            frames_per_buffer=self.chunk_size
        )
        
        print("\n🎤 Listening... (Press Ctrl+C to stop)")
        self.is_recording = True
        
        silence_threshold = 500
        silence_chunks = 0
        max_silence = int(1.5 * self.sample_rate / self.chunk_size)  # 1.5 seconds
        
        try:
            while self.is_recording:
                # Read audio chunk
                audio_chunk = stream.read(self.chunk_size, exception_on_overflow=False)
                
                # Check for silence
                audio_data = np.frombuffer(audio_chunk, dtype=np.int16)
                volume = np.abs(audio_data).mean()
                
                if volume < silence_threshold:
                    silence_chunks += 1
                    if silence_chunks > max_silence:
                        # Send end of speech signal
                        if self.ws and self.session_active:
                            self.ws.send(json.dumps({
                                "type": "end_of_speech",
                                "user_id": "streaming_user"
                            }))
                        silence_chunks = 0
                else:
                    silence_chunks = 0
                    
                    # Send audio chunk to server
                    if self.ws and self.session_active:
                        audio_base64 = base64.b64encode(audio_chunk).decode()
                        self.ws.send(json.dumps({
                            "type": "audio_chunk",
                            "audio": audio_base64,
                            "user_id": "streaming_user"
                        }))
                
        except KeyboardInterrupt:
            print("\n⏹️  Recording stopped")
        finally:
            stream.stop_stream()
            stream.close()
            self.is_recording = False
    
    def play_audio_stream(self):
        """Play audio from output queue in real-time"""
        print("🔊 Audio player ready")
        
        # Use sounddevice for low-latency playback
        with sd.OutputStream(
            samplerate=24000,  # ElevenLabs default
            channels=1,
            dtype='int16'
        ) as stream:
            
            while self.session_active:
                try:
                    # Get audio from queue
                    audio_chunk = self.audio_output_queue.get(timeout=0.1)
                    
                    # Convert to numpy array
                    audio_data = np.frombuffer(audio_chunk, dtype=np.int16)
                    
                    # Play immediately
                    stream.write(audio_data)
                    
                except queue.Empty:
                    continue
                except Exception as e:
                    print(f"Playback error: {e}")
    
    def start_conversation(self):
        """Start real-time conversation"""
        print("\n" + "=" * 50)
        print("🎙️  AURA REAL-TIME STREAMING CONVERSATION")
        print("=" * 50)
        print("\nSpeak naturally - AURA will respond in real-time")
        print("Press Ctrl+C to end conversation")
        print("-" * 50)
        
        # Start WebSocket connection
        self.start_websocket()
        
        # Start audio playback thread
        playback_thread = threading.Thread(target=self.play_audio_stream)
        playback_thread.daemon = True
        playback_thread.start()
        
        # Start microphone streaming
        try:
            self.stream_microphone_audio()
        except KeyboardInterrupt:
            print("\n👋 Ending conversation...")
        finally:
            self.cleanup()
    
    def cleanup(self):
        """Clean up resources"""
        self.session_active = False
        self.is_recording = False
        
        if self.ws:
            self.ws.close()
        
        self.p.terminate()
        print("✅ Cleaned up")


# Alternative: Simple streaming with immediate playback
class SimpleStreamingVoice:
    """Simpler version using HTTP streaming"""
    
    def __init__(self, backend_url="http://localhost:8000"):
        self.backend_url = backend_url
        self.p = pyaudio.PyAudio()
        
    def record_and_stream(self):
        """Record audio and stream response"""
        import requests
        import tempfile
        import wave
        
        # Audio settings
        CHUNK = 1024
        FORMAT = pyaudio.paInt16
        CHANNELS = 1
        RATE = 16000
        RECORD_SECONDS = 5  # Max recording time
        
        print("🎤 Recording... (speak now)")
        
        stream = self.p.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK
        )
        
        frames = []
        silence_threshold = 500
        silence_count = 0
        
        for _ in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
            data = stream.read(CHUNK)
            frames.append(data)
            
            # Check for silence
            audio_data = np.frombuffer(data, dtype=np.int16)
            if np.abs(audio_data).mean() < silence_threshold:
                silence_count += 1
                if silence_count > 20:  # ~1 second of silence
                    break
            else:
                silence_count = 0
        
        stream.stop_stream()
        stream.close()
        
        print("⏹️  Recording complete")
        
        # Save to temporary WAV
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            wf = wave.open(tmp.name, 'wb')
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(self.p.get_sample_size(FORMAT))
            wf.setframerate(RATE)
            wf.writeframes(b''.join(frames))
            wf.close()
            
            # Send to backend with streaming response
            print("🤖 Getting response...")
            
            with open(tmp.name, 'rb') as audio_file:
                files = {'audio': audio_file}
                data = {'user_id': 'stream_user', 'use_memory': 'true'}
                
                # Use streaming endpoint
                try:
                    print(f"🔗 Sending request to: {self.backend_url}/voice/process")
                    print(f"📁 Audio file size: {len(frames) * 2} bytes")
                    
                    with requests.post(
                        f"{self.backend_url}/voice/process",
                        files=files,
                        data=data,
                        stream=True,
                        timeout=30
                    ) as response:
                        
                        print(f"📡 Response status: {response.status_code}")
                        
                        if response.status_code != 200:
                            print(f"❌ Error: HTTP {response.status_code}")
                            print(f"Response: {response.text}")
                            return
                        
                        # Parse streaming response
                        try:
                            response_data = response.json()
                            print(f"📊 Response data keys: {list(response_data.keys())}")
                            
                            transcription = response_data.get('transcription', 'N/A')
                            aura_response = response_data.get('response', 'N/A')
                            
                            print(f"\n📝 You said: {transcription}")
                            print(f"🤖 AURA: {aura_response}")
                            
                            # Check for errors in response
                            if response_data.get('success') == False:
                                print(f"❌ Backend error: {response_data.get('detail', 'Unknown error')}")
                            
                            # Play audio immediately
                            if response_data.get('audio'):
                                print("🔊 Playing audio response...")
                                self.play_audio_immediate(response_data['audio'])
                            else:
                                print("⚠️ No audio response received")
                                
                        except json.JSONDecodeError as e:
                            print(f"❌ JSON decode error: {e}")
                            print(f"Raw response: {response.text[:500]}")
                            
                except requests.exceptions.RequestException as e:
                    print(f"❌ Request error: {e}")
                except Exception as e:
                    print(f"❌ Unexpected error: {e}")
                    import traceback
                    traceback.print_exc()
    
    def play_audio_immediate(self, audio_base64):
        """Play audio immediately without saving to file"""
        import pygame
        
        # Decode audio
        audio_bytes = base64.b64decode(audio_base64)
        
        # Use pygame for immediate playback
        pygame.mixer.init()
        
        # Load from memory
        audio_io = io.BytesIO(audio_bytes)
        pygame.mixer.music.load(audio_io)
        pygame.mixer.music.play()
        
        # Wait for playback to complete
        while pygame.mixer.music.get_busy():
            time.sleep(0.1)
    
    def conversation_loop(self):
        """Simple conversation loop"""
        print("\n" + "=" * 50)
        print("🎤 AURA Simple Streaming Voice")
        print("=" * 50)
        print("Press Enter to speak, 'q' to quit")
        
        while True:
            cmd = input("\n⏎ Press Enter to speak (or 'q' to quit): ")
            if cmd.lower() == 'q':
                break
            
            self.record_and_stream()
        
        self.p.terminate()
        print("👋 Goodbye!")


def main():
    """Main entry point"""
    
    print("Select mode:")
    print("1. WebSocket Streaming (real-time)")
    print("2. Simple HTTP Streaming")
    
    choice = input("\nChoice (1/2): ").strip()
    
    if choice == "1":
        # Check if WebSocket endpoint exists
        try:
            client = StreamingAuraVoice()
            client.start_conversation()
        except Exception as e:
            print(f"Error: {e}")
            print("WebSocket endpoint may not be implemented yet")
            print("Falling back to simple streaming...")
            choice = "2"
    
    if choice == "2":
        client = SimpleStreamingVoice()
        client.conversation_loop()


if __name__ == "__main__":
    # Install requirements check
    try:
        import pyaudio
        import numpy
        import sounddevice
        import pygame
    except ImportError as e:
        print("Missing dependencies! Install with:")
        print("pip install pyaudio numpy sounddevice pygame")
        print(f"Error: {e}")
        exit(1)
    
    main()