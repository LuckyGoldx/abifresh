-- ============================================================================
-- CREATE SUPERADMIN ACCOUNT: luckygold
-- ============================================================================
-- IMPORTANT: This only creates the user profile in the users table.
-- Authentication (password) is managed by Supabase Auth separately.
--
-- Username: luckygold
-- Email: luckygold@abifresh.com
-- Password: #lucky5788 (create via backend API or Supabase Dashboard)
-- Creation Date: 2026-03-15
-- ============================================================================

-- STEP 1: First, create the Supabase Auth user via backend or CLI:
-- Backend API call: POST /api/auth/register
-- {
--   "email": "luckygold@abifresh.com",
--   "password": "#lucky5788",
--   "fullName": "Lucky Gold - Superadmin",
--   "role": "superadmin",
--   "customUsername": "luckygold",
--   "phoneNumber": "+234802000000"
-- }

-- STEP 2: Or use Supabase CLI:
-- npx supabase auth admin create-user --email luckygold@abifresh.com --password "#lucky5788"

-- STEP 3: Get the user_id from either Step 1 or 2, then update the SQL below with the actual UUID:

-- Example: INSERT INTO public.users (
--   id,
--   email,
--   full_name,
--   username,
--   role,
--   is_active,
--   phone_number,
--   store_location,
--   created_at
-- ) VALUES (
--   'YOUR_SUPABASE_AUTH_USER_ID_HERE',  -- Replace with actual UUID from Supabase Auth
--   'luckygold@abifresh.com',
--   'Lucky Gold - Superadmin',
--   'luckygold',
--   'superadmin',
--   true,
--   '+234802000000',
--   'Jalingo',
--   NOW()
-- )
-- ON CONFLICT (email) DO NOTHING;

-- Verify the account was created
SELECT id, email, username, full_name, role, is_active, created_at 
FROM public.users 
WHERE email = 'luckygold@abifresh.com' OR username = 'luckygold';
