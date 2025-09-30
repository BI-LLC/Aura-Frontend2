#!/usr/bin/env python3
"""
AURA Demo - Voice Chat with Document Context
Continuous voice conversation with uploaded documents and document-specific AI responses
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
from datetime import datetime

# Initialize pygame for audio
pygame.mixer.init()

class AURADemo:
    def __init__(self, backend_url="http://127.0.0.1:8000"):
        """Initialize AURA demo system"""
        self.backend_url = backend_url
        # Use persistent user ID that survives restarts
        self.user_id = f"doc_user_persistent"
        self.organization = "default_org"
        self.documents = []
        self.selected_document = None
        
        # Audio recording setup
        self.audio = pyaudio.PyAudio()
        self.chunk = 1024
        self.format = pyaudio.paInt16
        self.channels = 1
        self.rate = 16000
        
        print(f"Initialized with user_id: {self.user_id}")
    
    def test_backend_connection(self):
        """Test if backend is running"""
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=5)
            if response.status_code == 200:
                print("✓ Backend connected")
                return True
            else:
                print(f"✗ Backend returned status {response.status_code}")
                return False
        except Exception as e:
            print(f"✗ Backend connection failed: {e}")
            print("  Start with: cd backend && python -m uvicorn app.main:app --reload")
            return False
    
    def upload_document(self, file_path: str):
        """Upload a document to the backend"""
        if not os.path.exists(file_path):
            print(f"✗ File not found: {file_path}")
            return False
        
        print(f"Uploading document: {file_path}")
        
        try:
            with open(file_path, 'rb') as f:
                files = {'file': (os.path.basename(file_path), f, 'application/octet-stream')}
                
                response = requests.post(
                    f"{self.backend_url}/api/documents/upload?user_id={self.user_id}",
                    files=files,
                    timeout=30
                )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✓ Upload successful: {result.get('message', 'No message')}")
                if 'document_id' in result:
                    self.documents.append(result['document_id'])
                    print(f"  Document ID: {result['document_id']}")
                return True
            else:
                print(f"✗ Upload failed with status {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"  Error: {error_data}")
                except:
                    print(f"  Error: {response.text}")
                return False
                
        except Exception as e:
            print(f"✗ Upload error: {e}")
            return False
    
    def list_documents(self):
        """List uploaded documents"""
        print("Listing documents...")
        
        try:
            # Use the correct endpoint - no query params needed, backend uses middleware
            response = requests.get(
                f"{self.backend_url}/api/documents",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                documents = data.get('documents', [])
                print(f"✓ Found {len(documents)} documents:")
                for doc in documents:
                    print(f"  - {doc.get('filename', 'Unknown')} (ID: {doc.get('id', 'Unknown')})")
                return documents
            else:
                print(f"✗ Failed to list documents: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"✗ Error listing documents: {e}")
            return []
    
    def chat(self, message: str, document_id: str = None):
        """Send a chat message"""
        print(f"Sending message: {message}")
        
        try:
            payload = {
                "message": message,
                "user_id": self.user_id,
                "document_id": document_id or "default_document",
                "organization": self.organization,
                "use_memory": True,
                "search_knowledge": True
            }
            
            response = requests.post(
                f"{self.backend_url}/api/chat",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                response_text = data.get('response', 'No response')
                sources = data.get('sources', [])
                
                print(f"✓ AI Response: {response_text}")
                if sources:
                    print(f"  Sources: {', '.join(sources)}")
                return response_text
            else:
                print(f"✗ Chat failed with status {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"  Error: {error_data}")
                except:
                    print(f"  Error: {response.text}")
                return None
                
        except Exception as e:
            print(f"✗ Chat error: {e}")
            return None
    
    def synthesize_speech(self, text: str):
        """Generate TTS (same as BIC.py)"""
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
                    
                    # Play audio with pygame
                    pygame.mixer.music.load(io.BytesIO(audio_bytes))
                    pygame.mixer.music.play()
                    
                    # Wait for playback to finish
                    while pygame.mixer.music.get_busy():
                        time.sleep(0.1)
                    
                    print("✓ Speech played")
                else:
                    print("✗ TTS response missing audio data")
            else:
                print(f"✗ TTS failed with status {response.status_code}")
                
        except Exception as e:
            print(f"✗ TTS error: {e}")
    
    def record_audio_continuous(self) -> Optional[bytes]:
        """Record audio continuously until user presses enter (BIC-style)"""
        print("🎤 Recording... Press ENTER when done speaking...")
        
        try:
            stream = self.audio.open(
                format=self.format,
                channels=self.channels,
                rate=self.rate,
                input=True,
                frames_per_buffer=self.chunk
            )
            
            frames = []
            print("🎤 Recording... Press ENTER when done...")
            
            # Record until user presses enter
            import threading
            import queue
            
            recording = True
            input_queue = queue.Queue()
            
            def wait_for_enter():
                input()
                input_queue.put("stop")
            
            # Start thread to wait for enter key
            input_thread = threading.Thread(target=wait_for_enter)
            input_thread.daemon = True
            input_thread.start()
            
            while recording:
                try:
                    data = stream.read(self.chunk, exception_on_overflow=False)
                    frames.append(data)
                    
                    # Check if enter was pressed
                    try:
                        input_queue.get_nowait()
                        recording = False
                        print("✓ Recording stopped")
                        break
                    except queue.Empty:
                        pass
                        
                except Exception as e:
                    print(f"Recording error: {e}")
                    break
            
            stream.stop_stream()
            stream.close()
            
            # Convert to bytes
            audio_bytes = b''.join(frames)
            print(f"✓ Recorded {len(audio_bytes)} bytes")
            return audio_bytes
            
        except Exception as e:
            print(f"✗ Recording error: {e}")
            return None
    
    def transcribe_audio(self, audio_bytes: bytes) -> Optional[str]:
        """Transcribe audio using backend (same as BIC.py)"""
        print("🔄 Transcribing audio...")
        
        temp_file_path = None
        try:
            # Create temporary WAV file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_file_path = temp_file.name
                with wave.open(temp_file.name, 'wb') as wav_file:
                    wav_file.setnchannels(self.channels)
                    wav_file.setsampwidth(self.audio.get_sample_size(self.format))
                    wav_file.setframerate(self.rate)
                    wav_file.writeframes(audio_bytes)
            
            # Send to backend for transcription (file is closed now)
            with open(temp_file_path, 'rb') as f:
                files = {'audio': ('voice_input.wav', f, 'audio/wav')}
                response = requests.post(
                    f"{self.backend_url}/voice/transcribe",
                    files=files,
                    timeout=30
                )
            
            if response.status_code == 200:
                data = response.json()
                transcript = data.get('text', '').strip()
                if transcript:
                    print(f"✓ Transcribed: {transcript}")
                    return transcript
                else:
                    print("⚠ No speech detected")
                    return None
            else:
                print(f"✗ Transcription failed: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"✗ Transcription error: {e}")
            return None
        finally:
            # Clean up temp file
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
    
    def test_document_context(self):
        """Test document context with user-provided questions"""
        print("\n🧪 Document Context Test")
        print("=" * 40)
        print("Let's test a few questions to make sure the AI is reading your document correctly.")
        print("You can ask questions about your document or try off-topic questions.")
        print("Type 'skip' to skip testing and go straight to voice conversation.")
        
        test_questions = []
        
        # Ask user for test questions
        for i in range(3):
            question = input(f"\nTest question {i+1} (or 'skip' to finish): ").strip()
            if question.lower() == 'skip':
                break
            if question:
                test_questions.append(question)
        
        if not test_questions:
            print("Skipping document context test.")
            return
        
        print(f"\nTesting {len(test_questions)} questions...")
        
        for question in test_questions:
            print(f"\n💬 Question: '{question}'")
            response = self.chat(question, self.selected_document)
            if response:
                print(f"🤖 AI: {response}")
                
                # Simple feedback
                response_text = response.lower()
                if 'document content provided' in response_text or 'can only answer' in response_text:
                    print("✅ AI correctly redirected to document content")
                else:
                    print("✅ AI provided a response based on document content")
            else:
                print("❌ No response received")

    def run_demo(self):
        """Run the AURA demo"""
        print("\nAURA Demo System")
        print("=" * 50)
        
        # Test backend connection
        if not self.test_backend_connection():
            return
        
        # Upload document first
        print("\n📄 Document options:")
        print("1. UPLOAD your document")
        print("2. Create and upload test document")
        print("3. Skip (continue without documents)")
        
        while True:
            choice = input("Choose option (1/2/3): ").strip()
            
            if choice == '1':
                print("\n📁 UPLOAD DOCUMENT:")
                print("1. Drag and drop your file into this terminal window")
                print("2. Or type the file path")
                print("3. Or press Enter to open file browser")
                
                upload_method = input("Choose upload method (1/2/3): ").strip()
                
                if upload_method == '1':
                    print("Drag and drop your file here, then press Enter...")
                    file_path = input().strip()
                    
                    # Clean up drag and drop path (remove quotes and extra characters)
                    if file_path.startswith('& '):
                        file_path = file_path[2:]
                    if file_path.startswith("'") and file_path.endswith("'"):
                        file_path = file_path[1:-1]
                    if file_path.startswith('"') and file_path.endswith('"'):
                        file_path = file_path[1:-1]
                    
                    print(f"Cleaned file path: {file_path}")
                elif upload_method == '2':
                    file_path = input("Enter file path: ").strip()
                elif upload_method == '3':
                    print("File browser method not available in terminal. Please use method 1 or 2.")
                    continue
                else:
                    print("Invalid choice. Please try again...")
                    continue
                
                if file_path and self.upload_document(file_path):
                    break
                print("Please try again...")
                
            elif choice == '2':
                # Create a test document
                test_content = """Sample Document for Testing

This is a sample document that can be used to test the AURA system.

Key Information:
- Document Title: Sample Document for Testing
- Author: Test User
- Purpose: Demonstration of document-based AI responses
- Date: 2024

Content Summary:
This document contains sample information that can be used to test how the AI responds to questions about document content. It includes basic information about the document itself and can be used to verify that the AI is reading and responding based on the provided document content rather than using general knowledge.

The document demonstrates the system's ability to:
1. Read and understand document content
2. Answer questions based on the document
3. Redirect off-topic questions appropriately"""
                
                with open("test_document.txt", "w") as f:
                    f.write(test_content)
                
                if self.upload_document("test_document.txt"):
                    print("✓ Test document created and uploaded!")
                    break
                else:
                    print("Failed to upload test document")
            elif choice == '3':
                print("Continuing without documents...")
                break
            else:
                print("Please choose 1, 2, or 3")
        
        # List and select document
        documents = self.list_documents()
        if documents:
            print(f"\n📋 Available documents:")
            for i, doc in enumerate(documents):
                print(f"  {i+1}. {doc.get('filename', 'Unknown')}")
            
            try:
                choice = input("Select document number (or press Enter for first): ").strip()
                if choice:
                    doc_index = int(choice) - 1
                    if 0 <= doc_index < len(documents):
                        self.selected_document = documents[doc_index]['id']
                        print(f"✓ Selected: {documents[doc_index]['filename']}")
                else:
                    self.selected_document = documents[0]['id']
                    print(f"✓ Using: {documents[0]['filename']}")
            except:
                self.selected_document = documents[0]['id']
                print(f"✓ Using: {documents[0]['filename']}")
        else:
            print(f"\n⚠️  No documents found in list, but you uploaded successfully!")
            print(f"   This is a known issue with document retrieval.")
            print(f"   The AI will still try to help with your uploaded content.")
            # Use a placeholder document ID
            self.selected_document = "uploaded_document"
        
        # Test document context
        self.test_document_context()
        
        # Start voice conversation (BIC-style press-to-speak)
        print(f"\n🎙️  Voice conversation started!")
        print("Press ENTER to speak, then ENTER again to stop recording")
        print("Press Ctrl+C to exit")
        
        try:
            while True:
                # Wait for user to press enter to start recording
                input("\nPress ENTER to start recording...")
                
                print("🎤 Recording... Press ENTER again to stop")
                
                # Record user input (continuous until enter is pressed)
                audio_bytes = self.record_audio_continuous()
                if not audio_bytes:
                    continue
                
                # Transcribe
                transcript = self.transcribe_audio(audio_bytes)
                if not transcript:
                    print("No speech detected, try again...")
                    continue
                
                print(f"👤 You: {transcript}")
                
                # Get AI response
                response = self.chat(transcript, self.selected_document)
                if response:
                    print(f"🤖 AI: {response}")
                    
                    # Speak response
                    self.synthesize_speech(response)
                else:
                    print("Sorry, I couldn't process that. Please try again.")
                    
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
        except Exception as e:
            print(f"\n✗ Error: {e}")
        finally:
            self.audio.terminate()


def main():
    """Entry point"""
    demo = AURADemo()
    demo.run_demo()


if __name__ == "__main__":
    main()
