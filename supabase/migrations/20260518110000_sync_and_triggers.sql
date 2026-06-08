-- SINCRONIZAÇÃO AVANÇADA DE ANALISTAS (Timestamp: 20260518110000)
-- Objetivo: Garantir que todos os analistas das planilhas e usuários do sistema apareçam na Fila de Atendimento

-- 1. Garantir Unicidade para evitar duplicidade de nomes
ALTER TABLE public.operadores DROP CONSTRAINT IF EXISTS unique_operator_name;
ALTER TABLE public.operadores ADD CONSTRAINT unique_operator_name UNIQUE (nome);

-- 2. Sincronização Inicial de Colaboradores (votos das planilhas)
-- Isso recupera todos os nomes que já foram importados nas planilhas de suporte
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_data') THEN
        INSERT INTO public.operadores (nome, status, ignorar_na_fila)
        SELECT DISTINCT colaborador, 'Ativo', false
        FROM public.support_data
        WHERE colaborador IS NOT NULL 
          AND colaborador != '' 
          AND colaborador != 'Não Identificado'
        ON CONFLICT (nome) DO NOTHING;
    END IF;
END $$;

-- 3. Sincronização Inicial de Perfil (Usuários registrados)
-- Pessoas que já logaram mas talvez não estejam nas planilhas ainda
INSERT INTO public.operadores (nome, status, ignorar_na_fila)
SELECT email, 'Ativo', false
FROM public.profiles
WHERE email NOT IN (SELECT nome FROM public.operadores)
ON CONFLICT (nome) DO NOTHING;

-- 4. Função Automática de Sincronização (Trigger)
-- Garante que futuras importações de planilhas alimentem automaticamente a lista de operadores
CREATE OR REPLACE FUNCTION public.sync_colaborador_to_operador_fn()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.colaborador IS NOT NULL AND NEW.colaborador != '' AND NEW.colaborador != 'Não Identificado' THEN
        INSERT INTO public.operadores (nome, status, ignorar_na_fila)
        VALUES (NEW.colaborador, 'Ativo', false)
        ON CONFLICT (nome) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Aplicar o Trigger na tabela support_data
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_data') THEN
        DROP TRIGGER IF EXISTS trg_sync_support_colaborador ON public.support_data;
        CREATE TRIGGER trg_sync_support_colaborador
        AFTER INSERT ON public.support_data
        FOR EACH ROW
        EXECUTE FUNCTION public.sync_colaborador_to_operador_fn();
    END IF;
END $$;

-- 6. Reparar permissões de RLS para garantir que a fila possa ser gerada
-- (Reforço do script anterior para as tabelas específicas que o QueueContext usa)
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

-- 7. Log de sucesso
COMMENT ON TABLE public.operadores IS 'Lista de operadores sincronizada automaticamente com a base de colaboradores';

NOTIFY pgrst, 'reload schema';