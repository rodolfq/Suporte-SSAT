-- Allow null values for tempo_resposta and duracao in support_data table
-- This prevents errors when spreadsheet data is missing these values

ALTER TABLE support_data ALTER COLUMN tempo_resposta DROP NOT NULL;
ALTER TABLE support_data ALTER COLUMN duracao DROP NOT NULL;

-- Also ensure avaliacao can be null if needed, though it currently defaults to 0 in code
ALTER TABLE support_data ALTER COLUMN avaliacao DROP NOT NULL;