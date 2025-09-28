#!/usr/bin/env python3
"""
Quick test script to check API connectivity
"""

import asyncio
from app.services.smart_router import SmartRouter

async def test_apis():
    print("🔍 Testing API connectivity...")
    router = SmartRouter()
    
    print("\n📡 Testing OpenAI...")
    try:
        response = await router._call_openai("Hello, this is a test message")
        print(f"✅ OpenAI OK: {response.model_used}")
        print(f"   Response: {response.content[:100]}...")
    except Exception as e:
        print(f"❌ OpenAI Error: {e}")
    
    print("\n📡 Testing Grok...")
    try:
        response = await router._call_grok("Hello, this is a test message")
        print(f"✅ Grok OK: {response.model_used}")
        print(f"   Response: {response.content[:100]}...")
    except Exception as e:
        print(f"❌ Grok Error: {e}")
    
    print("\n🔍 Testing health status...")
    try:
        health = await router.get_health_status()
        print(f"Health status: {health}")
    except Exception as e:
        print(f"❌ Health check error: {e}")

if __name__ == "__main__":
    asyncio.run(test_apis())
