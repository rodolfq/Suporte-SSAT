-- Add avatar_options column to collaborator_settings
ALTER TABLE collaborator_settings ADD COLUMN IF NOT EXISTS avatar_options JSONB;