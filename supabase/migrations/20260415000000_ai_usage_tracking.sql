
-- Table to track AI usage (tokens and queries)
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- Optional, for future user-specific tracking
  action_type TEXT NOT NULL, -- 'chat', 'upload', 'note_embedding'
  model_name TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  candidates_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read ai_usage_logs" ON ai_usage_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert ai_usage_logs" ON ai_usage_logs FOR INSERT WITH CHECK (true);

-- Index for faster daily aggregation
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);