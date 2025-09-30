#!/usr/bin/env python3
"""
Test script for AURA with hardcoded information from TypeScript backend
Similar to test_realtime.py but with predefined responses and data
"""

import sys
import os
import requests
import json
import base64
import pygame
import io
import time
import pyaudio
import numpy as np
import wave
import tempfile
from typing import Dict, List, Optional

# Add backend directory to Python path
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, backend_path)

pygame.mixer.init()

class HardcodedAuraChat:
    def __init__(self, backend_url="http://localhost:8000"):
        """Initialize with hardcoded data from TypeScript backend"""
        self.backend_url = backend_url
        self.user_id = "hardcoded_test_user"
        self.session_id = None
        
        # Hardcoded information from BIC TypeScript backend
        self.hardcoded_responses = {
            "greeting": "Hi! Welcome to BIC! We help AI, robotics, and autonomy founders raise capital and scale their companies. What can we help you today?",
            "company_info": "I'm Bibhrajit Halder, founder of Bibhrajit Investment Corporation (BIC), a venture and advisory firm focused on early-stage AI, robotics, autonomy, and defense tech startups. I have over two decades of experience in self-driving and autonomy, having led SafeAI as its founder and CEO.",
            "services": "We offer three main services: Pitch Deck Review & Redesign for $699, Fundraising Sprint for $1,699, and GTM Kickstart for $1,699. You can book a session at https://bicorp.ai/book-now",
            "contact": "You can reach us at info@bicorp.ai or book directly at https://bicorp.ai/book-now",
            "pitch_deck": "Our Pitch Deck Review & Redesign service is $699 and includes complete teardown and upgrade of pitch deck, strategic feedback on narrative, flow, and financials, updated slide structure plus redesigned clean deck template, and 1-hour 1:1 working session. Book here: https://bicorp.ai/products/pitch-deck-review",
            "fundraising": "Our Fundraising Sprint is $1,699 and gets you investor-ready in 2 weeks with 3 x 1:1 live working sessions (3 hrs total), deep dive into storyline, metrics, valuation narrative, feedback on investor list plus intros where aligned. Book here: https://bicorp.ai/products/fundraising-sprint",
            "gtm": "Our GTM Kickstart is $1,699 and helps define your first go-to-market motion, ICP, messaging with 3 x 1:1 working sessions (3 hrs total), ICP plus buyer persona definition, messaging teardown plus sales narrative coaching. Book here: https://bicorp.ai/products/gtm-kickstart",
            "default": "I don't have information about that topic. I can only help with BIC services, fundraising, pitch decks, and GTM strategies. For other questions, please contact info@bicorp.ai",
            "limitation": "I'm limited to BIC-specific topics only. I can help with our services, pricing, booking, and expertise areas. For anything else, please contact info@bicorp.ai"
        }
        
        # Hardcoded knowledge base from BIC
        self.knowledge_base = {
            "services": [
                "Pitch Deck Review & Redesign - $699",
                "Fundraising Sprint - $1,699", 
                "GTM Kickstart - $1,699"
            ],
            "expertise": [
                "AI/ML product development and commercialization",
                "Robotics and autonomy go-to-market strategy",
                "Enterprise sales for deep tech",
                "Fundraising for hardware-software startups",
                "Team building and technical hiring",
                "Product-market fit for B2B robotics",
                "Defense tech market entry",
                "Manufacturing and operations scaling"
            ],
            "links": {
                "book": "https://bicorp.ai/book-now",
                "about": "https://bicorp.ai/about-us",
                "services": "https://bicorp.ai/services",
                "products": "https://bicorp.ai/products",
                "pitch_deck": "https://bicorp.ai/products/pitch-deck-review",
                "fundraising": "https://bicorp.ai/products/fundraising-sprint",
                "gtm": "https://bicorp.ai/products/gtm-kickstart"
            }
        }
        
        # Audio settings for microphone
        self.sample_rate = 16000
        self.chunk_size = 1024
        self.channels = 1
        self.format = pyaudio.paInt16
        self.p = pyaudio.PyAudio()
        
        print("=" * 60)
        print("AURA HARDCODED CHAT READY")
        print("=" * 60)
        print("Loaded knowledge from BIC TypeScript backend")
        print("Supports text input and microphone voice input")
        print("-" * 60)
    
    def get_hardcoded_response(self, message: str) -> str:
        """Get response based on hardcoded BIC knowledge - STRICT LIMITATIONS"""
        message_lower = message.lower()
        
        # STRICT LIMITATIONS - Reject topics outside BIC scope
        off_topic_keywords = [
            "weather", "news", "sports", "politics", "entertainment", "movies", "music",
            "cooking", "recipes", "travel", "vacation", "health", "medical", "legal",
            "personal", "relationship", "dating", "family", "children", "school",
            "general", "random", "joke", "funny", "meme", "game", "gaming"
        ]
        
        if any(keyword in message_lower for keyword in off_topic_keywords):
            return self.hardcoded_responses["limitation"]
        
        # Check for specific BIC topics
        if any(word in message_lower for word in ["hello", "hi", "hey", "greeting", "welcome"]):
            return self.hardcoded_responses["greeting"]
        
        elif any(word in message_lower for word in ["company", "about", "who are you", "bic", "bibhrajit"]):
            return self.hardcoded_responses["company_info"]
        
        elif any(word in message_lower for word in ["services", "what do you do", "offer", "help"]):
            return self.hardcoded_responses["services"]
        
        elif any(word in message_lower for word in ["contact", "reach", "email", "info@bicorp.ai"]):
            return self.hardcoded_responses["contact"]
        
        elif any(word in message_lower for word in ["pitch deck", "pitchdeck", "deck review"]):
            return self.hardcoded_responses["pitch_deck"]
        
        elif any(word in message_lower for word in ["fundraising", "raise capital", "investor", "funding"]):
            return self.hardcoded_responses["fundraising"]
        
        elif any(word in message_lower for word in ["gtm", "go to market", "go-to-market", "market entry"]):
            return self.hardcoded_responses["gtm"]
        
        elif any(word in message_lower for word in ["book", "schedule", "meeting", "session"]):
            return f"You can book a session at {self.knowledge_base['links']['book']}"
        
        elif any(word in message_lower for word in ["expertise", "experience", "background", "safeai"]):
            expertise = ", ".join(self.knowledge_base["expertise"][:3])
            return f"My expertise includes {expertise}. I founded SafeAI and have 20+ years in autonomy and robotics."
        
        elif any(word in message_lower for word in ["pricing", "cost", "price", "how much"]):
            services = ", ".join(self.knowledge_base["services"])
            return f"Our services: {services}. Book at {self.knowledge_base['links']['book']}"
        
        else:
            return "I don't have information about that topic. I can only help with BIC services, fundraising, pitch decks, and GTM strategies. For other questions, please contact info@bicorp.ai"
    
    def record_from_microphone(self) -> str:
        """Record audio from microphone and transcribe it - same as test_realtime.py"""
        import tempfile
        import wave
        
        # Audio settings (same as test_realtime.py)
        CHUNK = 1024
        FORMAT = pyaudio.paInt16
        CHANNELS = 1
        RATE = 16000
        RECORD_SECONDS = 5  # Max recording time
        
        print("\n" + "=" * 50)
        print("MICROPHONE RECORDING")
        print("=" * 50)
        print("Recording... (speak now)")
        
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
        
        print("Recording complete")
        
        if len(frames) < 10:  # Less than ~0.1 seconds
            print("No audio detected. Please try again.")
            return ""
        
        # Save to temporary WAV
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            wf = wave.open(tmp.name, 'wb')
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(self.p.get_sample_size(FORMAT))
            wf.setframerate(RATE)
            wf.writeframes(b''.join(frames))
            wf.close()
            
            # Transcribe using backend
            print("Transcribing...")
            try:
                with open(tmp.name, 'rb') as audio_file:
                    files = {'audio': audio_file}
                    response = requests.post(
                        f"{self.backend_url}/voice/transcribe",
                        files=files,
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        transcription = data.get('text', '')
                        print(f"Transcription: {transcription}")
                        return transcription
                    else:
                        print(f"Transcription failed: {response.status_code}")
                        return ""
                        
            except Exception as e:
                print(f"Transcription error: {e}")
                return ""
            finally:
                # Clean up temp file
                try:
                    os.unlink(tmp.name)
                except:
                    pass
    
    def chat_with_hardcoded_response(self, message: str):
        """Send message and get hardcoded response with voice"""
        print(f"\n[YOU] {message}")
        
        # Get hardcoded response
        response_text = self.get_hardcoded_response(message)
        print(f"[BIC] {response_text}")
        
        # Generate and play voice
        self.speak(response_text)
        
        return {
            "response": response_text,
            "model_used": "hardcoded",
            "source": "typescript_backend_data"
        }
    
    def speak(self, text: str):
        """Generate TTS and play immediately"""
        if not text:
            return
        
        print("Generating speech...")
        
        # Limit text length for TTS
        text = text[:500]
        
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
        except requests.exceptions.RequestException as e:
            print(f"TTS connection error: {e}")
            return
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                if data.get("success") and data.get("audio"):
                    # Decode and play
                    audio_bytes = base64.b64decode(data["audio"])
                    print(f"Playing audio ({len(audio_bytes)} bytes)")
                    
                    # Play with pygame (no file saving)
                    audio_io = io.BytesIO(audio_bytes)
                    pygame.mixer.music.load(audio_io)
                    pygame.mixer.music.play()
                    
                    # Wait for playback
                    while pygame.mixer.music.get_busy():
                        pygame.time.wait(100)
                    print("Audio playback complete")
                else:
                    print("TTS failed - no audio generated")
            except json.JSONDecodeError as e:
                print(f"TTS JSON decode error: {e}")
        else:
            print(f"TTS error: HTTP {response.status_code}")
            try:
                error_data = response.json()
                print(f"Details: {error_data}")
            except:
                print(f"Response: {response.text[:500]}")
    
    def test_backend_connection(self):
        """Test if backend is running"""
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=5)
            data = response.json()
            
            print("Backend Status:")
            print(f"   Overall: {data.get('status', 'unknown')}")
            print(f"   Voice: {data.get('voice', {})}")
            
            return True
            
        except Exception as e:
            print("Backend not running!")
            print("   Start it with: cd backend && python -m uvicorn app.main:app --reload")
            return False
    
    def run_interactive_mode(self):
        """Interactive chat mode"""
        print("\n" + "=" * 60)
        print("AURA HARDCODED CHAT - Interactive Mode")
        print("=" * 60)
        print("This uses hardcoded information from BIC TypeScript backend")
        print("Commands: 'quit' to exit, 'clear' to reset, 'help' for topics")
        print("-" * 60)
        
        # Initial greeting
        self.speak("Hi! Welcome to BIC! We help AI, robotics, and autonomy founders raise capital and scale their companies. What can we help you today?")
        
        while True:
            try:
                user_input = input("\n[YOU] ").strip()
                
                if not user_input:
                    continue
                    
                if user_input.lower() == 'quit':
                    self.speak("Goodbye! Thanks for testing the hardcoded AURA system!")
                    break
                    
                if user_input.lower() == 'clear':
                    self.session_id = None
                    print("Session cleared")
                    continue
                
                if user_input.lower() == 'help':
                    print("\nAvailable BIC topics:")
                    print("   - Company information (BIC, Bibhrajit, SafeAI)")
                    print("   - Services (Pitch Deck, Fundraising, GTM)")
                    print("   - Pricing and booking")
                    print("   - Contact information")
                    print("\nI cannot help with:")
                    print("   - Weather, news, sports, entertainment")
                    print("   - Personal, medical, legal advice")
                    print("   - General knowledge outside BIC scope")
                    continue
                
                # Process message with hardcoded response
                self.chat_with_hardcoded_response(user_input)
                
            except KeyboardInterrupt:
                print("\n\nGoodbye!")
                break
            except Exception as e:
                print(f"Error: {e}")
    
    def run_test_mode(self):
        """Run predefined test scenarios"""
        print("\n" + "=" * 60)
        print("AURA HARDCODED CHAT - Test Mode")
        print("=" * 60)
        
        test_scenarios = [
            "Hello, how are you?",
            "What does BIC do?",
            "What services do you offer?",
            "Tell me about pitch deck review",
            "How much does fundraising help cost?",
            "What's your GTM service?",
            "How can I book a session?",
            "What's your background with SafeAI?",
            "How can I contact you?",
            "What's the weather like?",  # Should be rejected
            "Tell me a joke",  # Should be rejected
            "What's the latest news?"  # Should be rejected
        ]
        
        for i, scenario in enumerate(test_scenarios, 1):
            print(f"\n--- Test {i}/{len(test_scenarios)} ---")
            self.chat_with_hardcoded_response(scenario)
            time.sleep(2)  # Pause between tests
        
        print("\n✅ All tests completed!")


def main():
    """Main entry point"""
    print("\n🚀 AURA Hardcoded Chat Test")
    print("This uses hardcoded information from your TypeScript backend")
    print("-" * 50)
    
    chat = HardcodedAuraChat()
    
    if not chat.test_backend_connection():
        print("\nPlease start the backend first")
        return
    
    print("\nSelect mode:")
    print("1. Interactive Chat (type your own messages)")
    print("2. Test Mode (run predefined scenarios)")
    
    choice = input("\nChoice (1/2): ").strip()
    
    if choice == "1":
        chat.run_interactive_mode()
    elif choice == "2":
        chat.run_test_mode()
    else:
        print("Invalid choice, running interactive mode...")
        chat.run_interactive_mode()


if __name__ == "__main__":
    main()
