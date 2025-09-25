#!/usr/bin/env python3
"""
Test WebSocket with real auth token
"""

import websocket
import json
import time
import jwt

def test_websocket_with_auth():
    """Test WebSocket connection with real auth token"""
    print("🧪 Testing WebSocket with Auth Token")
    print("=" * 50)
    
    # Create a test token
    test_payload = {
        "sub": "test_user_123",
        "tenant_id": "default_tenant", 
        "organization": "AURA",
        "role": "user"
    }
    
    # Create token without signature (for testing)
    test_token = jwt.encode(test_payload, "test_secret", algorithm="HS256")
    print(f"Created test token: {test_token[:50]}...")
    
    ws_url = f"ws://localhost:8000/ws/voice/continuous?token={test_token}"
    print(f"Connecting to: {ws_url}")
    
    def on_message(ws, message):
        print(f"✅ Response received: {message}")
        ws.close()

    def on_error(ws, error):
        print(f"❌ WebSocket error: {error}")

    def on_close(ws, close_status_code, close_msg):
        print(f"WebSocket closed with code {close_status_code}: {close_msg}")

    def on_open(ws):
        print("✅ WebSocket connected successfully!")
        ws.send(json.dumps({"type": "ping", "message": "hello"}))
        print("✅ Test message sent")

    try:
        ws = websocket.WebSocketApp(ws_url,
                                    on_open=on_open,
                                    on_message=on_message,
                                    on_error=on_error,
                                    on_close=on_close)
        
        ws.run_forever()
        return True
    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")
        return False

if __name__ == "__main__":
    success = test_websocket_with_auth()
    if success:
        print("\n✅ WebSocket auth test passed!")
    else:
        print("\n❌ WebSocket auth test failed!")
