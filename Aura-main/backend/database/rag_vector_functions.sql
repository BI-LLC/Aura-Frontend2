-- RAG Vector Functions for AURA Voice AI
-- PostgreSQL functions for efficient vector similarity search in Supabase
-- Run this in your Supabase SQL Editor

-- =====================================================
-- VECTOR SIMILARITY SEARCH FUNCTIONS
-- =====================================================

-- Function for searching document chunks with vector similarity
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    tenant_filter uuid DEFAULT NULL
)
RETURNS TABLE(
    chunk_id int,
    doc_id uuid,
    chunk_text text,
    similarity float,
    metadata jsonb,
    chunk_index int
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        document_chunks.chunk_id,
        document_chunks.doc_id,
        document_chunks.chunk_text,
        (document_chunks.embedding <#> query_embedding) * -1 AS similarity,
        document_chunks.metadata,
        document_chunks.chunk_index
    FROM document_chunks
    WHERE 
        document_chunks.embedding IS NOT NULL
        AND (tenant_filter IS NULL OR document_chunks.tenant_id = tenant_filter)
        AND (document_chunks.embedding <#> query_embedding) * -1 > match_threshold
    ORDER BY document_chunks.embedding <#> query_embedding
    LIMIT match_count;
END;
$$;

-- Function for hybrid search combining vector similarity and text search
CREATE OR REPLACE FUNCTION hybrid_search_chunks(
    query_embedding vector(1536),
    search_text text,
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    tenant_filter uuid DEFAULT NULL,
    vector_weight float DEFAULT 0.7,
    text_weight float DEFAULT 0.3
)
RETURNS TABLE(
    chunk_id int,
    doc_id uuid,
    chunk_text text,
    vector_similarity float,
    text_similarity float,
    combined_score float,
    metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH vector_matches AS (
        SELECT
            dc.chunk_id,
            dc.doc_id,
            dc.chunk_text,
            (dc.embedding <#> query_embedding) * -1 AS vec_sim,
            dc.metadata
        FROM document_chunks dc
        WHERE 
            dc.embedding IS NOT NULL
            AND (tenant_filter IS NULL OR dc.tenant_id = tenant_filter)
            AND (dc.embedding <#> query_embedding) * -1 > match_threshold
    ),
    text_matches AS (
        SELECT
            dc.chunk_id,
            dc.doc_id,
            dc.chunk_text,
            similarity(dc.chunk_text, search_text) AS text_sim,
            dc.metadata
        FROM document_chunks dc
        WHERE 
            (tenant_filter IS NULL OR dc.tenant_id = tenant_filter)
            AND dc.chunk_text ILIKE '%' || search_text || '%'
    ),
    combined_results AS (
        SELECT
            COALESCE(v.chunk_id, t.chunk_id) AS chunk_id,
            COALESCE(v.doc_id, t.doc_id) AS doc_id,
            COALESCE(v.chunk_text, t.chunk_text) AS chunk_text,
            COALESCE(v.vec_sim, 0.0) AS vector_similarity,
            COALESCE(t.text_sim, 0.0) AS text_similarity,
            (COALESCE(v.vec_sim, 0.0) * vector_weight + COALESCE(t.text_sim, 0.0) * text_weight) AS combined_score,
            COALESCE(v.metadata, t.metadata) AS metadata
        FROM vector_matches v
        FULL OUTER JOIN text_matches t ON v.chunk_id = t.chunk_id
    )
    SELECT
        cr.chunk_id,
        cr.doc_id,
        cr.chunk_text,
        cr.vector_similarity,
        cr.text_similarity,
        cr.combined_score,
        cr.metadata
    FROM combined_results cr
    WHERE cr.combined_score > match_threshold
    ORDER BY cr.combined_score DESC
    LIMIT match_count;
END;
$$;

-- Function to search for similar documents (for deduplication)
CREATE OR REPLACE FUNCTION find_similar_chunks(
    reference_embedding vector(1536),
    similarity_threshold float DEFAULT 0.8,
    max_results int DEFAULT 5,
    exclude_doc_id uuid DEFAULT NULL,
    tenant_filter uuid DEFAULT NULL
)
RETURNS TABLE(
    chunk_id int,
    doc_id uuid,
    chunk_text text,
    similarity float,
    metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.chunk_id,
        dc.doc_id,
        dc.chunk_text,
        (dc.embedding <#> reference_embedding) * -1 AS similarity,
        dc.metadata
    FROM document_chunks dc
    WHERE 
        dc.embedding IS NOT NULL
        AND (tenant_filter IS NULL OR dc.tenant_id = tenant_filter)
        AND (exclude_doc_id IS NULL OR dc.doc_id != exclude_doc_id)
        AND (dc.embedding <#> reference_embedding) * -1 > similarity_threshold
    ORDER BY dc.embedding <#> reference_embedding
    LIMIT max_results;
END;
$$;

-- =====================================================
-- TRAINING DATA VECTOR FUNCTIONS (OPTIONAL)
-- =====================================================

-- Function to search training data with embeddings (if enabled)
CREATE OR REPLACE FUNCTION match_training_data(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    assistant_key_filter text DEFAULT NULL,
    tenant_filter uuid DEFAULT NULL
)
RETURNS TABLE(
    id uuid,
    prompt text,
    response text,
    similarity float,
    tags jsonb,
    assistant_key text
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if embedding column exists in training_data
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'training_data' 
        AND column_name = 'embedding'
    ) THEN
        RETURN QUERY
        SELECT
            td.id,
            td.prompt,
            td.response,
            (td.embedding <#> query_embedding) * -1 AS similarity,
            td.tags,
            td.assistant_key
        FROM training_data td
        WHERE 
            td.embedding IS NOT NULL
            AND (tenant_filter IS NULL OR td.tenant_id = tenant_filter)
            AND (assistant_key_filter IS NULL OR td.assistant_key = assistant_key_filter)
            AND (td.embedding <#> query_embedding) * -1 > match_threshold
        ORDER BY td.embedding <#> query_embedding
        LIMIT match_count;
    ELSE
        -- Return empty result if no embedding column
        RETURN;
    END IF;
END;
$$;

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to calculate average embedding for a set of chunks (for document-level search)
CREATE OR REPLACE FUNCTION get_document_average_embedding(
    document_id uuid
)
RETURNS vector(1536)
LANGUAGE plpgsql
AS $$
DECLARE
    avg_embedding vector(1536);
BEGIN
    SELECT AVG(embedding) INTO avg_embedding
    FROM document_chunks
    WHERE doc_id = document_id
    AND embedding IS NOT NULL;
    
    RETURN avg_embedding;
END;
$$;

-- Function to get chunk statistics for a document
CREATE OR REPLACE FUNCTION get_document_chunk_stats(
    document_id uuid
)
RETURNS TABLE(
    total_chunks int,
    chunks_with_embeddings int,
    avg_chunk_length float,
    chunk_types jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::int as total_chunks,
        COUNT(embedding)::int as chunks_with_embeddings,
        AVG(LENGTH(chunk_text)) as avg_chunk_length,
        jsonb_object_agg(
            COALESCE(metadata->>'chunk_type', 'unknown'),
            COUNT(*)
        ) as chunk_types
    FROM document_chunks
    WHERE doc_id = document_id;
END;
$$;

-- Function to clean up orphaned chunks (chunks without parent documents)
CREATE OR REPLACE FUNCTION cleanup_orphaned_chunks()
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count int;
BEGIN
    WITH orphaned_chunks AS (
        DELETE FROM document_chunks dc
        WHERE NOT EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.doc_id = dc.doc_id
        )
        RETURNING chunk_id
    )
    SELECT COUNT(*) INTO deleted_count FROM orphaned_chunks;
    
    RETURN deleted_count;
END;
$$;

-- =====================================================
-- PERFORMANCE OPTIMIZATION FUNCTIONS
-- =====================================================

-- Function to update vector index statistics (call periodically for better performance)
CREATE OR REPLACE FUNCTION refresh_vector_stats()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update table statistics
    ANALYZE document_chunks;
    
    -- Update vector index if it exists
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'document_chunks' 
        AND indexname LIKE '%embedding%'
    ) THEN
        -- Refresh index statistics
        REINDEX INDEX CONCURRENTLY idx_chunks_embeddings;
    END IF;
END;
$$;

-- Function to get vector search performance metrics
CREATE OR REPLACE FUNCTION get_vector_search_metrics()
RETURNS TABLE(
    total_chunks int,
    chunks_with_embeddings int,
    embedding_coverage_percent float,
    avg_embedding_dimension int,
    index_size text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::int as total_chunks,
        COUNT(embedding)::int as chunks_with_embeddings,
        (COUNT(embedding)::float / COUNT(*) * 100) as embedding_coverage_percent,
        (
            SELECT array_length(embedding, 1) 
            FROM document_chunks 
            WHERE embedding IS NOT NULL 
            LIMIT 1
        ) as avg_embedding_dimension,
        pg_size_pretty(pg_total_relation_size('document_chunks')) as index_size
    FROM document_chunks;
END;
$$;

-- =====================================================
-- INDEXES AND OPTIMIZATIONS
-- =====================================================

-- Ensure optimal vector indexes exist
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_cosine 
ON document_chunks USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create additional indexes for filtering
CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant_embedding 
ON document_chunks (tenant_id) 
WHERE embedding IS NOT NULL;

-- Create index for assistant_key filtering (using btree instead of gin for text)
CREATE INDEX IF NOT EXISTS idx_document_chunks_metadata_assistant 
ON document_chunks ((metadata->>'assistant_key'))
WHERE metadata ? 'assistant_key';

-- Optimize for hybrid search (full text search)
CREATE INDEX IF NOT EXISTS idx_document_chunks_text_search 
ON document_chunks USING gin (to_tsvector('english', chunk_text));

-- =====================================================
-- GRANTS (if needed for specific users)
-- =====================================================

-- Grant execute permissions on functions to authenticated users
-- GRANT EXECUTE ON FUNCTION match_document_chunks TO authenticated;
-- GRANT EXECUTE ON FUNCTION hybrid_search_chunks TO authenticated;
-- GRANT EXECUTE ON FUNCTION find_similar_chunks TO authenticated;
-- GRANT EXECUTE ON FUNCTION match_training_data TO authenticated;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

/*
-- Example 1: Basic vector search
SELECT * FROM match_document_chunks(
    '[0.1, 0.2, 0.3, ...]'::vector(1536),  -- query embedding
    0.7,  -- similarity threshold
    10,   -- max results
    'tenant-uuid'  -- tenant filter
);

-- Example 2: Hybrid search
SELECT * FROM hybrid_search_chunks(
    '[0.1, 0.2, 0.3, ...]'::vector(1536),  -- query embedding
    'search text',  -- text query
    0.5,   -- match threshold
    10,    -- max results
    'tenant-uuid',  -- tenant filter
    0.7,   -- vector weight
    0.3    -- text weight
);

-- Example 3: Find similar content
SELECT * FROM find_similar_chunks(
    '[0.1, 0.2, 0.3, ...]'::vector(1536),  -- reference embedding
    0.8,   -- similarity threshold
    5,     -- max results
    'exclude-doc-uuid',  -- exclude this document
    'tenant-uuid'  -- tenant filter
);

-- Example 4: Get search metrics
SELECT * FROM get_vector_search_metrics();

-- Example 5: Cleanup orphaned chunks
SELECT cleanup_orphaned_chunks();
*/
