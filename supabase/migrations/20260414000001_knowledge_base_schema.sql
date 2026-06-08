
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE IF NOT EXISTS kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chunks table
CREATE TABLE IF NOT EXISTS kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES kb_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768), -- gemini-embedding-2-preview with outputDimensionality: 768
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table
CREATE TABLE IF NOT EXISTS kb_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function for similarity search
CREATE OR REPLACE FUNCTION match_kb_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb_chunks.id,
    kb_chunks.document_id,
    kb_chunks.content,
    1 - (kb_chunks.embedding <=> query_embedding) AS similarity
  FROM kb_chunks
  WHERE 1 - (kb_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Enable RLS
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_notes ENABLE ROW LEVEL SECURITY;

-- Policies (Public for prototype)
CREATE POLICY "Allow public read documents" ON kb_documents FOR SELECT USING (true);
CREATE POLICY "Allow public insert documents" ON kb_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete documents" ON kb_documents FOR DELETE USING (true);

CREATE POLICY "Allow public read chunks" ON kb_chunks FOR SELECT USING (true);
CREATE POLICY "Allow public insert chunks" ON kb_chunks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete chunks" ON kb_chunks FOR DELETE USING (true);

CREATE POLICY "Allow public read notes" ON kb_notes FOR SELECT USING (true);
CREATE POLICY "Allow public insert notes" ON kb_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete notes" ON kb_notes FOR DELETE USING (true);