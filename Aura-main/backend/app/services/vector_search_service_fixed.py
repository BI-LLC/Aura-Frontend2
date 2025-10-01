# Vector Search Service for AURA Voice AI RAG Pipeline
# Handles semantic similarity search using embeddings in Supabase

import logging
from typing import List, Dict, Optional, Any, Tuple
from dataclasses import dataclass
from app.supabase_client import get_supabase_client
from app.services.embedding_service import get_embedding_service

logger = logging.getLogger(__name__)

@dataclass
class SearchResult:
    """Represents a vector search result"""
    chunk_id: Optional[int]
    doc_id: Optional[str]
    content: str
    similarity: float
    metadata: Dict[str, Any]
    source: str  # 'document_chunks', 'training_data', etc.
    chunk_type: Optional[str] = None

class VectorSearchService:
    def __init__(self):
        """Initialize vector search service"""
        self.supabase = None  # Lazy load to avoid import errors
        self.embedding_service = get_embedding_service()
        
        # Search parameters
        self.default_similarity_threshold = 0.7
        self.max_results = 50
        
        logger.info("Vector Search Service initialized")
    
    def _get_supabase(self):
        """Lazy load Supabase client"""
        if self.supabase is None:
            self.supabase = get_supabase_client()
        return self.supabase
    
    async def semantic_search(
        self,
        query: str,
        assistant_key: Optional[str] = None,
        tenant_id: Optional[str] = None,
        limit: int = 10,
        similarity_threshold: Optional[float] = None,
        search_sources: Optional[List[str]] = None
    ) -> List[SearchResult]:
        """
        Perform comprehensive semantic search across all available sources
        """
        try:
            # Generate query embedding
            query_embedding = await self.embedding_service.generate_embedding(query)
            if not any(query_embedding):  # Check for zero vector
                logger.error("Failed to generate query embedding, cannot perform semantic search.")
                return []

            # Use provided threshold or default
            threshold = similarity_threshold or self.default_similarity_threshold
            
            # Determine which sources to search
            sources_to_search = search_sources or ['document_chunks', 'training_data', 'logic_notes', 'reference_materials']
            
            results = []
            
            # Search document chunks
            if 'document_chunks' in sources_to_search:
                doc_results = await self._search_document_chunks_direct(
                    query_embedding, assistant_key, tenant_id, limit, threshold
                )
                results.extend(doc_results)
            
            # Search other sources (training_data, logic_notes, etc.)
            if 'training_data' in sources_to_search:
                training_results = await self._search_training_data_direct(
                    query, assistant_key, tenant_id, limit
                )
                results.extend(training_results)
            
            # Sort by similarity and filter by threshold
            results.sort(key=lambda x: x.similarity, reverse=True)
            filtered_results = [r for r in results if r.similarity >= threshold]
            
            logger.info(f"Semantic search for '{query[:50]}...' returned {len(filtered_results)} results")
            return filtered_results[:limit]
            
        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            return []
    
    async def _search_document_chunks_direct(
        self,
        query_embedding: List[float],
        assistant_key: Optional[str],
        tenant_id: Optional[str],
        limit: int,
        similarity_threshold: float
    ) -> List[SearchResult]:
        """Search document chunks using direct SQL query instead of RPC"""
        try:
            client = self._get_supabase().get_client(admin=True)
            
            # Build the query
            query_builder = client.table('document_chunks').select(
                'chunk_id, doc_id, chunk_text, metadata, embedding'
            ).not_.is_('embedding', 'null')
            
            # Add filters
            if tenant_id:
                query_builder = query_builder.eq('tenant_id', tenant_id)
            
            # Execute query
            result = query_builder.execute()
            
            if not result.data:
                logger.debug("No document chunks found")
                return []
            
            # Calculate similarities and filter
            search_results = []
            for item in result.data:
                # Skip if no embedding
                if not item.get('embedding'):
                    continue
                
                # Calculate cosine similarity
                similarity = self._cosine_similarity(query_embedding, item['embedding'])
                
                # Apply threshold filter
                if similarity < similarity_threshold:
                    continue
                
                # Apply assistant_key filter
                metadata = item.get('metadata', {})
                if assistant_key and metadata.get('assistant_key') != assistant_key:
                    continue
                
                search_result = SearchResult(
                    chunk_id=item.get('chunk_id'),
                    doc_id=item.get('doc_id'),
                    content=item.get('chunk_text', ''),
                    similarity=similarity,
                    metadata=metadata,
                    source='document_chunks',
                    chunk_type=metadata.get('chunk_type')
                )
                search_results.append(search_result)
            
            # Sort by similarity
            search_results.sort(key=lambda x: x.similarity, reverse=True)
            
            logger.info(f"Found {len(search_results)} document chunk matches")
            return search_results[:limit]
            
        except Exception as e:
            logger.error(f"Document chunk search failed: {e}")
            return []
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        try:
            import numpy as np
            
            # Ensure vectors are lists of floats
            if isinstance(vec1, str):
                import json
                vec1 = json.loads(vec1)
            if isinstance(vec2, str):
                import json
                vec2 = json.loads(vec2)
            
            # Convert to numpy arrays
            a = np.array(vec1, dtype=float)
            b = np.array(vec2, dtype=float)
            
            # Calculate cosine similarity
            dot_product = np.dot(a, b)
            norm_a = np.linalg.norm(a)
            norm_b = np.linalg.norm(b)
            
            if norm_a == 0 or norm_b == 0:
                return 0.0
            
            similarity = dot_product / (norm_a * norm_b)
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Error calculating cosine similarity: {e}")
            return 0.0
    
    async def _search_training_data_direct(
        self,
        query: str,
        assistant_key: Optional[str],
        tenant_id: Optional[str],
        limit: int
    ) -> List[SearchResult]:
        """Search training data using keyword matching"""
        try:
            client = self._get_supabase().get_client(admin=True)
            
            query_builder = client.table('training_data').select('id, prompt, response, tags')
            
            if assistant_key:
                query_builder = query_builder.eq('assistant_key', assistant_key)
            if tenant_id:
                query_builder = query_builder.eq('tenant_id', tenant_id)
            
            # Simple keyword search
            query_builder = query_builder.or_(
                f"prompt.ilike.%{query}%,response.ilike.%{query}%"
            )
            
            result = query_builder.limit(limit).execute()
            
            if not result.data:
                return []
            
            search_results = []
            for item in result.data:
                # Calculate simple keyword similarity
                prompt_text = item.get('prompt', '').lower()
                response_text = item.get('response', '').lower()
                query_lower = query.lower()
                
                # Count keyword matches
                prompt_matches = sum(1 for word in query_lower.split() if word in prompt_text)
                response_matches = sum(1 for word in query_lower.split() if word in response_text)
                
                # Simple similarity score
                similarity = (prompt_matches + response_matches) / max(len(query.split()), 1) * 0.5
                
                search_result = SearchResult(
                    chunk_id=None,
                    doc_id=item.get('id'),
                    content=f"Q: {item.get('prompt')}\nA: {item.get('response')}",
                    similarity=similarity,
                    metadata={'tags': item.get('tags', [])},
                    source='training_data'
                )
                search_results.append(search_result)
            
            return search_results
            
        except Exception as e:
            logger.error(f"Training data search failed: {e}")
            return []
    
    async def hybrid_search(
        self,
        query: str,
        assistant_key: Optional[str] = None,
        tenant_id: Optional[str] = None,
        limit: int = 10,
        vector_weight: float = 0.7,
        keyword_weight: float = 0.3,
        similarity_threshold: Optional[float] = None
    ) -> List[SearchResult]:
        """
        Hybrid search combining vector similarity and keyword matching
        """
        try:
            # Get vector search results
            vector_results = await self.semantic_search(
                query=query,
                assistant_key=assistant_key,
                tenant_id=tenant_id,
                limit=limit,
                similarity_threshold=similarity_threshold or 0.3  # Lower threshold
            )
            
            # Get keyword search results
            keyword_results = await self._keyword_search_document_chunks(
                query=query,
                assistant_key=assistant_key,
                tenant_id=tenant_id,
                limit=limit
            )
            
            logger.info(f"Hybrid search: {len(vector_results)} vector results, {len(keyword_results)} keyword results")
            
            # Combine and reweight results
            combined_results = []
            
            # Add vector results with vector weight
            for result in vector_results:
                result.similarity = result.similarity * vector_weight
                combined_results.append(result)
            
            # Add keyword results with keyword weight
            for result in keyword_results:
                result.similarity = result.similarity * keyword_weight
                combined_results.append(result)
            
            # Remove duplicates and sort by combined similarity
            seen_chunks = set()
            unique_results = []
            for result in combined_results:
                chunk_key = f"{result.doc_id}_{result.chunk_id}"
                if chunk_key not in seen_chunks:
                    seen_chunks.add(chunk_key)
                    unique_results.append(result)
            
            # Sort by combined similarity
            unique_results.sort(key=lambda x: x.similarity, reverse=True)
            
            logger.info(f"Hybrid search returned {len(unique_results)} unique results")
            return unique_results[:limit]
            
        except Exception as e:
            logger.error(f"Hybrid search failed: {e}")
            # Fallback to semantic search only
            return await self.semantic_search(
                query=query,
                assistant_key=assistant_key,
                tenant_id=tenant_id,
                limit=limit,
                similarity_threshold=similarity_threshold
            )
    
    async def _keyword_search_document_chunks(
        self,
        query: str,
        assistant_key: Optional[str],
        tenant_id: Optional[str],
        limit: int
    ) -> List[SearchResult]:
        """Simple keyword-based search in document chunks"""
        try:
            client = self._get_supabase().get_client(admin=True)
            
            query_builder = client.table('document_chunks').select(
                'chunk_id, doc_id, chunk_text, metadata'
            )
            
            if tenant_id:
                query_builder = query_builder.eq('tenant_id', tenant_id)
            
            # Simple keyword search
            query_builder = query_builder.ilike('chunk_text', f'%{query}%')
            
            result = query_builder.limit(limit).execute()
            
            if not result.data:
                return []
            
            search_results = []
            for item in result.data:
                metadata = item.get('metadata', {})
                
                # Filter by assistant_key if specified
                if assistant_key and metadata.get('assistant_key') != assistant_key:
                    continue
                
                # Calculate simple keyword similarity
                content_lower = item.get('chunk_text', '').lower()
                query_lower = query.lower()
                
                # Count keyword matches
                matches = sum(1 for word in query_lower.split() if word in content_lower)
                similarity = matches / max(len(query.split()), 1) * 0.5
                
                search_result = SearchResult(
                    chunk_id=item.get('chunk_id'),
                    doc_id=item.get('doc_id'),
                    content=item.get('chunk_text', ''),
                    similarity=similarity,
                    metadata=metadata,
                    source='document_chunks',
                    chunk_type=metadata.get('chunk_type')
                )
                search_results.append(search_result)
            
            return search_results
            
        except Exception as e:
            logger.error(f"Keyword search failed: {e}")
            return []

# Create singleton instance
vector_search_service = VectorSearchService()

def get_vector_search_service() -> VectorSearchService:
    return vector_search_service
