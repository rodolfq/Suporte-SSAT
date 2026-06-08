-- Add source_file and imported_at to support_data and odoo_tickets for better normalization and traceability
ALTER TABLE support_data ADD COLUMN IF NOT EXISTS source_file TEXT;
ALTER TABLE support_data ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE odoo_tickets ADD COLUMN IF NOT EXISTS source_file TEXT;
ALTER TABLE odoo_tickets ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index for performance on date filtering
CREATE INDEX IF NOT EXISTS idx_support_data_data ON support_data (data);
CREATE INDEX IF NOT EXISTS idx_odoo_tickets_created_at ON odoo_tickets (created_at);