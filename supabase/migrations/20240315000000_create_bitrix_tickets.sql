-- Create bitrix_tickets table
CREATE TABLE IF NOT EXISTS public.bitrix_tickets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    assignee TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    display_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    client TEXT,
    priority TEXT DEFAULT 'medium'
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.bitrix_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow read access to all authenticated users (or public if you prefer)
CREATE POLICY "Allow public read access" ON public.bitrix_tickets
    FOR SELECT USING (true);

-- Allow insert/update access to all authenticated users (or public if you prefer)
CREATE POLICY "Allow public insert access" ON public.bitrix_tickets
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON public.bitrix_tickets
    FOR UPDATE USING (true);

-- Create indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_bitrix_tickets_status ON public.bitrix_tickets(status);
CREATE INDEX IF NOT EXISTS idx_bitrix_tickets_assignee ON public.bitrix_tickets(assignee);
CREATE INDEX IF NOT EXISTS idx_bitrix_tickets_created_at ON public.bitrix_tickets(created_at DESC);