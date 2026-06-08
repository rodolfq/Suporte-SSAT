-- Ensure bitrix_tickets table has all required columns
DO $$ 
BEGIN
    -- Add assignee_avatar if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bitrix_tickets' AND column_name='assignee_avatar') THEN
        ALTER TABLE public.bitrix_tickets ADD COLUMN assignee_avatar TEXT;
    END IF;

    -- Add display_status if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bitrix_tickets' AND column_name='display_status') THEN
        ALTER TABLE public.bitrix_tickets ADD COLUMN display_status TEXT;
    END IF;

    -- Add client if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bitrix_tickets' AND column_name='client') THEN
        ALTER TABLE public.bitrix_tickets ADD COLUMN client TEXT;
    END IF;

    -- Add priority if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bitrix_tickets' AND column_name='priority') THEN
        ALTER TABLE public.bitrix_tickets ADD COLUMN priority TEXT DEFAULT 'medium';
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bitrix_tickets' AND column_name='updated_at') THEN
        ALTER TABLE public.bitrix_tickets ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';