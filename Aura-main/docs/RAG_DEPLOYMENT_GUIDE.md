# 🚀 RAG Pipeline Deployment Guide - AURA Voice AI

## ✅ What We've Built

Your RAG (Retrieval Augmented Generation) pipeline is now **fully integrated** into AURA Voice AI with the following components:

### 🧠 **Core RAG Services**
- **`embedding_service.py`** - OpenAI text-embedding-3-small integration with caching
- **`chunk_processor.py`** - Intelligent document chunking with semantic preservation  
- **`vector_search_service.py`** - Semantic similarity search with hybrid capabilities
- **`rag_pipeline.py`** - Complete orchestration of document processing and context retrieval

### 🔌 **API Integration**
- **`rag_chat.py`** - New RAG-enhanced chat endpoints (`/rag/chat`, `/rag/upload-document`)
- **Enhanced `chat.py`** - Existing chat now uses RAG when available
- **Updated `training_data_service.py`** - RAG-enhanced context retrieval

### 🗄️ **Database Functions**
- **`rag_vector_functions.sql`** - PostgreSQL functions for vector similarity search
- **Hybrid search capabilities** - Combines vector similarity + keyword matching
- **Performance optimization** functions

---

## 🏗️ **Deployment Steps**

### **Step 1: Database Setup (Supabase)**

1. **Open your Supabase SQL Editor**
2. **Execute the RAG functions**:
   ```sql
   -- Copy and paste the entire contents of:
   -- Aura-main/backend/database/rag_vector_functions.sql
   ```

3. **Verify vector extension is enabled**:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

4. **Check if vector functions were created**:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name LIKE 'match_%' OR routine_name LIKE '%_search_%';
   ```

### **Step 2: Backend Deployment**

1. **Upload your enhanced backend**:
   ```bash
   # From your local machine
   scp -r Aura-main/backend/* root@your-server-ip:/path/to/aura/backend/
   ```

2. **Install any missing dependencies** (if needed):
   ```bash
   # On your server
   cd /path/to/aura/backend
   pip install tiktoken  # Should already be in requirements.txt
   ```

3. **Restart the backend service**:
   ```bash
   # Stop old process
   pkill -f uvicorn
   
   # Start new process
   cd /path/to/aura/backend
   nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
   ```

### **Step 3: Test the Integration**

1. **Test basic functionality**:
   ```bash
   # Run the test script
   cd /path/to/aura/backend
   python test_rag_components.py
   ```

2. **Test RAG endpoints**:
   ```bash
   # Test RAG pipeline status
   curl http://localhost:8000/rag/test
   
   # Test enhanced chat
   curl -X POST http://localhost:8000/rag/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "What is BIC?", "assistant_key": "bib-halder"}'
   ```

---

## 🎯 **New API Endpoints**

### **RAG-Enhanced Chat**
```http
POST /rag/chat
{
  "message": "What is BIC Corporation?",
  "assistant_key": "bib-halder",
  "tenant_id": "optional-tenant-id",
  "use_hybrid_search": true,
  "max_context_chunks": 15
}
```

**Response:**
```json
{
  "response": "BIC stands for Bibhrajit Investment Corporation...",
  "sources_used": ["document_chunks", "training_data"],
  "context_confidence": 0.87,
  "processing_time": 1.23,
  "rag_stats": {
    "chunks_retrieved": 8,
    "context_tokens": 1250,
    "model_used": "gpt-4-turbo"
  }
}
```

### **RAG Document Upload**
```http
POST /rag/upload-document
Content-Type: multipart/form-data

file: [document file]
assistant_key: "bib-halder"
tenant_id: "optional-tenant-id"
```

**Response:**
```json
{
  "success": true,
  "results": {
    "chunks_created": 15,
    "chunks_stored": 15,
    "embeddings_generated": 15,
    "semantic_search_enabled": true
  }
}
```

### **Semantic Search (Testing)**
```http
GET /rag/search?query=investment&assistant_key=bib-halder&limit=10
```

---

## 🔄 **How It Works Now**

### **Enhanced Chat Flow**
1. **User sends message** → `/chat/message` or `/rag/chat`
2. **Context Retrieval**:
   - Traditional training data (Q&A, Logic Notes)
   - **NEW**: Vector similarity search in document chunks
   - **NEW**: Hybrid search (vector + keyword)
3. **AI Response** with comprehensive context
4. **Source Attribution** showing what knowledge was used

### **Document Upload Flow**
1. **User uploads document** → `/rag/upload-document`
2. **Intelligent Processing**:
   - Smart text chunking (preserves semantic meaning)
   - Embedding generation (OpenAI text-embedding-3-small)
   - Vector storage in Supabase
3. **Immediate Availability** for semantic search

---

## 🚨 **Important Notes**

### **Cost Management**
- **Embeddings cost**: ~$0.0001 per 1K tokens
- **Caching enabled**: Reduces repeat embedding costs
- **Batch processing**: Optimizes API calls

### **Performance**
- **Vector indexes**: Already optimized in database functions  
- **Hybrid search**: Balances speed vs. accuracy
- **Token limits**: Automatically manages context window

### **Fallback Behavior**
- **RAG fails** → Falls back to traditional training data
- **No embeddings** → Uses keyword search
- **Database down** → Returns "I don't know" gracefully

---

## 🧪 **Testing Your RAG Integration**

### **1. Upload a Test Document**
```bash
curl -X POST http://localhost:8000/rag/upload-document \
  -F "file=@test_document.txt" \
  -F "assistant_key=bib-halder"
```

### **2. Ask Questions About It**
```bash
curl -X POST http://localhost:8000/rag/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What does the document say about X?", "assistant_key": "bib-halder"}'
```

### **3. Check RAG Statistics**
```bash
curl http://localhost:8000/rag/stats
```

---

## 📊 **Monitoring & Debugging**

### **Log Messages to Watch For**
```
✅ "RAG context retrieved successfully (confidence: 0.87, sources: ['hybrid_search'])"
✅ "Generated 15 embeddings from test_document.txt"  
✅ "Stored 15/15 chunks for document"
❌ "RAG context failed, using traditional: [error]"
```

### **Key Metrics**
- **Context confidence score**: > 0.3 for good responses
- **Processing time**: < 2 seconds for normal queries
- **Cache hit rate**: Monitor embedding service cache stats

---

## 🎉 **You're Ready!**

Your AURA Voice AI now has **enterprise-grade RAG capabilities**:

- ✅ **Semantic document search** across all uploaded content
- ✅ **Intelligent context retrieval** with confidence scoring  
- ✅ **Hybrid search** combining vector similarity + keywords
- ✅ **Automatic fallback** to existing training data
- ✅ **Multi-tenant isolation** preserved
- ✅ **Cost-optimized** with embedding caching
- ✅ **Production-ready** with comprehensive error handling

### **Next Steps**
1. Deploy to your server following the steps above
2. Run the database functions in Supabase  
3. Test with your existing BIC documents
4. Monitor performance and adjust as needed

**Your AI will now provide dramatically more accurate, contextual responses while maintaining the reliability of your existing system!** 🚀
