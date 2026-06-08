-- Ensure source column exists in uploads table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uploads' AND column_name='source') THEN
        ALTER TABLE uploads ADD COLUMN source TEXT;
    END IF;
END $$;

-- Ensure columns exist in support_data table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_data' AND column_name='source') THEN
        ALTER TABLE support_data ADD COLUMN source TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_data' AND column_name='stage') THEN
        ALTER TABLE support_data ADD COLUMN stage TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_data' AND column_name='sla_deadline') THEN
        ALTER TABLE support_data ADD COLUMN sla_deadline TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Ensure odoo_tickets table exists
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

-- Enable RLS for odoo_tickets if not already enabled
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'odoo_tickets' AND rowsecurity = true) THEN
        ALTER TABLE odoo_tickets ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Re-create policies for odoo_tickets to ensure they exist
DROP POLICY IF EXISTS "Allow public read" ON odoo_tickets;
DROP POLICY IF EXISTS "Allow public insert" ON odoo_tickets;
DROP POLICY IF EXISTS "Allow public update" ON odoo_tickets;
DROP POLICY IF EXISTS "Allow public delete" ON odoo_tickets;

CREATE POLICY "Allow public read" ON odoo_tickets FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON odoo_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON odoo_tickets FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON odoo_tickets FOR DELETE USING (true);