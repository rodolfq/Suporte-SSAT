-- Migration to fix profiles table and ensure all required columns exist
-- This migration also sets up the trigger to sync auth users with profiles

-- 1. Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    permissions JSONB DEFAULT '{}'::jsonb,
    dashboard_layout JSONB,
    queue_layout JSONB,
    settings_layout JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Ensure columns exist if the table was created without them
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dashboard_layout JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS queue_layout JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS settings_layout JSONB;

-- 3. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
DO $$ 
BEGIN
    -- Policy: Users can view their own profile
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
    END IF;

    -- Policy: Admins can view all profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all profiles' AND tablename = 'profiles') THEN
        CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@systemsat.com.br'
        );
    END IF;

    -- Policy: Users can update their own profile
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;

    -- Policy: Admins can update/insert/delete any profile
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all' AND tablename = 'profiles') THEN
        CREATE POLICY "Admins can update all" ON public.profiles FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@systemsat.com.br'
        );
    END IF;

    -- Policy: Allow public insert during signup if needed (or through trigger)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable insert for service role and trigger' AND tablename = 'profiles') THEN
        CREATE POLICY "Enable insert for service role and trigger" ON public.profiles FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- 5. Trigger for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id, 
    new.email, 
    CASE 
      WHEN new.email = 'admin@systemsat.com.br' THEN 'admin'
      ELSE 'user'
    END
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Pre-populate profiles for existing auth users if they don't have one
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 
  CASE 
    WHEN email = 'admin@systemsat.com.br' THEN 'admin'
    ELSE 'user'
  END
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 7. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';