#!/usr/bin/env python3
"""
BIC AURA Voice-Only Conversational Chat System
A focused AI assistant for BIC that maintains natural voice conversation
while staying within company knowledge boundaries
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
import random
from typing import Dict, List, Optional, Tuple
from datetime import datetime

# Initialize pygame for audio
pygame.mixer.init()

class BICConversationalChat:
    def __init__(self, backend_url="http://localhost:8000"):
        """Initialize BIC conversational assistant"""
        self.backend_url = backend_url
        self.user_id = "bic_user"
        self.session_id = None
        
        # Track conversation state
        self.conversation_history = []
        self.conversation_turn = 0
        self.last_topic = None
        self.user_name = None
        self.user_context = {}
        
        # BIC Knowledge Base - Core information about the company
        self.bic_knowledge = {
            "company": {
                "name": "Bibhrajit Investment Corporation (BIC)",
                "founder": "Bibhrajit Halder",
                "focus": "AI, robotics, autonomy, and defense tech startups",
                "mission": "Help founders raise capital and scale their companies",
                "experience": "20+ years in self-driving and autonomy",
                "previous": "Founded and led SafeAI as CEO",
                "approach": "Hands-on, founder-friendly advisory"
            },
            
            "services": {
                "pitch_deck": {
                    "name": "Pitch Deck Review & Redesign",
                    "price": "$699",
                    "includes": [
                        "Complete teardown and upgrade of pitch deck",
                        "Strategic feedback on narrative and flow",
                        "Redesigned clean deck template",
                        "1-hour 1:1 working session"
                    ],
                    "timeline": "1 week turnaround",
                    "best_for": "Pre-seed to Series A founders"
                },
                "fundraising": {
                    "name": "Fundraising Sprint",
                    "price": "$1,699",
                    "includes": [
                        "3 x 1:1 live working sessions (3 hrs total)",
                        "Deep dive into storyline and metrics",
                        "Valuation narrative development",
                        "Investor list feedback and warm intros"
                    ],
                    "timeline": "2 weeks to investor-ready",
                    "best_for": "Founders actively raising"
                },
                "gtm": {
                    "name": "GTM Kickstart",
                    "price": "$1,699",
                    "includes": [
                        "3 x 1:1 working sessions (3 hrs total)",
                        "ICP and buyer persona definition",
                        "Messaging teardown and refinement",
                        "Sales narrative coaching"
                    ],
                    "timeline": "2 weeks",
                    "best_for": "Technical founders needing go-to-market help"
                }
            },
            
            "expertise_areas": [
                "AI/ML product commercialization",
                "Robotics and autonomy go-to-market",
                "Enterprise B2B sales strategies",
                "Defense tech market entry",
                "Hardware-software integration",
                "Technical team scaling",
                "Product-market fit for deep tech"
            ],
            
            "contact": {
                "email": "info@bicorp.ai",
                "booking": "https://bicorp.ai/book-now",
                "website": "https://bicorp.ai"
            },
            
            "founder_background": {
                "education": "Engineering background",
                "companies": ["SafeAI", "Multiple autonomy startups"],
                "specialties": ["Self-driving technology", "Industrial automation", "Mining and construction tech"],
                "investor_network": "Strong connections in Silicon Valley and defense tech"
            }
        }
        
        # Conversational response templates for natural flow
        self.response_patterns = {
            "greetings": [
                "Hey there! I'm here to help you navigate fundraising and scaling your AI or robotics startup. What brings you to BIC today?",
                "Hi! Great to connect. I work with AI and robotics founders on fundraising and growth. What's on your mind?",
                "Hello! Welcome to BIC. Whether it's pitch decks, fundraising, or GTM strategy, I'm here to help. What are you working on?"
            ],
            
            "acknowledgments": [
                "I see what you're getting at.",
                "That's a great question.",
                "Good point.",
                "Interesting.",
                "Makes sense.",
                "I understand."
            ],
            
            "transitions": [
                "Speaking of which,",
                "On that note,",
                "Actually,",
                "You know,",
                "By the way,",
                "That reminds me,"
            ],
            
            "clarifications": [
                "Let me clarify -",
                "To be specific,",
                "What I mean is,",
                "In other words,",
                "Put simply,"
            ],
            
            "off_topic_redirects": [
                "I'm not the right person to ask about that - I focus specifically on helping AI and robotics founders with BIC services. What about your startup can I help with?",
                "That's outside my wheelhouse - I stick to what I know best: fundraising and scaling AI/robotics companies. Got any questions about that?",
                "I don't have information on that topic. My expertise is in BIC's services for deep tech founders. What would you like to know about our offerings?",
                "Hmm, I can't help with that one. But if you have questions about pitch decks, fundraising, or GTM for your startup, I'm your person!",
                "That's not something I can speak to. I'm here specifically for BIC-related questions. Anything about our services you'd like to explore?"
            ],
            
            "unknown_info": [
                "I don't have that specific information, but you can reach out to info@bicorp.ai for details.",
                "That's a detailed question I can't answer fully - drop a note to info@bicorp.ai and they'll help you out.",
                "I don't have all those details handy. Best to email info@bicorp.ai for complete information.",
                "Good question, but I'd need to check on that. Contact info@bicorp.ai for the full answer."
            ]
        }
        
        # Audio settings
        self.sample_rate = 16000
        self.chunk_size = 1024
        self.channels = 1
        self.format = pyaudio.paInt16
        self.p = pyaudio.PyAudio()
        
        print("=" * 60)
        print("BIC AURA VOICE CHAT")
        print("=" * 60)
        print("Natural voice conversation within BIC knowledge domain")
        print("-" * 60)
    
    def generate_response(self, user_message: str) -> str:
        """
        Generate contextual, conversational response
        Maintains focus on BIC while being naturally engaging
        """
        message_lower = user_message.lower().strip()
        self.conversation_turn += 1
        
        # Add to conversation history
        self.conversation_history.append({"role": "user", "content": user_message})
        
        # Keep conversation history manageable
        if len(self.conversation_history) > 20:
            self.conversation_history = self.conversation_history[-20:]
        
        # Check if this is clearly off-topic
        if self._is_off_topic(message_lower):
            response = self._handle_off_topic()
        # Check for greeting or introduction
        elif self._is_greeting(message_lower) or self.conversation_turn == 1:
            response = self._handle_greeting()
        # Check for specific BIC topics
        elif self._is_about_services(message_lower):
            response = self._handle_services_question(message_lower)
        elif self._is_about_founder(message_lower):
            response = self._handle_founder_question(message_lower)
        elif self._is_about_process(message_lower):
            response = self._handle_process_question(message_lower)
        elif self._is_about_pricing(message_lower):
            response = self._handle_pricing_question(message_lower)
        elif self._is_about_booking(message_lower):
            response = self._handle_booking_question()
        # Handle follow-up questions
        elif self._is_follow_up(message_lower):
            response = self._handle_follow_up(message_lower)
        # Handle vague but potentially relevant questions
        else:
            response = self._handle_general_question(message_lower)
        
        # Add response to history
        self.conversation_history.append({"role": "assistant", "content": response})
        
        return response
    
    def _is_off_topic(self, message: str) -> bool:
        """Check if clearly outside BIC scope"""
        off_topic_indicators = [
            # Other companies
            "google", "apple", "microsoft", "amazon", "meta", "tesla", "openai",
            # General topics
            "weather", "sports", "news", "politics", "movie", "music", "game",
            "recipe", "travel", "vacation", "medical", "doctor", "health",
            # Abstract concepts not related to business
            "ocean", "mountain", "animal", "planet", "universe", "philosophy"
        ]
        
        # Check if asking about abstract concepts
        if any(word in message for word in off_topic_indicators):
            # But allow if it's metaphorical about business
            business_context = ["like", "similar", "analogy", "example", "startup", "business"]
            if not any(ctx in message for ctx in business_context):
                return True
        
        return False
    
    def _is_greeting(self, message: str) -> bool:
        """Check if user is greeting"""
        greetings = ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", "howdy"]
        return any(greet in message for greet in greetings)
    
    def _is_about_services(self, message: str) -> bool:
        """Check if asking about services"""
        service_keywords = ["service", "offer", "help", "pitch deck", "fundraising", "gtm", "go-to-market", "what do you do"]
        return any(keyword in message for keyword in service_keywords)
    
    def _is_about_founder(self, message: str) -> bool:
        """Check if asking about founder or company background"""
        founder_keywords = ["bibhrajit", "founder", "who are you", "background", "experience", "safeai", "credentials"]
        return any(keyword in message for keyword in founder_keywords)
    
    def _is_about_process(self, message: str) -> bool:
        """Check if asking about how things work"""
        process_keywords = ["how does", "how do", "process", "timeline", "what happens", "procedure", "steps"]
        return any(keyword in message for keyword in process_keywords)
    
    def _is_about_pricing(self, message: str) -> bool:
        """Check if asking about pricing"""
        price_keywords = ["price", "cost", "how much", "fee", "charge", "expensive", "budget", "afford"]
        return any(keyword in message for keyword in price_keywords)
    
    def _is_about_booking(self, message: str) -> bool:
        """Check if asking about booking"""
        book_keywords = ["book", "schedule", "meeting", "call", "session", "appointment", "talk", "connect"]
        return any(keyword in message for keyword in book_keywords)
    
    def _is_follow_up(self, message: str) -> bool:
        """Check if this is a follow-up to previous topic"""
        follow_ups = ["tell me more", "what else", "how about", "what about", "anything else", 
                     "more details", "can you explain", "interesting", "go on", "and"]
        
        # Short responses are often follow-ups
        if len(message.split()) <= 3:
            return True
            
        return any(phrase in message for phrase in follow_ups)
    
    def _handle_off_topic(self) -> str:
        """Handle off-topic questions naturally"""
        return random.choice(self.response_patterns["off_topic_redirects"])
    
    def _handle_greeting(self) -> str:
        """Handle greetings conversationally"""
        if self.conversation_turn == 1:
            return random.choice(self.response_patterns["greetings"])
        else:
            return "Hey! Still here to help with your startup journey. What would you like to know about BIC's services?"
    
    def _handle_services_question(self, message: str) -> str:
        """Handle service-related questions conversationally"""
        response = ""
        
        # Add acknowledgment sometimes
        if random.random() > 0.5:
            response += random.choice(self.response_patterns["acknowledgments"]) + " "
        
        if "pitch deck" in message:
            service = self.bic_knowledge["services"]["pitch_deck"]
            response += f"Our {service['name']} is perfect for founders who need to nail their story. "
            response += f"For {service['price']}, you get a complete deck overhaul - "
            response += f"we tear down your current deck, rebuild the narrative, and give you a clean template. "
            response += f"Plus a 1-hour session to work through it together. Most founders see dramatic improvements in investor engagement after this."
            self.last_topic = "pitch_deck"
            
        elif "fundraising" in message or "raise" in message:
            service = self.bic_knowledge["services"]["fundraising"]
            response += f"The {service['name']} is our most popular - {service['price']} for 2 weeks of intensive prep. "
            response += "We do three working sessions together, diving deep into your storyline, metrics, and valuation narrative. "
            response += "I'll also review your investor list and make warm intros where it makes sense. "
            response += "It's like having a fundraising co-pilot."
            self.last_topic = "fundraising"
            
        elif "gtm" in message or "go-to-market" in message or "market" in message:
            service = self.bic_knowledge["services"]["gtm"]
            response += f"Our {service['name']} helps technical founders crack the go-to-market code. "
            response += f"{service['price']} gets you three working sessions where we figure out exactly who your buyers are, "
            response += "craft messaging that resonates, and build a sales narrative that converts. "
            response += "Essential for B2B deep tech companies."
            self.last_topic = "gtm"
            
        else:
            # General services overview
            response += "We've got three core ways to help founders. "
            response += f"Pitch Deck Review ({self.bic_knowledge['services']['pitch_deck']['price']}) if your story needs work. "
            response += f"Fundraising Sprint ({self.bic_knowledge['services']['fundraising']['price']}) to get you investor-ready fast. "
            response += f"And GTM Kickstart ({self.bic_knowledge['services']['gtm']['price']}) for nailing your go-to-market. "
            response += "Which challenge are you facing right now?"
            self.last_topic = "services"
        
        return response
    
    def _handle_founder_question(self, message: str) -> str:
        """Handle questions about founder/company conversationally"""
        response = ""
        
        if "you" in message or "who" in message:
            response += "I'm part of BIC - Bibhrajit Investment Corporation. "
            response += "Our founder, Bibhrajit Halder, built and scaled SafeAI, "
            response += "so we've been in the trenches of deep tech fundraising ourselves. "
            response += "20+ years in autonomy and self-driving means we understand the unique challenges "
            response += "of hardware-software startups. We're not just advisors - we're operators who've done it."
        else:
            response += f"Bibhrajit founded BIC after leading SafeAI as CEO. "
            response += "His background is in self-driving and industrial automation - "
            response += "real technical depth combined with fundraising and scaling experience. "
            response += "That's why we focus specifically on AI, robotics, and autonomy startups."
        
        self.last_topic = "founder"
        return response
    
    def _handle_process_question(self, message: str) -> str:
        """Handle process/timeline questions"""
        response = "Great question about our process. "
        
        if self.last_topic and self.last_topic in self.bic_knowledge["services"]:
            service = self.bic_knowledge["services"][self.last_topic]
            response += f"For the {service['name']}, you'll get {service['timeline']}. "
            response += "We start immediately after booking, work intensively together, "
            response += "and you walk away with tangible deliverables and clear next steps."
        else:
            response += "All our programs are designed to be fast and intensive. "
            response += "Pitch deck review takes about a week, while our Sprint programs run 2 weeks. "
            response += "We believe in rapid iteration and getting you results quickly."
        
        return response
    
    def _handle_pricing_question(self, message: str) -> str:
        """Handle pricing questions conversationally"""
        response = ""
        
        # Sometimes acknowledge the question
        if random.random() > 0.5:
            response += "Sure, let's talk pricing. "
        
        response += "We keep it simple - "
        response += f"Pitch Deck Review is {self.bic_knowledge['services']['pitch_deck']['price']}, "
        response += f"both the Fundraising Sprint and GTM Kickstart are {self.bic_knowledge['services']['fundraising']['price']}. "
        response += "These are one-time fees, no hidden costs. "
        response += "Honestly, it's a fraction of what you'd pay traditional consultants, "
        response += "and you're working directly with people who've actually built and scaled startups."
        
        self.last_topic = "pricing"
        return response
    
    def _handle_booking_question(self) -> str:
        """Handle booking requests"""
        responses = [
            f"Absolutely! Head to {self.bic_knowledge['contact']['booking']} to book directly. "
            f"Pick the service that fits your needs and grab a time that works. Looking forward to working together!",
            
            f"You can book right now at {self.bic_knowledge['contact']['booking']}. "
            f"The calendar shows available slots, just pick what works for you. "
            f"Or shoot an email to {self.bic_knowledge['contact']['email']} if you have questions first.",
            
            f"Ready to get started? Book at {self.bic_knowledge['contact']['booking']}. "
            f"We usually have slots available within the week. Let's make it happen!"
        ]
        return random.choice(responses)
    
    def _handle_follow_up(self, message: str) -> str:
        """Handle follow-up questions based on context"""
        if not self.last_topic:
            return "What specifically would you like to know? I can tell you about our services, process, or how we can help your startup."
        
        response = ""
        
        # Add transition sometimes
        if random.random() > 0.6:
            response += random.choice(self.response_patterns["transitions"]) + " "
        
        if self.last_topic in self.bic_knowledge["services"]:
            service = self.bic_knowledge["services"][self.last_topic]
            
            # Provide additional details
            if "include" in str(service):
                response += "here's what you get: " + ", ".join(service["includes"][:2]) + ". "
                response += f"It's designed for {service['best_for']}. "
            
            response += "Want to book a session or learn about our other services?"
            
        elif self.last_topic == "pricing":
            response += "These prices are for the complete program - no hourly billing or surprise fees. "
            response += "You get all the sessions, materials, and support included. "
            response += "It's an investment in getting your startup to the next level."
            
        elif self.last_topic == "founder":
            response += "What's unique about working with us is the operational experience. "
            response += "We've raised capital, hired teams, shipped products, and navigated acquisitions. "
            response += "So when we work with founders, it's practical advice, not theory."
            
        else:
            response += "Happy to dive deeper. What aspect would you like to explore - "
            response += "the specific deliverables, timeline, or how it applies to your situation?"
        
        return response
    
    def _handle_general_question(self, message: str) -> str:
        """Handle general or vague questions"""
        
        # Check if they're asking something we might know but phrased differently
        if any(word in message for word in ["help", "need", "problem", "challenge", "struggling"]):
            response = "I hear you. Tell me more about your specific challenge - "
            response += "is it about crafting your pitch, finding the right investors, "
            response += "or figuring out your go-to-market? "
            response += "That'll help me point you to the right solution."
            
        elif any(word in message for word in ["startup", "company", "building", "working"]):
            response = "Sounds like you're in building mode! "
            response += "At what stage is your startup? "
            response += "We typically work with founders from pre-seed through Series A, "
            response += "especially in AI, robotics, and autonomy. "
            response += "What's your biggest blocker right now?"
            
        elif len(message.split()) <= 5:  # Short, unclear message
            responses = [
                "Not sure I follow - can you tell me more about what you're looking for?",
                "Could you elaborate? Happy to help with anything BIC-related.",
                "What specifically would you like to know about our services or approach?",
                "Tell me more about what you need help with - pitch, fundraising, or GTM?"
            ]
            response = random.choice(responses)
            
        else:
            # Default to unknown but helpful
            response = "That's not something I have specific details on. "
            response += f"For questions beyond our standard services, reach out to {self.bic_knowledge['contact']['email']}. "
            response += "But if you're looking for help with pitch decks, fundraising, or GTM, I'm your person!"
        
        return response
    
    def speak(self, text: str):
        """Generate TTS and play audio"""
        if not text:
            return
        
        print("Generating speech...")
        
        # Limit text for TTS
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
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("success") and data.get("audio"):
                    # Decode and play audio
                    audio_bytes = base64.b64decode(data["audio"])
                    audio_io = io.BytesIO(audio_bytes)
                    pygame.mixer.music.load(audio_io)
                    pygame.mixer.music.play()
                    
                    # Wait for playback to complete
                    while pygame.mixer.music.get_busy():
                        pygame.time.wait(100)
                        
        except Exception as e:
            print(f"TTS error: {e}")
    
    def record_from_microphone(self) -> str:
        """Record and transcribe voice input"""
        print("\n" + "=" * 50)
        print("LISTENING...")
        print("=" * 50)
        print("Speak now...")
        
        CHUNK = 1024
        FORMAT = pyaudio.paInt16
        CHANNELS = 1
        RATE = 16000
        RECORD_SECONDS = 5
        
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
        
        # Record audio with silence detection
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
        
        print("Processing...")
        
        if len(frames) < 10:
            return ""
        
        # Save and transcribe
        temp_file = None
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                temp_file = tmp.name
            
            # Write WAV file
            wf = wave.open(temp_file, 'wb')
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(self.p.get_sample_size(FORMAT))
            wf.setframerate(RATE)
            wf.writeframes(b''.join(frames))
            wf.close()  # Important: Close before reading
            
            # Add small delay to ensure file is fully written
            time.sleep(0.1)
            
            # Now read and send the file
            with open(temp_file, 'rb') as audio_file:
                files = {'audio': ('audio.wav', audio_file, 'audio/wav')}
                data = {'language': 'en'}
                
                response = requests.post(
                    f"{self.backend_url}/voice/transcribe",
                    files=files,
                    data=data,
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result.get('text', '')
                else:
                    print(f"Transcription failed: {response.status_code}")
                    return ""
                    
        except Exception as e:
            print(f"Transcription error: {e}")
            return ""
        finally:
            # Clean up temp file with retry logic
            if temp_file and os.path.exists(temp_file):
                for attempt in range(3):
                    try:
                        time.sleep(0.1)  # Small delay before cleanup
                        os.unlink(temp_file)
                        break
                    except PermissionError:
                        if attempt < 2:
                            time.sleep(0.5)  # Wait longer and retry
                        else:
                            print(f"Warning: Could not delete temporary file {temp_file}")
                    except Exception:
                        break  # File already deleted or other error
    
    def chat(self, message: str):
        """Process message and respond"""
        # Generate response
        response = self.generate_response(message)
        print(f"[BIC] {response}")
        
        # Speak response
        self.speak(response)
        
        return response
    
    def run(self):
        """Main voice conversation loop"""
        print("\n" + "=" * 60)
        print("BIC AURA - Voice Mode")
        print("=" * 60)
        print("Press Enter to start recording, Ctrl+C to exit")
        print("-" * 60)
        
        # Initial greeting
        initial = random.choice(self.response_patterns["greetings"])
        print(f"[BIC] {initial}")
        self.speak(initial)
        
        while True:
            try:
                print("\n[Press Enter to speak]")
                # Wait for fresh Enter press
                user_input = input().strip()
                
                # If user typed something other than just pressing Enter, handle it
                if user_input:
                    if user_input.lower() in ['quit', 'exit', 'goodbye', 'bye']:
                        farewell = "Great talking with you! When you're ready to level up your startup, you know where to find us. Take care!"
                        print(f"[BIC] {farewell}")
                        self.speak(farewell)
                        break
                    else:
                        print("Press Enter without typing anything to start voice recording, or type 'quit' to exit.")
                        continue  # Go back to waiting for Enter
                
                transcription = self.record_from_microphone()
                if transcription:
                    print(f"[YOU] {transcription}")
                    
                    # Check for quit command
                    if transcription.lower().strip() in ['quit', 'exit', 'goodbye', 'bye']:
                        farewell = "Great talking with you! When you're ready to level up your startup, you know where to find us. Take care!"
                        print(f"[BIC] {farewell}")
                        self.speak(farewell)
                        break
                    
                    # Process and respond
                    self.chat(transcription)
                else:
                    print("No speech detected. Try again.")
                
            except KeyboardInterrupt:
                print("\n\nGoodbye!")
                break
            except Exception as e:
                print(f"Error: {e}")
                print("Try again...")


def main():
    """Entry point"""
    print("\nBIC AURA Voice-Only Conversational Chat System")
    print("=" * 50)
    
    # Initialize chat
    chat = BICConversationalChat()
    
    # Test backend connection
    try:
        response = requests.get(f"{chat.backend_url}/health", timeout=5)
        print("✓ Backend connected")
    except:
        print("✗ Backend not running")
        print("  Start with: cd backend && python -m uvicorn app.main:app --reload")
        return
    
    # Start voice conversation
    chat.run()


if __name__ == "__main__":
    main()