-- Force a schema cache reload by performing a DDL change
-- This migration ensures the 'source' column exists and attempts to trigger a PostgREST cache refresh

DO $$ 
BEGIN 
    -- Check uploads table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uploads' AND column_name='source') THEN
        ALTER TABLE uploads ADD COLUMN source TEXT;
    ELSE
        -- If it exists, just "touch" it to trigger schema change detection
        COMMENT ON COLUMN uploads.source IS 'Source of the upload (chat, odoo, or bitrix)';
    END IF;

    -- Check support_data table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_data' AND column_name='source') THEN
        ALTER TABLE support_data ADD COLUMN source TEXT;
    ELSE
        COMMENT ON COLUMN support_data.source IS 'Source of the support record';
    END IF;
END $$;

-- Ensure PostgREST reloads the schema if the NOTIFY command is supported/enabled
-- This is a common way to force a refresh in many Supabase-like setups
NOTIFY pgrst, 'reload schema';