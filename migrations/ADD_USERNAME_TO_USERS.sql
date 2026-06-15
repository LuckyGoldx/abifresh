-- ============================================================================
-- MIGRATION: Add username column to users table (if it doesn't exist)
-- Run this in Supabase SQL Editor if your users table is missing the username column
-- ============================================================================

-- Add username column if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;

-- Update role CHECK constraint to include all supported roles
-- Drop the old constraint and add a new one
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'sales', 'sales_staff', 'staff_commission', 'commission_staff', 'staff_non_commission', 'non_commission_staff'));

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- If you want, you can populate existing usernames from emails
-- This generates usernames from the email address (everything before @)
UPDATE public.users 
SET username = LOWER(SPLIT_PART(email, '@', 1)) 
WHERE username IS NULL AND email IS NOT NULL;

NOTIFY pgrst, 'reload schema';
