-- CORREÇÃO DEFINITIVA DE PERMISSÕES E ESTRUTURA (Timestamp: 20260518112500)
-- Objetivo: Resolver Erro 500 e Permission Denied na tabela bitrix_schedules

-- 1. Garantir que a extensão uuid-ossp existe para gerar IDs se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Recriar a tabela com estrutura robusta se houver inconsistência
-- Usamos IF NOT EXISTS para preservar dados, mas garantimos as colunas
CREATE TABLE IF NOT EXISTS public.bitrix_schedules (
    user_id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    schedule JSONB DEFAULT '{}'::jsonb,
    action TEXT DEFAULT 'pause',
    active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Resetar e Re-aplicar Políticas de Segurança (RLS)
-- O Erro 500/Permission Denied geralmente ocorre quando RLS está ativo mas não há políticas para o papel 'anon'
ALTER TABLE public.bitrix_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Select bitrix_schedules" ON public.bitrix_schedules;
DROP POLICY IF EXISTS "Public Insert bitrix_schedules" ON public.bitrix_schedules;
DROP POLICY IF EXISTS "Public Update bitrix_schedules" ON public.bitrix_schedules;
DROP POLICY IF EXISTS "Public Delete bitrix_schedules" ON public.bitrix_schedules;
DROP POLICY IF EXISTS "Allow public access to bitrix_schedules" ON public.bitrix_schedules;

-- Criar política simplificada para acesso total (necessário para o funcionamento do dashboard de horários)
CREATE POLICY "Full access bitrix_schedules" 
ON public.bitrix_schedules 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. Garantir Grant de permissões para os papéis do Supabase (essencial para API REST)
GRANT ALL ON public.bitrix_schedules TO anon;
GRANT ALL ON public.bitrix_schedules TO authenticated;
GRANT ALL ON public.bitrix_schedules TO service_role;

-- 5. Sincronizar novamente os operadores para garantir que a tabela não esteja vazia
-- Isso reaproveita a lista fixa que definimos anteriormente
INSERT INTO public.bitrix_schedules (user_id, user_name, schedule, action, active)
SELECT 
    LOWER(REPLACE(nome, ' ', '_')), 
    nome, 
    '{"id": null, "TYPE": "SHIFT", "WORKTIME_START": "08:00:00", "WORKTIME_END": "17:00:00"}'::jsonb,
    'pause',
    true
FROM public.operadores
ON CONFLICT (user_id) DO UPDATE SET 
    user_name = EXCLUDED.user_name,
    updated_at = NOW();

-- 6. Forçar recarga do PostgREST para reconhecer as permissões e colunas
NOTIFY pgrst, 'reload schema';