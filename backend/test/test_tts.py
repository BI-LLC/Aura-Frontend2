#!/usr/bin/env python3
"""
Interactive TTS Terminal Tester for AURA Voice AI
Tests your custom voice with different texts
"""

import requests
import base64
import os
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_tts(text, save_filename=None, stability=0.5, similarity=0.75):
    """Test TTS with given text and save to file"""
    
    print(f"\n🎤 Testing TTS with: '{text[:50]}...'")
    
    response = requests.post(
        f"{BASE_URL}/voice/synthesize",
        data={
            "text": text,
            "stability": stability,
            "similarity_boost": similarity
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        
        if data["success"]:
            # Decode audio
            audio_bytes = base64.b64decode(data["audio"])
            
            # Generate filename if not provided
            if not save_filename:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                save_filename = f"tts_output_{timestamp}.mp3"
            
            # Save to file
            with open(save_filename, "wb") as f:
                f.write(audio_bytes)
            
            print(f" Success!")
            print(f"   Saved to: {save_filename}")
            print(f"   Size: {len(audio_bytes):,} bytes")
            print(f"   Characters used: {data['characters']}")
            
            # Auto-play on Windows (optional)
            if os.name == 'nt':  # Windows
                os.system(f'start {save_filename}')
            
            return save_filename
        else:
            print(f" TTS failed: {data}")
    else:
        print(f" Request failed: {response.status_code}")
    
    return None

def test_batch():
    """Test multiple TTS examples"""
    
    test_cases = [
        {
            "name": "Greeting",
            "text": "Hello! I'm AURA, your AI assistant speaking with your custom voice.",
            "stability": 0.5
        },
        {
            "name": "Question",
            "text": "How can I help you today? Would you like to discuss technology, business, or something else?",
            "stability": 0.5
        },
        {
            "name": "Technical",
            "text": "The system achieves 99.9% uptime with sub-100 millisecond response times across all endpoints.",
            "stability": 0.7
        },
        {
            "name": "Emotional",
            "text": "Wow! This is absolutely incredible! I'm so excited to be working with you on this project!",
            "stability": 0.3
        },
        {
            "name": "Long Form",
            "text": "Artificial intelligence is transforming how we work and live. From natural language processing to computer vision, AI systems are becoming increasingly sophisticated. This voice synthesis technology is just one example of how AI can create more natural human-computer interactions.",
            "stability": 0.6
        }
    ]
    
    print("=" * 50)
    print(" BATCH TTS TESTING")
    print("=" * 50)
    
    for i, test in enumerate(test_cases, 1):
        print(f"\nTest {i}/{len(test_cases)}: {test['name']}")
        print("-" * 30)
        
        filename = f"test_{i}_{test['name'].lower().replace(' ', '_')}.mp3"
        test_tts(
            test["text"], 
            filename,
            stability=test.get("stability", 0.5)
        )
        
        time.sleep(1)  # Small delay between requests
    
    print("\n" + "=" * 50)
    print("✅ Batch testing complete!")
    print("Check the generated MP3 files")

def interactive_mode():
    """Interactive TTS testing"""
    
    print("=" * 50)
    print("🎤 INTERACTIVE TTS TESTER")
    print("=" * 50)
    print("Type your text and press Enter to synthesize")
    print("Commands: 'quit' to exit, 'batch' for batch test")
    print("-" * 50)
    
    while True:
        text = input("\n📝 Enter text: ").strip()
        
        if text.lower() == 'quit':
            print("Goodbye!")
            break
        elif text.lower() == 'batch':
            test_batch()
        elif text:
            # Ask for settings
            use_custom = input("Custom settings? (y/n): ").lower() == 'y'
            
            if use_custom:
                stability = float(input("Stability (0.0-1.0, default 0.5): ") or "0.5")
                similarity = float(input("Similarity (0.0-1.0, default 0.75): ") or "0.75")
            else:
                stability = 0.5
                similarity = 0.75
            
            test_tts(text, stability=stability, similarity=similarity)
        else:
            print("Please enter some text!")

def main():
    print("\n AURA Voice AI - TTS Terminal Tester")
    print("Using your custom ElevenLabs voice")
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/voice/status")
        data = response.json()
        
        if not data["components"]["elevenlabs_available"]:
            print(" ElevenLabs not configured! Check your API key.")
            return
        
        print(" Voice system ready!")
        
    except:
        print(" Server not running! Start with: python -m app.main")
        return
    
    # Choose mode
    print("\nSelect mode:")
    print("1. Interactive mode (type custom text)")
    print("2. Batch test (test multiple examples)")
    print("3. Quick test (one example)")
    
    choice = input("\nChoice (1/2/3): ").strip()
    
    if choice == "1":
        interactive_mode()
    elif choice == "2":
        test_batch()
    else:
        # Quick test
        test_tts("Hello! This is a quick test of the AURA voice system. Your custom voice is working perfectly!")

if __name__ == "__main__":
    main()