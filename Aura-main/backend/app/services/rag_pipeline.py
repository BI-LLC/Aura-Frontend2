# RAG Pipeline for AURA Voice AI
# Complete Retrieval Augmented Generation pipeline orchestration

import logging
from typing import List, Dict, Optional, Any, Tuple
from dataclasses import dataclass
from datetime import datetime

from app.services.embedding_service import get_embedding_service
from app.services.vector_search_service import get_vector_search_service, SearchResult
from app.services.chunk_processor import get_chunk_processor, DocumentChunk
from app.services.training_data_service import get_training_data_service
from app.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

@dataclass
class RAGContext:
    """Complete context object for RAG-enhanced responses"""
    query: str
    retrieved_chunks: List[SearchResult]
    context_text: str
    source_count: int
    confidence_score: float
    processing_time: float
    context_sources: List[str]
    token_count: int

@dataclass  
class RAGProcessingResult:
    """Result of document processing through RAG pipeline"""
    success: bool
    doc_id: Optional[str]
    filename: str
    chunks_created: int
    chunks_stored: int
    embeddings_generated: int
    processing_time: float
    error_message: Optional[str] = None

class RAGPipeline:
    def __init__(self):
        """Initialize RAG pipeline with all required services"""
        self.supabase = get_supabase_client()
        self.embedding_service = get_embedding_service()
        self.vector_search_service = get_vector_search_service()
        self.chunk_processor = get_chunk_processor()
        self.training_service = get_training_data_service()
        
        # Configuration
        self.max_context_tokens = 3000  # Leave room for LLM response
        self.max_chunks_per_source = 5  # Max chunks from each source type
        self.confidence_threshold = 0.3  # Minimum confidence for responses
        
        logger.info("RAG Pipeline initialized with all services")
    
    async def process_document_upload(
        self,
        content: str,
        filename: str,
        assistant_key: str,
        tenant_id: Optional[str] = None,
        file_type: Optional[str] = None
    ) -> RAGProcessingResult:
        """
        Complete RAG processing pipeline for uploaded documents
        Steps: Text Extraction → Chunking → Embeddings → Vector Storage
        
        Args:
            content: Extracted text content from document
            filename: Original filename
            assistant_key: Assistant identifier
            tenant_id: Tenant identifier for multi-tenancy
            file_type: File extension/type
            
        Returns:
            RAGProcessingResult with processing statistics
        """
        start_time = datetime.now()
        
        try:
            logger.info(f"Starting RAG processing for {filename}")
            
            # 1. Intelligent document chunking
            chunks = await self._chunk_document(content, filename, assistant_key)
            
            if not chunks:
                return RAGProcessingResult(
                    success=False,
                    doc_id=None,
                    filename=filename,
                    chunks_created=0,
                    chunks_stored=0,
                    embeddings_generated=0,
                    processing_time=0.0,
                    error_message="No chunks created from document"
                )
            
            logger.info(f"Created {len(chunks)} chunks from {filename}")
            
            # 2. Generate embeddings for all chunks
            chunk_texts = [chunk.text for chunk in chunks]
            embeddings = await self.embedding_service.generate_batch_embeddings(chunk_texts)
            
            logger.info(f"Generated {len(embeddings)} embeddings")
            
            # 3. Store document and chunks in Supabase
            doc_id, stored_count = await self._store_document_with_chunks(
                chunks=chunks,
                embeddings=embeddings,
                filename=filename,
                content=content,
                assistant_key=assistant_key,
                tenant_id=tenant_id,
                file_type=file_type
            )
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"RAG processing completed for {filename}: {stored_count}/{len(chunks)} chunks stored")
            
            return RAGProcessingResult(
                success=True,
                doc_id=doc_id,
                filename=filename,
                chunks_created=len(chunks),
                chunks_stored=stored_count,
                embeddings_generated=len([e for e in embeddings if any(x != 0.0 for x in e)]),
                processing_time=processing_time
            )
            
        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"RAG document processing failed for {filename}: {e}")
            
            return RAGProcessingResult(
                success=False,
                doc_id=None,
                filename=filename,
                chunks_created=0,
                chunks_stored=0,
                embeddings_generated=0,
                processing_time=processing_time,
                error_message=str(e)
            )
    
    async def retrieve_context(
        self,
        query: str,
        assistant_key: Optional[str] = None,
        tenant_id: Optional[str] = None,
        use_hybrid_search: bool = True,
        max_chunks: int = 15
    ) -> RAGContext:
        """
        Advanced context retrieval combining multiple sources
        
        Priority Order:
        1. Exact training data matches (Q&A pairs, Logic Notes)
        2. Vector similarity search in documents
        3. Hybrid search (vector + keyword)
        4. Reference materials
        
        Args:
            query: User query/question
            assistant_key: Filter by assistant
            tenant_id: Filter by tenant
            use_hybrid_search: Whether to use hybrid vector+keyword search
            max_chunks: Maximum chunks to retrieve
            
        Returns:
            RAGContext with comprehensive context and metadata
        """
        start_time = datetime.now()
        
        try:
            all_results = []
            context_sources = []
            
            # 1. Get traditional training context (Q&A pairs, Logic Notes)
            logger.debug("Retrieving traditional training context...")
            training_context = await self.training_service.get_training_context(
                query, assistant_key, tenant_id
            )
            
            if training_context:
                context_sources.append("training_data")
                logger.debug(f"Found training context: {len(training_context)} characters")
            
            # 2. Perform vector search in document chunks
            logger.debug("Performing vector search...")
            if use_hybrid_search:
                vector_results = await self.vector_search_service.hybrid_search(
                    query=query,
                    assistant_key=assistant_key,
                    tenant_id=tenant_id,
                    limit=max_chunks,
                    vector_weight=0.7,
                    keyword_weight=0.3
                )
                search_method = "hybrid"
            else:
                vector_results = await self.vector_search_service.semantic_search(
                    query=query,
                    assistant_key=assistant_key,
                    tenant_id=tenant_id,
                    limit=max_chunks,
                    similarity_threshold=0.6
                )
                search_method = "vector"
            
            all_results.extend(vector_results)
            
            if vector_results:
                context_sources.append(search_method)
                logger.debug(f"Found {len(vector_results)} vector search results")
            
            # 3. Build comprehensive context
            context_text = await self._build_comprehensive_context(
                query=query,
                training_context=training_context,
                search_results=all_results,
                max_tokens=self.max_context_tokens
            )
            
            # 4. Calculate confidence score
            confidence_score = self._calculate_confidence(
                training_context=training_context,
                search_results=all_results,
                query=query
            )
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # 5. Count tokens (approximate)
            token_count = len(context_text.split()) * 1.3  # Rough approximation
            
            rag_context = RAGContext(
                query=query,
                retrieved_chunks=all_results,
                context_text=context_text,
                source_count=len(all_results),
                confidence_score=confidence_score,
                processing_time=processing_time,
                context_sources=context_sources,
                token_count=int(token_count)
            )
            
            logger.info(f"RAG context retrieved - Sources: {context_sources}, Confidence: {confidence_score:.2f}")
            return rag_context
            
        except Exception as e:
            logger.error(f"RAG context retrieval failed: {e}")
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Fallback to traditional training system
            try:
                fallback_context = await self.training_service.get_training_context(
                    query, assistant_key, tenant_id
                )
                
                return RAGContext(
                    query=query,
                    retrieved_chunks=[],
                    context_text=fallback_context,
                    source_count=0,
                    confidence_score=0.5 if fallback_context else 0.1,
                    processing_time=processing_time,
                    context_sources=["training_data_fallback"] if fallback_context else [],
                    token_count=len(fallback_context.split()) if fallback_context else 0
                )
            except Exception as fallback_error:
                logger.error(f"Fallback context retrieval also failed: {fallback_error}")
                return RAGContext(
                    query=query,
                    retrieved_chunks=[],
                    context_text="",
                    source_count=0,
                    confidence_score=0.0,
                    processing_time=processing_time,
                    context_sources=[],
                    token_count=0
                )
    
    async def _chunk_document(
        self, 
        content: str, 
        filename: str, 
        assistant_key: str
    ) -> List[DocumentChunk]:
        """Process document into intelligent chunks"""
        try:
            metadata = {
                'filename': filename,
                'assistant_key': assistant_key,
                'processed_at': datetime.now().isoformat()
            }
            
            chunks = self.chunk_processor.smart_chunk_document(content, metadata)
            
            # Log chunking statistics
            if chunks:
                stats = self.chunk_processor.get_chunk_statistics(chunks)
                logger.debug(f"Chunk statistics: {stats}")
            
            return chunks
            
        except Exception as e:
            logger.error(f"Document chunking failed: {e}")
            return []
    
    async def _store_document_with_chunks(
        self,
        chunks: List[DocumentChunk],
        embeddings: List[List[float]],
        filename: str,
        content: str,
        assistant_key: str,
        tenant_id: Optional[str],
        file_type: Optional[str]
    ) -> Tuple[Optional[str], int]:
        """Store document and chunks with embeddings in Supabase"""
        try:
            client = self.supabase.get_client()
            
            # 1. Create document record
            doc_data = {
                'filename': filename,
                'tenant_id': tenant_id,
                'user_id': tenant_id,  # Simplified mapping
                'file_size': len(content.encode('utf-8')),
                'file_type': file_type or filename.split('.')[-1].lower(),
                'content_preview': content[:1000],  # First 1000 chars
                'chunks_count': len(chunks),
                'metadata': {
                    'assistant_key': assistant_key,
                    'processed_at': datetime.now().isoformat(),
                    'processing_method': 'rag_pipeline'
                },
                'is_processed': True,
                'processing_status': 'completed'
            }
            
            doc_result = client.table('documents').insert(doc_data).execute()
            
            if not doc_result.data:
                raise Exception("Failed to create document record")
            
            doc_id = doc_result.data[0]['doc_id']
            logger.debug(f"Created document record with ID: {doc_id}")
            
            # 2. Store chunks with embeddings in batches
            stored_count = 0
            batch_size = 50  # Process in batches to avoid timeouts
            
            for i in range(0, len(chunks), batch_size):
                batch_chunks = chunks[i:i + batch_size]
                batch_embeddings = embeddings[i:i + batch_size]
                
                chunk_records = []
                for chunk, embedding in zip(batch_chunks, batch_embeddings):
                    chunk_record = {
                        'doc_id': doc_id,
                        'tenant_id': tenant_id,
                        'chunk_text': chunk.text,
                        'chunk_index': chunk.chunk_index,
                        'embedding': embedding,
                        'metadata': {
                            **chunk.metadata,
                            'chunk_type': chunk.chunk_type,
                            'token_count': chunk.token_count,
                            'start_char': chunk.start_char,
                            'end_char': chunk.end_char
                        }
                    }
                    chunk_records.append(chunk_record)
                
                # Insert batch
                batch_result = client.table('document_chunks').insert(chunk_records).execute()
                
                if batch_result.data:
                    stored_count += len(batch_result.data)
                    logger.debug(f"Stored batch {i//batch_size + 1}: {len(batch_result.data)} chunks")
            
            logger.info(f"Successfully stored {stored_count}/{len(chunks)} chunks for {filename}")
            return doc_id, stored_count
            
        except Exception as e:
            logger.error(f"Document and chunk storage failed: {e}")
            return None, 0
    
    async def _build_comprehensive_context(
        self,
        query: str,
        training_context: str,
        search_results: List[SearchResult],
        max_tokens: int
    ) -> str:
        """Build optimized context from all sources within token limit"""
        context_parts = []
        current_tokens = 0
        
        # 1. Always prioritize exact training data
        if training_context:
            training_section = f"EXACT TRAINING DATA:\n{training_context}"
            training_tokens = len(training_section.split()) * 1.3
            
            if current_tokens + training_tokens <= max_tokens:
                context_parts.append(training_section)
                current_tokens += training_tokens
                logger.debug(f"Added training context: {training_tokens} tokens")
        
        # 2. Add highest-scoring search results
        if search_results and current_tokens < max_tokens * 0.8:  # Reserve 20% for other content
            vector_content = []
            
            # Sort by similarity and group by source
            sorted_results = sorted(search_results, key=lambda x: x.similarity, reverse=True)
            
            for result in sorted_results:
                if current_tokens >= max_tokens * 0.9:  # Stop at 90% capacity
                    break
                
                # Format result with source information
                source_info = self._format_source_info(result)
                content_block = f"{source_info}\n{result.content}"
                content_tokens = len(content_block.split()) * 1.3
                
                if current_tokens + content_tokens <= max_tokens:
                    vector_content.append(content_block)
                    current_tokens += content_tokens
                else:
                    # Truncate content to fit
                    remaining_tokens = max_tokens - current_tokens
                    if remaining_tokens > 50:  # Only add if meaningful space left
                        truncated_content = self._truncate_content(
                            content_block, int(remaining_tokens / 1.3)
                        )
                        vector_content.append(truncated_content)
                    break
            
            if vector_content:
                vector_section = f"SEMANTIC SEARCH RESULTS:\n" + "\n\n".join(vector_content)
                context_parts.append(vector_section)
                logger.debug(f"Added {len(vector_content)} search results")
        
        # 3. Combine all parts
        final_context = "\n\n=== CONTEXT SEPARATOR ===\n\n".join(context_parts)
        
        logger.debug(f"Built comprehensive context: {len(final_context)} chars, ~{current_tokens} tokens")
        return final_context
    
    def _format_source_info(self, result: SearchResult) -> str:
        """Format source information for search results"""
        source_parts = []
        
        # Add source type
        source_parts.append(f"Source: {result.source}")
        
        # Add document info if available
        if result.metadata:
            filename = result.metadata.get('filename', result.metadata.get('original_filename'))
            if filename:
                source_parts.append(f"Document: {filename}")
            
            chunk_type = result.metadata.get('chunk_type')
            if chunk_type:
                source_parts.append(f"Type: {chunk_type}")
        
        # Add similarity score
        source_parts.append(f"Relevance: {result.similarity:.2f}")
        
        return f"[{' | '.join(source_parts)}]"
    
    def _truncate_content(self, content: str, max_words: int) -> str:
        """Truncate content to fit within word limit"""
        words = content.split()
        if len(words) <= max_words:
            return content
        
        truncated = " ".join(words[:max_words])
        return truncated + "... [truncated]"
    
    def _calculate_confidence(
        self,
        training_context: str,
        search_results: List[SearchResult],
        query: str
    ) -> float:
        """Calculate confidence score for the retrieved context"""
        confidence_factors = []
        
        # Factor 1: Training data availability (high weight)
        if training_context:
            # If we have training data, give it high confidence regardless of keyword overlap
            # This ensures that existing Q&A pairs, logic notes, and reference materials are prioritized
            confidence_factors.append(0.9)  # High confidence for any training data
        
        # Factor 2: Vector search quality
        if search_results:
            # Average similarity of top results
            top_results = search_results[:5]  # Consider top 5
            avg_similarity = sum(r.similarity for r in top_results) / len(top_results)
            confidence_factors.append(avg_similarity)
            
            # Bonus for multiple high-quality results
            high_quality_count = len([r for r in search_results if r.similarity > 0.8])
            diversity_bonus = min(high_quality_count / 10, 0.2)  # Up to 20% bonus
            confidence_factors.append(diversity_bonus)
        
        # Factor 3: Query complexity (simpler queries are more reliable)
        query_complexity = min(len(query.split()) / 10, 1.0)  # Normalize to 0-1
        simplicity_factor = 1.0 - query_complexity * 0.3  # Reduce confidence for complex queries
        confidence_factors.append(simplicity_factor)
        
        # Calculate weighted average
        if not confidence_factors:
            return 0.0
        
        # Weight the factors: training data (0.4), similarity (0.3), diversity (0.2), simplicity (0.1)
        weights = [0.4, 0.3, 0.2, 0.1]
        
        # Pad or trim factors to match weights
        while len(confidence_factors) < len(weights):
            confidence_factors.append(0.0)
        
        confidence_factors = confidence_factors[:len(weights)]
        
        weighted_confidence = sum(f * w for f, w in zip(confidence_factors, weights))
        
        return min(max(weighted_confidence, 0.0), 1.0)  # Clamp to 0-1
    
    async def get_pipeline_stats(self) -> Dict[str, Any]:
        """Get comprehensive RAG pipeline statistics"""
        try:
            client = self.supabase.get_client()
            
            # Document statistics
            doc_stats = client.table('documents').select('doc_id').execute()
            total_docs = len(doc_stats.data) if doc_stats.data else 0
            
            # Chunk statistics
            chunk_stats = client.rpc('get_vector_search_metrics').execute()
            
            # Embedding service stats
            embedding_stats = self.embedding_service.get_cache_stats()
            
            return {
                'documents': {
                    'total': total_docs
                },
                'chunks': chunk_stats.data[0] if chunk_stats.data else {},
                'embeddings': embedding_stats,
                'pipeline_status': 'operational'
            }
            
        except Exception as e:
            logger.error(f"Failed to get pipeline stats: {e}")
            return {
                'error': str(e),
                'pipeline_status': 'error'
            }

# Global service instance
rag_pipeline = RAGPipeline()

def get_rag_pipeline() -> RAGPipeline:
    """Get the global RAG pipeline instance"""
    return rag_pipeline
