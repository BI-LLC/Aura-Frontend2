# 🚀 AURA Voice AI - Complete Setup Guide

## 🎯 **Your Custom Voice Status**
✅ **ElevenLabs Voice ID**: `Jn2FTGxo9WlzIb33zWo9` (Bibhrajit - Custom Voice)  
✅ **API Key**: Working perfectly  
✅ **Voice Generation**: Tested and confirmed working  

## 📋 **Step-by-Step Setup**

### **Step 1: Start the Backend Server**

The backend serves both the API and the frontend. Here's how to start it properly:

```bash
# Navigate to the backend directory
cd Aura-main/backend

# Set Python path and start server
$env:PYTHONPATH = "$PWD"; python app/main.py
```

**Expected Output:**
```
✅ Loaded .env from: C:\Users\Raf\Desktop\Aura-main\Aura-main\backend\.env
Config loaded - Voice configured: True
INFO:app.services.voice_pipeline:ElevenLabs (TTS) available: True
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### **Step 2: Access the Frontend Interfaces**

Once the backend is running, you can access multiple interfaces:

#### **🎤 Main Voice Interface**
- **URL**: http://localhost:8000/
- **Features**: Full voice conversation interface
- **Your Custom Voice**: Will use "Bibhrajit" voice

#### **🧪 Test Interface (Recommended)**
- **URL**: http://localhost:8000/test
- **Features**: 
  - Voice conversation testing
  - Document upload testing
  - System status checking
  - Real-time debugging

#### **🔧 Debug Interface**
- **URL**: http://localhost:8000/debug
- **Features**: Comprehensive system diagnostics

#### **📊 Admin Dashboard**
- **URL**: http://localhost:8000/admin
- **Features**: Document management and system monitoring

### **Step 3: Test Your Custom Voice**

1. **Open the test interface**: http://localhost:8000/test
2. **Click the microphone icon** to start a voice conversation
3. **Speak into your microphone**
4. **Listen for your custom "Bibhrajit" voice** in the response

### **Step 4: React Frontend (Optional)**

If you want to use the React frontend instead:

```bash
# Navigate to frontend directory
cd Aura-main/frontend

# Install dependencies
npm install

# Start React development server
npm start
```

**React Frontend URLs:**
- **Main App**: http://localhost:3000
- **Voice Chat**: http://localhost:3000/chat/[slug]
- **Voice Call Session**: http://localhost:3000/chat/[slug]/call

## 🔧 **Troubleshooting**

### **If Backend Won't Start:**

1. **Check Python Path:**
```bash
cd Aura-main/backend
$env:PYTHONPATH = "$PWD"
python app/main.py
```

2. **Kill Existing Processes:**
```bash
Get-Process | Where-Object {$_.ProcessName -eq "python"} | Stop-Process -Force
```

3. **Check Port Availability:**
```bash
netstat -an | findstr :8000
```

### **If Voice Call Feature Isn't Working:**

1. **Check Server Status:**
   - Visit: http://localhost:8000/voice/status
   - Should show: `"status": "operational"`

2. **Check Browser Permissions:**
   - Allow microphone access
   - Use HTTPS if needed (some browsers require it)

3. **Check WebSocket Connection:**
   - Open browser console (F12)
   - Look for WebSocket connection errors

### **If Custom Voice Isn't Playing:**

1. **Verify Voice ID in .env:**
```bash
# Check your .env file
Get-Content Aura-main/backend/.env | findstr ELEVENLABS_VOICE_ID
```

2. **Test Voice Directly:**
```bash
cd Aura-main/backend
python test_voice_connection.py
```

## 📁 **File Structure Overview**

```
Aura-main/
├── 📂 backend/                 # Python/FastAPI server
│   ├── 📄 app/main.py         # Main server (serves frontend + API)
│   ├── 📄 .env                # Your API keys and voice ID
│   └── 📂 app/services/       # Voice pipeline services
├── 📂 frontend/               # React frontend (optional)
│   ├── 📄 package.json       # React dependencies
│   └── 📂 src/components/    # React components
└── 📄 docker-compose.yml     # Docker setup (optional)
```

## 🎤 **Voice Call Features**

### **Available Interfaces:**

1. **Test Interface** (`/test`)
   - ✅ Voice conversation testing
   - ✅ Document upload and AI search
   - ✅ System status monitoring
   - ✅ Real-time debugging

2. **Main Interface** (`/`)
   - ✅ Full voice AI interface
   - ✅ Document-based conversations
   - ✅ Custom voice integration

3. **React Frontend** (`/chat/[slug]/call`)
   - ✅ Advanced voice call session
   - ✅ Real-time transcript
   - ✅ Voice activity detection
   - ✅ WebSocket streaming

## 🔑 **Key URLs Summary**

| Interface | URL | Purpose |
|-----------|-----|---------|
| **Test Interface** | http://localhost:8000/test | 🎤 Voice testing (Recommended) |
| **Main Interface** | http://localhost:8000/ | 🏠 Main voice AI interface |
| **Voice Status** | http://localhost:8000/voice/status | 📊 Check voice system status |
| **Debug Interface** | http://localhost:8000/debug | 🔧 System diagnostics |
| **React App** | http://localhost:3000 | ⚛️ Advanced React frontend |

## ✅ **Quick Start Commands**

```bash
# 1. Start Backend (Required)
cd Aura-main/backend
$env:PYTHONPATH = "$PWD"; python app/main.py

# 2. Open Test Interface
# Navigate to: http://localhost:8000/test

# 3. Test Your Custom Voice
# Click microphone icon and speak!

# 4. Optional: Start React Frontend
cd Aura-main/frontend
npm install
npm start
```

## 🎉 **Your Custom Voice is Ready!**

Your custom "Bibhrajit" voice (`Jn2FTGxo9WlzIb33zWo9`) is properly configured and working. The voice call feature should work perfectly once you start the backend server and access the test interface.

**Next Steps:**
1. Start the backend server
2. Open http://localhost:8000/test
3. Click the microphone and start talking!
4. Listen for your custom "Bibhrajit" voice in the responses
