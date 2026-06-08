-- Migration to create escalas_por_data table and ensure queue system tables exist
-- This migration ensures the database has all necessary tables for the Queue and Schedule features.

-- 1. Table for Operators (Operadores)
CREATE TABLE IF NOT EXISTS operadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    horario_trabalho TEXT,
    status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Ausente')),
    ausente_ate TIMESTAMP WITH TIME ZONE,
    ignorar_na_fila BOOLEAN DEFAULT false,
    posicao_fixa INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table for Daily Queues (Filas)
CREATE TABLE IF NOT EXISTS filas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL UNIQUE,
    responsavel_passagem_turno_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table for Operators in a Queue (Fila Operadores)
CREATE TABLE IF NOT EXISTS fila_operadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fila_id UUID REFERENCES filas(id) ON DELETE CASCADE,
    operador_id UUID REFERENCES operadores(id) ON DELETE CASCADE,
    ordem INTEGER NOT NULL,
    ticket_info TEXT DEFAULT '',
    telefone_info TEXT DEFAULT '',
    atendimento_tipo TEXT DEFAULT 'Chamado' CHECK (atendimento_tipo IN ('Chamado', 'Telefone', 'Almoço', 'Ausente')),
    atendimento_hora TEXT DEFAULT '',
    atendimento_obs TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(fila_id, operador_id)
);

-- 4. Table for Checklists
CREATE TABLE IF NOT EXISTS checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fila_operador_id UUID REFERENCES fila_operadores(id) ON DELETE CASCADE UNIQUE,
    vpn BOOLEAN DEFAULT false,
    ch_bitrix BOOLEAN DEFAULT false,
    ch_odoo BOOLEAN DEFAULT false,
    telefone BOOLEAN DEFAULT false,
    almoco BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table for Lunch Times (Almoços)
CREATE TABLE IF NOT EXISTS almocos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fila_operador_id UUID REFERENCES fila_operadores(id) ON DELETE CASCADE UNIQUE,
    horario TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Table for Activities (Atividades)
CREATE TABLE IF NOT EXISTS atividades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operador_id UUID REFERENCES operadores(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('Chamado', 'Telefone', 'Almoço', 'Ausente')),
    horario TEXT,
    observacao TEXT,
    data DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Table for Schedules (Escalas por Data) - THE MISSING TABLE
CREATE TABLE IF NOT EXISTS escalas_por_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('terca', 'quarta', 'presencial')),
    nomes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(data, tipo)
);

-- Enable RLS for all tables
ALTER TABLE operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE filas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fila_operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE almocos ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalas_por_data ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allowing public access for a simple prototype/internal tool)
-- For a production app, you would restrict these to authenticated users or specific roles.

DO $$ 
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY['operadores', 'filas', 'fila_operadores', 'checklists', 'almocos', 'atividades', 'escalas_por_data'];
BEGIN
    FOREACH table_name IN ARRAY tables LOOP
        -- SELECT
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read' AND tablename = table_name) THEN
            EXECUTE format('CREATE POLICY "Allow public read" ON %I FOR SELECT USING (true)', table_name);
        END IF;
        
        -- INSERT
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert' AND tablename = table_name) THEN
            EXECUTE format('CREATE POLICY "Allow public insert" ON %I FOR INSERT WITH CHECK (true)', table_name);
        END IF;
        
        -- UPDATE
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public update' AND tablename = table_name) THEN
            EXECUTE format('CREATE POLICY "Allow public update" ON %I FOR UPDATE USING (true)', table_name);
        END IF;
        
        -- DELETE
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public delete' AND tablename = table_name) THEN
            EXECUTE format('CREATE POLICY "Allow public delete" ON %I FOR DELETE USING (true)', table_name);
        END IF;
    END LOOP;
END $$;