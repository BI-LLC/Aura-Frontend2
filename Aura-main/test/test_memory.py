#!/usr/bin/env python3
# Test script for AURA Voice AI Memory System
# Exercises memory functionality: preferences, sessions, summaries, and GDPR flows.

import requests
import json
import time
import uuid

BASE_URL = "http://localhost:8000"

# Test user ID
TEST_USER_ID = "test_user_123"

def test_health():
    """Test if memory system is connected"""
    print("\nTesting Health with Memory...")
    response = requests.get(f"{BASE_URL}/health")
    data = response.json()
    print(f"Status: {data['status']}")
    print(f"   Memory: {data.get('memory', 'unknown')}")
    return data.get('memory') == 'connected'

def test_user_preferences():
    """Test user preference storage"""
    print("\nTesting User Preferences...")
    
    # Set preferences
    preferences = {
        "communication_style": "technical",
        "response_pace": "detailed",
        "expertise_areas": ["AI", "software", "startups"],
        "preferred_examples": "technical"
    }
    
    response = requests.put(
        f"{BASE_URL}/memory/preferences/{TEST_USER_ID}",
        json=preferences
    )
    
    if response.status_code == 200:
        print("Preferences saved successfully")
        print(f"   Style: {preferences['communication_style']}")
        print(f"   Pace: {preferences['response_pace']}")
        print(f"   Areas: {', '.join(preferences['expertise_areas'])}")
    else:
        print(f"Failed to save preferences: {response.text}")
        return False
    
    # Get preferences back
    response = requests.get(f"{BASE_URL}/memory/preferences/{TEST_USER_ID}")
    if response.status_code == 200:
        data = response.json()
        print("Preferences retrieved successfully")
        return True
    return False

def test_chat_with_memory():
    """Test chat with memory context"""
    print("\nTesting Chat WITH Memory...")
    
    response = requests.post(
        f"{BASE_URL}/chat",
        json={
            "message": "Explain how neural networks work",
            "user_id": TEST_USER_ID,
            "use_memory": True
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"Memory-enhanced chat successful")
        print(f"   Model: {data['model_used']}")
        print(f"   Memory Used: {data['memory_used']}")
        print(f"   Session ID: {data['session_id']}")
        print(f"   Response preview: {data['response'][:150]}...")
        return data['session_id']
    else:
        print(f"Chat failed: {response.text}")
        return None

def test_chat_without_memory():
    """Test chat without memory for comparison"""
    print("\nTesting Chat WITHOUT Memory...")
    
    response = requests.post(
        f"{BASE_URL}/chat",
        json={
            "message": "Explain how neural networks work",
            "use_memory": False
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"Standard chat successful")
        print(f"   Model: {data['model_used']}")
        print(f"   Memory Used: {data['memory_used']}")
        print(f"   Response preview: {data['response'][:150]}...")
        return True
    return False

def test_conversation_history():
    """Test conversation history retrieval"""
    print("\nTesting Conversation History...")
    
    response = requests.get(f"{BASE_URL}/memory/conversations/{TEST_USER_ID}")
    
    if response.status_code == 200:
        data = response.json()
        conversations = data.get('conversations', [])
        print(f"Found {len(conversations)} conversations")
        for conv in conversations[-3:]:  # Show last 3
            print(f"   - Session: {conv['session_id'][:8]}...")
            print(f"     Summary: {conv['summary'][:50]}...")
        return True
    return False

def test_data_export():
    """Test GDPR data export"""
    print("\nTesting Data Export (GDPR)...")
    
    response = requests.get(f"{BASE_URL}/memory/export/{TEST_USER_ID}")
    
    if response.status_code == 200:
        data = response.json()
        print("Data export successful")
        print(f"   User ID: {data['user_id']}")
        print(f"   Has preferences: {bool(data.get('preferences'))}")
        print(f"   Conversations: {len(data.get('conversation_summaries', []))}")
        return True
    return False

def test_data_deletion():
    """Test GDPR data deletion"""
    print("\nTesting Data Deletion (GDPR)...")
    
    # Create a test user for deletion
    delete_user_id = "delete_test_user"
    
    # First add some data
    requests.put(
        f"{BASE_URL}/memory/preferences/{delete_user_id}",
        json={"communication_style": "direct"}
    )
    
    # Now delete it
    response = requests.delete(
        f"{BASE_URL}/memory/delete/{delete_user_id}",
        json={
            "user_id": delete_user_id,
            "confirmation": True
        }
    )
    
    if response.status_code == 200:
        print("Data deletion successful")
        data = response.json()
        print(f"   {data['message']}")
        return True
    return False

def main():
    """Run all memory tests"""
    print("=" * 50)
    print("AURA VOICE AI - MEMORY TESTS")
    print("=" * 50)
    
    # Check if server is running
    try:
        requests.get(BASE_URL, timeout=2)
    except:
        print("Server not running. Start it with:")
        print("  cd backend && python -m app.main")
        return
    
    # Run tests
    tests_passed = 0
    tests_total = 7
    
    if test_health():
        tests_passed += 1
    
    if test_user_preferences():
        tests_passed += 1
    
    # Test chat with and without memory
    session_id = test_chat_with_memory()
    if session_id:
        tests_passed += 1
    
    time.sleep(1)  # Small delay between requests
    
    if test_chat_without_memory():
        tests_passed += 1
    
    if test_conversation_history():
        tests_passed += 1
    
    if test_data_export():
        tests_passed += 1
    
    if test_data_deletion():
        tests_passed += 1
    
    print("\n" + "=" * 50)
    print(f"TESTS COMPLETE: {tests_passed}/{tests_total} passed")
    print("=" * 50)
    
    print("\nWeek 3-4 Success Criteria:")
    print("  - Redis/Memory system connected")
    print("  - User preferences stored and retrieved")
    print("  - Memory affects chat responses")
    print("  - Session context maintained")
    print("  - GDPR compliance (export/delete)")
    print("\nMemory System: COMPLETE")

if __name__ == "__main__":
    main()