# AURA Voice AI - Troubleshooting Guide

## 🚨 Critical Issues & Solutions

### 1. WebSocket Connection Failures

#### Error: `WebSocket connection to 'ws://localhost:8080/ws/voice/continuous' failed`

**Symptoms:**
- Widget shows "Connection failed" status
- Browser console shows WebSocket errors
- No audio processing occurs

**Root Causes:**
1. **Backend server not running**
2. **Port conflicts (Error 10048)**
3. **Firewall blocking connections**
4. **Wrong WebSocket URL**

**Solutions:**
```bash
# Check if server is running
curl http://localhost:8080/health

# Kill existing Python processes
Get-Process | Where-Object {$_.ProcessName -eq "python"} | Stop-Process -Force

# Start server on different port
# Edit simple_test.py: uvicorn.run(app, host="0.0.0.0", port=8081)
python simple_test.py

# Update frontend WebSocket URL
# Edit widget.js: ws://localhost:8081/ws/voice/continuous
```

**Prevention:**
- Always check server status before testing
- Use unique ports for development
- Verify firewall settings

### 2. Microphone Access Denied

#### Error: `NotAllowedError: Permission denied`

**Symptoms:**
- Browser blocks microphone access
- Widget shows "Connection failed" after permission denial
- No audio capture occurs

**Root Causes:**
1. **Browser security policies**
2. **HTTPS requirement for getUserMedia()**
3. **User denied microphone permission**
4. **Multiple tabs requesting microphone**

**Solutions:**
```javascript
// Check microphone permission status
navigator.permissions.query({name: 'microphone'}).then(result => {
    console.log('Microphone permission:', result.state);
});

// Request microphone with error handling
try {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000,
            channelCount: 1
        }
    });
} catch (error) {
    console.error('Microphone access failed:', error);
    // Show user-friendly error message
}
```

**Prevention:**
- Test on HTTPS in production
- Clear browser permissions if needed
- Close other tabs using microphone
- Provide clear permission request UI

### 3. Audio Processing Failures

#### Error: `ScriptProcessorNode is deprecated`

**Symptoms:**
- Audio capture doesn't work
- Console warnings about deprecated APIs
- No audio data sent to server

**Root Causes:**
1. **Deprecated Web Audio API usage**
2. **Audio context not properly initialized**
3. **Buffer size issues**
4. **Audio format conversion errors**

**Solutions:**
```javascript
// Modern AudioWorklet approach (recommended)
class AudioProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        
        for (let channel = 0; channel < input.length; ++channel) {
            const inputChannel = input[channel];
            const outputChannel = output[channel];
            
            for (let i = 0; i < inputChannel.length; ++i) {
                outputChannel[i] = inputChannel[i];
            }
        }
        
        return true;
    }
}

// Fallback to ScriptProcessorNode
if (typeof AudioWorkletProcessor === 'undefined') {
    // Use ScriptProcessorNode with proper error handling
    this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
}
```

**Prevention:**
- Test on multiple browsers
- Implement graceful fallbacks
- Monitor audio context state
- Handle audio format conversion carefully

### 4. API Key Issues

#### Error: `OPENAI_API_KEY not found` or `ELEVENLABS_API_KEY not found`

**Symptoms:**
- Server starts but shows API key warnings
- No speech recognition or TTS
- Demo mode only functionality

**Root Causes:**
1. **Missing environment variables**
2. **Invalid API keys**
3. **API rate limits exceeded**
4. **Network connectivity issues**

**Solutions:**
```bash
# Set environment variables
export OPENAI_API_KEY="sk-your-openai-key"
export ELEVENLABS_API_KEY="your-elevenlabs-key"

# Test API connectivity
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# Check API usage limits
# Monitor OpenAI dashboard for rate limits
```

**Prevention:**
- Store API keys securely
- Implement rate limiting
- Monitor API usage
- Have fallback responses

### 5. Audio Playback Issues

#### Error: `Audio playback failed` or `AudioContext was not allowed to start`

**Symptoms:**
- No audio output from AI responses
- Silent responses despite successful processing
- Audio context suspended

**Root Causes:**
1. **Browser autoplay policies**
2. **Audio context suspended state**
3. **Invalid audio format**
4. **Audio blob creation issues**

**Solutions:**
```javascript
// Resume audio context on user interaction
document.addEventListener('click', () => {
    if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
    }
});

// Proper audio playback with error handling
playAudio(audioBase64) {
    try {
        const audioData = atob(audioBase64);
        const audioArray = new Uint8Array(audioData.length);
        
        for (let i = 0; i < audioData.length; i++) {
            audioArray[i] = audioData.charCodeAt(i);
        }
        
        const audioBlob = new Blob([audioArray], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        // Resume audio context if needed
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        audio.play().catch(error => {
            console.error('Audio playback failed:', error);
            // Show user-friendly error
        });
        
        audio.onended = () => URL.revokeObjectURL(audioUrl);
    } catch (error) {
        console.error('Audio playback error:', error);
    }
}
```

**Prevention:**
- Require user interaction before audio
- Handle audio context state properly
- Validate audio format before playback
- Provide visual feedback for audio issues

## 🔧 Common Development Issues

### 6. Port Conflicts

#### Error: `[Errno 10048] only one usage of each socket address is normally permitted`

**Solutions:**
```bash
# Find processes using port 8080
netstat -ano | findstr :8080

# Kill specific process
taskkill /PID <process_id> /F

# Use different port
python simple_test.py --port 8081
```

### 7. Module Import Errors

#### Error: `ModuleNotFoundError: No module named 'app'`

**Solutions:**
```bash
# Ensure correct working directory
cd aura-voice-ai/backend

# Install missing dependencies
pip install -r requirements.txt

# Check Python path
python -c "import sys; print(sys.path)"
```

### 8. CORS Issues

#### Error: `Access to fetch at 'http://localhost:8080' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solutions:**
```python
# Ensure CORS middleware is properly configured
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 9. Audio Format Issues

#### Error: `Invalid audio format` or `Audio processing failed`

**Solutions:**
```python
# Ensure proper audio format conversion
def convert_to_wav(audio_bytes: bytes) -> bytes:
    try:
        with io.BytesIO() as wav_buffer:
            with wave.open(wav_buffer, 'wb') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(16000)  # 16kHz
                wav_file.writeframes(audio_bytes)
            return wav_buffer.getvalue()
    except Exception as e:
        print(f"WAV conversion error: {e}")
        return audio_bytes
```

## 🐛 Debugging Techniques

### 1. Browser Console Debugging

```javascript
// Enable detailed logging
console.log('🎤 Audio capture started');
console.log('📨 Received message:', message);
console.log('🔊 Playing audio response');

// Debug WebSocket state
console.log('WebSocket readyState:', this.websocket.readyState);
console.log('Audio context state:', this.audioContext.state);
```

### 2. Server-Side Debugging

```python
# Enable detailed logging
print(f"🔌 WebSocket connected")
print(f"🎤 Received {len(audio_bytes)} bytes of audio")
print(f"📝 Processing transcript: {transcript}")

# Debug API responses
print(f"OpenAI response: {response}")
print(f"ElevenLabs audio length: {len(audio_response)}")
```

### 3. Network Debugging

```bash
# Test WebSocket connection
wscat -c ws://localhost:8080/ws/voice/continuous

# Monitor network traffic
# Use browser DevTools Network tab
# Check WebSocket frames
```

## 📊 Performance Issues

### 1. High Latency

**Symptoms:**
- Delayed audio responses
- Lag in conversation flow
- Poor user experience

**Solutions:**
- Optimize audio buffer sizes
- Use WebSocket compression
- Implement client-side buffering
- Monitor API response times

### 2. Memory Leaks

**Symptoms:**
- Increasing memory usage
- Browser crashes
- Audio context not cleaned up

**Solutions:**
```javascript
// Proper cleanup in endCall()
endCall() {
    if (this.scriptProcessor) {
        this.scriptProcessor.disconnect();
        this.scriptProcessor = null;
    }
    
    if (this.audioSource) {
        this.audioSource.disconnect();
        this.audioSource = null;
    }
    
    if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
    }
}
```

### 3. Audio Quality Issues

**Symptoms:**
- Poor audio quality
- Echo or feedback
- Background noise

**Solutions:**
```javascript
// Optimize audio constraints
const audioConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000,
    channelCount: 1
};
```

## 🔒 Security Issues

### 1. WebSocket Security

**Issues:**
- Unencrypted WebSocket connections
- No authentication
- Potential data interception

**Solutions:**
```python
# Implement WebSocket authentication
@app.websocket("/ws/voice/continuous")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    # Validate token
    if not validate_token(token):
        await websocket.close(code=4001, reason="Invalid token")
        return
    
    await websocket.accept()
```

### 2. API Key Exposure

**Issues:**
- API keys in client-side code
- Exposed environment variables
- Insecure key storage

**Solutions:**
- Never expose API keys in frontend
- Use environment variables
- Implement proper authentication
- Rotate keys regularly

## 🚀 Production Deployment Issues

### 1. SSL/HTTPS Requirements

**Issues:**
- getUserMedia() requires HTTPS
- WebSocket connections blocked
- Mixed content warnings

**Solutions:**
- Deploy with SSL certificates
- Use secure WebSocket (wss://)
- Configure proper CORS headers
- Test on production-like environment

### 2. Server Scaling

**Issues:**
- Single server bottleneck
- WebSocket connection limits
- Audio processing delays

**Solutions:**
- Implement load balancing
- Use Redis for session management
- Optimize audio processing
- Monitor server resources

## 📞 Support Resources

### 1. Browser Compatibility
- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Limited Web Audio API support
- **Edge**: Full support

### 2. API Documentation
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [ElevenLabs API](https://elevenlabs.io/docs/api-reference)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

### 3. Debugging Tools
- Browser DevTools
- WebSocket testing tools (wscat)
- Audio analysis tools
- Network monitoring

---

**Last Updated**: December 2024
**Version**: 1.0.0

**For additional support, check the main developer guide or create an issue in the project repository.**
