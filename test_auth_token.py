#!/usr/bin/env python3
"""
Test auth token verification
"""

import sys
import os
sys.path.append('backend')

def test_auth_token():
    """Test auth token verification"""
    try:
        print("Testing auth token verification...")
        
        from app.services.auth_service import TenantAuthService
        from app.config import Settings
        
        settings = Settings()
        auth_service = TenantAuthService()
        
        # Test with a simple JWT token (no signature verification)
        import jwt
        
        # Create a simple test token
        test_payload = {
            "sub": "test_user_123",
            "tenant_id": "default_tenant", 
            "organization": "AURA",
            "role": "user"
        }
        
        # Create token without signature (for testing)
        test_token = jwt.encode(test_payload, "test_secret", algorithm="HS256")
        print(f"Created test token: {test_token[:50]}...")
        
        # Test verification
        result = auth_service.verify_token(test_token)
        print(f"Verification result: {result}")
        
        if result:
            print("✅ Auth token verification working!")
            return True
        else:
            print("❌ Auth token verification failed!")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_auth_token()
    if success:
        print("\n✅ Auth test passed!")
    else:
        print("\n❌ Auth test failed!")
