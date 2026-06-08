-- FORCE PERMISSIONS AND POPULATE OPERATORS (Timestamp: 20290518115500)

-- 1. Granting everything to everyone (last resort for internal dash)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role, anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role, anon, authenticated;

-- 2. Ensure bitrix_schedules exists and is accessible
CREATE TABLE IF NOT EXISTS public.bitrix_schedules (
    user_id TEXT PRIMARY KEY,
    user_name TEXT,
    schedule JSONB DEFAULT '{}'::jsonb,
    action TEXT DEFAULT 'pause',
    active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.bitrix_schedules OWNER TO postgres;
GRANT ALL ON public.bitrix_schedules TO service_role, anon, authenticated;
ALTER TABLE public.bitrix_schedules DISABLE ROW LEVEL SECURITY;

-- 3. Repopulate Operadores
TRUNCATE public.operadores RESTART IDENTITY CASCADE;
INSERT INTO public.operadores (nome, status, ignorar_na_fila) VALUES
('Rodolfo', 'Ativo', false),
('Mauro', 'Ativo', false),
('Ana Julia', 'Ativo', false),
('Davidson', 'Ativo', false),
('Thiago', 'Ativo', false),
('Rafael', 'Ativo', false),
('Bianca', 'Ativo', false),
('Pablo', 'Ativo', false);

-- 4. Ensure escalas_por_data is accessible
CREATE TABLE IF NOT EXISTS public.escalas_por_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    tipo TEXT NOT NULL,
    nomes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(data, tipo)
);
ALTER TABLE public.escalas_por_data DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.escalas_por_data TO service_role, anon, authenticated;

-- 5. Force schema reload
NOTIFY pgrst, 'reload schema';