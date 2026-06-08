-- Aggressive schema refresh for PostgREST
-- Rename and rename back to force a cache reload

DO $$ 
BEGIN 
    -- For uploads table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uploads' AND column_name='source') THEN
        ALTER TABLE uploads RENAME COLUMN source TO source_temp;
        ALTER TABLE uploads RENAME COLUMN source_temp TO source;
    ELSE
        ALTER TABLE uploads ADD COLUMN source TEXT DEFAULT 'chat';
    END IF;

    -- For support_data table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_data' AND column_name='source') THEN
        ALTER TABLE support_data RENAME COLUMN source TO source_temp;
        ALTER TABLE support_data RENAME COLUMN source_temp TO source;
    ELSE
        ALTER TABLE support_data ADD COLUMN source TEXT DEFAULT 'chat';
    END IF;
END $$;

-- Add a dummy function and drop it to trigger a reload if the above didn't
CREATE OR REPLACE FUNCTION public.pgrst_watch_dog() RETURNS void AS $$ BEGIN END; $$ LANGUAGE plpgsql;
DROP FUNCTION public.pgrst_watch_dog();