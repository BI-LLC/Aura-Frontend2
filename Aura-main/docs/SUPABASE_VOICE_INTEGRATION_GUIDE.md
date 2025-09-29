# 🎤 Supabase Voice Integration - Backend Update Complete

## ✅ **COMPLETED BACKEND CHANGES**

The backend has been successfully updated to integrate with Supabase for tenant-specific voice IDs. Here's what was implemented:

### **1. Updated Voice Endpoints**

#### **`/voice/transcribe`**
- ✅ Now accepts `assistant_key` and `tenant_id` parameters
- ✅ Supports Supabase bearer token validation (optional)
- ✅ Returns assistant_key in response for frontend tracking

#### **`/voice/synthesize`**
- ✅ Enhanced Supabase voice lookup with `get_voice_id_for_assistant()`
- ✅ Supports both underscore (`bib_halder`) and slug (`bib-halder`) variants
- ✅ Proper error handling when voice_id is not found
- ✅ Bearer token validation for security

#### **`/voice/process`** 
- ✅ Updated to use new voice lookup system
- ✅ Supports assistant_key for end-to-end voice processing

#### **`/chat/message`**
- ✅ Now accepts `assistant_key` and `tenant_id` in request body
- ✅ Returns assistant_key in response for frontend voice synthesis

### **2. Enhanced Supabase Integration**

#### **New Helper Functions**
```python
async def get_voice_id_for_assistant(assistant_key: str, tenant_id: Optional[str] = None)
async def validate_supabase_token(authorization: Optional[str])
def normalize_assistant_key(key: str) -> str
```

#### **Updated Supabase Client**
- ✅ Added `get_assistant_voice_prefs()` method
- ✅ Added `create_assistant_voice_prefs()` method

#### **Database Schema**
- ✅ Added `assistant_voice_prefs` table to `supabase_migration.sql`
- ✅ Proper indexes for fast lookups
- ✅ Tenant isolation support

### **3. Key Features Implemented**

#### **🔄 Dual Key Format Support**
- `bib_halder` ↔ `bib-halder` automatic normalization
- Fallback lookup if primary key format fails

#### **🔒 Token Validation**  
- Optional Supabase JWT token validation
- User context extraction from valid tokens

#### **🏢 Tenant Isolation**
- Voice preferences scoped by tenant_id
- Multi-tenant voice configuration support

---

## 🎯 **FRONTEND CONFIGURATION REQUIRED**

The frontend needs to be updated to work with the new backend:

### **1. Environment Variables**
Make sure your frontend `.env` file contains:
```bash
REACT_APP_API_BASE_URL=https://api.iaura.ai
# NOT the fallback URL
```

### **2. Frontend API Calls**
Update your frontend components to send `assistant_key`:

#### **Voice Transcription**
```javascript
const formData = new FormData();
formData.append('audio', audioBlob);
formData.append('assistant_key', assistantKey); // NEW
formData.append('tenant_id', tenantId);         // NEW

fetch(`${API_BASE_URL}/voice/transcribe`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseToken}` // NEW - Optional
  },
  body: formData
});
```

#### **Voice Synthesis**
```javascript
fetch(`${API_BASE_URL}/voice/synthesize`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Bearer ${supabaseToken}` // NEW
  },
  body: new URLSearchParams({
    text: responseText,
    assistant_key: assistantKey, // NEW - Backend will lookup voice_id
    tenant_id: tenantId,
    stability: '0.5',
    similarity_boost: '0.75'
  })
});
```

#### **Chat Messages**
```javascript
fetch(`${API_BASE_URL}/chat/message`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseToken}` // NEW
  },
  body: JSON.stringify({
    message: userMessage,
    assistant_key: assistantKey, // NEW
    tenant_id: tenantId,         // NEW
    use_documents: true,
    use_memory: true
  })
});
```

---

## 🗃️ **Supabase Setup**

### **1. Run Migration**
Execute the updated `supabase_migration.sql` in your Supabase SQL editor to create the `assistant_voice_prefs` table.

### **2. Environment Variables**
Ensure your backend `.env` contains:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
```

### **3. Sample Voice Preferences**
Insert test data into `assistant_voice_prefs`:
```sql
INSERT INTO assistant_voice_prefs (assistant_key, tenant_id, voice_id, provider, model, params)
VALUES 
  ('bib_halder', null, 'your_elevenlabs_voice_id', 'elevenlabs', 'eleven_turbo_v2', 
   '{"stability": 0.5, "similarity_boost": 0.75}');
```

---

## 🚀 **Deployment**

### **Upload to Droplet**
```bash
# Upload updated files
scp "C:/Users/Raf/Downloads/voice.py" root@api.iaura.ai:/opt/aura/backend/app/routers/voice.py
scp "C:/Users/Raf/Downloads/chat.py" root@api.iaura.ai:/opt/aura/backend/app/routers/chat.py  
scp "C:/Users/Raf/Downloads/supabase_client.py" root@api.iaura.ai:/opt/aura/backend/app/supabase_client.py

# Restart service
ssh root@api.iaura.ai "systemctl restart aura"
```

---

## ✅ **Testing**

### **Test Voice Synthesis**
```bash
curl -X POST https://api.iaura.ai/voice/synthesize \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -d "text=Hello world&assistant_key=bib_halder"
```

### **Expected Response**
```json
{
  "success": true,
  "audio": "base64_audio_data...",
  "content_type": "audio/mpeg",
  "characters": 11,
  "assistant_key": "bib_halder",
  "voice_id": "found_voice_id_from_supabase"
}
```

---

## 🔧 **Troubleshooting**

### **No voice_id found**
1. Check `assistant_voice_prefs` table has the correct `assistant_key`
2. Verify `tenant_id` matches (use `null` for global assistants)
3. Try both formats: `bib_halder` and `bib-halder`

### **Token validation fails**
1. Ensure Supabase token is valid and not expired
2. Check `SUPABASE_URL` and keys in backend `.env`
3. Token validation is optional for transcription, required for synthesis

### **500 errors**
1. Check backend logs: `ssh root@api.iaura.ai "journalctl -u aura -f"`
2. Verify Supabase connection and table exists
3. Ensure all dependencies are installed

---

## 🎉 **RESULT**

✅ **Backend is now fully integrated with Supabase for tenant-specific voice IDs**  
✅ **No more fixed voice IDs across all tenants**  
✅ **Frontend can create unique voices per assistant via Supabase**  
✅ **Audio responses will now work with proper voice mapping**  

The backend will now correctly read tenant-specific voice IDs from Supabase instead of using a fixed voice ID for all users!
