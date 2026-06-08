-- FORÇAR PERMISSÕES TOTAIS (Timestamp: 20260518113000)
-- Este script força a liberação do bitrix_schedules

-- 1. Garantir que a tabela existe
CREATE TABLE IF NOT EXISTS public.bitrix_schedules (
    user_id TEXT PRIMARY KEY,
    user_name TEXT,
    schedule JSONB DEFAULT '{}'::jsonb,
    action TEXT DEFAULT 'pause',
    active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Desabilitar RLS temporariamente para garantir que não é o RLS bloqueando por falta de política
ALTER TABLE public.bitrix_schedules DISABLE ROW LEVEL SECURITY;

-- 3. Garantir Grant Literal
GRANT ALL ON public.bitrix_schedules TO anon, authenticated, service_role;

-- 4. Re-habilitar RLS com Política Ultra-Permissiva
ALTER TABLE public.bitrix_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access bitrix_schedules" ON public.bitrix_schedules;
CREATE POLICY "Public access bitrix_schedules" ON public.bitrix_schedules FOR ALL USING (true) WITH CHECK (true);

-- 5. Forçar Reload do PostgREST
COMMENT ON TABLE public.bitrix_schedules IS 'Tabela de horários do Bitrix - Forçado em 2026-05-18';
NOTIFY pgrst, 'reload schema';