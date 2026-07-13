-- ============================================================================
-- Migration: Fix staff payment types (Production)
-- ============================================================================
-- Run in Supabase SQL Editor on production (cifzlkspxjghpgxhrwkg.supabase.co)
-- Safe to re-run (idempotent).
-- ============================================================================

BEGIN;

-- 1. Drop old CHECK constraint and recreate with all valid types
ALTER TABLE staff_payments DROP CONSTRAINT IF EXISTS staff_payments_payment_type_check;
ALTER TABLE staff_payments ADD CONSTRAINT staff_payments_payment_type_check 
  CHECK (payment_type IN ('commission', 'non_commission', 'sales', 'salary', 'credit_remittance', 'other', 'sales_portal'));

-- 2. Show current state
SELECT u.full_name, u.role, p.payment_type, COUNT(*) as cnt, SUM(p.amount) as total
FROM staff_payments p
JOIN users u ON u.id = p.staff_id
WHERE (u.role IN ('sales', 'sales_staff') AND p.payment_type = 'commission')
   OR (u.role IN ('non_commission_staff', 'staff_non_commission') AND p.payment_type = 'salary')
GROUP BY u.id, u.full_name, u.role, p.payment_type;

-- 3. Update sales staff payments: 'commission' → 'sales'
UPDATE staff_payments
SET payment_type = 'sales'
WHERE staff_id IN (SELECT id FROM users WHERE role IN ('sales', 'sales_staff'))
AND payment_type = 'commission';

-- 4. Update non-commission staff payments: 'salary' → 'non_commission'
UPDATE staff_payments
SET payment_type = 'non_commission'
WHERE staff_id IN (SELECT id FROM users WHERE role IN ('non_commission_staff', 'staff_non_commission'))
AND payment_type = 'salary';

-- 5. Verify
SELECT u.full_name, u.role, p.payment_type, COUNT(*) as cnt, SUM(p.amount) as total
FROM staff_payments p
JOIN users u ON u.id = p.staff_id
WHERE u.role NOT IN ('admin', 'superadmin')
GROUP BY u.id, u.full_name, u.role, p.payment_type
ORDER BY u.role, p.payment_type;

COMMIT;
