-- Migration to support multiple dashboard layouts
-- 1. Ensure profiles table has the dashboard_layout column
-- Note: profiles table is expected to exist and be linked to auth.users
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS dashboard_layout JSONB;

-- 2. Create the dashboard_layouts table for multiple models
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layout JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- 3. Enable RLS for dashboard_layouts
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own layouts') THEN
        CREATE POLICY "Users can view their own layouts" ON dashboard_layouts FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own layouts') THEN
        CREATE POLICY "Users can insert their own layouts" ON dashboard_layouts FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own layouts') THEN
        CREATE POLICY "Users can update their own layouts" ON dashboard_layouts FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own layouts') THEN
        CREATE POLICY "Users can delete their own layouts" ON dashboard_layouts FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;