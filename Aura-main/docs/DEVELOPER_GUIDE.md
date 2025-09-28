# AURA Voice AI - Developer Guide

## 🏗️ Architecture Overview

AURA Voice AI is a real-time voice conversation system with the following architecture:

### Frontend (React + Vanilla JavaScript)
- **Location**: `frontend/`
- **Technology**: React TypeScript + Vanilla JavaScript, HTML5, CSS3
- **Key Components**:
  - `aura-react-frontend/` - Modern React TypeScript application
  - `widget/` - Floating voice widget for end users (HTML/JS)
  - `admin/` - Admin panel for document management (HTML/JS)
  - `shared/` - Shared API utilities

### Backend (Python/FastAPI)
- **Location**: `backend/`
- **Technology**: FastAPI, WebSockets, OpenAI Whisper, ElevenLabs TTS, Supabase
- **Key Components**:
  - `app/main.py` - Main FastAPI application
  - `app/routers/` - API route handlers
  - `app/services/` - Core business logic services
  - `app/supabase_client.py` - Supabase database integration
  - `simple_test.py` - Development test server

## 📁 Project Structure

```
aura-voice-ai/
├── frontend/
│   ├── aura-react-frontend/    # React TypeScript app
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── pages/          # Page components
│   │   │   ├── contexts/       # React contexts
│   │   │   └── hooks/          # Custom hooks
│   │   └── package.json        # Frontend dependencies
│   ├── widget/
│   │   ├── index.html          # Voice widget interface
│   │   ├── widget.css          # Widget styling
│   │   └── widget.js           # Voice call functionality
│   ├── admin/
│   │   ├── index.html          # Admin login
│   │   ├── dashboard.html      # Admin dashboard
│   │   ├── login.js            # Login handler
│   │   ├── dashboard.js        # Dashboard functionality
│   │   └── style.css           # Admin styling
│   ├── shared/
│   │   └── api.js              # Shared API utilities
│   ├── test.html               # Demo page
│   └── index.html              # Main entry point
├── backend/
│   ├── app/
│   │   ├── main.py             # Main FastAPI app
│   │   ├── config.py           # Configuration
│   │   ├── routers/            # API endpoints
│   │   ├── services/           # Core services
│   │   ├── models/             # Data models
│   │   ├── middleware/         # Middleware
│   │   └── supabase_client.py  # Supabase integration
│   ├── database/
│   │   ├── init.sql            # Database initialization
│   │   └── supabase_migration.sql # Supabase migration
│   ├── simple_test.py          # Development server
│   └── requirements.txt        # Python dependencies
├── test/                       # Test scripts
│   ├── test_api_keys.py        # API key testing
│   ├── test_complete_pipeline.py # Full pipeline testing
│   ├── test_continuous_voice.py # Voice conversation testing
│   ├── test_streaming.py       # Streaming functionality testing
│   └── test_voice_pipeline.py  # Voice pipeline testing
├── docs/                       # Documentation
└── README.md                   # This file
```

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd aura-voice-ai/backend

# Install dependencies
pip install -r requirements.txt

# Set environment variables (optional for demo)
export OPENAI_API_KEY="your_openai_key"
export ELEVENLABS_API_KEY="your_elevenlabs_key"

# Start development server
python simple_test.py
```

### 2. Frontend Setup

```bash
cd aura-voice-ai/frontend

# Open in browser (no build step required)
# Navigate to: http://localhost:8080
```

## 🎤 Voice Widget Implementation

### Audio Capture Flow

1. **Microphone Access**: Uses `navigator.mediaDevices.getUserMedia()`
2. **Audio Processing**: Web Audio API with `ScriptProcessorNode`
3. **Real-time Streaming**: Continuous audio chunks via WebSocket
4. **Audio Format**: 16-bit PCM, 16kHz, mono

### Key JavaScript Classes

#### VoiceWidget Class
```javascript
class VoiceWidget {
    constructor() {
        this.isCallActive = false;
        this.websocket = null;
        this.mediaStream = null;
        this.audioContext = null;
        this.scriptProcessor = null;
    }
    
    async startCall() {
        // 1. Get microphone access
        // 2. Connect WebSocket
        // 3. Start audio capture
    }
    
    startAudioCapture() {
        // Real-time audio processing
        // Convert Float32 to Int16
        // Send via WebSocket
    }
    
    handleWebSocketMessage(data) {
        // Handle transcript and audio responses
    }
}
```

### Audio Processing Details

```javascript
// Audio capture configuration
const audioConfig = {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 16000,
    channelCount: 1
};

// Audio processing pipeline
this.scriptProcessor.onaudioprocess = (event) => {
    const inputData = event.inputBuffer.getChannelData(0);
    const int16Array = new Int16Array(inputData.length);
    
    // Convert Float32 to Int16
    for (let i = 0; i < inputData.length; i++) {
        int16Array[i] = inputData[i] * 32767;
    }
    
    // Send via WebSocket
    this.websocket.send(int16Array.buffer);
};
```

## 🗄️ Database Schema

### **Supabase Database Structure**

The AURA Voice AI system uses Supabase (PostgreSQL) with comprehensive multi-tenant architecture and Row Level Security (RLS) policies.

#### **Core Tables Overview**

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `tenants` | Organization management | Multi-tenant isolation, subscription tiers |
| `tenant_users` | User management per tenant | Role-based access, persona settings |
| `tenant_storage` | Storage tracking | Usage limits, quota management |
| `documents` | Document management | File metadata, processing status |
| `document_chunks` | AI document chunks | Vector embeddings, semantic search |
| `user_preferences` | User customization | Communication style, expertise areas |
| `user_personas` | AI personality adaptation | Formality, detail level, energy |
| `conversation_summaries` | Chat history | Session summaries, key topics |
| `api_usage` | Usage tracking | Cost monitoring, performance metrics |
| `ab_test_results` | A/B testing | Engagement optimization |

#### **Multi-Tenant Architecture**

```sql
-- Tenant isolation example
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_name VARCHAR(255) NOT NULL,
    admin_email VARCHAR(255) NOT NULL UNIQUE,
    subscription_tier VARCHAR(50) DEFAULT 'standard',
    max_storage_gb INTEGER DEFAULT 10,
    max_users INTEGER DEFAULT 10,
    max_api_calls_monthly INTEGER DEFAULT 10000,
    custom_settings JSONB DEFAULT '{}',
    api_keys JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Document Management System**

```sql
-- Documents with AI processing
CREATE TABLE documents (
    doc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    user_id UUID NOT NULL REFERENCES tenant_users(user_id),
    filename VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    content_preview TEXT,
    chunks_count INTEGER DEFAULT 0,
    metadata JSONB,
    is_processed BOOLEAN DEFAULT FALSE,
    processing_status VARCHAR(50) DEFAULT 'pending'
);

-- AI-powered document chunks with vector embeddings
CREATE TABLE document_chunks (
    chunk_id SERIAL PRIMARY KEY,
    doc_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding VECTOR(1536), -- OpenAI embeddings
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **User Personalization System**

```sql
-- User preferences for AI adaptation
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES tenant_users(user_id),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    communication_style VARCHAR(50) DEFAULT 'conversational',
    response_pace VARCHAR(50) DEFAULT 'normal',
    expertise_areas TEXT[],
    preferred_examples VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI persona adaptation
CREATE TABLE user_personas (
    user_id UUID PRIMARY KEY REFERENCES tenant_users(user_id),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    formality VARCHAR(50) DEFAULT 'balanced',
    detail_level VARCHAR(50) DEFAULT 'normal',
    example_style VARCHAR(50) DEFAULT 'mixed',
    questioning VARCHAR(50) DEFAULT 'direct',
    energy VARCHAR(50) DEFAULT 'moderate',
    confidence FLOAT DEFAULT 0.8,
    sessions_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **API Usage Tracking & Analytics**

```sql
-- Comprehensive API usage monitoring
CREATE TABLE api_usage (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES tenant_users(user_id),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    api_name VARCHAR(50) NOT NULL, -- 'grok', 'openai', 'elevenlabs'
    tokens_used INTEGER DEFAULT 0,
    cost DECIMAL(10, 6) DEFAULT 0,
    request_time FLOAT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B testing for optimization
CREATE TABLE ab_test_results (
    test_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES tenant_users(user_id),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    test_attribute VARCHAR(50),
    original_value VARCHAR(50),
    test_value VARCHAR(50),
    engagement_score FLOAT,
    selected BOOLEAN DEFAULT FALSE,
    test_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Document Processing Pipeline**

```sql
-- Background processing queue
CREATE TABLE document_processing_queue (
    queue_id SERIAL PRIMARY KEY,
    doc_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    priority INTEGER DEFAULT 1,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Audit trail for document access
CREATE TABLE document_access_logs (
    log_id SERIAL PRIMARY KEY,
    doc_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    access_type VARCHAR(50), -- upload, view, search, delete, download
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255)
);
```

#### **Row Level Security (RLS)**

All tables have RLS enabled for complete tenant isolation:

```sql
-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy example
CREATE POLICY "Users can only access their tenant's data" ON documents
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    ));
```

#### **Database Extensions**

```sql
-- Required extensions for advanced features
CREATE EXTENSION IF NOT EXISTS vector;        -- For AI embeddings
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- For UUID generation
```

#### **Key Database Features**

- **Multi-tenant Isolation**: Complete data separation between organizations
- **Vector Search**: AI-powered semantic document search using embeddings
- **Real-time Updates**: Supabase real-time subscriptions for live data
- **Audit Logging**: Comprehensive access and usage tracking
- **Background Processing**: Queue-based document processing system
- **A/B Testing**: Built-in experimentation framework
- **Cost Tracking**: Detailed API usage and cost monitoring

## 🔧 Backend Implementation

### WebSocket Endpoint

```python
@app.websocket("/ws/voice/continuous")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    while True:
        data = await websocket.receive()
        
        if "bytes" in data:
            # Handle binary audio data
            await process_audio_bytes(websocket, data["bytes"])
        elif "text" in data:
            # Handle text messages
            await process_text(websocket, data["text"])
```

### Audio Processing Pipeline

1. **Receive Audio**: Binary audio data from WebSocket
2. **Convert Format**: Raw bytes to WAV format for Whisper
3. **Transcribe**: OpenAI Whisper API for speech-to-text
4. **Generate Response**: GPT-3.5-turbo for AI responses
5. **Synthesize Speech**: ElevenLabs for text-to-speech
6. **Send Response**: Audio and transcript back via WebSocket

### API Integration

```python
# OpenAI Whisper
transcript = openai_client.audio.transcriptions.create(
    model="whisper-1",
    file=audio_file,
    response_format="text"
)

# OpenAI GPT
response = openai_client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[
        {"role": "system", "content": "You are AURA..."},
        {"role": "user", "content": text}
    ]
)

# ElevenLabs TTS
audio = generate(
    text=text,
    voice="Rachel",
    model="eleven_monolingual_v1"
)
```

## 🔌 WebSocket Protocol

### Message Types

#### From Client to Server
```javascript
// Binary audio data
websocket.send(audioBuffer);

// Text messages
websocket.send(JSON.stringify({
    type: "text",
    text: "Hello AURA"
}));
```

#### From Server to Client
```javascript
// Transcript messages
{
    "type": "transcript",
    "text": "You said: Hello"
}

// Audio responses
{
    "type": "audio",
    "audio": "base64_encoded_audio_data"
}

// Error messages
{
    "type": "error",
    "text": "Error description"
}
```

## 🎨 UI Components

### Voice Widget Features
- **Floating Design**: Always-on-top widget
- **Minimize/Maximize**: Collapsible interface
- **Real-time Status**: Connection and call status
- **Transcript Display**: Live conversation history
- **Audio Controls**: Start/end call buttons
- **Settings Panel**: Configuration options

### Admin Panel Features
- **Login System**: Secure authentication
- **Document Upload**: File management
- **Dashboard**: Overview and statistics
- **Modern UI**: W3Schools-inspired design

## 🔐 Security Considerations

### Authentication
- Token-based WebSocket authentication
- JWT tokens for admin panel
- Secure API endpoints

### Audio Security
- Local audio processing
- Secure WebSocket connections
- No audio storage on server

## 🧪 Testing

### Development Server
```bash
# Start test server
python simple_test.py

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/
```

### Test Scripts
```bash
cd test
python test_api_keys.py            # Test API key configuration
python test_complete_pipeline.py   # Test full voice pipeline
python test_continuous_voice.py    # Test real-time voice conversation
python test_streaming.py           # Test streaming functionality
python test_voice_pipeline.py      # Test voice pipeline components
```

### Frontend Testing
1. Open `frontend/test.html`
2. Test voice widget functionality
3. Verify WebSocket connections
4. Check audio capture and playback

## 📊 Performance Considerations

### Audio Optimization
- **Buffer Size**: 4096 samples for ScriptProcessor
- **Sample Rate**: 16kHz for optimal Whisper performance
- **Channels**: Mono to reduce bandwidth
- **Format**: 16-bit PCM for compatibility

### WebSocket Optimization
- **Binary Messages**: Direct audio streaming
- **Buffering**: Client-side audio buffering
- **Error Handling**: Graceful connection recovery

## 🔄 Deployment

### Production Setup
1. **Backend**: Deploy FastAPI with uvicorn
2. **Frontend**: Serve static files via web server
3. **Environment**: Set production API keys
4. **SSL**: Enable HTTPS for WebSocket connections

### Environment Variables
```bash
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
DATABASE_URL=your_database_url
REDIS_URL=your_redis_url
```

## 📚 API Reference

### WebSocket Endpoints
- `ws://localhost:8080/ws/voice/continuous` - Voice call WebSocket

### HTTP Endpoints
- `GET /health` - Health check
- `GET /` - Root endpoint
- `POST /api/login` - Admin login
- `POST /api/documents/upload` - Document upload
- `GET /api/documents` - List documents

## 🤝 Contributing

### Development Workflow
1. Create feature branch
2. Implement changes
3. Test with development server
4. Update documentation
5. Submit pull request

### Code Standards
- **JavaScript**: ES6+ with modern practices
- **Python**: PEP 8 with type hints
- **HTML/CSS**: Semantic HTML, modern CSS
- **Documentation**: Clear comments and README updates

---

**Last Updated**: December 2024
**Version**: 1.0.0
