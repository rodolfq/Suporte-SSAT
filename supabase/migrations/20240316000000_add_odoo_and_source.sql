-- Add source column to uploads table
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS source TEXT;

-- Add source, stage, and sla_deadline columns to support_data table
ALTER TABLE support_data ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE support_data ADD COLUMN IF NOT EXISTS stage TEXT;
ALTER TABLE support_data ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP WITH TIME ZONE;

-- Create odoo_tickets table if it doesn't exist
CREATE TABLE IF NOT EXISTS odoo_tickets (
    id TEXT PRIMARY KEY,
    priority TEXT,
    subject TEXT,
    team TEXT,
    assignee TEXT,
    client TEXT,
    sla_deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    last_updated TIMESTAMP WITH TIME ZONE,
    properties JSONB,
    stage TEXT,
    upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE
);

-- Enable RLS for odoo_tickets
ALTER TABLE odoo_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies for odoo_tickets
CREATE POLICY "Allow public read" ON odoo_tickets FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON odoo_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON odoo_tickets FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON odoo_tickets FOR DELETE USING (true);