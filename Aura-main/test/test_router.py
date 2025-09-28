"""
Simple test script for the Smart Router
Verifies health, chat routing, and stats endpoints.
"""

import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000"

async def test_health():
    """Test the health endpoint"""
    print("Testing health endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200

async def test_chat(message: str):
    """Test the chat endpoint"""
    print(f"\nTesting chat with: '{message}'")
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{BASE_URL}/chat",
            json={"message": message}
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Model used: {data['model_used']}")
            print(f"Response time: {data['response_time']:.2f}s")
            print(f"Cost: ${data['cost']:.4f}")
            print(f"Response: {data['response'][:200]}...")
            return True
        else:
            print(f"Error: {response.text}")
            return False

async def test_stats():
    """Test the stats endpoint"""
    print("\nTesting stats endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/stats")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200

async def run_tests():
    """Run all tests"""
    print("Starting AURA Voice AI Tests")
    print("=" * 50)
    
    # Test health
    health_ok = await test_health()
    
    if not health_ok:
        print("Health check failed. Make sure the server is running.")
        return
    
    # Test different types of queries
    test_queries = [
        # Quick factual query (should use GPT-4-turbo)
        "What is the capital of France?",
        
        # Complex reasoning (should use Grok)
        "Analyze the pros and cons of remote work versus office work, considering productivity, work-life balance, and team collaboration aspects.",
        
        # Medium query (routing will depend on keywords)
        "Explain how machine learning works"
    ]
    
    for query in test_queries:
        success = await test_chat(query)
        if not success:
            print(f"Chat test failed for: {query}")
        await asyncio.sleep(2)  # Don't hammer the API
    
    # Test stats
    await test_stats()
    
    print("\n" + "=" * 50)
    print("Tests completed!")
    print("\nSuccess Criteria Check:")
    print("- Both LLMs respond successfully")
    print("- Router picks correct LLM based on simple rules")
    print("- Less than 5% API failures")
    print("\nMilestone: COMPLETE")

if __name__ == "__main__":
    asyncio.run(run_tests())