#!/usr/bin/env python3
"""
Simple WebSocket connection test
"""

import asyncio
import websockets
import json

async def test_websocket_connection():
    """Test WebSocket connection to voice endpoint"""
    try:
        # Test WebSocket connection
        uri = "ws://localhost:8000/ws/voice/continuous?token=test_token"
        print(f"Connecting to: {uri}")
        
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connected successfully!")
            
            # Send a test message
            test_message = {
                "type": "ping",
                "message": "test"
            }
            await websocket.send(json.dumps(test_message))
            print("✅ Test message sent")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"✅ Response received: {response}")
            except asyncio.TimeoutError:
                print("⚠️ No response received (timeout)")
            
    except websockets.exceptions.ConnectionClosed as e:
        print(f"❌ WebSocket connection closed: {e}")
    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")

if __name__ == "__main__":
    print("🧪 Testing WebSocket Connection")
    print("=" * 40)
    asyncio.run(test_websocket_connection())
