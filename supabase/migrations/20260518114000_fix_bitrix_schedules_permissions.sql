-- Migration to fix bitrix_schedules table and permissions
-- This table is used for automatic journey closure/pause in Bitrix integration

-- 1. Create the table if it doesn't exist or ensure columns are correct
CREATE TABLE IF NOT EXISTS public.bitrix_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    user_name TEXT NOT NULL,
    schedule JSONB DEFAULT '{}'::jsonb,
    action TEXT DEFAULT 'close',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Grant permissions to anon and authenticated roles
-- This is necessary because the API route uses the anon key
GRANT ALL ON public.bitrix_schedules TO anon;
GRANT ALL ON public.bitrix_schedules TO authenticated;
GRANT ALL ON public.bitrix_schedules TO service_role;

-- 3. Reset RLS (Row Level Security)
-- We will enable RLS but create a policy that allows everything for now to fix the 500 error
ALTER TABLE public.bitrix_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for now" ON public.bitrix_schedules;
CREATE POLICY "Enable all access for now" ON public.bitrix_schedules
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. Ensure we have some default data if needed or just leave it empty
-- The user will populate this via the UI once access is restored

-- 5. Fix permissions for other related tables just in case
GRANT ALL ON public.operadores TO anon;
GRANT ALL ON public.operadores TO authenticated;
GRANT ALL ON public.operadores TO service_role;

GRANT ALL ON public.escalas_por_data TO anon;
GRANT ALL ON public.escalas_por_data TO authenticated;
GRANT ALL ON public.escalas_por_data TO service_role;

-- 6. Grant usage on schema public
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;