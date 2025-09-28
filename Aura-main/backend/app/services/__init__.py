# AURA Voice AI - Service Layer
"""Business logic and external API integrations"""

# Import all services for easy access
from .smart_router import SmartRouter, LLMResponse
from .voice_pipeline import VoicePipeline, AudioTranscription, AudioSynthesis
from .data_ingestion import DataIngestionService, Document
from .persona_manager import PersonaManager
from .tenant_manager import TenantManager
from .auth_service import TenantAuthService
from .streaming_handler import StreamingHandler
from .tenant_aware_services import (
    TenantAwareDataIngestion,
    TenantAwareSmartRouter,
    TenantAwareVoicePipeline
)

# Try to import optional services
try:
    from .memory_engine import MemoryEngine
except ImportError:
    MemoryEngine = None

try:
    from .continuous_conversation import ContinuousConversationService
except ImportError:
    ContinuousConversationService = None

try:
    from .document_processor import DocumentProcessor
except ImportError:
    DocumentProcessor = None

try:
    from .fine_tuner import FineTuner
except ImportError:
    FineTuner = None

try:
    from .social_ingestion import SocialIngestionService
except ImportError:
    SocialIngestionService = None

try:
    from .voice_activity_detector import VoiceActivityDetector
except ImportError:
    VoiceActivityDetector = None

__all__ = [
    'SmartRouter',
    'LLMResponse', 
    'VoicePipeline',
    'AudioTranscription',
    'AudioSynthesis',
    'DataIngestionService',
    'Document',
    'PersonaManager',
    'TenantManager',
    'TenantAuthService',
    'StreamingHandler',
    'TenantAwareDataIngestion',
    'TenantAwareSmartRouter',
    'TenantAwareVoicePipeline',
    'MemoryEngine',
    'ContinuousConversationService',
    'DocumentProcessor',
    'FineTuner',
    'SocialIngestionService',
    'VoiceActivityDetector'
]
