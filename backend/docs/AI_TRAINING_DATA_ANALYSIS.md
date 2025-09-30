# 🔍 **AI TRAINING DATA STORAGE ANALYSIS**

## ⚠️ **CRITICAL FINDING: MISSING TRAINING TABLES**

After comprehensive analysis of the Supabase schema and backend implementation, **the three training data types are NOT currently stored in dedicated tables**:

### **❌ MISSING TABLES:**
1. **Q&A Pairs** - No dedicated table exists
2. **Logic Notes** - No dedicated table exists  
3. **Reference Materials** - No dedicated table exists

---

## 📊 **CURRENT STATE ANALYSIS**

### **✅ EXISTING RELEVANT TABLES:**
1. **`documents`** - Stores uploaded files (PDF, DOCX, TXT, etc.)
2. **`document_chunks`** - Stores vectorized text chunks for semantic search
3. **`assistant_voice_prefs`** - Stores voice settings per assistant
4. **`tenant_storage`** - Tracks storage usage

### **🔄 CURRENT WORKFLOW:**
The system currently treats all training data as generic **documents**:
- User uploads files → `documents` table
- Files are processed → text chunks stored in `document_chunks` 
- AI retrieves context via semantic search of `document_chunks`

### **❌ PROBLEMS WITH CURRENT APPROACH:**
1. **No categorization** - Q&A pairs mixed with reference materials
2. **No structured Q&A handling** - Questions and answers not linked
3. **No logic note organization** - Important business rules scattered
4. **Generic responses** - AI doesn't know data type context

---

## 🚀 **REQUIRED SOLUTION: CREATE TRAINING TABLES**

### **1. Q&A PAIRS TABLE:**
```sql
CREATE TABLE IF NOT EXISTS qa_pairs (
    qa_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    assistant_key VARCHAR(255) NOT NULL, -- Links to specific assistant
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100), -- Optional grouping
    priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES tenant_users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_qa_tenant_assistant (tenant_id, assistant_key),
    INDEX idx_qa_active (is_active),
    INDEX idx_qa_priority (priority)
);
```

### **2. LOGIC NOTES TABLE:**
```sql
CREATE TABLE IF NOT EXISTS logic_notes (
    logic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    assistant_key VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'business_rule', -- business_rule, process, guideline
    priority INTEGER DEFAULT 1,
    applies_to VARCHAR(255), -- Contexts where this applies
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES tenant_users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_logic_tenant_assistant (tenant_id, assistant_key),
    INDEX idx_logic_type (note_type),
    INDEX idx_logic_active (is_active)
);
```

### **3. REFERENCE MATERIALS TABLE:**
```sql
CREATE TABLE IF NOT EXISTS reference_materials (
    ref_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    assistant_key VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    material_type VARCHAR(50) DEFAULT 'general', -- general, technical, policy, faq
    source_url VARCHAR(500), -- Optional external link
    tags TEXT[], -- Array for flexible categorization
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES tenant_users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_ref_tenant_assistant (tenant_id, assistant_key),
    INDEX idx_ref_type (material_type),
    INDEX idx_ref_tags (tags),
    INDEX idx_ref_active (is_active)
);
```

---

## 🛠️ **BACKEND IMPLEMENTATION REQUIRED**

### **1. NEW TRAINING DATA SERVICE:**
```python
# app/services/training_data_service.py
class TrainingDataService:
    
    async def store_qa_pair(self, tenant_id: str, assistant_key: str, 
                           question: str, answer: str, category: str = None):
        """Store Q&A pair in dedicated table"""
        
    async def store_logic_note(self, tenant_id: str, assistant_key: str,
                              title: str, content: str, note_type: str):
        """Store logic note in dedicated table"""
        
    async def store_reference_material(self, tenant_id: str, assistant_key: str,
                                     title: str, content: str, material_type: str):
        """Store reference material in dedicated table"""
        
    async def get_training_context(self, tenant_id: str, assistant_key: str, 
                                  user_query: str) -> str:
        """Retrieve relevant training data for AI context"""
```

### **2. NEW API ENDPOINTS:**
```python
# app/routers/training.py

@router.post("/qa-pairs")
async def create_qa_pair(request: QAPairRequest):
    """Create new Q&A pair"""

@router.post("/logic-notes") 
async def create_logic_note(request: LogicNoteRequest):
    """Create new logic note"""

@router.post("/reference-materials")
async def create_reference_material(request: ReferenceMaterialRequest):
    """Create new reference material"""

@router.get("/training-context/{assistant_key}")
async def get_training_context(assistant_key: str, query: str):
    """Get relevant training data for AI context"""
```

### **3. ENHANCED AI CONTEXT RETRIEVAL:**
```python
# Updated chat/voice processing
async def build_ai_context(tenant_id: str, assistant_key: str, user_query: str) -> str:
    context_parts = []
    
    # 1. Get exact Q&A matches
    qa_matches = await training_service.search_qa_pairs(tenant_id, assistant_key, user_query)
    if qa_matches:
        context_parts.append("EXACT Q&A ANSWERS:\n" + "\n".join(qa_matches))
    
    # 2. Get relevant logic notes
    logic_notes = await training_service.search_logic_notes(tenant_id, assistant_key, user_query)
    if logic_notes:
        context_parts.append("BUSINESS LOGIC:\n" + "\n".join(logic_notes))
    
    # 3. Get reference materials
    references = await training_service.search_reference_materials(tenant_id, assistant_key, user_query)
    if references:
        context_parts.append("REFERENCE MATERIALS:\n" + "\n".join(references))
    
    return "\n\n".join(context_parts) if context_parts else ""
```

---

## 🎯 **ENFORCING "I DON'T KNOW" RULE**

### **UPDATED AI SYSTEM PROMPT:**
```python
SYSTEM_PROMPT = f"""You are {assistant_key}, a specialized AI assistant.

CRITICAL RULES:
1. You must ONLY use information from the provided training data context
2. If the answer is not in the training data, respond exactly: "I don't know."
3. Never make up information or use general knowledge
4. Always prioritize Q&A pairs over other sources

TRAINING DATA CONTEXT:
{training_context}

USER QUESTION: {user_query}

Answer based STRICTLY on the training data above. If not found, say "I don't know."
"""
```

---

## 📋 **IMPLEMENTATION CHECKLIST**

### **Phase 1: Database Setup**
- [ ] Add training tables to `supabase_migration.sql`
- [ ] Run migration in Supabase
- [ ] Add RLS policies for tenant isolation
- [ ] Create indexes for performance

### **Phase 2: Backend Services** 
- [ ] Create `TrainingDataService` class
- [ ] Add CRUD operations for all three data types
- [ ] Implement search/retrieval functions
- [ ] Add training data endpoints to API

### **Phase 3: AI Integration**
- [ ] Update `SmartRouter` to use training context
- [ ] Modify chat endpoints to retrieve training data
- [ ] Update voice processing to use training context
- [ ] Enforce "I don't know" rule in system prompts

### **Phase 4: Frontend Integration**
- [ ] Update dashboard to use new training endpoints
- [ ] Separate Q&A, Logic Notes, and Reference Material forms
- [ ] Add category/type selection to upload forms
- [ ] Display training data by type in dashboard

---

## 🔥 **IMMEDIATE ACTION REQUIRED**

The current system is **NOT using structured training data**. To implement your requirements:

1. **Create the missing tables** in Supabase
2. **Implement the training data service** in the backend
3. **Update the AI context retrieval** to use structured data
4. **Enforce the "I don't know" rule** with strict system prompts

**Without these changes, the AI will continue to use generic document search instead of your structured training data categories.** 

Would you like me to implement these missing components?
