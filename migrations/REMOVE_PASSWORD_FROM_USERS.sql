-- ============================================================================
-- MIGRATION: Remove password column from users table
-- Run this in Supabase SQL Editor to fix the "null value in column password" error
-- ============================================================================
-- This removes the password_hash column from the users table because:
-- 1. Passwords should ONLY be stored in Supabase Auth, never in the users table
-- 2. The application uses Supabase Auth for password management
-- 3. Storing passwords in multiple places creates security vulnerabilities

-- Drop the password_hash column if it exists
ALTER TABLE public.users 
DROP COLUMN IF EXISTS password_hash;

-- Also drop if it's named just "password"
ALTER TABLE public.users 
DROP COLUMN IF EXISTS password;

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- DONE! Now you can create users without the password column error
-- ============================================================================
