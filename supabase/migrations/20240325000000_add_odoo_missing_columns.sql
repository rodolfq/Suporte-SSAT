-- Add missing columns to odoo_tickets table
ALTER TABLE odoo_tickets ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE odoo_tickets ADD COLUMN IF NOT EXISTS source_file TEXT;