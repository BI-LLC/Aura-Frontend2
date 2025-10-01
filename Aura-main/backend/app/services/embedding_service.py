# Embedding Service for AURA Voice AI RAG Pipeline
# Generates embeddings using OpenAI's text-embedding-3-small model

import asyncio
import openai
import logging
from typing import List, Dict, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        """Initialize OpenAI embedding service"""
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "text-embedding-3-small"  # Cost-effective and fast
        self.dimensions = 1536
        self.max_batch_size = 100  # OpenAI limit
        
        # Embedding cache to reduce costs
        self._embedding_cache = {}
        self._cache_hits = 0
        self._cache_misses = 0
        
        logger.info(f"Embedding Service initialized - Model: {self.model}, Dimensions: {self.dimensions}")
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text
        
        Args:
            text: Input text to embed
            
        Returns:
            List of floats representing the embedding vector
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for embedding")
            return [0.0] * self.dimensions
        
        # Check cache first
        text_hash = hash(text.strip())
        if text_hash in self._embedding_cache:
            self._cache_hits += 1
            logger.debug("Embedding cache hit")
            return self._embedding_cache[text_hash]
        
        try:
            # Generate embedding via OpenAI
            response = await self.client.embeddings.create(
                model=self.model,
                input=text.strip(),
                dimensions=self.dimensions
            )
            
            embedding = response.data[0].embedding
            
            # Cache the result
            self._embedding_cache[text_hash] = embedding
            self._cache_misses += 1
            
            logger.debug(f"Generated embedding for text: {text[:50]}...")
            return embedding
            
        except Exception as e:
            logger.error(f"Embedding generation failed for text '{text[:50]}...': {e}")
            # Return zero vector on failure
            return [0.0] * self.dimensions
    
    async def generate_batch_embeddings(
        self, 
        texts: List[str], 
        batch_size: Optional[int] = None
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts efficiently
        
        Args:
            texts: List of texts to embed
            batch_size: Override default batch size
            
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        
        batch_size = batch_size or self.max_batch_size
        embeddings = []
        
        # Process in batches
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_embeddings = await self._process_batch(batch)
            embeddings.extend(batch_embeddings)
            
            # Small delay to respect rate limits
            if i + batch_size < len(texts):
                await asyncio.sleep(0.1)
        
        logger.info(f"Generated {len(embeddings)} embeddings from {len(texts)} texts")
        return embeddings
    
    async def _process_batch(self, batch: List[str]) -> List[List[float]]:
        """Process a single batch of texts"""
        try:
            # Filter empty texts
            valid_texts = [text.strip() for text in batch if text and text.strip()]
            
            if not valid_texts:
                return [[0.0] * self.dimensions] * len(batch)
            
            # Check cache for each text
            cached_embeddings = {}
            uncached_texts = []
            
            for text in valid_texts:
                text_hash = hash(text)
                if text_hash in self._embedding_cache:
                    cached_embeddings[text] = self._embedding_cache[text_hash]
                    self._cache_hits += 1
                else:
                    uncached_texts.append(text)
            
            # Generate embeddings for uncached texts
            new_embeddings = {}
            if uncached_texts:
                try:
                    response = await self.client.embeddings.create(
                        model=self.model,
                        input=uncached_texts,
                        dimensions=self.dimensions
                    )
                    
                    for text, embedding_data in zip(uncached_texts, response.data):
                        embedding = embedding_data.embedding
                        new_embeddings[text] = embedding
                        
                        # Cache the result
                        text_hash = hash(text)
                        self._embedding_cache[text_hash] = embedding
                        self._cache_misses += 1
                        
                except Exception as e:
                    logger.error(f"Batch embedding generation failed: {e}")
                    # Fill with zero vectors on failure
                    for text in uncached_texts:
                        new_embeddings[text] = [0.0] * self.dimensions
            
            # Combine cached and new embeddings in original order
            result_embeddings = []
            for original_text in batch:
                text = original_text.strip() if original_text else ""
                if text in cached_embeddings:
                    result_embeddings.append(cached_embeddings[text])
                elif text in new_embeddings:
                    result_embeddings.append(new_embeddings[text])
                else:
                    result_embeddings.append([0.0] * self.dimensions)
            
            return result_embeddings
            
        except Exception as e:
            logger.error(f"Batch processing failed: {e}")
            return [[0.0] * self.dimensions] * len(batch)
    
    async def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding specifically optimized for queries
        
        Args:
            query: User query text
            
        Returns:
            Query embedding vector
        """
        # For queries, we might want to do some preprocessing
        processed_query = query.strip().lower()
        
        # Remove question words that might not be in documents
        query_words = processed_query.split()
        filtered_words = [
            word for word in query_words 
            if word not in ['what', 'who', 'when', 'where', 'why', 'how', 'is', 'are', 'the']
        ]
        
        # Use original query if filtering removes too much
        if len(filtered_words) < len(query_words) * 0.3:
            final_query = query
        else:
            final_query = ' '.join(filtered_words)
        
        logger.debug(f"Query embedding - Original: '{query}' -> Processed: '{final_query}'")
        return await self.generate_embedding(final_query)
    
    def get_cache_stats(self) -> Dict[str, int]:
        """Get embedding cache statistics"""
        total_requests = self._cache_hits + self._cache_misses
        hit_rate = (self._cache_hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'cache_hits': self._cache_hits,
            'cache_misses': self._cache_misses,
            'hit_rate': round(hit_rate, 2),
            'cache_size': len(self._embedding_cache)
        }
    
    def clear_cache(self):
        """Clear embedding cache"""
        self._embedding_cache.clear()
        self._cache_hits = 0
        self._cache_misses = 0
        logger.info("Embedding cache cleared")

# Global service instance
embedding_service = EmbeddingService()

def get_embedding_service() -> EmbeddingService:
    """Get the global embedding service instance"""
    return embedding_service
