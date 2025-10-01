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
        
        Args:
            query: Search query
            assistant_key: Filter by assistant
            tenant_id: Filter by tenant
            limit: Maximum number of results
            similarity_threshold: Minimum similarity score
            search_sources: List of sources to search ['document_chunks', 'training_data', etc.]
            
        Returns:
            List of SearchResult objects sorted by similarity
        """
        try:
            # Generate query embedding
            query_embedding = await self.embedding_service.embed_query(query)
            
            if not query_embedding or all(x == 0.0 for x in query_embedding):
                logger.error("Failed to generate query embedding")
                return []
            
            similarity_threshold = similarity_threshold or self.default_similarity_threshold
            search_sources = search_sources or ['document_chunks']
            
            all_results = []
            
            # Search in document chunks (main vector table)
            if 'document_chunks' in search_sources:
                doc_results = await self._search_document_chunks(
                    query_embedding, assistant_key, tenant_id, limit * 2, similarity_threshold
                )
                all_results.extend(doc_results)
            
            # Search in training data with embeddings (if enabled)
            if 'training_data' in search_sources:
                training_results = await self._search_training_data(
                    query_embedding, assistant_key, tenant_id, limit, similarity_threshold
                )
                all_results.extend(training_results)
            
            # Sort by similarity and apply final limit
            all_results.sort(key=lambda x: x.similarity, reverse=True)
            final_results = all_results[:limit]
            
            logger.info(f"Semantic search for '{query[:50]}...' returned {len(final_results)} results")
            return final_results
            
        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            return []
    
    async def _search_document_chunks(
        self,
        query_embedding: List[float],
        assistant_key: Optional[str],
        tenant_id: Optional[str],
        limit: int,
        similarity_threshold: float
    ) -> List[SearchResult]:
        """Search in document_chunks table using vector similarity"""
        try:
            client = self._get_supabase().get_client()
            
            # Prepare parameters for RPC call
            rpc_params = {
                'query_embedding': query_embedding,
                'match_threshold': similarity_threshold,
                'match_count': limit
            }
            
            # Add filters if provided
            if tenant_id:
                rpc_params['tenant_filter'] = tenant_id
            if assistant_key:
                rpc_params['assistant_key_filter'] = assistant_key
            
            # Call the vector search function
            result = client.rpc('match_document_chunks', rpc_params).execute()
            
            if not result.data:
                logger.debug("No document chunk results found")
                return []
            
            # Convert to SearchResult objects
            search_results = []
            for item in result.data:
                # Extract metadata
                metadata = item.get('metadata', {})
                
                # Filter by assistant_key if specified (metadata-based filter)
                if assistant_key and metadata.get('assistant_key') != assistant_key:
                    continue
                
                search_result = SearchResult(
                    chunk_id=item.get('chunk_id'),
                    doc_id=item.get('doc_id'),
                    content=item.get('chunk_text', ''),
                    similarity=float(item.get('similarity', 0.0)),
                    metadata=metadata,
                    source='document_chunks',
                    chunk_type=metadata.get('chunk_type')
                )
                search_results.append(search_result)
            
            logger.debug(f"Found {len(search_results)} document chunk results")
            return search_results
            
        except Exception as e:
            logger.error(f"Document chunk search failed: {e}")
            return []
    
    async def _search_training_data(
        self,
        query_embedding: List[float],
        assistant_key: Optional[str],
        tenant_id: Optional[str],
        limit: int,
        similarity_threshold: float
    ) -> List[SearchResult]:
        """Search in training_data table (if it has embeddings)"""
        try:
            client = self._get_supabase().get_client()
            
            # Check if training_data has embedding column
            # This is optional - only works if embeddings have been added to training tables
            query_builder = client.table('training_data').select('id, prompt, response, tags, embedding')
            
            if assistant_key:
                query_builder = query_builder.eq('assistant_key', assistant_key)
            
            if tenant_id:
                query_builder = query_builder.eq('tenant_id', tenant_id)
            
            # Limit initial query to avoid large data transfer
            result = query_builder.limit(100).execute()
            
            if not result.data:
                return []
            
            # Calculate similarities manually (since we might not have RPC for training data)
            search_results = []
            for item in result.data:
                if 'embedding' not in item or not item['embedding']:
                    continue
                
                # Calculate cosine similarity
                item_embedding = item['embedding']
                similarity = self._cosine_similarity(query_embedding, item_embedding)
                
                if similarity >= similarity_threshold:
                    # Create result for both prompt and response
                    for content_type, content in [('prompt', item['prompt']), ('response', item['response'])]:
                        if content and content.strip():
                            search_result = SearchResult(
                                chunk_id=None,
                                doc_id=str(item['id']),
                                content=content,
                                similarity=similarity,
                                metadata={
                                    'type': content_type,
                                    'tags': item.get('tags', []),
                                    'assistant_key': assistant_key
                                },
                                source='training_data',
                                chunk_type='qa_pair'
                            )
                            search_results.append(search_result)
            
            # Sort by similarity and limit
            search_results.sort(key=lambda x: x.similarity, reverse=True)
            return search_results[:limit]
            
        except Exception as e:
            logger.debug(f"Training data search failed (expected if no embeddings): {e}")
            return []
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        try:
            if len(vec1) != len(vec2):
                return 0.0
            
            dot_product = sum(a * b for a, b in zip(vec1, vec2))
            norm_a = sum(a * a for a in vec1) ** 0.5
            norm_b = sum(b * b for b in vec2) ** 0.5
            
            if norm_a == 0 or norm_b == 0:
                return 0.0
            
            return dot_product / (norm_a * norm_b)
            
        except Exception as e:
            logger.error(f"Cosine similarity calculation failed: {e}")
            return 0.0
    
    async def search_similar_chunks(
        self,
        reference_text: str,
        assistant_key: Optional[str] = None,
        tenant_id: Optional[str] = None,
        limit: int = 5,
        exclude_doc_id: Optional[str] = None
    ) -> List[SearchResult]:
        """
        Find chunks similar to a reference text
        Useful for finding related content or duplicates
        """
        try:
            reference_embedding = await self.embedding_service.generate_embedding(reference_text)
            
            # Search with slightly lower threshold for similarity matching
            results = await self.semantic_search(
                query=reference_text,  # Use original text as query
                assistant_key=assistant_key,
                tenant_id=tenant_id,
                limit=limit + 5,  # Get extra in case we need to filter
                similarity_threshold=0.6  # Lower threshold for similarity search
            )
            
            # Filter out the reference document if specified
            if exclude_doc_id:
                results = [r for r in results if r.doc_id != exclude_doc_id]
            
            return results[:limit]
            
        except Exception as e:
            logger.error(f"Similar chunk search failed: {e}")
            return []
    
    async def hybrid_search(
        self,
        query: str,
        assistant_key: Optional[str] = None,
        tenant_id: Optional[str] = None,
        limit: int = 10,
        vector_weight: float = 0.7,
        keyword_weight: float = 0.3
    ) -> List[SearchResult]:
        """
        Hybrid search combining vector similarity and keyword matching
        
        Args:
            query: Search query
            vector_weight: Weight for vector similarity scores
            keyword_weight: Weight for keyword matching scores
        """
        try:
            # Get vector search results
            vector_results = await self.semantic_search(
                query=query,
                assistant_key=assistant_key,
                tenant_id=tenant_id,
                limit=limit * 2,  # Get more for hybrid ranking
                similarity_threshold=0.5  # Lower threshold for hybrid
            )
            
            # Get keyword search results (simple text matching)
            keyword_results = await self._keyword_search(
                query=query,
                assistant_key=assistant_key,
                tenant_id=tenant_id,
                limit=limit * 2
            )
            
            # Combine and re-rank results
            combined_results = self._combine_search_results(
                vector_results, keyword_results, vector_weight, keyword_weight
            )
            
            return combined_results[:limit]
            
        except Exception as e:
            logger.error(f"Hybrid search failed: {e}")
            # Fallback to vector search only
            return await self.semantic_search(query, assistant_key, tenant_id, limit)
    
    async def _keyword_search(
        self,
        query: str,
        assistant_key: Optional[str],
        tenant_id: Optional[str],
        limit: int
    ) -> List[SearchResult]:
        """Simple keyword-based search in document chunks"""
        try:
            client = self._get_supabase().get_client()
            
            # Build text search query
            query_builder = client.table('document_chunks').select(
                'chunk_id, doc_id, chunk_text, metadata'
            )
            
            # Add filters
            if tenant_id:
                query_builder = query_builder.eq('tenant_id', tenant_id)
            
            # Simple text search (case-insensitive)
            query_builder = query_builder.ilike('chunk_text', f'%{query}%')
            
            result = query_builder.limit(limit).execute()
            
            if not result.data:
                return []
            
            # Convert to SearchResult objects with keyword-based scoring
            keyword_results = []
            for item in result.data:
                # Simple keyword relevance scoring
                content = item.get('chunk_text', '')
                query_lower = query.lower()
                content_lower = content.lower()
                
                # Count keyword occurrences
                keyword_count = content_lower.count(query_lower)
                
                # Calculate simple relevance score (0-1)
                relevance = min(keyword_count / 10, 1.0)  # Normalize
                
                metadata = item.get('metadata', {})
                
                # Filter by assistant_key if specified
                if assistant_key and metadata.get('assistant_key') != assistant_key:
                    continue
                
                search_result = SearchResult(
                    chunk_id=item.get('chunk_id'),
                    doc_id=item.get('doc_id'),
                    content=content,
                    similarity=relevance,  # Using similarity field for keyword score
                    metadata=metadata,
                    source='keyword_search'
                )
                keyword_results.append(search_result)
            
            return keyword_results
            
        except Exception as e:
            logger.error(f"Keyword search failed: {e}")
            return []
    
    def _combine_search_results(
        self,
        vector_results: List[SearchResult],
        keyword_results: List[SearchResult],
        vector_weight: float,
        keyword_weight: float
    ) -> List[SearchResult]:
        """Combine and re-rank search results from different methods"""
        # Create a map of chunk_id to results for deduplication
        combined_map = {}
        
        # Add vector results
        for result in vector_results:
            key = (result.chunk_id, result.doc_id)
            combined_map[key] = {
                'result': result,
                'vector_score': result.similarity,
                'keyword_score': 0.0
            }
        
        # Add keyword results
        for result in keyword_results:
            key = (result.chunk_id, result.doc_id)
            if key in combined_map:
                # Update existing result with keyword score
                combined_map[key]['keyword_score'] = result.similarity
            else:
                # Add new result
                combined_map[key] = {
                    'result': result,
                    'vector_score': 0.0,
                    'keyword_score': result.similarity
                }
        
        # Calculate combined scores and create final results
        final_results = []
        for key, data in combined_map.items():
            vector_score = data['vector_score']
            keyword_score = data['keyword_score']
            
            # Calculate weighted combined score
            combined_score = (vector_score * vector_weight) + (keyword_score * keyword_weight)
            
            # Create new result with combined score
            result = data['result']
            final_result = SearchResult(
                chunk_id=result.chunk_id,
                doc_id=result.doc_id,
                content=result.content,
                similarity=combined_score,
                metadata={
                    **result.metadata,
                    'vector_score': vector_score,
                    'keyword_score': keyword_score,
                    'search_method': 'hybrid'
                },
                source='hybrid_search',
                chunk_type=result.chunk_type
            )
            final_results.append(final_result)
        
        # Sort by combined score
        final_results.sort(key=lambda x: x.similarity, reverse=True)
        return final_results

# Global service instance
vector_search_service = VectorSearchService()

def get_vector_search_service() -> VectorSearchService:
    """Get the global vector search service instance"""
    return vector_search_service
