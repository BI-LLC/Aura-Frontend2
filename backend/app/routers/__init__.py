# AURA Voice AI - API Routers
"""FastAPI route handlers for all endpoints"""

# Import all routers
from . import chat
from . import voice  
from . import admin
from . import documents
from . import streaming
from . import continuous_voice
from . import tenant_admin

# Try to import optional routers
try:
    from . import memory
except ImportError:
    memory = None

__all__ = [
    'chat',
    'voice', 
    'admin',
    'documents',
    'streaming',
    'continuous_voice',
    'tenant_admin',
    'memory'
]
