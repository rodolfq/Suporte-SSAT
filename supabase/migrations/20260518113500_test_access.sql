-- TESTE DE ACESSO (Timestamp: 20260518113500)
CREATE TABLE IF NOT EXISTS public.test_schedules (
    id SERIAL PRIMARY KEY,
    name TEXT
);
ALTER TABLE public.test_schedules DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.test_schedules TO anon, authenticated, service_role;
INSERT INTO public.test_schedules (name) VALUES ('Test 1');