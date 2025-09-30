# AURA Voice AI - Quick Reference

## 🚀 Quick Commands

### Backend
```bash
# Start development server
cd aura-voice-ai/backend
python simple_test.py

# Kill all Python processes
Get-Process | Where-Object {$_.ProcessName -eq "python"} | Stop-Process -Force

# Test server health
curl http://localhost:8080/health

# Install dependencies
pip install -r requirements.txt
```

### Frontend
```bash
# Open main page
start frontend/index.html

# Open voice widget
start frontend/widget/index.html

# Open admin panel
start frontend/admin/index.html
```

## 🔧 Common Fixes

### WebSocket Connection Failed
```bash
# 1. Check server status
curl http://localhost:8080/health

# 2. Kill existing processes
Get-Process | Where-Object {$_.ProcessName -eq "python"} | Stop-Process -Force

# 3. Restart server
python simple_test.py
```

### Microphone Not Working
```javascript
// Check permission status
navigator.permissions.query({name: 'microphone'}).then(result => {
    console.log('Permission:', result.state);
});

// Clear permissions (Chrome)
chrome://settings/content/microphone
```

### Audio Playback Issues
```javascript
// Resume audio context
if (audioContext.state === 'suspended') {
    audioContext.resume();
}

// Check audio context state
console.log('Audio context state:', audioContext.state);
```

## 📊 Debug Commands

### Browser Console
```javascript
// Check WebSocket state
console.log('WebSocket readyState:', websocket.readyState);

// Check audio context
console.log('Audio context state:', audioContext.state);

// Monitor audio capture
console.log('Audio data length:', audioData.length);
```

### Server Logs
```python
# Enable debug logging
print(f"🔌 WebSocket connected")
print(f"🎤 Received {len(audio_bytes)} bytes")
print(f"📝 Processing: {transcript}")
```

## 🐛 Error Solutions

| Error | Solution |
|-------|----------|
| `WebSocket connection failed` | Check server status, kill processes, restart |
| `Permission denied` | Clear browser permissions, use HTTPS |
| `ScriptProcessorNode deprecated` | Use AudioWorkletProcessor (modern browsers) |
| `AudioContext suspended` | Resume on user interaction |
| `Port 8080 in use` | Kill process or change port |
| `Module not found` | Check working directory, install dependencies |

## 🔑 API Keys Setup

```bash
# Set environment variables
export OPENAI_API_KEY="sk-your-key"
export ELEVENLABS_API_KEY="your-key"

# Test API connectivity
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

## 📁 File Locations

| File | Purpose | Location |
|------|---------|----------|
| Voice Widget | Main voice interface | `frontend/widget/` |
| Admin Panel | Document management | `frontend/admin/` |
| API Utilities | Shared functions | `frontend/shared/api.js` |
| Test Server | Development server | `backend/simple_test.py` |
| Main Backend | Production server | `backend/app/main.py` |

## 🌐 URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:8080` | Main entry point |
| `http://localhost:8080/widget/` | Voice widget |
| `http://localhost:8080/admin/` | Admin panel |
| `ws://localhost:8080/ws/voice/continuous` | WebSocket endpoint |

## 🔄 Development Workflow

1. **Start Backend**
   ```bash
   cd backend
   python simple_test.py
   ```

2. **Test Frontend**
   ```bash
   start frontend/widget/index.html
   ```

3. **Debug Issues**
   - Check browser console
   - Monitor server logs
   - Test WebSocket connection

4. **Deploy Changes**
   - Update code
   - Test functionality
   - Update documentation

## 📞 Emergency Contacts

- **WebSocket Issues**: Check server status, restart
- **Audio Problems**: Clear permissions, check HTTPS
- **API Errors**: Verify keys, check rate limits
- **Performance**: Monitor memory, optimize buffers

---

**Last Updated**: December 2024
**For detailed info, see DEVELOPER_GUIDE.md and TROUBLESHOOTING_GUIDE.md**
