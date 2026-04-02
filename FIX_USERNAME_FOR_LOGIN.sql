-- ============================================================================
-- FIX: Populate username field from email for test users
-- Run this SQL in Supabase SQL Editor to fix login issues
-- ============================================================================

-- For admin user
UPDATE public.users 
SET username = 'admin'
WHERE email = 'admin@abifresh.com' AND username IS NULL;

-- For sales user
UPDATE public.users 
SET username = 'sales'
WHERE email = 'sales@abifresh.com' AND username IS NULL;

-- For all other users, auto-generate from email if not already set
UPDATE public.users 
SET username = LOWER(SPLIT_PART(email, '@', 1))
WHERE username IS NULL AND email IS NOT NULL;

-- Verify the changes
SELECT id, email, username, full_name, role FROM public.users ORDER BY created_at DESC;

-- Test query to see if 'sales' user can be found
SELECT * FROM public.users WHERE username ILIKE 'sales';
