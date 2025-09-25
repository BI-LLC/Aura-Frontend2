#!/usr/bin/env python3
"""
Simplest real-time conversation test
No files, just streaming audio
"""

import pyaudio
import requests
import base64
import numpy as np
import pygame
import io
import time

pygame.mixer.init()

class QuickVoiceChat:
    def __init__(self):
        self.p = pyaudio.PyAudio()
        self.backend = "http://localhost:8000"
        
    def listen_and_respond(self):
        """Record, process, and play response immediately"""
        
        # Recording settings
        CHUNK = 1024
        FORMAT = pyaudio.paInt16
        CHANNELS = 1
        RATE = 16000
        
        print("\n🎤 Listening... (speak now)")
        
        # Start recording
        stream = self.p.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK
        )
        
        frames = []
        silence_count = 0
        
        # Record until silence
        while True:
            data = stream.read(CHUNK)
            frames.append(data)
            
            # Check volume
            audio_array = np.frombuffer(data, dtype=np.int16)
            volume = np.abs(audio_array).mean()
            
            if volume < 500:  # Silence threshold
                silence_count += 1
                if silence_count > 20:  # ~1 second of silence
                    break
            else:
                silence_count = 0
        
        stream.stop_stream()
        stream.close()
        
        print("⏹️  Processing...")
        
        # Convert to WAV format in memory
        import wave
        import tempfile
        
        with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
            wf = wave.open(tmp.name, 'wb')
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(self.p.get_sample_size(FORMAT))
            wf.setframerate(RATE)
            wf.writeframes(b''.join(frames))
            wf.close()
            
            # Send to backend
            with open(tmp.name, 'rb') as f:
                response = requests.post(
                    f"{self.backend}/voice/process",
                    files={'audio': ('audio.wav', f, 'audio/wav')},
                    data={
                        'user_id': 'quick_user',
                        'document_id': 'default_document',  # Use default document
                        'organization': 'default_org'
                    }
                )
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"\n📝 You: {data['transcription']}")
            print(f"🤖 AURA: {data['response']}")
            
            # Play audio immediately (no file saving)
            if data.get('audio'):
                audio_bytes = base64.b64decode(data['audio'])
                
                # Stream directly to speakers
                audio_io = io.BytesIO(audio_bytes)
                pygame.mixer.music.load(audio_io)
                pygame.mixer.music.play()
                
                # Wait for playback
                while pygame.mixer.music.get_busy():
                    time.sleep(0.1)
        else:
            print(f"Error: {response.status_code}")
    
    def run(self):
        """Run conversation loop"""
        print("\n" + "=" * 50)
        print("🎤 AURA Quick Voice Chat")
        print("=" * 50)
        print("Press Enter to speak, 'q' to quit")
        
        while True:
            cmd = input("\n⏎ Press Enter to speak: ").strip()
            if cmd.lower() == 'q':
                break
            
            self.listen_and_respond()
        
        self.p.terminate()
        print("👋 Goodbye!")

if __name__ == "__main__":
    chat = QuickVoiceChat()
    chat.run()