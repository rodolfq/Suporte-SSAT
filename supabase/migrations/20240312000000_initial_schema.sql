-- Initial Schema for Performance Suporte

-- Table to track spreadsheet uploads
CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    row_count INTEGER DEFAULT 0
);

-- Table for raw support data
CREATE TABLE IF NOT EXISTS support_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
    colaborador TEXT NOT NULL,
    cliente TEXT NOT NULL,
    tempo_resposta FLOAT NOT NULL,
    duracao FLOAT NOT NULL,
    avaliacao FLOAT NOT NULL,
    atendimentos INTEGER NOT NULL,
    data TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table for collaborator specific settings (like avatars)
CREATE TABLE IF NOT EXISTS collaborator_settings (
    name TEXT PRIMARY KEY,
    avatar_url TEXT
);

-- Enable Row Level Security (RLS)
-- For this prototype, we'll allow public access if no auth is configured, 
-- but in production you should restrict this.
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborator_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON uploads FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON uploads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete" ON uploads FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON support_data FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON support_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete" ON support_data FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON collaborator_settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON collaborator_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON collaborator_settings FOR UPDATE USING (true);