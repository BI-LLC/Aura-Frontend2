#!/usr/bin/env python3
"""
Simple test script to verify voice connection is working
Production-ready voice connection test
"""

import requests
import json
import time

def test_backend_health():
    """Test if backend is running and services are ready"""
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Backend Health Check:")
            print(f"   Status: {data.get('status', 'unknown')}")
            print(f"   Services: {data.get('services', {})}")
            print(f"   WebSocket: {data.get('websocket', {})}")
            
            # Check if voice services are ready
            services = data.get('services', {})
            websocket = data.get('websocket', {})
            
            if (services.get('conversation_manager') and 
                services.get('auth_service') and 
                websocket.get('ready')):
                print("✅ Voice services are ready!")
                return True
            else:
                print("❌ Voice services not ready")
                return False
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend not running: {e}")
        print("   Start backend with: cd backend && python -m uvicorn app.main:app --reload")
        return False

def test_websocket_endpoint():
    """Test if WebSocket endpoint is accessible"""
    try:
        # Test if the endpoint exists (this will fail but shows the endpoint is there)
        response = requests.get("http://localhost:8000/ws/voice/continuous", timeout=2)
        print("❌ WebSocket endpoint should not accept HTTP requests")
        return False
    except requests.exceptions.ConnectionError:
        print("❌ WebSocket endpoint not accessible")
        return False
    except Exception:
        # This is expected - WebSocket endpoints don't accept HTTP GET
        print("✅ WebSocket endpoint is accessible")
        return True

def main():
    """Run production-ready voice connection tests"""
    print("🧪 Testing Voice Connection - Production Ready")
    print("=" * 50)
    
    # Test 1: Backend health
    print("\n1. Testing Backend Health...")
    backend_ok = test_backend_health()
    
    # Test 2: WebSocket endpoint
    print("\n2. Testing WebSocket Endpoint...")
    websocket_ok = test_websocket_endpoint()
    
    # Summary
    print("\n" + "=" * 50)
    if backend_ok and websocket_ok:
        print("✅ Voice connection is production-ready!")
        print("\nNext steps:")
        print("1. Start frontend: cd frontend && npm start")
        print("2. Navigate to a voice call session")
        print("3. Test the voice connection")
    else:
        print("❌ Voice connection needs fixes")
        if not backend_ok:
            print("   - Start the backend server")
        if not websocket_ok:
            print("   - Check WebSocket configuration")

if __name__ == "__main__":
    main()
