-- Aggressive schema cache refresh
-- This migration performs a minor DDL change on the affected tables to trigger PostgREST cache invalidation

DO $$ 
BEGIN 
    -- Touch odoo_tickets
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='odoo_tickets') THEN
        COMMENT ON TABLE odoo_tickets IS 'Odoo tickets synchronization table (Refreshed at ' || NOW() || ')';
        
        -- Ensure columns exist just in case the previous migration failed silently
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='odoo_tickets' AND column_name='source_file') THEN
            ALTER TABLE odoo_tickets ADD COLUMN source_file TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='odoo_tickets' AND column_name='imported_at') THEN
            ALTER TABLE odoo_tickets ADD COLUMN imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;

    -- Touch support_data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='support_data') THEN
        COMMENT ON TABLE support_data IS 'Support data records (Refreshed at ' || NOW() || ')';
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_data' AND column_name='source_file') THEN
            ALTER TABLE support_data ADD COLUMN source_file TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_data' AND column_name='imported_at') THEN
            ALTER TABLE support_data ADD COLUMN imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Explicitly notify PostgREST to reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';