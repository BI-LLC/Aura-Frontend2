# AURA Voice AI - Complete Backend System Architecture

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Core Architecture Components](#core-architecture-components)
4. [RAG Pipeline Architecture](#rag-pipeline-architecture)
5. [Database Schema (Supabase)](#database-schema-supabase)
6. [API Endpoints](#api-endpoints)
7. [Data Flow](#data-flow)
8. [Multi-Tenant Architecture](#multi-tenant-architecture)
9. [Security & Access Control](#security--access-control)
10. [Deployment Architecture](#deployment-architecture)

---

## System Overview

AURA is an AI-powered conversational assistant with **Retrieval Augmented Generation (RAG)** capabilities, multi-tenant support, voice interaction, and comprehensive knowledge management. The system uses **Supabase** as its primary database and storage layer, **OpenAI** and **Grok** for LLM processing, and **ElevenLabs** for text-to-speech.

### Key Features
- 🤖 **Multi-LLM Support**: OpenAI GPT-4 Turbo, Grok, with intelligent routing
- 📚 **RAG Pipeline**: Semantic search across documents, training data, and knowledge bases
- 🏢 **Multi-Tenant**: Complete data isolation per organization
- 🗣️ **Voice Support**: Real-time STT/TTS with WebSocket streaming
- 💾 **Supabase Integration**: PostgreSQL with vector extensions for embeddings
- 🔒 **Row Level Security**: Fine-grained access control

---

## Technology Stack

### Core Technologies
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Web Framework** | FastAPI | High-performance async API server |
| **Database** | Supabase (PostgreSQL) | Primary database with vector search |
| **Vector Search** | pgvector | Semantic similarity search for embeddings |
| **Embeddings** | OpenAI `text-embedding-3-small` | 1536-dimensional vector embeddings |
| **LLM** | OpenAI GPT-4 Turbo, Grok | Text generation and chat |
| **STT** | OpenAI Whisper | Speech-to-text |
| **TTS** | ElevenLabs | Text-to-speech with natural voices |
| **Storage** | Supabase Storage | File uploads (documents, audio) |
| **Server** | Uvicorn | ASGI server for FastAPI |

### Python Libraries
```
fastapi==0.115.6
supabase==2.10.0
openai==1.59.6
tiktoken==0.8.0
python-multipart==0.0.20
PyPDF2==3.0.1
python-docx==1.1.2
websockets==14.1
```

---

## Core Architecture Components

### 1. Application Entry Point (`main.py`)

```
┌─────────────────────────────────────────────┐
│          FastAPI Application (main.py)       │
├─────────────────────────────────────────────┤
│ • CORS Middleware                            │
│ • Tenant Identification Middleware           │
│ • Router Registration                        │
│ • Startup/Shutdown Hooks                     │
└─────────────────────────────────────────────┘
```

**Key Responsibilities:**
- Initialize all services and routers
- Configure CORS for frontend access
- Set up tenant middleware for request isolation
- Health checks and monitoring

### 2. Router Layer (`app/routers/`)

| Router | Endpoint Prefix | Purpose |
|--------|----------------|---------|
| `chat.py` | `/api/chat` | Standard chat interactions |
| `rag_chat.py` | `/rag/chat` | RAG-enhanced chat with document retrieval |
| `voice.py` | `/api/voice` | Voice processing (STT/TTS) |
| `continuous_voice.py` | `/api/continuous-voice` | WebSocket voice streaming |
| `documents.py` | `/api/documents` | Document upload and management |
| `training.py` | `/api/training` | Training data CRUD operations |
| `memory.py` | `/api/memory` | User preference and memory management |
| `admin.py` | `/admin` | Administrative dashboard and operations |
| `tenant_admin.py` | `/api/tenant` | Tenant-specific admin functions |

### 3. Service Layer (`app/services/`)

#### Core Services

**RAG Pipeline Services:**
```
embedding_service.py        → Generate OpenAI embeddings
chunk_processor.py          → Smart document chunking
vector_search_service.py    → Semantic similarity search
rag_pipeline.py            → Orchestrate RAG workflow
```

**AI & Language Services:**
```
smart_router.py            → Route queries to appropriate LLM
voice_service.py           → Handle voice processing
voice_pipeline.py          → Manage STT/TTS pipeline
```

**Data Management:**
```
document_processor.py      → Extract text from documents
data_ingestion.py          → Process and store uploaded files
training_data_service.py   → Manage training Q&A pairs
memory_engine.py           → User preferences and history
```

**Multi-Tenant:**
```
tenant_manager.py          → Tenant CRUD and management
tenant_aware_services.py   → Tenant-isolated operations
```

---

## RAG Pipeline Architecture

### Overview

The RAG (Retrieval Augmented Generation) pipeline enhances AI responses by retrieving relevant context from multiple knowledge sources before generating answers.

```
┌──────────────┐
│ User Query   │
└──────┬───────┘
       │
       ↓
┌─────────────────────────────────────────────┐
│  1. EMBEDDING GENERATION                     │
│  Convert query → 1536-dim vector            │
│  (OpenAI text-embedding-3-small)            │
└──────┬──────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────┐
│  2. VECTOR SEARCH (Parallel)                │
├─────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌────────────────┐   │
│  │ Document Chunks │  │ Training Data  │   │
│  │ (pgvector)      │  │ (Q&A pairs)    │   │
│  └─────────────────┘  └────────────────┘   │
│  ┌─────────────────┐  ┌────────────────┐   │
│  │ Logic Notes     │  │ Ref Materials  │   │
│  │ (Guidelines)    │  │ (Documents)    │   │
│  └─────────────────┘  └────────────────┘   │
└──────┬──────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────┐
│  3. CONTEXT AGGREGATION                     │
│  • Rank by similarity score                 │
│  • Filter by threshold (0.7 default)        │
│  • Deduplicate and merge contexts           │
│  • Calculate confidence score               │
└──────┬──────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────┐
│  4. PROMPT CONSTRUCTION                     │
│  System Prompt + Retrieved Context + Query  │
└──────┬──────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────┐
│  5. LLM GENERATION                          │
│  Route to: OpenAI GPT-4 / Grok              │
└──────┬──────────────────────────────────────┘
       │
       ↓
┌──────────────┐
│ AI Response  │
└──────────────┘
```

### RAG Service Components

#### 1. Embedding Service (`embedding_service.py`)
```python
class EmbeddingService:
    - generate_embedding(text) → List[float]
    - generate_batch_embeddings(texts) → List[List[float]]
```
**Features:**
- Uses OpenAI `text-embedding-3-small` model
- 1536-dimensional vectors
- Batch processing support (up to 100 texts)
- Automatic retry on failures

#### 2. Chunk Processor (`chunk_processor.py`)
```python
class ChunkProcessor:
    - smart_chunk_document(text, metadata) → List[DocumentChunk]
```
**Chunking Strategy:**
- **Token-based**: Max 500 tokens per chunk
- **Semantic preservation**: Split by sentences/paragraphs
- **Overlap**: 50-token overlap between chunks
- **Structure detection**: Identifies headers, lists, sections
- **Type classification**: definition, question, process, data, general

**Example Chunk:**
```python
DocumentChunk(
    text="Bibhrajit Halder is an AI founder...",
    chunk_index=0,
    token_count=491,
    metadata={
        'filename': 'Bibhrajit_Company_Information.txt',
        'tenant_id': '00000000-0000-0000-0000-000000000001',
        'assistant_key': 'bib-halder',
        'chunk_type': 'definition'
    },
    chunk_type="definition",
    start_char=0,
    end_char=1245
)
```

#### 3. Vector Search Service (`vector_search_service.py`)
```python
class VectorSearchService:
    - semantic_search(query, assistant_key, tenant_id, limit, threshold)
    - _search_document_chunks() → List[SearchResult]
    - _search_training_data() → List[SearchResult]
    - _search_logic_notes() → List[SearchResult]
    - _keyword_search_fallback() → List[SearchResult]
```

**Search Process:**
1. Generate query embedding
2. Search across multiple sources in parallel
3. Use cosine similarity (pgvector `<=>` operator)
4. Filter by similarity threshold (default 0.7)
5. Filter by tenant_id and assistant_key
6. Fallback to keyword search if no results

**Similarity Calculation:**
```sql
1 - (embedding <=> query_embedding) AS similarity
```

#### 4. RAG Pipeline (`rag_pipeline.py`)
```python
class RAGPipeline:
    - retrieve_and_generate(query, assistant_key, tenant_id)
    - get_context_for_query() → (context, sources, confidence)
```

**Confidence Scoring:**
- High (>0.8): Strong match, multiple high-similarity sources
- Medium (0.6-0.8): Moderate match, some relevant context
- Low (<0.6): Weak match, may trigger "I don't know" response

---

## Database Schema (Supabase)

### Vector Search Function

**Required PostgreSQL Extensions:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

**Vector Search RPC Function:**
```sql
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  tenant_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  chunk_id int,
  doc_id uuid,
  chunk_text text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.chunk_id,
    document_chunks.doc_id::uuid,
    document_chunks.chunk_text,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity,
    document_chunks.metadata
  FROM document_chunks
  WHERE 
    (tenant_filter IS NULL OR document_chunks.tenant_id = tenant_filter)
    AND document_chunks.embedding IS NOT NULL
    AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Core Tables

#### 1. Tenants
```sql
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

#### 2. Documents
```sql
CREATE TABLE documents (
    doc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    filename VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    content_preview TEXT,
    chunks_count INTEGER DEFAULT 0,
    metadata JSONB,
    upload_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_processed BOOLEAN DEFAULT FALSE,
    processing_status VARCHAR(50) DEFAULT 'pending'
);
```

#### 3. Document Chunks (Vector Search)
```sql
CREATE TABLE document_chunks (
    chunk_id SERIAL PRIMARY KEY,
    doc_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding VECTOR(1536),  -- OpenAI text-embedding-3-small
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

-- Vector similarity index (IVFFlat for performance)
CREATE INDEX idx_document_chunks_embedding 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

#### 4. Training Data
```sql
CREATE TABLE training_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    assistant_key VARCHAR(255),
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. Reference Materials
```sql
CREATE TABLE reference_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    filename VARCHAR(500),
    original_filename VARCHAR(500),
    file_type VARCHAR(50),
    file_size BIGINT,
    content TEXT,
    uploaded_by UUID,
    assistant_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 6. Logic Notes
```sql
CREATE TABLE logic_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    assistant_key VARCHAR(255),
    title VARCHAR(500),
    content TEXT,
    category VARCHAR(100),
    tags TEXT[],
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Storage Buckets

**Supabase Storage Buckets:**
- `reference-materials`: User-uploaded documents (PDF, DOCX, TXT, MD)
- `audio-files`: Voice recordings and generated audio

---

## API Endpoints

### RAG Chat Endpoint

**POST** `/rag/chat`

**Request:**
```json
{
  "message": "Who is Bibhrajit Halder?",
  "assistant_key": "bib-halder",
  "tenant_id": "00000000-0000-0000-0000-000000000001",
  "use_memory": false,
  "stream": false
}
```

**Response:**
```json
{
  "response": "Bibhrajit Halder is an AI and robotics founder who helps startups with fundraising and growth strategies...",
  "sources_used": ["document_chunks", "training_data"],
  "context_confidence": 0.89,
  "processing_time": 5.21,
  "cost": 0.0042,
  "rag_stats": {
    "chunks_retrieved": 4,
    "context_tokens": 1245,
    "search_time": 2.34,
    "model_used": "gpt-4-turbo"
  },
  "assistant_key": "bib-halder",
  "timestamp": "2025-10-01T12:24:21.114213"
}
```

### Document Upload

**POST** `/api/documents/upload`

**Request:**
```
Content-Type: multipart/form-data

file: <PDF/DOCX/TXT/MD file>
user_id: "user-123"
```

**Response:**
```json
{
  "success": true,
  "message": "Document 'report.pdf' processed successfully",
  "document": {
    "id": "3cd24486-6e0c-4204-8f99-e16f73351fb5",
    "filename": "report.pdf",
    "chunks": 12,
    "tokens": 5432,
    "processed_at": "2025-10-01T12:00:00Z"
  }
}
```

### Training Data

**POST** `/api/training/qa`

**Request:**
```json
{
  "prompt": "What is your mission?",
  "response": "To help AI founders grow their companies through strategic guidance.",
  "tags": ["mission", "company"],
  "assistant_key": "bib-halder"
}
```

---

## Data Flow

### Document Upload & Processing Flow

```
┌─────────────────┐
│ 1. User Uploads │
│    Document     │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────┐
│ 2. Store in Supabase Storage        │
│    Bucket: reference-materials      │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│ 3. Extract Text                     │
│    • PDF → PyPDF2                   │
│    • DOCX → python-docx             │
│    • TXT/MD → Direct read           │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│ 4. Intelligent Chunking             │
│    • Split by sentences/paragraphs  │
│    • Max 500 tokens per chunk       │
│    • 50-token overlap               │
│    • Classify chunk types           │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│ 5. Generate Embeddings              │
│    • OpenAI text-embedding-3-small  │
│    • Batch process (100 at a time)  │
│    • 1536-dimensional vectors       │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│ 6. Store in Supabase                │
│    • documents table: metadata      │
│    • document_chunks: text+vectors  │
│    • reference_materials: original  │
└─────────────────────────────────────┘
```

### RAG Query Flow

```
┌──────────────┐
│ User Query   │
└──────┬───────┘
       │
       ↓
┌───────────────────────────────────────┐
│ 1. Generate Query Embedding           │
└──────┬────────────────────────────────┘
       │
       ↓
┌───────────────────────────────────────┐
│ 2. Vector Search (Parallel)           │
│    • Search document_chunks           │
│    • Search training_data             │
│    • Search logic_notes               │
│    • Search reference_materials       │
│    • Filter by tenant + assistant_key │
│    • Similarity threshold: 0.7        │
└──────┬────────────────────────────────┘
       │
       ↓
┌───────────────────────────────────────┐
│ 3. Rank & Aggregate Results           │
│    • Sort by similarity (desc)        │
│    • Deduplicate overlapping chunks   │
│    • Calculate confidence score       │
└──────┬────────────────────────────────┘
       │
       ↓
┌───────────────────────────────────────┐
│ 4. Build Context Prompt               │
│    System: "You are an AI assistant"  │
│    Context: [Retrieved chunks]        │
│    Query: [User question]             │
└──────┬────────────────────────────────┘
       │
       ↓
┌───────────────────────────────────────┐
│ 5. LLM Generation                     │
│    Route to OpenAI or Grok            │
└──────┬────────────────────────────────┘
       │
       ↓
┌───────────────────────────────────────┐
│ 6. Return Response                    │
│    • AI answer                        │
│    • Sources used                     │
│    • Confidence score                 │
│    • Processing stats                 │
└───────────────────────────────────────┘
```

---

## Multi-Tenant Architecture

### Tenant Isolation Strategy

**Database Level:**
- Every table has `tenant_id` foreign key
- Row Level Security (RLS) policies enforce isolation
- Separate storage paths: `{tenant_id}/documents/`

**Application Level:**
- Tenant middleware extracts `tenant_id` from requests
- All queries automatically filtered by `tenant_id`
- Service layer enforces tenant context

**Tenant Middleware (`tenant_middleware.py`):**
```python
async def tenant_middleware(request: Request, call_next):
    # Extract tenant_id from:
    # 1. Header: X-Tenant-ID
    # 2. Subdomain: {tenant}.iaura.ai
    # 3. JWT token claims
    
    tenant_id = extract_tenant_id(request)
    request.state.tenant_id = tenant_id
    
    response = await call_next(request)
    return response
```

**Tenant-Aware Query Example:**
```python
# Automatic tenant filtering
result = supabase.table('documents') \
    .select('*') \
    .eq('tenant_id', request.state.tenant_id) \
    .execute()
```

### Default Tenant

**ID:** `00000000-0000-0000-0000-000000000001`
**Name:** `Default Organization`
**Purpose:** Development, testing, and single-tenant deployments

---

## Security & Access Control

### Row Level Security (RLS)

**Enable RLS on Tables:**
```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_materials ENABLE ROW LEVEL SECURITY;
```

**Example Policy:**
```sql
-- Allow authenticated users to read their tenant's documents
CREATE POLICY "Tenant isolation for documents"
ON documents
FOR SELECT
TO authenticated
USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### API Authentication

**Service Key (Admin):**
- `SUPABASE_SERVICE_KEY`: Bypasses RLS, full access
- Used by backend for system operations

**Anonymous Key:**
- `SUPABASE_ANON_KEY`: Limited access with RLS
- Used for public endpoints (if any)

### Environment Variables

**Required in `.env`:**
```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...  # For admin operations

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Grok
GROK_API_KEY=xai-...

# ElevenLabs
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=...

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=false
```

---

## Deployment Architecture

### Production Server Setup

**Server:** DigitalOcean Droplet (Ubuntu)
**Location:** `/root/Aura/backend`

**Directory Structure:**
```
/root/Aura/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── main.py
│   ├── .env
│   ├── requirements.txt
│   └── backend.log
└── venv/  # Python virtual environment
```

**Systemd Service (Optional):**
```ini
[Unit]
Description=AURA Voice AI Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/Aura/backend
Environment="PATH=/root/Aura/venv/bin"
ExecStart=/root/Aura/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

**Manual Start:**
```bash
cd /root/Aura/backend
source /root/Aura/venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Nginx Reverse Proxy:**
```nginx
server {
    listen 80;
    server_name api.iaura.ai;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /api/continuous-voice/ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Monitoring & Logs

**Backend Logs:**
```bash
tail -f /root/Aura/backend/backend.log
```

**Check Running Process:**
```bash
ps aux | grep uvicorn
```

**Restart Backend:**
```bash
pkill -f 'uvicorn.*main'
cd /root/Aura/backend
source /root/Aura/venv/bin/activate
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
```

---

## Performance Considerations

### Vector Search Optimization

**Index Type:** IVFFlat (Inverted File Flat)
```sql
CREATE INDEX idx_document_chunks_embedding 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Benefits:**
- Faster than brute-force search
- ~10x speedup on large datasets (>10,000 vectors)
- Trade-off: 98% recall (vs 100% for exact search)

### Caching Strategy

**Embedding Cache:**
- Cache frequently queried embeddings
- Reduce OpenAI API calls
- Use Redis or in-memory cache

**Context Cache:**
- Cache retrieved contexts for common queries
- TTL: 1 hour
- Invalidate on document updates

### Batch Processing

**Document Processing:**
- Process uploads asynchronously
- Use background workers (Celery/RQ)
- Queue system for large document batches

**Embedding Generation:**
- Batch embeddings (100 texts per request)
- Reduces API latency
- Cost-effective

---

## Future Enhancements

1. **Fine-tuning:** Custom fine-tuned models per tenant
2. **Advanced Chunking:** Recursive character splitters, semantic chunking
3. **Hybrid Search:** Combine vector + keyword search (BM25)
4. **Re-ranking:** Use cross-encoder for better result ranking
5. **Streaming RAG:** Stream retrieved chunks + generation
6. **Multi-modal:** Support images, audio, video in RAG
7. **Graph RAG:** Knowledge graphs for complex relationships

---

## Support & Troubleshooting

### Common Issues

**1. No chunks retrieved in RAG:**
- Check if `match_document_chunks` function exists
- Verify embeddings are generated and stored
- Check similarity threshold (try lowering to 0.5)
- Ensure tenant_id and assistant_key filters are correct

**2. RLS blocking database access:**
- Use `SUPABASE_SERVICE_KEY` for admin operations
- Check RLS policies allow your operation
- Verify policies target correct roles (authenticated/anon)

**3. Slow vector search:**
- Create IVFFlat index on embedding column
- Increase `lists` parameter for better performance
- Consider upgrading Supabase plan for more resources

### Debug Commands

**Check chunks in database:**
```bash
python check_chunks.py
```

**Process uploaded documents:**
```bash
python process_reference_materials.py
```

**Test RAG endpoint:**
```bash
curl -X POST http://localhost:8000/rag/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Your question here", "assistant_key": "default-assistant"}'
```

---

## Conclusion

The AURA Voice AI backend is a sophisticated, production-ready system combining:
- ✅ **RAG**: Semantic search across multiple knowledge sources
- ✅ **Multi-LLM**: Intelligent routing to OpenAI/Grok
- ✅ **Multi-Tenant**: Complete data isolation
- ✅ **Voice**: Real-time STT/TTS processing
- ✅ **Scalable**: Designed for growth with vector indexes and caching
- ✅ **Secure**: RLS policies and tenant isolation

**Contact & Support:**
- Documentation: `/docs`
- API Reference: `http://api.iaura.ai/docs`
- GitHub: [Your repository]

---

**Last Updated:** October 1, 2025
**Version:** 2.0.0 (RAG-Enhanced)

