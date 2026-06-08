-- Comprehensive migration to fix missing tables and columns

-- 1. Ensure profiles table and role column
-- Use separate statements to ensure column existence before policy creation
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns individually if they are missing
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user';
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'active';
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.profiles ADD COLUMN permissions JSONB DEFAULT '{}'::jsonb;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.profiles ADD COLUMN dashboard_layout JSONB;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.profiles ADD COLUMN queue_layout JSONB;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.profiles ADD COLUMN settings_layout JSONB;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
END $$;

-- 2. Ensure bitrix_schedules table exists
CREATE TABLE IF NOT EXISTS public.bitrix_schedules (
    user_id TEXT PRIMARY KEY,
    user_name TEXT,
    schedule JSONB DEFAULT '{}'::jsonb,
    action TEXT DEFAULT 'pause',
    active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS and Create Policies for bitrix_schedules
ALTER TABLE public.bitrix_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access to bitrix_schedules" ON public.bitrix_schedules;
CREATE POLICY "Allow public access to bitrix_schedules" ON public.bitrix_schedules FOR ALL USING (true);

-- 4. Re-configure Policies for profiles (safely)
-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for service role and trigger" ON public.profiles;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Dynamic check for admin role or specific emails
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
    role = 'admin' 
    OR auth.jwt() ->> 'email' IN ('admin@systemsat.com.br', 'rodolfo.quintanilha@systemsat.com.br')
);

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all" ON public.profiles FOR ALL USING (
    role = 'admin'
    OR auth.jwt() ->> 'email' IN ('admin@systemsat.com.br', 'rodolfo.quintanilha@systemsat.com.br')
);

CREATE POLICY "Enable insert for service role and trigger" ON public.profiles FOR INSERT WITH CHECK (true);

-- 5. Set Rodolfo as admin in profiles if they exist
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'rodolfo.quintanilha@systemsat.com.br'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 6. Trigger for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id, 
    new.email, 
    CASE 
      WHEN new.email IN ('admin@systemsat.com.br', 'rodolfo.quintanilha@systemsat.com.br') THEN 'admin'
      ELSE 'user'
    END
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Ensure ticket_metrics table exists (if missing)
CREATE TABLE IF NOT EXISTS public.ticket_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id TEXT,
    client TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for ticket_metrics
ALTER TABLE public.ticket_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access to ticket_metrics" ON public.ticket_metrics;
CREATE POLICY "Allow public access to ticket_metrics" ON public.ticket_metrics FOR ALL USING (true);

-- 8. Ensure operators exist to avoid "Nenhum operador disponível" error
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.operadores LIMIT 1) THEN
        INSERT INTO public.operadores (nome, horario_trabalho, status)
        VALUES 
            ('Operador 1', '08:00 - 17:00', 'Ativo'),
            ('Operador 2', '08:00 - 17:00', 'Ativo');
    END IF;
END $$;

-- 9. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';