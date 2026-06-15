-- ============================================================================
-- SUPERADMIN IMPLEMENTATION - DATABASE MIGRATION SCRIPT
-- ============================================================================
-- This script adds superadmin role and required tables to your Supabase database
-- Execute in order: 1. Add role → 2. Create tables → 3. Insert superadmin users
-- ============================================================================

-- ============================================================================
-- STEP 1: Add 'superadmin' role to users table (if not exists)
-- ============================================================================
-- Uncomment based on your current constraints:

-- If using ENUM type:
-- ALTER TYPE user_role ADD VALUE 'superadmin' BEFORE 'admin';

-- If using CHECK constraint, update it:
-- ALTER TABLE users DROP CONSTRAINT check_valid_role;
-- ALTER TABLE users ADD CONSTRAINT check_valid_role 
--   CHECK (role IN ('admin', 'sales', 'staff_commission', 'staff_non_commission', 'superadmin'));

-- If role is just VARCHAR, no changes needed


-- ============================================================================
-- STEP 2: Add deactivation columns to users table
-- ============================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deactivated_reason TEXT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);


-- ============================================================================
-- STEP 3: Create audit_logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_email VARCHAR(255),
  action VARCHAR(255) NOT NULL,
  action_type VARCHAR(50), -- 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'APPROVE', 'LOGIN_FAILED', 'UNAUTHORIZED_ACCESS'
  resource_type VARCHAR(100), -- 'user', 'payment', 'inventory', 'staff', 'admin', 'system_config'
  resource_id UUID,
  details JSONB, -- Store additional context
  ip_address VARCHAR(45),
  status VARCHAR(20) NOT NULL DEFAULT 'success', -- 'success', 'failed'
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes for common queries
  INDEX idx_user_id (user_id),
  INDEX idx_action_type (action_type),
  INDEX idx_resource_type (resource_type),
  INDEX idx_created_at (created_at DESC),
  INDEX idx_status (status)
);

-- Note: If INDEX syntax doesn't work in Supabase PostgreSQL, use:
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON public.audit_logs(status);


-- ============================================================================
-- STEP 4: Create system_events table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL, -- 'login', 'logout', 'error', 'backup', 'sync', 'payment', 'inventory'
  severity VARCHAR(20) NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  affected_users INT DEFAULT 0,
  affected_records INT DEFAULT 0,
  metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_event_type (event_type),
  INDEX idx_severity (severity),
  INDEX idx_created_at (created_at DESC)
);

CREATE INDEX IF NOT EXISTS idx_system_events_event_type ON public.system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON public.system_events(severity);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON public.system_events(created_at DESC);


-- ============================================================================
-- STEP 5: Create system_config table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(255) UNIQUE NOT NULL,
  config_value JSONB,
  data_type VARCHAR(50), -- 'string', 'number', 'boolean', 'array', 'object'
  description TEXT,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_config_key (config_key)
);

CREATE INDEX IF NOT EXISTS idx_system_config_key ON public.system_config(config_key);


-- ============================================================================
-- STEP 6: Add RLS (Row Level Security) policies if needed
-- ============================================================================

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only superadmins can view ALL audit logs
CREATE POLICY "superadmin_can_view_all_audit_logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'superadmin'
    )
  );

-- Admins can view audit logs for their own actions
CREATE POLICY "admin_can_view_own_audit_logs" ON public.audit_logs
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'superadmin'
    )
  );


-- ============================================================================
-- STEP 7: Insert initial superadmin users
-- ============================================================================
-- IMPORTANT: Replace password hashes with actual bcrypt hashes from your backend
-- You can generate these by running this in your backend:
-- const bcrypt = require('bcryptjs');
-- bcrypt.hash('YourPassword@2026', 10).then(hash => console.log(hash));

-- Example hashes (DO NOT USE IN PRODUCTION):
-- Password: SuperAdmin_Owner@2026 → $2b$10$abcdefghijklmnopqrstuvwxyz (EXAMPLE)
-- Password: SuperAdmin_Finance@2026 → $2b$10$abcdefghijklmnopqrstuvwxyz (EXAMPLE)
-- Password: SuperAdmin_Operations@2026 → $2b$10$abcdefghijklmnopqrstuvwxyz (EXAMPLE)

INSERT INTO public.users (
  email,
  full_name,
  role,
  password_hash,
  is_active,
  phone_number,
  store_location,
  created_at
) VALUES
  (
    'superadmin.owner@abifresh.com',
    'Owner - Superadmin',
    'superadmin',
    '$2b$10$YOUR_BCRYPT_HASH_HERE', -- Replace with actual hash
    true,
    '+234802000001',
    'Jalingo',
    NOW()
  ),
  (
    'superadmin.finance@abifresh.com',
    'Finance Director - Superadmin',
    'superadmin',
    '$2b$10$YOUR_BCRYPT_HASH_HERE', -- Replace with actual hash
    true,
    '+234802000002',
    'Jalingo',
    NOW()
  ),
  (
    'superadmin.ops@abifresh.com',
    'Operations Manager - Superadmin',
    'superadmin',
    '$2b$10$YOUR_BCRYPT_HASH_HERE', -- Replace with actual hash
    true,
    '+234802000003',
    'Jalingo',
    NOW()
  )
ON CONFLICT (email) DO NOTHING;


-- ============================================================================
-- STEP 8: Verify installation
-- ============================================================================

-- Check superadmin users created
SELECT id, email, full_name, role, is_active, created_at FROM public.users 
WHERE role = 'superadmin' 
ORDER BY created_at;

-- Check tables created
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('audit_logs', 'system_events', 'system_config');

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('audit_logs', 'system_events', 'system_config', 'users');

-- ============================================================================
-- REFERENCE: Test Data (Optional - for development only)
-- ============================================================================

-- Insert test audit logs (demonstrates the structure)
-- INSERT INTO public.audit_logs (
--   user_id, user_email, action, action_type, resource_type, status, created_at
-- ) VALUES (
--   'superadmin-user-id',
--   'superadmin@abifresh.com',
--   'Admin Approved Payment',
--   'APPROVE',
--   'payment',
--   'success',
--   NOW()
-- );

-- Insert test system events
-- INSERT INTO public.system_events (
--   event_type, severity, title, description, created_at
-- ) VALUES (
--   'login',
--   'info',
--   'Superadmin Login',
--   'Owner superadmin logged in successfully',
--   NOW()
-- );

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Replace password hashes in the INSERT statements with actual bcrypt hashes
-- 2. These hashes should match passwords you'll use to collect test credentials
-- 3. After inserting, test login at http://localhost:3000/login
-- 4. Check Supabase UI to verify users and tables are created
-- 5. Run this entire script in Supabase SQL editor
-- ============================================================================
