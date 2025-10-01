#!/usr/bin/env python3
"""
Debug script to test chat router functionality
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_chat_router():
    """Test if chat router can be imported and initialized"""
    try:
        print("Testing chat router import...")
        from app.routers.chat import router, set_services
        print("SUCCESS: Chat router imported successfully")
        
        print("Testing router endpoints...")
        routes = [route.path for route in router.routes]
        print(f"Available routes: {routes}")
        
        # Check if /message endpoint exists
        message_routes = [route for route in router.routes if '/message' in route.path]
        print(f"Message routes: {message_routes}")
        
        return True
        
    except Exception as e:
        print(f"ERROR: Error importing chat router: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_main_imports():
    """Test if main.py can import all routers"""
    try:
        print("\nTesting main.py router imports...")
        from app.routers import chat, voice, admin, memory, streaming, documents, continuous_voice, tenant_admin, training, rag_chat
        print("SUCCESS: All routers imported successfully")
        return True
        
    except Exception as e:
        print(f"ERROR: Error importing routers: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Debugging Chat Router...")
    print("=" * 50)
    
    success1 = test_chat_router()
    success2 = test_main_imports()
    
    if success1 and success2:
        print("\nSUCCESS: All tests passed - chat router should be working")
    else:
        print("\nERROR: Some tests failed - this explains the 404 error")
