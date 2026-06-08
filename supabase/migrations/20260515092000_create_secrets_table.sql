-- Migration to create app_secrets table for secure storage of system keys (Bitrix Webhook, etc.)
CREATE TABLE IF NOT EXISTS app_secrets (
    key_name TEXT PRIMARY KEY,
    encrypted_value TEXT NOT NULL,
    iv TEXT NOT NULL,
    tag TEXT NOT NULL,
    updated_by TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;

-- Note: No public policies for app_secrets. 
-- Access is managed strictly via service_role in secrets-server.ts
-- or by authorized admins if specific policies are added later.