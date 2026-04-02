-- ============================================================================
-- FIX ALL SCHEMA MISMATCHES
-- Run this ENTIRE script in Supabase SQL Editor (in one go)
-- This fixes ALL "Could not find column X in schema cache" errors
-- ============================================================================

-- ============================================================================
-- 1. staff_sales: Add 'commission' column (FIXES the reported error)
-- ============================================================================
ALTER TABLE public.staff_sales
ADD COLUMN IF NOT EXISTS commission DECIMAL(12, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_staff_sales_commission
ON public.staff_sales(staff_id, commission);

COMMENT ON COLUMN public.staff_sales.commission
IS 'Commission earned by staff member from this sale (item.commission * quantity)';

-- ============================================================================
-- 2. staff_sales: Add 'sold_outside_jalingo' column
-- ============================================================================
ALTER TABLE public.staff_sales
ADD COLUMN IF NOT EXISTS sold_outside_jalingo BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.staff_sales.sold_outside_jalingo
IS 'TRUE when the item was sold outside Jalingo; FALSE means Jalingo price was used';

-- ============================================================================
-- 3. posted_items: Add 'staff_comment' column (safety — may already exist)
-- ============================================================================
ALTER TABLE public.posted_items
ADD COLUMN IF NOT EXISTS staff_comment TEXT;

-- ============================================================================
-- 4. users: Add 'last_notifications_read_at' column
-- ============================================================================
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_notifications_read_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 5. staff_commissions: Add 'item_id' for per-staff-per-item commissions
-- ============================================================================
ALTER TABLE public.staff_commissions
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.items(id);

-- Create unique constraint for upsert support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_staff_item_commission'
  ) THEN
    ALTER TABLE public.staff_commissions
    ADD CONSTRAINT unique_staff_item_commission UNIQUE (staff_id, item_id);
  END IF;
END $$;

-- ============================================================================
-- 6. Ensure 'superadmin' is allowed in users role constraint
-- ============================================================================
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE IF EXISTS public.users ADD CONSTRAINT users_role_check CHECK (
  role IN (
    'admin', 'sales', 'sales_staff',
    'staff_commission', 'commission_staff',
    'staff_non_commission', 'non_commission_staff',
    'superadmin'
  )
);

-- ============================================================================
-- 7. Verify all fixes applied
-- ============================================================================
SELECT 'staff_sales.commission' AS fix,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='staff_sales' AND column_name='commission') AS applied
UNION ALL
SELECT 'staff_sales.sold_outside_jalingo',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='staff_sales' AND column_name='sold_outside_jalingo')
UNION ALL
SELECT 'posted_items.staff_comment',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='posted_items' AND column_name='staff_comment')
UNION ALL
SELECT 'users.last_notifications_read_at',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_notifications_read_at')
UNION ALL
SELECT 'staff_commissions.item_id',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='staff_commissions' AND column_name='item_id');
