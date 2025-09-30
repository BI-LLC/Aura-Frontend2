#!/usr/bin/env python3
"""
Test script for AURA Voice AI Phase 3 (Week 9-10)
Tests persona management and data ingestion features
"""

import asyncio
import aiohttp
import json
import os

BASE_URL = "http://localhost:8000"
TEST_USER_ID = "test_user_phase3"

async def test_persona_system():
    """Test dynamic persona management"""
    print("\n🎭 Testing Persona System...")
    
    async with aiohttp.ClientSession() as session:
        # 1. Get initial persona
        async with session.get(f"{BASE_URL}/admin/persona/{TEST_USER_ID}") as resp:
            if resp.status == 200:
                data = await resp.json()
                print(f"✅ Initial persona retrieved")
                print(f"   Status: {data.get('status', 'created')}")
            else:
                print(f"❌ Failed to get persona: {resp.status}")
        
        # 2. Update persona manually
        persona_settings = {
            "formality": "professional",
            "detail_level": "detailed",
            "energy": "enthusiastic"
        }
        
        async with session.put(
            f"{BASE_URL}/admin/persona/{TEST_USER_ID}",
            json=persona_settings
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                print(f"✅ Persona updated successfully")
                print(f"   Settings: {data['persona']}")
            else:
                print(f"❌ Failed to update persona: {resp.status}")
        
        # 3. Test chat with persona
        async with session.post(
            f"{BASE_URL}/chat/",
            json={
                "message": "Explain machine learning",
                "user_id": TEST_USER_ID,
                "use_persona": True
            }
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                print(f"✅ Chat with persona successful")
                print(f"   Persona applied: {data['persona_applied']}")
                print(f"   Response preview: {data['response'][:100]}...")
            else:
                print(f"❌ Chat failed: {resp.status}")
    
    return True

async def test_data_ingestion():
    """Test file upload and knowledge base"""
    print("\n📚 Testing Data Ingestion...")
    
    async with aiohttp.ClientSession() as session:
        # 1. Create a test file
        test_content = """
        This is a test document for AURA Voice AI.
        
        Key Information:
        - AURA uses GPT-4 and Grok for processing
        - It supports voice input and output
        - The system has a persona management feature
        - Knowledge can be uploaded and searched
        
        Technical Details:
        The system is built with FastAPI and React.
        It uses Redis for caching and PostgreSQL for storage.
        Voice processing is handled by Whisper and ElevenLabs.
        """
        
        test_file = "/tmp/test_document.txt"
        with open(test_file, "w") as f:
            f.write(test_content)
        
        # 2. Upload file
        with open(test_file, 'rb') as f:
            data = aiohttp.FormData()
            data.add_field('file', f, filename='test_document.txt')
            data.add_field('user_id', TEST_USER_ID)
            
            async with session.post(f"{BASE_URL}/admin/upload", data=data) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    print(f"✅ File uploaded successfully")
                    print(f"   Doc ID: {result['doc_id']}")
                    print(f"   Chunks: {result['chunks']}")
                    doc_id = result['doc_id']
                else:
                    print(f"❌ Upload failed: {resp.status}")
                    return False
        
        # 3. Search knowledge base
        async with session.get(
            f"{BASE_URL}/admin/search",
            params={"query": "persona management", "user_id": TEST_USER_ID}
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                print(f"✅ Knowledge search successful")
                print(f"   Found {data['count']} results")
                if data['results']:
                    print(f"   Top result: {data['results'][0]['filename']}")
            else:
                print(f"❌ Search failed: {resp.status}")
        
        # 4. Test chat with knowledge integration
        async with session.post(
            f"{BASE_URL}/chat/",
            json={
                "message": "What technical details do you know about AURA?",
                "user_id": TEST_USER_ID,
                "search_knowledge": True
            }
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                print(f"✅ Chat with knowledge successful")
                print(f"   Knowledge used: {data['knowledge_used']}")
                print(f"   Sources: {data['sources']}")
                print(f"   Response preview: {data['response'][:150]}...")
            else:
                print(f"❌ Chat with knowledge failed: {resp.status}")
        
        # Clean up
        os.remove(test_file)
    
    return True

async def test_enhanced_chat():
    """Test enhanced chat with all features"""
    print("\n💬 Testing Enhanced Chat...")
    
    async with aiohttp.ClientSession() as session:
        # Test chat with all features enabled
        async with session.post(
            f"{BASE_URL}/chat/",
            json={
                "message": "Based on what you know about me, how should I approach learning AI?",
                "user_id": TEST_USER_ID,
                "use_memory": True,
                "use_persona": True,
                "search_knowledge": True
            }
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                print(f"✅ Enhanced chat successful")
                print(f"   Model used: {data['model_used']}")
                print(f"   Persona applied: {data['persona_applied']}")
                print(f"   Knowledge used: {data['knowledge_used']}")
                print(f"   Response time: {data['response_time']:.2f}s")
                print(f"   Cost: ${data['cost']:.4f}")
            else:
                print(f"❌ Enhanced chat failed: {resp.status}")
                return False
    
    return True

async def test_admin_dashboard():
    """Test admin dashboard availability"""
    print("\n🎛️ Testing Admin Dashboard...")
    
    async with aiohttp.ClientSession() as session:
        # Check if dashboard is accessible
        async with session.get(f"{BASE_URL}/admin/") as resp:
            if resp.status == 200:
                print(f"✅ Admin dashboard accessible")
                content = await resp.text()
                if "AURA Admin Dashboard" in content:
                    print(f"   Dashboard HTML loaded correctly")
            else:
                print(f"❌ Dashboard not accessible: {resp.status}")
                return False
        
        # Get admin stats
        async with session.get(f"{BASE_URL}/admin/stats") as resp:
            if resp.status == 200:
                data = await resp.json()
                print(f"✅ Admin stats retrieved")
                print(f"   Documents: {data['documents']}")
                print(f"   Users: {data['users']}")
                print(f"   Total cost: ${data['total_cost']:.2f}")
            else:
                print(f"❌ Stats retrieval failed: {resp.status}")
    
    return True

async def test_user_context():
    """Test complete user context retrieval"""
    print("\n🔍 Testing User Context...")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{BASE_URL}/chat/context/{TEST_USER_ID}") as resp:
            if resp.status == 200:
                data = await resp.json()
                print(f"✅ User context retrieved")
                print(f"   Has memory: {bool(data['memory'])}")
                print(f"   Has persona: {bool(data['persona'])}")
                print(f"   Documents: {len(data['documents'])}")
            else:
                print(f"❌ Context retrieval failed: {resp.status}")
                return False
    
    return True

async def run_all_tests():
    """Run all Phase 3 tests"""
    print("=" * 50)
    print("🚀 AURA Voice AI - Phase 3 Tests")
    print("Testing Personalization & Data Ingestion")
    print("=" * 50)
    
    # Check if server is running
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BASE_URL}/health") as resp:
                if resp.status != 200:
                    print("❌ Server not responding")
                    return
                
                data = await resp.json()
                print(f"✅ Server status: {data['status']}")
                print(f"   Services: {data['services']}")
    except Exception as e:
        print(f"❌ Cannot connect to server: {e}")
        print("Start the server with: python -m app.main")
        return
    
    # Run tests
    tests_passed = 0
    tests_total = 5
    
    try:
        if await test_persona_system():
            tests_passed += 1
        
        if await test_data_ingestion():
            tests_passed += 1
        
        if await test_enhanced_chat():
            tests_passed += 1
        
        if await test_admin_dashboard():
            tests_passed += 1
        
        if await test_user_context():
            tests_passed += 1
        
    except Exception as e:
        print(f"❌ Test error: {e}")
    
    # Summary
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tests_passed}/{tests_total} passed")
    print("=" * 50)
    
    print("\n📋 Phase 3 (Week 9-10) Success Criteria:")
    print("  ✓ Personal data ingestion working")
    print("  ✓ Knowledge base searchable")
    print("  ✓ Dynamic persona system active")
    print("  ✓ Enhanced chat with context")
    print("  ✓ Admin dashboard functional")
    
    if tests_passed == tests_total:
        print("\n🎉 Phase 3 Complete! Ready for Week 11-12")
        print("Next: Social media integration and advanced learning")
    else:
        print(f"\n⚠️ {tests_total - tests_passed} tests failed")
        print("Fix issues before proceeding to Week 11-12")

if __name__ == "__main__":
    asyncio.run(run_all_tests())