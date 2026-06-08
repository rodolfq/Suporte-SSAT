-- Add exclusion and client columns to support_data table
ALTER TABLE public.support_data ADD COLUMN IF NOT EXISTS is_excluded BOOLEAN DEFAULT false;
ALTER TABLE public.support_data ADD COLUMN IF NOT EXISTS exclusion_reason TEXT;
ALTER TABLE public.support_data ADD COLUMN IF NOT EXISTS cliente TEXT;

-- Add client columns to other tables if missing
ALTER TABLE public.bitrix_tickets ADD COLUMN IF NOT EXISTS client TEXT DEFAULT 'N/A';
ALTER TABLE public.odoo_tickets ADD COLUMN IF NOT EXISTS client TEXT DEFAULT 'N/A';
ALTER TABLE public.ticket_metrics ADD COLUMN IF NOT EXISTS client TEXT;

-- Force schema cache refresh by touching the table
COMMENT ON TABLE public.support_data IS 'Support data records with exclusion support';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';