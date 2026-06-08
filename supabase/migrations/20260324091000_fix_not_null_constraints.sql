-- Fix not-null constraints for support_data table
-- This is a repeat of a previous migration to ensure it runs and drops the constraints
-- that are causing upload failures.

ALTER TABLE support_data ALTER COLUMN tempo_resposta DROP NOT NULL;
ALTER TABLE support_data ALTER COLUMN duracao DROP NOT NULL;
ALTER TABLE support_data ALTER COLUMN avaliacao DROP NOT NULL;

-- Force a schema refresh by adding and dropping a dummy column
ALTER TABLE support_data ADD COLUMN IF NOT EXISTS _refresh_cache_3 BOOLEAN;
ALTER TABLE support_data DROP COLUMN IF EXISTS _refresh_cache_3;