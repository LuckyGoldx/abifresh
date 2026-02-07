-- ============================================================================
-- SUPABASE USER SETUP - INSERT 6 TEST USERS
-- ============================================================================
-- 
-- IMPORTANT: Run this SQL in your Supabase project's SQL Editor
-- Project: Abifresh (akv) - https://app.supabase.com
-- Steps:
--   1. Go to SQL Editor in left sidebar
--   2. Click "New Query"
--   3. Copy and paste this entire script
--   4. Click "Run"
--
-- ============================================================================

-- NOTE: Before running this, delete existing test users if they exist:
-- DELETE FROM users WHERE email IN ('admin@abifresh.com', 'sales@abifresh.com', 'seller@abifresh.com', 'staff.comm@abifresh.com', 'staff@abifresh.com', 'finance@abifresh.com');
-- DELETE FROM auth.users WHERE email IN ('admin@abifresh.com', 'sales@abifresh.com', 'seller@abifresh.com', 'staff.comm@abifresh.com', 'staff@abifresh.com', 'finance@abifresh.com');

-- ============================================================================
-- USER 1: ADMIN
-- ============================================================================
-- Email: admin@abifresh.com
-- Password: admin123
-- Role: admin

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '550e8400-e29b-41d4-a716-446655440001',
  'authenticated',
  'authenticated',
  'admin@abifresh.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "admin", "full_name": "Admin User", "store_location": "Jalingo"}'::jsonb
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
  id,
  email,
  full_name,
  role,
  is_active,
  store_location
)
SELECT 
  '550e8400-e29b-41d4-a716-446655440001',
  'admin@abifresh.com',
  'Admin User',
  'admin',
  true,
  'Jalingo'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'admin@abifresh.com'
);

-- ============================================================================
-- USER 2: SALES PERSON 1
-- ============================================================================
-- Email: sales@abifresh.com
-- Password: sales123
-- Role: sales

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '550e8400-e29b-41d4-a716-446655440002',
  'authenticated',
  'authenticated',
  'sales@abifresh.com',
  crypt('sales123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "sales", "full_name": "John Sales", "store_location": "Jalingo"}'::jsonb
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
  id,
  email,
  full_name,
  role,
  is_active,
  store_location
)
SELECT 
  '550e8400-e29b-41d4-a716-446655440002',
  'sales@abifresh.com',
  'John Sales',
  'sales',
  true,
  'Jalingo'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'sales@abifresh.com'
);

-- ============================================================================
-- USER 3: SALES PERSON 2
-- ============================================================================
-- Email: seller@abifresh.com
-- Password: seller123
-- Role: sales

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '550e8400-e29b-41d4-a716-446655440003',
  'authenticated',
  'authenticated',
  'seller@abifresh.com',
  crypt('seller123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "sales", "full_name": "Mary Seller", "store_location": "Jalingo"}'::jsonb
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
  id,
  email,
  full_name,
  role,
  is_active,
  store_location
)
SELECT 
  '550e8400-e29b-41d4-a716-446655440003',
  'seller@abifresh.com',
  'Mary Seller',
  'sales',
  true,
  'Jalingo'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'seller@abifresh.com'
);

-- ============================================================================
-- USER 4: STAFF WITH COMMISSION
-- ============================================================================
-- Email: staff.comm@abifresh.com
-- Password: staffcomm123
-- Role: commission_staff

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '550e8400-e29b-41d4-a716-446655440004',
  'authenticated',
  'authenticated',
  'staff.comm@abifresh.com',
  crypt('staffcomm123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "commission_staff", "full_name": "David Staff (Commission)", "store_location": "Jalingo"}'::jsonb
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
  id,
  email,
  full_name,
  role,
  is_active,
  store_location
)
SELECT 
  '550e8400-e29b-41d4-a716-446655440004',
  'staff.comm@abifresh.com',
  'David Staff (Commission)',
  'commission_staff',
  true,
  'Jalingo'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'staff.comm@abifresh.com'
);

-- ============================================================================
-- USER 5: STAFF WITHOUT COMMISSION
-- ============================================================================
-- Email: staff@abifresh.com
-- Password: staff123
-- Role: non_commission_staff

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '550e8400-e29b-41d4-a716-446655440005',
  'authenticated',
  'authenticated',
  'staff@abifresh.com',
  crypt('staff123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "non_commission_staff", "full_name": "Sarah Staff (No Commission)", "store_location": "Jalingo"}'::jsonb
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
  id,
  email,
  full_name,
  role,
  is_active,
  store_location
)
SELECT 
  '550e8400-e29b-41d4-a716-446655440005',
  'staff@abifresh.com',
  'Sarah Staff (No Commission)',
  'non_commission_staff',
  true,
  'Jalingo'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'staff@abifresh.com'
);

-- ============================================================================
-- USER 6: FINANCE MANAGER (BONUS)
-- ============================================================================
-- Email: finance@abifresh.com
-- Password: finance123
-- Role: admin (same as admin, or create new role)

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '550e8400-e29b-41d4-a716-446655440006',
  'authenticated',
  'authenticated',
  'finance@abifresh.com',
  crypt('finance123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "admin", "full_name": "Finance Manager", "store_location": "Jalingo"}'::jsonb
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
  id,
  email,
  full_name,
  role,
  is_active,
  store_location
)
SELECT 
  '550e8400-e29b-41d4-a716-446655440006',
  'finance@abifresh.com',
  'Finance Manager',
  'admin',
  true,
  'Jalingo'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'finance@abifresh.com'
);

-- ============================================================================
-- VERIFY USERS WERE CREATED
-- ============================================================================

SELECT 
  'Auth Users' as source,
  email,
  raw_user_meta_data->>'role' as role,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email IN (
  'admin@abifresh.com',
  'sales@abifresh.com',
  'seller@abifresh.com',
  'staff.comm@abifresh.com',
  'staff@abifresh.com',
  'finance@abifresh.com'
)
ORDER BY email;

-- ============================================================================
-- TEST USER CREDENTIALS
-- ============================================================================
-- 
-- Admin:
--   Email: admin@abifresh.com
--   Password: admin123
--   Role: admin
--   Expected Dashboard: /admin/dashboard
--
-- Sales 1:
--   Email: sales@abifresh.com
--   Password: sales123
--   Role: sales
--   Expected Dashboard: /sales/dashboard
--
-- Sales 2:
--   Email: seller@abifresh.com
--   Password: seller123
--   Role: sales
--   Expected Dashboard: /sales/dashboard
--
-- Staff (Commission):
--   Email: staff.comm@abifresh.com
--   Password: staffcomm123
--   Role: staff_commission
--   Expected Dashboard: /staff/dashboard (commission visible)
--
-- Staff (Non-Commission):
--   Email: staff@abifresh.com
--   Password: staff123
--   Role: staff_non_commission
--   Expected Dashboard: /staff/dashboard (commission hidden)
--
-- Finance (Bonus):
--   Email: finance@abifresh.com
--   Password: finance123
--   Role: admin
--   Expected Dashboard: /admin/dashboard
--
-- ============================================================================
