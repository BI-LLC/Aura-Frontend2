#!/usr/bin/env python3
"""
Test conversation manager initialization
"""

import sys
import os
sys.path.append('backend')

def test_conversation_manager():
    """Test if conversation manager can be initialized"""
    try:
        print("Testing conversation manager initialization...")
        
        # Test imports
        print("1. Testing imports...")
        from app.services.continuous_conversation import ContinuousConversationManager
        print("✓ ContinuousConversationManager imported")
        
        from app.services.voice_pipeline import VoicePipeline
        print("✓ VoicePipeline imported")
        
        from app.services.smart_router import SmartRouter
        print("✓ SmartRouter imported")
        
        from app.services.tenant_manager import TenantManager
        print("✓ TenantManager imported")
        
        # Test initialization
        print("2. Testing service initialization...")
        tenant_manager = TenantManager()
        print("✓ TenantManager initialized")
        
        smart_router = SmartRouter()
        print("✓ SmartRouter initialized")
        
        voice_pipeline = VoicePipeline()
        print("✓ VoicePipeline initialized")
        
        # Test conversation manager
        print("3. Testing ContinuousConversationManager...")
        conversation_manager = ContinuousConversationManager(
            voice_pipeline=voice_pipeline,
            smart_router=smart_router,
            tenant_manager=tenant_manager
        )
        print("✓ ContinuousConversationManager initialized successfully!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_conversation_manager()
    if success:
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Tests failed!")
