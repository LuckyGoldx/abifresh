-- ============================================================================
-- Migration: Fix staff payment types
--   - sales_staff: 'commission' → 'sales'
--   - non_commission_staff: 'salary' → 'non_commission'
-- ============================================================================
-- Run in Supabase SQL Editor. Safe to re-run (idempotent).
-- ============================================================================

-- 1. Show current state
SELECT u.full_name, u.role, p.payment_type, COUNT(*) as cnt, SUM(p.amount) as total
FROM staff_payments p
JOIN users u ON u.id = p.staff_id
WHERE (u.role IN ('sales', 'sales_staff') AND p.payment_type = 'commission')
   OR (u.role IN ('non_commission_staff', 'staff_non_commission') AND p.payment_type = 'salary')
GROUP BY u.id, u.full_name, u.role, p.payment_type;

-- 2. Update sales staff payments: 'commission' → 'sales'
UPDATE staff_payments
SET payment_type = 'sales'
WHERE staff_id IN (SELECT id FROM users WHERE role IN ('sales', 'sales_staff'))
AND payment_type = 'commission';

-- 3. Update non-commission staff payments: 'salary' → 'non_commission'
UPDATE staff_payments
SET payment_type = 'non_commission'
WHERE staff_id IN (SELECT id FROM users WHERE role IN ('non_commission_staff', 'staff_non_commission'))
AND payment_type = 'salary';

-- 4. Verify
SELECT u.full_name, u.role, p.payment_type, COUNT(*) as cnt, SUM(p.amount) as total
FROM staff_payments p
JOIN users u ON u.id = p.staff_id
WHERE u.role NOT IN ('admin', 'superadmin')
GROUP BY u.id, u.full_name, u.role, p.payment_type
ORDER BY u.role, p.payment_type;
