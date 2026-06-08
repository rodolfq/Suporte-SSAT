-- Add mensagens column to support_data table
ALTER TABLE support_data ADD COLUMN IF NOT EXISTS mensagens INTEGER DEFAULT 0;