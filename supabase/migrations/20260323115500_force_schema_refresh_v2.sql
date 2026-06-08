-- Another attempt to force a schema cache reload
-- This migration performs a more significant DDL change to ensure PostgREST notices it

-- 1. Add a temporary dummy column
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS _schema_refresh_dummy TEXT;

-- 2. Drop the temporary dummy column
ALTER TABLE uploads DROP COLUMN IF EXISTS _schema_refresh_dummy;

-- 3. Ensure the source column is definitely there and has a comment
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uploads' AND column_name='source') THEN
        ALTER TABLE uploads ADD COLUMN source TEXT;
    END IF;
END $$;

COMMENT ON TABLE uploads IS 'Table for tracking data uploads from various sources (chat, odoo, bitrix)';
COMMENT ON COLUMN uploads.source IS 'The origin of the data (e.g., odoo, chat)';

-- 4. Do the same for support_data just in case
ALTER TABLE support_data ADD COLUMN IF NOT EXISTS _schema_refresh_dummy TEXT;
ALTER TABLE support_data DROP COLUMN IF EXISTS _schema_refresh_dummy;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_data' AND column_name='source') THEN
        ALTER TABLE support_data ADD COLUMN source TEXT;
    END IF;
END $$;

COMMENT ON TABLE support_data IS 'Detailed support ticket data';