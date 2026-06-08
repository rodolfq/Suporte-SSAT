-- Migration to ensure base operators exist and fix potential RLS issues
-- This prevents the "Nenhum operador disponível" error if the table is empty.

-- 1. Ensure RLS is configured to allow reading by all authenticated users
-- (Previous migration used 'Allow public read' but maybe 'authenticated' is safer/different)
DO $$ 
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY['operadores', 'filas', 'fila_operadores', 'checklists', 'almocos', 'atividades', 'escalas_por_data'];
BEGIN
    FOREACH table_name IN ARRAY tables LOOP
        -- Ensure public access is truly available as intended by previous migrations
        EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', table_name);
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = table_name) THEN
            EXECUTE format('CREATE POLICY "Allow public access" ON %I FOR ALL USING (true)', table_name);
        END IF;
    END LOOP;
END $$;

-- 2. Insert default operators if table is empty
INSERT INTO public.operadores (nome, horario_trabalho, status)
SELECT 'Operador 1', '08:00 - 17:00', 'Ativo'
WHERE NOT EXISTS (SELECT 1 FROM public.operadores LIMIT 1);

INSERT INTO public.operadores (nome, horario_trabalho, status)
SELECT 'Operador 2', '08:00 - 17:00', 'Ativo'
WHERE NOT EXISTS (SELECT 1 FROM public.operadores WHERE nome = 'Operador 2') 
  AND (SELECT count(*) FROM public.operadores) < 2;

-- 3. Notify PostgREST
NOTIFY pgrst, 'reload schema';