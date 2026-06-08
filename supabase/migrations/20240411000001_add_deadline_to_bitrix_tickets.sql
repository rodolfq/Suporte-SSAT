
-- Add deadline column to bitrix_tickets table
ALTER TABLE bitrix_tickets ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE;