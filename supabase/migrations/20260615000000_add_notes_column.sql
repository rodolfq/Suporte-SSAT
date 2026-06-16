-- Add notes column to support_data for annotation feature
ALTER TABLE public.support_data ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.support_data ADD COLUMN IF NOT EXISTS duracao_segundos INTEGER;
ALTER TABLE public.support_data ADD COLUMN IF NOT EXISTS tempo_resposta_segundos INTEGER;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';