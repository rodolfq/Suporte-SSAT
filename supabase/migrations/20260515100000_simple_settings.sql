-- Migration to create a simple plain-text settings table
CREATE TABLE IF NOT EXISTS app_settings (
    key_name TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read settings
CREATE POLICY "Allow authenticated read settings" ON app_settings
    FOR SELECT TO authenticated USING (true);