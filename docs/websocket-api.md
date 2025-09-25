# 🔌 WebSocket API Documentation

## **Overview**

The AURA Voice AI WebSocket API enables real-time, bidirectional voice communication between the frontend and backend. This API handles continuous audio streaming, voice activity detection, and real-time conversation management.

## **Connection Endpoint**

```
ws://localhost:8000/ws/voice/continuous?token=<auth_token>
```

### **Authentication**
- **Method**: Query parameter token
- **Format**: JWT token or demo token
- **Example**: `ws://localhost:8000/ws/voice/continuous?token=demo_token`

## **Message Protocol**

### **Client → Server Messages**

#### **1. Binary Audio Data**
```javascript
// Raw PCM audio chunks (16-bit, 16kHz, mono)
websocket.send(int16Array.buffer);
```

#### **2. Control Messages (JSON)**

**End Call:**
```json
{
  "type": "end_call"
}
```

**Ping (Keepalive):**
```json
{
  "type": "ping",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### **Server → Client Messages**

#### **1. Greeting**
```json
{
  "type": "greeting",
  "text": "Hello! I'm AURA, your AI assistant. How can I help you today?",
  "audio": "base64_encoded_audio_data"
}
```

#### **2. User Transcript**
```json
{
  "type": "user_transcript",
  "text": "What's the weather like today?",
  "confidence": 0.95
}
```

#### **3. AI Audio Response**
```json
{
  "type": "ai_audio",
  "text": "The weather is sunny with a high of 75°F.",
  "audio": "base64_encoded_audio_data"
}
```

#### **4. Streaming Audio Chunks**
```json
{
  "type": "ai_audio_chunk",
  "text": "The weather is",
  "audio": "base64_encoded_audio_data",
  "is_complete": false
}
```

#### **5. Response Complete**
```json
{
  "type": "ai_complete",
  "full_response": "The weather is sunny with a high of 75°F today.",
  "model_used": "gpt-4",
  "response_time": 1.23,
  "cost": 0.002
}
```

#### **6. AI Interrupted**
```json
{
  "type": "ai_interrupted",
  "message": "AI stopped speaking due to user interruption"
}
```

#### **7. Error Messages**
```json
{
  "type": "error",
  "message": "Audio processing failed",
  "code": "AUDIO_ERROR",
  "details": "Whisper API returned empty transcription"
}
```

#### **8. Keepalive Response**
```json
{
  "type": "pong",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## **Connection Lifecycle**

### **1. Connection Establishment**
```javascript
const websocket = new WebSocket('ws://localhost:8000/ws/voice/continuous?token=demo_token');

websocket.onopen = () => {
    console.log('Connected to AURA Voice AI');
    // Start audio capture
};
```

### **2. Audio Stream Setup**
```javascript
// Get microphone access
const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000,
        channelCount: 1
    }
});

// Set up audio processing
const audioContext = new AudioContext();
const source = audioContext.createMediaStreamSource(stream);
const processor = audioContext.createScriptProcessor(4096, 1, 1);

processor.onaudioprocess = (event) => {
    const inputData = event.inputBuffer.getChannelData(0);
    const int16Array = new Int16Array(inputData.length);
    
    // Convert Float32 to Int16
    for (let i = 0; i < inputData.length; i++) {
        int16Array[i] = inputData[i] * 32767;
    }
    
    // Send binary audio data
    websocket.send(int16Array.buffer);
};

source.connect(processor);
processor.connect(audioContext.destination);
```

### **3. Message Handling**
```javascript
websocket.onmessage = (event) => {
    try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
            case 'greeting':
                displayMessage('AI', message.text);
                playAudio(message.audio);
                break;
                
            case 'user_transcript':
                displayMessage('User', message.text);
                break;
                
            case 'ai_audio':
                displayMessage('AI', message.text);
                playAudio(message.audio);
                break;
                
            case 'ai_interrupted':
                console.log('AI was interrupted');
                break;
                
            case 'error':
                console.error('Error:', message.message);
                break;
        }
    } catch (error) {
        console.error('Failed to parse message:', error);
    }
};
```

### **4. Connection Cleanup**
```javascript
function endCall() {
    // Send end call message
    websocket.send(JSON.stringify({ type: 'end_call' }));
    
    // Stop audio streams
    stream.getTracks().forEach(track => track.stop());
    
    // Close WebSocket
    websocket.close();
}
```

## **Error Handling**

### **Connection Errors**
```javascript
websocket.onerror = (error) => {
    console.error('WebSocket error:', error);
    // Implement reconnection logic
};

websocket.onclose = (event) => {
    if (event.code !== 1000) {
        console.error('Unexpected disconnection:', event.code, event.reason);
        // Attempt reconnection
    }
};
```

### **Common Error Codes**

| Code | Message | Description |
|------|---------|-------------|
| 1008 | Invalid Token | Authentication failed |
| 1011 | Server Error | Internal server error |
| 4001 | Audio Error | Audio processing failed |
| 4002 | STT Error | Speech-to-text failed |
| 4003 | LLM Error | Language model error |
| 4004 | TTS Error | Text-to-speech failed |

## **Performance Considerations**

### **Audio Settings**
```javascript
const optimalAudioConfig = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000,      // Optimal for Whisper
    channelCount: 1,        // Mono reduces bandwidth
    sampleSize: 16,         // 16-bit samples
    latency: 0.01          // Low latency mode
};
```

### **Buffer Management**
```javascript
class AudioBufferManager {
    constructor() {
        this.bufferSize = 4096;
        this.sampleRate = 16000;
        this.maxBufferTime = 30; // seconds
    }
    
    processAudioChunk(audioData) {
        // Implement efficient buffering
        if (this.shouldSendChunk(audioData)) {
            this.sendAudioChunk(audioData);
        }
    }
}
```

### **Bandwidth Optimization**
- **Audio Format**: 16-bit PCM (32KB/s)
- **Chunk Size**: 4096 samples (~256ms)
- **Compression**: Consider Opus for production
- **Buffering**: Client-side buffering for smooth playback

## **Testing**

### **WebSocket Connection Test**
```javascript
async function testWebSocketConnection() {
    const websocket = new WebSocket('ws://localhost:8000/ws/voice/continuous?token=demo_token');
    
    return new Promise((resolve, reject) => {
        websocket.onopen = () => {
            console.log('✅ WebSocket connected');
            websocket.close();
            resolve(true);
        };
        
        websocket.onerror = (error) => {
            console.error('❌ WebSocket failed');
            reject(error);
        };
        
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
}
```

### **Audio Pipeline Test**
```javascript
async function testAudioPipeline() {
    // Test microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Test audio processing
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    
    console.log('✅ Audio pipeline working');
    
    // Cleanup
    stream.getTracks().forEach(track => track.stop());
    audioContext.close();
}
```

## **Security**

### **Authentication**
```javascript
// JWT token example
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const websocket = new WebSocket(`ws://localhost:8000/ws/voice/continuous?token=${token}`);
```

### **HTTPS/WSS Requirements**
```javascript
// Production requires secure connections
const isProduction = location.protocol === 'https:';
const wsProtocol = isProduction ? 'wss:' : 'ws:';
const websocket = new WebSocket(`${wsProtocol}//your-domain.com/ws/voice/continuous?token=${token}`);
```

### **Audio Data Security**
- Audio data is processed in real-time
- No persistent storage of audio
- Encrypted WebSocket connections in production
- Token-based authentication

## **Rate Limiting**

### **Connection Limits**
- **Per User**: 1 concurrent voice session
- **Per Tenant**: 100 concurrent sessions
- **Global**: 1000 concurrent sessions

### **Message Limits**
- **Audio Chunks**: No limit (continuous)
- **Control Messages**: 10 per second
- **Reconnections**: 5 per minute

## **Monitoring**

### **Client-side Metrics**
```javascript
class WebSocketMetrics {
    constructor() {
        this.connectionTime = null;
        this.messagesSent = 0;
        this.messagesReceived = 0;
        this.audioChunksSent = 0;
        this.lastLatency = 0;
    }
    
    trackMessage(type, direction) {
        if (direction === 'sent') {
            this.messagesSent++;
        } else {
            this.messagesReceived++;
        }
    }
    
    calculateLatency(sendTime) {
        this.lastLatency = Date.now() - sendTime;
        return this.lastLatency;
    }
}
```

### **Health Monitoring**
```javascript
// Periodic health check
setInterval(async () => {
    try {
        websocket.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
    } catch (error) {
        console.error('Health check failed:', error);
        // Implement reconnection logic
    }
}, 30000); // Every 30 seconds
```

---

**🎯 This WebSocket API provides real-time, low-latency voice communication for natural AI conversations.**
