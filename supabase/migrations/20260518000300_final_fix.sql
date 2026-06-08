-- REPARO TOTAL DO BANCO DE DADOS (V4 - Final)
-- Este script resolve:
-- 1. Tabela profiles (coluna role e permissões)
-- 2. Tabela bitrix_schedules (evita erro 500)
-- 3. Tabela ticket_metrics
-- 4. Tabelas da Fila e Operadores (evita erro "Nenhum operador disponível")
-- 5. Erro 42P10 (ON CONFLICT corrigido para usar ID)

-- 1. Garantir tabela profiles e colunas
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir constraint UNIQUE no email se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- Adicionar colunas individualmente
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

-- 2. Bitrix e Métricas
CREATE TABLE IF NOT EXISTS public.bitrix_schedules (
    user_id TEXT PRIMARY KEY,
    user_name TEXT,
    schedule JSONB DEFAULT '{}'::jsonb,
    action TEXT DEFAULT 'pause',
    active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id TEXT,
    client TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Operadores e Fila
CREATE TABLE IF NOT EXISTS public.operadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    horario_trabalho TEXT DEFAULT '08:00 - 17:00',
    status TEXT DEFAULT 'Ativo',
    ausente_ate TIMESTAMP WITH TIME ZONE,
    ignorar_na_fila BOOLEAN DEFAULT false,
    posicao_fixa INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.filas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL UNIQUE,
    responsavel_passagem_turno_id UUID REFERENCES public.operadores(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fila_operadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fila_id UUID REFERENCES public.filas(id) ON DELETE CASCADE,
    operador_id UUID REFERENCES public.operadores(id) ON DELETE CASCADE,
    ordem INTEGER NOT NULL,
    ticket_info TEXT DEFAULT '',
    telefone_info TEXT DEFAULT '',
    atendimento_tipo TEXT DEFAULT 'Chamado',
    atendimento_hora TEXT DEFAULT '',
    atendimento_obs TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(fila_id, operador_id)
);

CREATE TABLE IF NOT EXISTS public.checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fila_operador_id UUID REFERENCES public.fila_operadores(id) ON DELETE CASCADE UNIQUE,
    vpn BOOLEAN DEFAULT false,
    ch_bitrix BOOLEAN DEFAULT false,
    ch_odoo BOOLEAN DEFAULT false,
    telefone BOOLEAN DEFAULT false,
    almoco BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.almocos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fila_operador_id UUID REFERENCES public.fila_operadores(id) ON DELETE CASCADE UNIQUE,
    horario TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir operador se vazio
INSERT INTO public.operadores (nome, status, ignorar_na_fila)
SELECT 'Operador Sistema 1', 'Ativo', false
WHERE NOT EXISTS (SELECT 1 FROM public.operadores LIMIT 1);

-- 4. RLS e Políticas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;

CREATE POLICY "Profiles read policy" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profiles update policy" ON public.profiles FOR UPDATE USING (
    auth.uid() = id 
    OR (auth.jwt() ->> 'email') IN ('admin@systemsat.com.br', 'rodolfo.quintanilha@systemsat.com.br')
);
CREATE POLICY "Profiles insert policy" ON public.profiles FOR INSERT WITH CHECK (true);

-- Outras tabelas
DO $$ 
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['operadores', 'filas', 'fila_operadores', 'checklists', 'almocos', 'bitrix_schedules', 'ticket_metrics'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow public access %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Allow public access %I" ON public.%I FOR ALL USING (true)', t, t);
    END LOOP;
END $$;

-- 5. Definir Admins (CORREÇÃO ON CONFLICT)
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email IN ('admin@systemsat.com.br', 'rodolfo.quintanilha@systemsat.com.br')
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 6. Trigger
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Reload PostgREST
NOTIFY pgrst, 'reload schema';