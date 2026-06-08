-- REPARO DEFINITIVO (Timestamp: 20260518012000)
-- 1. Tabelas Base (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Colunas extras para perfis
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
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
END $$;

-- 2. Tabela bitrix_schedules (Causa do Erro 500 no /api/bitrix/schedules)
CREATE TABLE IF NOT EXISTS public.bitrix_schedules (
    user_id TEXT PRIMARY KEY,
    user_name TEXT,
    schedule JSONB DEFAULT '{}'::jsonb,
    action TEXT DEFAULT 'pause',
    active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela ticket_metrics
CREATE TABLE IF NOT EXISTS public.ticket_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id TEXT,
    client TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabelas de Fila e Operadores
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

CREATE TABLE IF NOT EXISTS public.atividades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operador_id UUID REFERENCES public.operadores(id) ON DELETE CASCADE,
    tipo TEXT,
    horario TEXT,
    observacao TEXT,
    data DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.escalas_por_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    tipo TEXT NOT NULL,
    nomes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(data, tipo)
);

-- Tabelas para Segredos e Configurações (Secrets System)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key_name TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_secrets (
    key_name TEXT PRIMARY KEY,
    encrypted_value TEXT NOT NULL,
    iv TEXT NOT NULL,
    tag TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Inserir Operador de Sistema para evitar erro de Fila Vazia
INSERT INTO public.operadores (nome, status)
SELECT 'Suporte Sistema', 'Ativo'
WHERE NOT EXISTS (SELECT 1 FROM public.operadores LIMIT 1);

-- 6. Configurar RLS Totalmente Permissivo para este Dash Interno
DO $$ 
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['profiles', 'bitrix_schedules', 'ticket_metrics', 'operadores', 'filas', 'fila_operadores', 'checklists', 'almocos', 'atividades', 'escalas_por_data', 'app_settings', 'app_secrets'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Public access %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow public access %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow public read" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow public insert" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow public update" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow public delete" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Public access %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
    END LOOP;
END $$;

-- 7. Definir Administrador sem usar ON CONFLICT problemático
DO $$
BEGIN
    -- Garantir Unique no email para o profiles se possível
    BEGIN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
    EXCEPTION WHEN others THEN NULL;
    END;

    -- Upsert manual para rodolfo
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'rodolfo.quintanilha@systemsat.com.br') THEN
        INSERT INTO public.profiles (id, email, role)
        SELECT id, email, 'admin' FROM auth.users WHERE email = 'rodolfo.quintanilha@systemsat.com.br'
        ON CONFLICT (id) DO UPDATE SET role = 'admin';
    END IF;
    
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@systemsat.com.br') THEN
        INSERT INTO public.profiles (id, email, role)
        SELECT id, email, 'admin' FROM auth.users WHERE email = 'admin@systemsat.com.br'
        ON CONFLICT (id) DO UPDATE SET role = 'admin';
    END IF;
END $$;

-- 8. Limpeza de erros anteriores: Se houver políticas corrompidas ou com nomes antigos
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;

-- 9. Reload cache
NOTIFY pgrst, 'reload schema';