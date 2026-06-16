-- Migration to backfill exclusion rules for existing data
-- Rule: Exclude records with less than 3 messages

UPDATE public.support_data 
SET is_excluded = true,
    exclusion_reason = 'Menos de 3 mensagens'
WHERE mensagens < 3 
  AND mensagens IS NOT NULL
  AND is_excluded = false;

-- Also mark records with invalid collaborator names
UPDATE public.support_data 
SET is_excluded = true,
    exclusion_reason = CASE 
      WHEN LENGTH(TRIM(colaborador)) < 3 THEN 'Colaborador inválido'
      WHEN LOWER(TRIM(colaborador)) IN ('undefined', 'null', 'invalido', 'inválido') THEN 'Colaborador inválido'
      WHEN LOWER(TRIM(colaborador)) LIKE '%total%' OR LOWER(TRIM(colaborador)) LIKE '%média%' OR LOWER(TRIM(colaborador)) LIKE '%media%' THEN 'Nome reservado'
      ELSE exclusion_reason
    END
WHERE is_excluded = false
  AND (
    LENGTH(TRIM(colaborador)) < 3
    OR LOWER(TRIM(colaborador)) IN ('undefined', 'null', 'invalido', 'inválido')
    OR LOWER(TRIM(colaborador)) LIKE '%total%'
    OR LOWER(TRIM(colaborador)) LIKE '%média%'
    OR LOWER(TRIM(colaborador)) LIKE '%media%'
  )
  AND mensagens >= 3;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';