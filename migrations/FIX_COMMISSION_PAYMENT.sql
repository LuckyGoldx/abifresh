-- Fix incorrect payment for commission@abifresh.com
-- Reset commission_paid to 0 for this staff member

-- First, let's see the current state
SELECT 
    id,
    name,
    email,
    commission_paid,
    (SELECT COALESCE(SUM(commission_amount), 0) 
     FROM staff_sales 
     WHERE staff_id = users.id) as total_commission_generated
FROM users 
WHERE email = 'commission@abifresh.com';

-- Update: Reset commission_paid to 0
UPDATE users 
SET commission_paid = 0 
WHERE email = 'commission@abifresh.com';

-- Delete the incorrect payment record from commission_payments table
DELETE FROM commission_payments 
WHERE staff_id = (SELECT id FROM users WHERE email = 'commission@abifresh.com')
AND created_at >= NOW() - INTERVAL '1 day';

-- Verify the fix
SELECT 
    id,
    name,
    email,
    commission_paid,
    (SELECT COALESCE(SUM(commission_amount), 0) 
     FROM staff_sales 
     WHERE staff_id = users.id) as total_commission_generated,
    (SELECT COALESCE(SUM(commission_amount), 0) 
     FROM staff_sales 
     WHERE staff_id = users.id) - commission_paid as pending_commission
FROM users 
WHERE email = 'commission@abifresh.com';
