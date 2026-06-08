-- Definitive fix for bitrix_schedules and other permissions
-- This migration drops and recreates the table to ensure ownership and permissions are clean

-- 1. Drop existing table if it exists
DROP TABLE IF EXISTS public.bitrix_schedules CASCADE;

-- 2. Recreate with correct structure
CREATE TABLE public.bitrix_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    user_name TEXT NOT NULL,
    schedule JSONB DEFAULT '{}'::jsonb,
    action TEXT DEFAULT 'close',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Grant absolute permissions to everyone
GRANT ALL ON TABLE public.bitrix_schedules TO postgres, anon, authenticated, service_role;

-- 4. Enable RLS and set a permissive policy
ALTER TABLE public.bitrix_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access" ON public.bitrix_schedules;
CREATE POLICY "Public access" ON public.bitrix_schedules 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- 5. Fix permissions for other tables to ensure full visibility
GRANT ALL ON TABLE public.operadores TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.escalas_por_data TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.uploads TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.support_data TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.atividades TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.filas TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.fila_operadores TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.checklists TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.almocos TO postgres, anon, authenticated, service_role;

-- 6. Ensure usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;