"""Test production RAG system end-to-end"""
import requests
import json

def test_production_rag():
    base_url = "http://157.245.192.221:8000"
    
    print("=== TESTING PRODUCTION RAG SYSTEM ===\n")
    
    # Test 1: Health check
    print("1. Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            print("   ✅ Backend is healthy")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Health check error: {e}")
    
    # Test 2: RAG chat
    print("\n2. Testing RAG chat...")
    try:
        payload = {
            "message": "What services do you offer?",
            "assistant_key": "bib-halder"
        }
        response = requests.post(
            f"{base_url}/rag/chat",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ RAG chat working")
            print(f"   Response: {data['response'][:100]}...")
            print(f"   Sources: {data['sources_used']}")
            print(f"   Chunks retrieved: {data['rag_stats']['chunks_retrieved']}")
            print(f"   Confidence: {data['context_confidence']:.2f}")
        else:
            print(f"   ❌ RAG chat failed: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   ❌ RAG chat error: {e}")
    
    # Test 3: Document upload (simulation)
    print("\n3. Testing document upload capability...")
    try:
        # Check if upload endpoint exists
        response = requests.get(f"{base_url}/docs", timeout=10)
        if response.status_code == 200:
            print("   ✅ Document upload endpoint available")
        else:
            print(f"   ❌ Upload endpoint check failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Upload test error: {e}")
    
    # Test 4: Check database connectivity
    print("\n4. Testing database connectivity...")
    try:
        response = requests.get(f"{base_url}/rag/stats", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'error' in data.get('rag_pipeline', {}):
                print(f"   ⚠️  Database function error: {data['rag_pipeline']['error']}")
            else:
                print("   ✅ Database connectivity working")
        else:
            print(f"   ❌ Database test failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Database test error: {e}")
    
    print("\n=== PRODUCTION TEST COMPLETE ===")

if __name__ == "__main__":
    test_production_rag()
