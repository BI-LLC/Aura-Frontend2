# Training Data Service - Connects AI to Supabase training tables
# This service retrieves Q&A pairs, logic notes, and reference materials

import logging
from typing import List, Dict, Optional
from app.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

class TrainingDataService:
    def __init__(self):
        self.supabase_client = get_supabase_client()
    
    async def get_training_context(self, user_query: str, assistant_key: Optional[str] = None, tenant_id: Optional[str] = None) -> str:
        """
        Build comprehensive training context from all three data sources
        Returns formatted context string for AI system prompt
        CRITICAL: Returns empty string if no training data found - this triggers "I don't know" responses
        """
        try:
            context_parts = []
            
            # 1. Get Q&A pairs (exact matches first, then similar)
            qa_context = await self._get_qa_context(user_query, assistant_key, tenant_id)
            if qa_context:
                context_parts.append(f"EXACT Q&A ANSWERS:\n{qa_context}")
            
            # 2. Get logic notes (business rules and processes)
            logic_context = await self._get_logic_notes_context(user_query, assistant_key, tenant_id)
            if logic_context:
                context_parts.append(f"BUSINESS LOGIC & RULES:\n{logic_context}")
            
            # 3. Get reference materials (supporting documentation) - RE-ENABLED FOR COMPLETE COVERAGE
            reference_context = await self._get_reference_materials_context(user_query, assistant_key, tenant_id)
            if reference_context:
                context_parts.append(f"REFERENCE MATERIALS:\n{reference_context}")
            
            final_context = "\n\n".join(context_parts) if context_parts else ""
            
            if final_context:
                logger.info(f"Training context found for {assistant_key}: (length: {len(final_context)})")
            else:
                logger.info(f"NO training context found for {assistant_key} - will trigger 'I don't know' response")
            
            return final_context
            
        except Exception as e:
            logger.error(f"Error getting training context: {e}")
            return ""  # Return empty string to trigger "I don't know" on error
    
    async def _get_qa_context(self, user_query: str, assistant_key: Optional[str] = None, tenant_id: Optional[str] = None) -> str:
        """Get relevant Q&A pairs from training_data table"""
        try:
            client = self.supabase_client.get_client()
            
            # Search for similar questions using text matching
            query = client.table('training_data').select('prompt, response, tags')
            
            # Filter by assistant_key if provided
            if assistant_key:
                query = query.eq('assistant_key', assistant_key)
            
            # Filter by tenant_id if provided - TEMPORARILY DISABLED FOR DEBUG
            # if tenant_id:
            #     query = query.eq('tenant_id', tenant_id)
            
            result = query.execute()
            logger.info(f"Raw Supabase result: {result}")  # DEBUG: See the full response
            logger.info(f"Q&A query result for {assistant_key}: {len(result.data) if result.data else 0} items")
            
            if not result.data:
                logger.info(f"No Q&A data found for {assistant_key} - result.data is: {result.data}")
                return ""
            
            # Format Q&A pairs for AI context
            qa_pairs = []
            for item in result.data:
                logger.info(f"Processing Q&A: '{item['prompt']}' -> '{item['response']}'")
                qa_pairs.append(f"Q: {item['prompt']}\nA: {item['response']}")
            
            qa_context = "\n\n".join(qa_pairs)
            logger.info(f"Final Q&A context: '{qa_context}'")
            return qa_context
            
        except Exception as e:
            logger.error(f"Error getting Q&A context: {e}")
            return ""
    
    async def _get_logic_notes_context(self, user_query: str, assistant_key: Optional[str] = None, tenant_id: Optional[str] = None) -> str:
        """Get relevant logic notes"""
        try:
            client = self.supabase_client.get_client()
            
            # Get all logic notes (you can add text similarity search later)
            query = client.table('logic_notes').select('title, content, category, tags')
            
            # Filter by assistant_key if column exists
            if assistant_key:
                query = query.eq('assistant_key', assistant_key)
            
            result = query.execute()
            
            if not result.data:
                return ""
            
            # Format logic notes for AI context
            notes = []
            for item in result.data:
                category_prefix = f"[{item['category']}] " if item['category'] else ""
                notes.append(f"{category_prefix}{item['title']}: {item['content']}")
            
            return "\n\n".join(notes)
            
        except Exception as e:
            logger.error(f"Error getting logic notes context: {e}")
            return ""
    
    async def _get_reference_materials_context(self, user_query: str, assistant_key: Optional[str] = None, tenant_id: Optional[str] = None) -> str:
        """Get relevant reference materials"""
        try:
            client = self.supabase_client.get_client()
            
            # Get all reference materials (you can add text similarity search later)
            query = client.table('reference_materials').select('filename, original_filename, content, tags')
            
            # Filter by assistant_key if column exists
            if assistant_key:
                query = query.eq('assistant_key', assistant_key)
            
            result = query.execute()
            
            if not result.data:
                return ""
            
            # Format reference materials for AI context
            materials = []
            for item in result.data:
                title = item.get('original_filename', item.get('filename', 'Unknown File'))
                materials.append(f"Document '{title}': {item['content']}")
            
            return "\n\n".join(materials)
            
        except Exception as e:
            logger.error(f"Error getting reference materials context: {e}")
            return ""
    
    # CRUD operations for dashboard
    async def create_qa_pair(self, prompt: str, response: str, tags: List[str] = None, assistant_key: Optional[str] = None, tenant_id: Optional[str] = None) -> Dict:
        """Create new Q&A pair in training_data table"""
        try:
            client = self.supabase_client.get_client()
            
            data = {
                'prompt': prompt,
                'response': response,
                'tags': tags or []
            }
            
            # Add assistant_key and tenant_id if columns exist
            # if assistant_key:
            #     data['assistant_key'] = assistant_key
            # if tenant_id:
            #     data['tenant_id'] = tenant_id
            
            result = client.table('training_data').insert(data).execute()
            
            if result.data:
                logger.info(f"Created Q&A pair: {prompt[:50]}...")
                return {'success': True, 'data': result.data[0]}
            else:
                return {'success': False, 'error': 'Failed to create Q&A pair'}
                
        except Exception as e:
            logger.error(f"Error creating Q&A pair: {e}")
            return {'success': False, 'error': str(e)}
    
    async def create_logic_note(self, title: str, content: str, category: str = None, tags: List[str] = None, assistant_key: Optional[str] = None, tenant_id: Optional[str] = None) -> Dict:
        """Create new logic note"""
        try:
            client = self.supabase_client.get_client()
            
            data = {
                'title': title,
                'content': content,
                'category': category or 'general',
                'tags': tags or []
            }
            
            result = client.table('logic_notes').insert(data).execute()
            
            if result.data:
                logger.info(f"Created logic note: {title}")
                return {'success': True, 'data': result.data[0]}
            else:
                return {'success': False, 'error': 'Failed to create logic note'}
                
        except Exception as e:
            logger.error(f"Error creating logic note: {e}")
            return {'success': False, 'error': str(e)}
    
    async def create_reference_material(self, title: str, content: str, category: str = None, tags: List[str] = None, assistant_key: Optional[str] = None, tenant_id: Optional[str] = None) -> Dict:
        """Create new reference material"""
        try:
            client = self.supabase_client.get_client()
            
            data = {
                'title': title,
                'content': content,
                'category': category or 'general',
                'tags': tags or []
            }
            
            result = client.table('reference_materials').insert(data).execute()
            
            if result.data:
                logger.info(f"Created reference material: {title}")
                return {'success': True, 'data': result.data[0]}
            else:
                return {'success': False, 'error': 'Failed to create reference material'}
                
        except Exception as e:
            logger.error(f"Error creating reference material: {e}")
            return {'success': False, 'error': str(e)}

# Global training data service instance
training_data_service = TrainingDataService()

def get_training_data_service() -> TrainingDataService:
    """Get the global training data service instance"""
    return training_data_service
