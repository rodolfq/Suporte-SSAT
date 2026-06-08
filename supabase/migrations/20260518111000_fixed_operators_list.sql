-- CORREÇÃO: LISTA FIXA DE COLABORADORES (Timestamp: 20260518111000)

-- 1. Remover trigger de sincronização automática (não queremos mais analistas extras)
DROP TRIGGER IF EXISTS trg_sync_support_colaborador ON public.support_data;
DROP FUNCTION IF EXISTS public.sync_colaborador_to_operador_fn();

-- 2. Limpar operadores atuais para garantir apenas a lista fixa
-- O CASCADE garante que se houver registros em fila_operadores, eles sejam limpos para consistência
TRUNCATE public.operadores RESTART IDENTITY CASCADE;

-- 3. Inserir lista fixa de colaboradores solicitada
INSERT INTO public.operadores (nome, status, ignorar_na_fila) VALUES
('Rodolfo', 'Ativo', false),
('Mauro', 'Ativo', false),
('Ana Julia', 'Ativo', false),
('Davidson', 'Ativo', false),
('Thiago', 'Ativo', false),
('Rafael', 'Ativo', false),
('Bianca', 'Ativo', false),
('Pablo', 'Ativo', false);

-- 4. Re-garantir permissões de RLS
DO $$ 
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['operadores', 'filas', 'fila_operadores', 'checklists', 'almocos', 'atividades'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Public access %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Public access %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';