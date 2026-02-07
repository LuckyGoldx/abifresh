-- ============================================================================
-- ABIFRESH & KIDDIES VENTURES - Complete User Setup Script
-- ============================================================================
-- This script will:
-- 1. Clear existing users safely
-- 2. Create new auth users with passwords
-- 3. Create corresponding user profiles
-- 4. Set up proper permissions
-- ============================================================================

-- STEP 1: Clean up existing users (CAREFUL - THIS DELETES ALL DATA!)
-- ============================================================================

-- Delete from public.users table first (to avoid foreign key issues)
DELETE FROM public.users;

-- Delete from auth.users table
-- Note: This requires service_role privileges
DELETE FROM auth.users;

-- ============================================================================
-- STEP 2: Create Auth Users with Passwords
-- ============================================================================
-- These users will be created in Supabase Authentication

-- Admin User
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@abifresh.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin User"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Sales User
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'sales@abifresh.com',
  crypt('sales123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Sales Representative"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Seller User
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'seller@abifresh.com',
  crypt('seller123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Seller User"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Staff Commission User
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'staff.comm@abifresh.com',
  crypt('staffcomm123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Staff Commission"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Staff Non-Commission User
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'staff@abifresh.com',
  crypt('staff123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Staff User"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Finance User (Admin role)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'finance@abifresh.com',
  crypt('finance123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Finance Manager"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- ============================================================================
-- STEP 3: Create User Profiles in public.users table
-- ============================================================================
-- These profiles link to the auth users and contain role information

-- Insert profiles with matching auth user IDs
INSERT INTO public.users (id, email, full_name, role, is_active, store_location, created_at)
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  CASE 
    WHEN email = 'admin@abifresh.com' THEN 'admin'
    WHEN email = 'sales@abifresh.com' THEN 'sales'
    WHEN email = 'seller@abifresh.com' THEN 'sales'
    WHEN email = 'staff.comm@abifresh.com' THEN 'staff_commission'
    WHEN email = 'staff@abifresh.com' THEN 'staff_non_commission'
    WHEN email = 'finance@abifresh.com' THEN 'admin'
  END as role,
  true as is_active,
  'Jalingo' as store_location,
  created_at
FROM auth.users
WHERE email IN (
  'admin@abifresh.com',
  'sales@abifresh.com',
  'seller@abifresh.com',
  'staff.comm@abifresh.com',
  'staff@abifresh.com',
  'finance@abifresh.com'
);

-- ============================================================================
-- STEP 4: Verify Users Created
-- ============================================================================

-- Check auth.users table
SELECT 
  email,
  email_confirmed_at,
  created_at,
  'Auth User' as table_name
FROM auth.users 
WHERE email LIKE '%@abifresh.com'
ORDER BY created_at;

-- Check public.users table
SELECT 
  email,
  full_name,
  role,
  is_active,
  store_location,
  'Public Profile' as table_name
FROM public.users 
WHERE email LIKE '%@abifresh.com'
ORDER BY created_at;

-- ============================================================================
-- SUCCESS! All users created with the following credentials:
-- ============================================================================
-- Email: admin@abifresh.com       | Password: admin123       | Role: admin
-- Email: sales@abifresh.com       | Password: sales123       | Role: sales
-- Email: seller@abifresh.com      | Password: seller123      | Role: sales
-- Email: staff.comm@abifresh.com  | Password: staffcomm123   | Role: staff_commission
-- Email: staff@abifresh.com       | Password: staff123       | Role: staff_non_commission
-- Email: finance@abifresh.com     | Password: finance123     | Role: admin
-- ============================================================================
