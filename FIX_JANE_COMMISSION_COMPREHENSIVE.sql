-- Comprehensive fix for Jane's commission payments
-- This will update ANY approved payment close to ₦10 for Jane to have payment_type='commission'

UPDATE staff_payments
SET payment_type = 'commission'
WHERE 
  staff_id = (SELECT id FROM users WHERE email ILIKE '%jane%' LIMIT 1)
  AND status = 'approved'
  AND amount BETWEEN 9 AND 11  -- Catches both ₦10 and ₦10.80
  AND payment_type != 'commission';

-- Show all Jane's payments after the fix
SELECT 
  id,
  amount,
  payment_type,
  status,
  created_at
FROM staff_payments
WHERE 
  staff_id = (SELECT id FROM users WHERE email ILIKE '%jane%' LIMIT 1)
ORDER BY amount DESC;
