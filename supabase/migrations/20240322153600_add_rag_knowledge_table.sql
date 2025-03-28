-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge chunks table
CREATE TABLE knowledge_chunks (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    source TEXT,
    metadata JSONB DEFAULT '{}',
    embedding vector(768), -- 768 dimensions for Gemini embedding-001 model
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Function to match chunks based on embedding similarity
CREATE OR REPLACE FUNCTION match_chunks (
    query_embedding vector(768),
    similarity_threshold FLOAT,
    match_count INTEGER
)
RETURNS TABLE (
    id BIGINT,
    content TEXT,
    source TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kc.id,
        kc.content,
        kc.source,
        kc.metadata,
        1 - (kc.embedding <=> query_embedding) as similarity
    FROM knowledge_chunks kc
    WHERE 1 - (kc.embedding <=> query_embedding) > similarity_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Create an HNSW index for faster similarity search
CREATE INDEX ON knowledge_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64); 