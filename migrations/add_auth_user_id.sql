-- Migration: Add auth_user_id column to track Supabase Auth UUIDs
-- Safe: Adds nullable column, no data loss or deletion

ALTER TABLE public.users ADD COLUMN auth_user_id UUID NULL UNIQUE;

-- Index for faster lookups by auth_user_id
CREATE INDEX idx_users_auth_user_id ON public.users(auth_user_id);

-- Comment for clarity
COMMENT ON COLUMN public.users.auth_user_id IS 'Immutable UUID of the corresponding Supabase Auth user. Used for direct auth operations without email lookup.';
