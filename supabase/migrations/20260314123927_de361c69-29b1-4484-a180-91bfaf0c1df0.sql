
-- Make user_id nullable for public (unauthenticated) submissions
ALTER TABLE public.quote_requests ALTER COLUMN user_id DROP NOT NULL;

-- Add contact fields for public submissions
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS contact_company text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text;
