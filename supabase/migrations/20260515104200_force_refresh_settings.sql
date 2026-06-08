-- Force schema cache refresh for app_settings
DO $$ 
BEGIN 
    EXECUTE 'COMMENT ON TABLE app_settings IS ' || quote_literal('Tabela de configurações simples (Atualizada em ' || NOW() || ')');
END $$;

-- Garantir que a tabela existe (reduntante mas ajuda no trigger de cache)
CREATE TABLE IF NOT EXISTS app_settings (
    key_name TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notificar recarga (se suportado pelo ambiente)
NOTIFY pgrst, 'reload schema';