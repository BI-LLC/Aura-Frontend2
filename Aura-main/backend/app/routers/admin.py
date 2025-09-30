# Admin router for AURA Voice AI
# Admin dashboard for knowledge management and settings

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse, HTMLResponse
from typing import List, Optional, Dict
import os
import logging
import aiofiles
from datetime import datetime

from app.services.data_ingestion import DataIngestionService
from app.services.persona_manager import PersonaManager
from app.services.memory_engine import MemoryEngine

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/admin", tags=["admin"])

# Initialize services (will be injected from main)
data_service = None
persona_manager = None
smart_router = None
memory_engine = None
voice_pipeline = None

def set_services(sr, me, vp):  # REMOVED TYPE HINTS to avoid circular imports
    """Set service instances from main app"""
    global smart_router, memory_engine, voice_pipeline, data_service, persona_manager
    smart_router = sr
    memory_engine = me
    voice_pipeline = vp
    
    # Initialize the services that aren't passed in
    from app.services.data_ingestion import DataIngestionService
    from app.services.persona_manager import PersonaManager
    data_service = DataIngestionService()
    persona_manager = PersonaManager()

@router.get("/status")
async def admin_status():
    """Get admin system status - ALWAYS RETURN JSON"""
    try:
        service_health = {}
        
        # Safe health checks with error handling
        if smart_router:
            try:
                service_health["smart_router"] = await smart_router.get_health_status()
            except Exception as e:
                service_health["smart_router"] = {"error": str(e)}
        
        if memory_engine:
            try:
                service_health["memory"] = {"connected": memory_engine.connected}
            except Exception as e:
                service_health["memory"] = {"error": str(e)}
        
        if voice_pipeline:
            try:
                service_health["voice"] = voice_pipeline.get_pipeline_status()
            except Exception as e:
                service_health["voice"] = {"error": str(e)}
        
        return {
            "admin": "operational",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "smart_router": smart_router is not None,
                "memory_engine": memory_engine is not None,
                "voice_pipeline": voice_pipeline is not None,
                "data_service": data_service is not None,
                "persona_manager": persona_manager is not None
            },
            "service_health": service_health
        }
        
    except Exception as e:
        # ALWAYS return JSON structure
        return {
            "admin": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
            "services": {
                "smart_router": False,
                "memory_engine": False,
                "voice_pipeline": False,
                "data_service": False,
                "persona_manager": False
            },
            "service_health": {}
        }

@router.get("/")
async def admin_dashboard():
    """Serve admin dashboard HTML"""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>AURA Admin Dashboard</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: rgba(255, 255, 255, 0.95);
                border-radius: 20px;
                padding: 30px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            h1 {
                color: #333;
                margin-bottom: 30px;
                border-bottom: 3px solid #667eea;
                padding-bottom: 10px;
            }
            .section {
                margin-bottom: 30px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 10px;
            }
            .upload-area {
                border: 2px dashed #667eea;
                border-radius: 10px;
                padding: 40px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s;
            }
            .upload-area:hover {
                background: rgba(102, 126, 234, 0.1);
            }
            .btn {
                background: #667eea;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.3s;
            }
            .btn:hover {
                background: #5a67d8;
                transform: translateY(-2px);
            }
            .stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-top: 20px;
            }
            .stat-card {
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .stat-value {
                font-size: 32px;
                font-weight: bold;
                color: #667eea;
            }
            .stat-label {
                color: #666;
                margin-top: 5px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎯 AURA Admin Dashboard</h1>
            
            <div class="section">
                <h2>📚 Knowledge Base Management</h2>
                <div class="upload-area" onclick="document.getElementById('fileInput').click()">
                    <h3>Drop files here or click to upload</h3>
                    <p>Supported: PDF, TXT, DOCX, MD, JSON (Max 10MB)</p>
                    <input type="file" id="fileInput" style="display:none" multiple accept=".pdf,.txt,.docx,.md,.json">
                </div>
                <div id="uploadStatus"></div>
            </div>
            
            <div class="section">
                <h2>📊 System Statistics</h2>
                <div class="stats" id="statsContainer">
                    <div class="stat-card">
                        <div class="stat-value">0</div>
                        <div class="stat-label">Documents</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">0</div>
                        <div class="stat-label">Active Users</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">0</div>
                        <div class="stat-label">API Calls</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">$0.00</div>
                        <div class="stat-label">Total Cost</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>🎭 Persona Settings</h2>
                <button class="btn" onclick="refreshStats()">Refresh Stats</button>
                <button class="btn" onclick="clearCache()">Clear Cache</button>
            </div>
        </div>
        
        <script>
            // File upload handler
            document.getElementById('fileInput').addEventListener('change', async (e) => {
                const files = e.target.files;
                const statusDiv = document.getElementById('uploadStatus');
                
                for (let file of files) {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('user_id', 'admin');
                    
                    try {
                        const response = await fetch('/admin/upload', {
                            method: 'POST',
                            body: formData
                        });
                        
                        const result = await response.json();
                        statusDiv.innerHTML += `<p>✅ Uploaded: ${file.name}</p>`;
                    } catch (error) {
                        statusDiv.innerHTML += `<p>❌ Failed: ${file.name}</p>`;
                    }
                }
                
                refreshStats();
            });
            
            // Refresh statistics
            async function refreshStats() {
                try {
                    const response = await fetch('/admin/stats');
                    const stats = await response.json();
                    
                    // Update UI with stats
                    console.log('Stats refreshed:', stats);
                } catch (error) {
                    console.error('Failed to refresh stats:', error);
                }
            }
            
            // Clear cache
            function clearCache() {
                if (confirm('Clear all cached data?')) {
                    fetch('/admin/clear-cache', { method: 'POST' })
                        .then(() => alert('Cache cleared'))
                        .catch(err => alert('Failed to clear cache'));
                }
            }
            
            // Initial load
            refreshStats();
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_id: str = Form(default="admin")
):
    """Upload and process a file for knowledge base"""
    try:
        # Validate file type
        file_ext = os.path.splitext(file.filename)[1].lower()
        allowed_exts = ['.pdf', '.txt', '.docx', '.md', '.json']
        
        if file_ext not in allowed_exts:
            raise HTTPException(status_code=400, detail=f"File type {file_ext} not supported")
        
        # Save uploaded file temporarily
        temp_path = f"/tmp/{file.filename}"
        
        async with aiofiles.open(temp_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Process file
        document = await data_service.ingest_file(temp_path, user_id)
        
        # Clean up temp file
        os.remove(temp_path)
        
        return {
            "success": True,
            "doc_id": document.doc_id,
            "filename": document.filename,
            "chunks": len(document.chunks),
            "size": len(document.content)
        }
        
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/{user_id}")
async def get_user_documents(user_id: str):
    """Get all documents for a user"""
    try:
        documents = await data_service.get_user_documents(user_id)
        return {
            "user_id": user_id,
            "documents": documents,
            "count": len(documents)
        }
    except Exception as e:
        logger.error(f"Failed to get documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user_id: str = "admin"):
    """Delete a document from knowledge base"""
    try:
        success = await data_service.delete_document(doc_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found or unauthorized")
        
        return {"success": True, "message": f"Document {doc_id} deleted"}
        
    except Exception as e:
        logger.error(f"Failed to delete document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_knowledge_base(
    query: str,
    user_id: str = "admin",
    limit: int = 5
):
    """Search knowledge base"""
    try:
        results = await data_service.search_documents(query, user_id, limit)
        return {
            "query": query,
            "results": results,
            "count": len(results)
        }
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/persona/{user_id}")
async def get_user_persona(user_id: str):
    """Get persona settings for a user"""
    try:
        stats = await persona_manager.get_persona_stats(user_id)
        return stats
    except Exception as e:
        logger.error(f"Failed to get persona: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/persona/{user_id}")
async def update_persona(user_id: str, settings: Dict[str, str]):
    """Update persona settings for a user"""
    try:
        persona = await persona_manager.set_manual_persona(user_id, settings)
        return {
            "success": True,
            "persona": {
                "formality": persona.formality,
                "detail_level": persona.detail_level,
                "example_style": persona.example_style,
                "energy": persona.energy
            }
        }
    except Exception as e:
        logger.error(f"Failed to update persona: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_admin_stats():
    """Get overall system statistics"""
    try:
        # Get document count
        all_docs = []
        for doc_id, doc in data_service.documents.items():
            all_docs.append(doc)
        
        # Get user count from memory engine
        user_count = 0
        if memory_engine:
            # This is simplified - in production you'd query the database
            user_count = 10  # Placeholder
        
        # Get cost data (simplified)
        from app.services.smart_router import SmartRouter
        router = SmartRouter()
        costs = router.get_cost_summary() if hasattr(router, 'get_cost_summary') else {}
        
        return {
            "documents": len(all_docs),
            "users": user_count,
            "api_calls": 1000,  # Placeholder
            "total_cost": costs.get('total', 0),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        return {
            "documents": 0,
            "users": 0,
            "api_calls": 0,
            "total_cost": 0,
            "error": str(e)
        }

@router.post("/clear-cache")
async def clear_cache():
    """Clear system caches"""
    try:
        # Clear document cache (keep files)
        data_service.documents.clear()
        
        # Clear persona cache
        persona_manager.personas.clear()
        
        return {"success": True, "message": "Cache cleared"}
        
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/training-data/{user_id}")
async def get_training_data(user_id: str):
    """Get prepared training data for a user"""
    try:
        training_data = await data_service.prepare_training_data(user_id)
        return training_data
    except Exception as e:
        logger.error(f"Failed to prepare training data: {e}")
        raise HTTPException(status_code=500, detail=str(e))