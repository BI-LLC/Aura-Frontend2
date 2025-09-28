#!/usr/bin/env python3
"""
Test the direct_openai_chat function directly
"""

import sys
import os
sys.path.append('backend')

import asyncio
from app.main import direct_openai_chat

async def test_direct_chat():
    """Test direct_openai_chat function directly"""
    print("🧪 Testing direct_openai_chat Function Directly")
    print("=" * 60)
    
    # Test with off-topic question
    print("💬 Testing off-topic question: 'What is the ocean?'")
    response = await direct_openai_chat(
        message="What is the ocean?",
        user_id="test_user",
        document_id="default_document",
        organization="default_org"
    )
    
    print(f"🤖 AI Response: {response.content}")
    print(f"🔧 Model Used: {response.model_used}")
    
    # Check if response redirects properly
    response_text = response.content.lower()
    redirect_indicators = [
        'document content provided',
        'can only answer',
        'not in the document',
        'ask me something about the document',
        'don\'t know that information from the document'
    ]
    
    found_redirect = any(indicator in response_text for indicator in redirect_indicators)
    
    if found_redirect:
        print("✅ Response properly redirects to document content!")
    else:
        print("⚠️  Response doesn't redirect properly")
        print("🔍 Looking for redirect indicators...")
        for indicator in redirect_indicators:
            if indicator in response_text:
                print(f"   ✅ Found: '{indicator}'")
            else:
                print(f"   ❌ Missing: '{indicator}'")
    
    print("\n" + "=" * 60)
    
    # Test with document-specific question
    print("💬 Testing document-specific question: 'What is nepotism protocol?'")
    response2 = await direct_openai_chat(
        message="What is nepotism protocol?",
        user_id="test_user",
        document_id="default_document",
        organization="default_org"
    )
    
    print(f"🤖 AI Response: {response2.content}")
    print(f"🔧 Model Used: {response2.model_used}")
    
    # Check if response contains document content
    response_text2 = response2.content.lower()
    if 'nepotism' in response_text2 or 'protocol' in response_text2:
        print("✅ Response contains document-specific content!")
    else:
        print("⚠️  Response doesn't contain document-specific content")

if __name__ == "__main__":
    asyncio.run(test_direct_chat())
