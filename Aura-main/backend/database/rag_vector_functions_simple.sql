-- Simplified RAG Vector Functions for AURA Voice AI
-- PostgreSQL functions for efficient vector similarity search in Supabase
-- Run this in your Supabase SQL Editor (SIMPLIFIED VERSION FOR TESTING)

-- =====================================================
-- BASIC VECTOR SIMILARITY SEARCH FUNCTION
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

-- =====================================================
-- BASIC INDEXES (NO GIN ISSUES)
-- =====================================================

-- Ensure optimal vector indexes exist
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_cosine 
ON document_chunks USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create additional indexes for filtering
CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant_embedding 
ON document_chunks (tenant_id) 
WHERE embedding IS NOT NULL;

-- Simple btree index for metadata filtering
CREATE INDEX IF NOT EXISTS idx_document_chunks_metadata_simple
ON document_chunks ((metadata->>'assistant_key'));

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to get vector search performance metrics
CREATE OR REPLACE FUNCTION get_vector_search_metrics()
RETURNS TABLE(
    total_chunks int,
    chunks_with_embeddings int,
    embedding_coverage_percent float,
    avg_embedding_dimension int
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
        ) as avg_embedding_dimension
    FROM document_chunks;
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
-- TEST THE FUNCTION
-- =====================================================

-- Test if the function works
SELECT 'RAG vector functions installed successfully' as status;

-- Check if we can call the function (will return empty results if no data)
SELECT COUNT(*) as test_function_works 
FROM match_document_chunks('[0.1,0.2,0.3]'::vector(3), 0.5, 1);

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

/*
-- Example 1: Basic vector search
SELECT * FROM match_document_chunks(
    '[0.1, 0.2, 0.3, ...]'::vector(1536),  -- query embedding
    0.7,  -- similarity threshold
    10,   -- max results
    'tenant-uuid'::uuid  -- tenant filter
);

-- Example 2: Get search metrics
SELECT * FROM get_vector_search_metrics();

-- Example 3: Cleanup orphaned chunks
SELECT cleanup_orphaned_chunks();
*/
