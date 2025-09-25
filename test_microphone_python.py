#!/usr/bin/env python3
"""
Python Microphone Test - Similar to BIC.py and Demo.py
Tests PyAudio microphone functionality
"""

import pyaudio
import numpy as np
import time
import sys

def test_pyaudio():
    """Test PyAudio functionality"""
    print("=" * 50)
    print("PYTHON MICROPHONE TEST")
    print("=" * 50)
    
    try:
        # Initialize PyAudio
        p = pyaudio.PyAudio()
        print("✅ PyAudio initialized successfully")
        
        # Audio settings (same as BIC.py and Demo.py)
        CHUNK = 1024
        FORMAT = pyaudio.paInt16
        CHANNELS = 1
        RATE = 16000
        
        print(f"Audio settings:")
        print(f"  - Sample Rate: {RATE} Hz")
        print(f"  - Channels: {CHANNELS}")
        print(f"  - Format: {FORMAT}")
        print(f"  - Chunk Size: {CHUNK}")
        
        # List available devices
        print("\n📱 Available Audio Devices:")
        for i in range(p.get_device_count()):
            info = p.get_device_info_by_index(i)
            if info['maxInputChannels'] > 0:
                print(f"  {i}: {info['name']} (Input channels: {info['maxInputChannels']})")
        
        # Test microphone access
        print("\n🎤 Testing microphone access...")
        try:
            stream = p.open(
                format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                frames_per_buffer=CHUNK
            )
            print("✅ Microphone access granted")
            
            # Test audio levels
            print("\n🔊 Testing audio levels (speak into microphone)...")
            for i in range(10):
                data = stream.read(CHUNK, exception_on_overflow=False)
                audio_data = np.frombuffer(data, dtype=np.int16)
                level = np.abs(audio_data).mean()
                print(f"  Level {i+1}: {level:.2f}")
                time.sleep(0.1)
            
            stream.stop_stream()
            stream.close()
            print("✅ Microphone test completed successfully")
            
        except Exception as e:
            print(f"❌ Microphone access failed: {e}")
            return False
            
    except Exception as e:
        print(f"❌ PyAudio initialization failed: {e}")
        return False
    finally:
        p.terminate()
    
    return True

def test_audio_processing():
    """Test audio processing similar to BIC.py"""
    print("\n" + "=" * 50)
    print("AUDIO PROCESSING TEST")
    print("=" * 50)
    
    try:
        p = pyaudio.PyAudio()
        
        # Settings from BIC.py
        CHUNK = 1024
        FORMAT = pyaudio.paInt16
        CHANNELS = 1
        RATE = 16000
        RECORD_SECONDS = 3
        
        print(f"Recording for {RECORD_SECONDS} seconds...")
        
        stream = p.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK
        )
        
        frames = []
        silence_threshold = 500
        silence_count = 0
        
        print("🎤 Recording... (speak now)")
        
        # Record with silence detection (like BIC.py)
        for i in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
            data = stream.read(CHUNK)
            frames.append(data)
            
            # Check for silence
            audio_data = np.frombuffer(data, dtype=np.int16)
            if np.abs(audio_data).mean() < silence_threshold:
                silence_count += 1
                if silence_count > 20:  # ~1 second of silence
                    print("🔇 Silence detected, stopping early")
                    break
            else:
                silence_count = 0
                print(f"🎤 Voice detected, level: {np.abs(audio_data).mean():.2f}")
        
        stream.stop_stream()
        stream.close()
        
        print(f"✅ Recording completed: {len(frames)} chunks")
        print(f"   Total duration: {len(frames) * CHUNK / RATE:.2f} seconds")
        
        # Analyze the recorded audio
        if frames:
            all_audio = b''.join(frames)
            audio_data = np.frombuffer(all_audio, dtype=np.int16)
            max_level = np.abs(audio_data).max()
            avg_level = np.abs(audio_data).mean()
            
            print(f"   Max audio level: {max_level}")
            print(f"   Average audio level: {avg_level:.2f}")
            
            if avg_level > 100:
                print("✅ Audio captured successfully")
            else:
                print("⚠️  Low audio levels detected")
        
    except Exception as e:
        print(f"❌ Audio processing test failed: {e}")
        return False
    finally:
        p.terminate()
    
    return True

def main():
    """Main test function"""
    print("Python Microphone Test Suite")
    print("This tests PyAudio functionality like BIC.py and Demo.py")
    print()
    
    # Test 1: Basic PyAudio functionality
    if not test_pyaudio():
        print("\n❌ PyAudio test failed. Please check your audio setup.")
        sys.exit(1)
    
    # Test 2: Audio processing
    if not test_audio_processing():
        print("\n❌ Audio processing test failed.")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("✅ ALL TESTS PASSED!")
    print("PyAudio is working correctly on this system.")
    print("=" * 50)

if __name__ == "__main__":
    main()
