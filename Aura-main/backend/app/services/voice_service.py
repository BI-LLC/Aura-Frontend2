import os
import httpx
import time
import asyncio
from typing import Dict, Optional
from dotenv import load_dotenv
import logging

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ElevenLabsVoiceService:
    def __init__(self):
        self.api_key = os.getenv('ELEVENLABS_API_KEY')
        self.base_url = "https://api.elevenlabs.io/v1"
        
        if not self.api_key:
            logger.warning("⚠️ ELEVENLABS_API_KEY not found in environment variables")
        
    async def create_voice(self, user_name: str, user_email: str = "") -> Dict:
        """Create a new ElevenLabs voice for a user"""
        try:
            if not self.api_key:
                logger.error("❌ ElevenLabs API key not configured")
                return {
                    'voice_id': 'Jn2FTGxo9WlzIb33zWo9',  # Your fallback voice
                    'voice_name': 'default_voice',
                    'success': False,
                    'error': 'API key not configured'
                }

            # Clean username for voice name
            clean_name = ''.join(c if c.isalnum() else '_' for c in user_name)
            voice_name = f"{clean_name}_{int(time.time())}"
            
            logger.info(f"🎤 Creating ElevenLabs voice for: {user_name}")

            headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'xi-api-key': self.api_key
            }

            payload = {
                'name': voice_name,
                'description': f'AI voice for {user_name}',
                'files': [],  # Empty for now - basic voice creation
                'remove_background_noise': True
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/voices/add",
                    json=payload,
                    headers=headers
                )

                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"✅ ElevenLabs voice created: {data.get('voice_id')}")
                    
                    return {
                        'voice_id': data.get('voice_id'),
                        'voice_name': voice_name,
                        'success': True
                    }
                else:
                    error_text = response.text
                    logger.error(f"❌ ElevenLabs API error: {response.status_code} - {error_text}")
                    return {
                        'voice_id': 'Jn2FTGxo9WlzIb33zWo9',
                        'voice_name': 'default_voice',
                        'success': False,
                        'error': f"API error: {response.status_code} - {error_text}"
                    }

        except Exception as e:
            logger.error(f"❌ Failed to create ElevenLabs voice: {str(e)}")
            return {
                'voice_id': 'Jn2FTGxo9WlzIb33zWo9',
                'voice_name': 'default_voice', 
                'success': False,
                'error': str(e)
            }

    async def create_voice_preferences(self, supabase_client, assistant_key: str, tenant_id: str, voice_result: Dict) -> bool:
        """Save voice preferences to Supabase"""
        try:
            data = {
                'assistant_key': assistant_key,
                'tenant_id': tenant_id,
                'provider': 'elevenlabs',
                'voice_id': voice_result['voice_id'],
                'model': 'eleven_turbo_v2',
                'params': {
                    'stability': 0.5,
                    'similarity_boost': 0.75,
                    'voice_name': voice_result['voice_name'],
                    'created_automatically': True,
                    'creation_success': voice_result['success']
                }
            }

            result = supabase_client.table('assistant_voice_prefs').insert(data).execute()
            
            if result.data:
                logger.info(f"✅ Voice preferences saved for {assistant_key}")
                return True
            else:
                logger.error(f"❌ Failed to save voice preferences for {assistant_key}")
                return False

        except Exception as e:
            logger.error(f"❌ Error saving voice preferences: {str(e)}")
            return False

    async def get_voice_preferences(self, supabase_client, assistant_key: str, tenant_id: str = None) -> Optional[Dict]:
        """Get voice preferences for an assistant"""
        try:
            query = supabase_client.table('assistant_voice_prefs').select('*').eq('assistant_key', assistant_key)
            
            if tenant_id:
                query = query.eq('tenant_id', tenant_id)
            
            result = query.execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            else:
                return None
                
        except Exception as e:
            logger.error(f"❌ Error getting voice preferences: {str(e)}")
            return None

    async def test_api_connection(self) -> Dict:
        """Test ElevenLabs API connection"""
        try:
            if not self.api_key:
                return {'success': False, 'error': 'API key not configured'}
            
            headers = {'xi-api-key': self.api_key}
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/voices", headers=headers)
                
                if response.status_code == 200:
                    voices = response.json()
                    return {
                        'success': True, 
                        'message': f'Connected successfully. Found {len(voices.get("voices", []))} voices.'
                    }
                else:
                    return {
                        'success': False, 
                        'error': f'API test failed: {response.status_code} - {response.text}'
                    }
                    
        except Exception as e:
            return {'success': False, 'error': f'Connection test failed: {str(e)}'}

# Initialize the service
voice_service = ElevenLabsVoiceService()
