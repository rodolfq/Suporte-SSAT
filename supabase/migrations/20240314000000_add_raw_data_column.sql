-- Add raw_data column to support_data to store original spreadsheet row
ALTER TABLE support_data ADD COLUMN IF NOT EXISTS raw_data JSONB;