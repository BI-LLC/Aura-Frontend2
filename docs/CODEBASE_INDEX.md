# 📚 AURA Voice AI - Codebase Index

## 🎯 **Project Overview**

**AURA Voice AI** is a sophisticated multi-tenant voice AI platform that enables organizations to create personalized voice chatbots with document-based knowledge. The system provides real-time voice conversations, document ingestion, and AI-powered responses using a combination of OpenAI Whisper, GPT models, and ElevenLabs TTS.

## 🏗️ **Architecture Summary**

### **System Type**: Multi-tenant SaaS Platform
### **Technology Stack**:
- **Backend**: Python/FastAPI with WebSocket support
- **Frontend**: React.js with vanilla JavaScript components
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **AI Services**: OpenAI (Whisper, GPT), ElevenLabs (TTS), Grok API
- **Infrastructure**: Docker, Redis, WebSocket real-time communication

## 📁 **Directory Structure Analysis**

```
Aura-main/
├── 📂 backend/                    # Python/FastAPI backend
│   ├── 📂 app/                    # Main application code
│   │   ├── 📄 main.py             # FastAPI app entry point
│   │   ├── 📄 config.py           # Configuration management
│   │   ├── 📂 models/             # Pydantic data models
│   │   ├── 📂 services/           # Core business logic
│   │   ├── 📂 routers/            # API endpoint handlers
│   │   ├── 📂 middleware/         # Request/response middleware
│   │   └── 📄 supabase_client.py  # Database integration
│   ├── 📂 data/                   # Document storage
│   ├── 📂 database/               # Database schemas
│   └── 📄 requirements.txt        # Python dependencies
├── 📂 frontend/                   # React.js frontend
│   ├── 📂 src/                    # React application source
│   │   ├── 📄 App.js              # Main React component
│   │   ├── 📂 components/         # React components
│   │   ├── 📂 services/           # API service layer
│   │   ├── 📂 context/            # React context providers
│   │   ├── 📂 hooks/              # Custom React hooks
│   │   └── 📂 styles/             # CSS styling
│   └── 📄 package.json            # Frontend dependencies
├── 📂 docs/                       # Comprehensive documentation
├── 📂 test/                       # Test scripts and utilities
├── 📂 deployment/                 # Docker and deployment configs
└── 📄 docker-compose.yml          # Development environment
```

## 🔧 **Core Components Analysis**

### **1. Backend Architecture**

#### **Main Application (`backend/app/main.py`)**
- **Purpose**: FastAPI application with multi-tenant support
- **Key Features**:
  - Multi-tenant architecture with isolated data per organization
  - WebSocket support for real-time voice communication
  - Service lifecycle management with dependency injection
  - Comprehensive error handling and logging
  - Health monitoring and system status endpoints

#### **Core Services**
| Service | Purpose | Key Features |
|---------|---------|--------------|
| `SmartRouter` | AI provider routing | Load balancing between OpenAI/Grok, cost tracking, health monitoring |
| `VoicePipeline` | Voice processing | STT/TTS integration, audio format conversion, streaming support |
| `MemoryEngine` | Conversation context | Redis-based memory, session management, context persistence |
| `TenantManager` | Multi-tenant isolation | Organization management, user isolation, subscription tiers |
| `DataIngestion` | Document processing | File upload, content extraction, vector embeddings |

#### **API Endpoints**
| Endpoint | Purpose | Methods |
|----------|---------|---------|
| `/api/chat` | Document-based chat | POST |
| `/api/documents/upload` | Document upload | POST |
| `/api/documents` | Document listing | GET |
| `/voice/status` | Voice system status | GET |
| `/health` | System health check | GET |
| `/ws/voice/continuous` | Real-time voice WebSocket | WebSocket |

### **2. Frontend Architecture**

#### **React Application (`frontend/src/`)**
- **Technology**: React 18 with modern hooks and context
- **Routing**: React Router for SPA navigation
- **State Management**: React Context API with custom hooks
- **Styling**: CSS modules with responsive design

#### **Key Components**
| Component | Purpose | Location |
|-----------|---------|----------|
| `Homepage` | Landing page | `components/home/` |
| `VoiceChat` | Voice conversation interface | `components/explore/` |
| `Dashboard` | User dashboard | `components/dashboard/` |
| `Login/Register` | Authentication | `components/auth/` |
| `Navbar` | Navigation | `components/common/` |

#### **Services Layer**
| Service | Purpose | Key Methods |
|---------|---------|-------------|
| `api.js` | HTTP client | GET, POST, PUT, DELETE with interceptors |
| `voiceService.js` | Voice functionality | Recording, STT, TTS, audio playback |
| `authService.js` | Authentication | Login, logout, token management |
| `chatbotService.js` | Chat integration | Message sending, response handling |

### **3. Database Schema**

#### **Multi-Tenant Architecture**
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Tenant Isolation**: Complete data separation per organization
- **Key Tables**:
  - `tenants` - Organization management
  - `tenant_users` - User management per tenant
  - `documents` - Document storage and metadata
  - `document_chunks` - AI-processed document chunks with embeddings
  - `user_preferences` - Personalization settings
  - `conversation_summaries` - Chat history and context

## 🎤 **Voice AI Pipeline**

### **Audio Processing Flow**
1. **Audio Capture**: Web Audio API → 16kHz mono PCM
2. **Real-time Streaming**: WebSocket binary data transmission
3. **Speech-to-Text**: OpenAI Whisper API
4. **AI Processing**: GPT-3.5-turbo with document context
5. **Text-to-Speech**: ElevenLabs API
6. **Audio Playback**: Web Audio API with streaming

### **Key Voice Features**
- **Continuous Conversation**: Real-time voice interaction
- **Document Context**: AI responses based on uploaded documents
- **Interruption Handling**: User can interrupt AI responses
- **Voice Activity Detection**: Automatic speech detection
- **Multi-format Support**: Various audio formats and qualities

## 🔐 **Security & Multi-tenancy**

### **Tenant Isolation**
- **Row Level Security**: Database-level tenant separation
- **API Authentication**: JWT-based authentication per tenant
- **Data Encryption**: Secure data transmission and storage
- **Access Control**: Role-based permissions within tenants

### **Security Features**
- **API Key Management**: Secure storage and rotation
- **CORS Configuration**: Configurable cross-origin policies
- **Input Validation**: Pydantic models for request validation
- **Error Handling**: Secure error responses without data leakage

## 📊 **Performance & Scalability**

### **Current Performance Metrics**
| Metric | Current | Target |
|--------|---------|--------|
| Audio Latency | ~2-3s | <500ms |
| STT Processing | ~1-2s | <300ms |
| LLM Response | ~2-4s | <1s |
| TTS Generation | ~1-2s | <400ms |
| Total RTT | ~6-11s | <2.2s |

### **Scalability Features**
- **Horizontal Scaling**: Docker-based deployment
- **Load Balancing**: Smart routing between AI providers
- **Caching**: Redis for session and conversation data
- **Queue Processing**: Background document processing
- **Connection Pooling**: Database connection optimization

## 🧪 **Testing & Quality Assurance**

### **Test Coverage**
- **Unit Tests**: Service-level testing for core components
- **Integration Tests**: End-to-end pipeline testing
- **API Tests**: Comprehensive endpoint testing
- **Voice Tests**: Audio processing and WebSocket testing
- **Performance Tests**: Load and stress testing

### **Test Files**
| File | Purpose | Coverage |
|------|---------|----------|
| `test_api_keys.py` | API connectivity | OpenAI, ElevenLabs, Grok |
| `test_complete_pipeline.py` | End-to-end testing | Full voice pipeline |
| `test_continuous_voice.py` | Voice conversation | Real-time WebSocket |
| `test_streaming.py` | Streaming functionality | Audio/response streaming |

## 🚀 **Deployment & Infrastructure**

### **Development Environment**
- **Local Development**: Docker Compose with hot reload
- **Database**: Local Supabase instance
- **Services**: Redis, PostgreSQL, FastAPI, React dev server

### **Production Deployment**
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose with scaling support
- **Monitoring**: Health checks and system metrics
- **Environment Management**: Environment-specific configurations

## 📚 **Documentation Quality**

### **Documentation Coverage**
- **System Architecture**: Comprehensive technical documentation
- **Developer Guide**: Setup, development, and deployment guides
- **API Documentation**: Complete endpoint and WebSocket documentation
- **Troubleshooting**: Common issues and solutions
- **Quick Reference**: Essential commands and fixes

### **Documentation Files**
| File | Purpose | Audience |
|------|---------|----------|
| `SYSTEM_ARCHITECTURE.md` | Technical architecture | Developers, Architects |
| `DEVELOPER_GUIDE.md` | Development workflow | Developers |
| `QUICK_REFERENCE.md` | Essential commands | All users |
| `TROUBLESHOOTING_GUIDE.md` | Issue resolution | Support, Developers |

## 🔍 **Key Findings & Recommendations**

### **Strengths**
✅ **Well-architected multi-tenant system** with proper data isolation
✅ **Comprehensive documentation** with clear setup instructions
✅ **Modern technology stack** with industry-standard tools
✅ **Real-time voice capabilities** with WebSocket support
✅ **Extensible design** for adding new AI providers
✅ **Security-conscious implementation** with proper authentication

### **Areas for Improvement**
⚠️ **Voice pipeline latency** needs optimization (currently 6-11s total)
⚠️ **Error handling** could be more robust in voice processing
⚠️ **Testing coverage** could be expanded for edge cases
⚠️ **Performance monitoring** needs more comprehensive metrics
⚠️ **Documentation** could include more deployment scenarios

### **Technical Debt**
- Voice Activity Detection implementation is incomplete
- Streaming LLM responses not fully implemented
- Audio pipeline optimization needed for lower latency
- Some hardcoded configurations should be environment-based

## 🎯 **Development Priorities**

### **Phase 1: Performance Optimization** (High Priority)
1. Optimize voice pipeline latency
2. Implement proper streaming responses
3. Enhance Voice Activity Detection
4. Improve audio processing efficiency

### **Phase 2: Feature Enhancement** (Medium Priority)
1. Add function calling support
2. Implement advanced interruption handling
3. Enhance multi-modal context support
4. Add comprehensive monitoring

### **Phase 3: Scalability** (Lower Priority)
1. Implement horizontal scaling
2. Add load balancing
3. Enhance caching strategies
4. Optimize database queries

## 📞 **Getting Started**

### **Quick Start Commands**
```bash
# Backend setup
cd backend
pip install -r requirements.txt
python app/main.py

# Frontend setup
cd frontend
npm install
npm start

# Docker setup
docker-compose up
```

### **Key URLs**
- **Main Application**: http://localhost:8000
- **Voice Widget**: http://localhost:8000/widget/
- **Admin Panel**: http://localhost:8000/admin/
- **Health Check**: http://localhost:8000/health
- **WebSocket**: ws://localhost:8000/ws/voice/continuous

---

**📝 This codebase index provides a comprehensive overview of the AURA Voice AI system. The platform demonstrates sophisticated architecture with multi-tenant support, real-time voice processing, and comprehensive documentation. The main focus areas for improvement are performance optimization and enhanced voice pipeline capabilities.**

**Last Updated**: December 2024  
**Version**: 4.0.0  
**Status**: Production-ready with optimization opportunities
