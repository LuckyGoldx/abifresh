-- Fix Jane's commission payment to have correct payment_type
-- Run this in Supabase SQL Editor

UPDATE staff_payments
SET payment_type = 'commission'
WHERE 
  staff_id = (SELECT id FROM users WHERE email ILIKE '%jane%' LIMIT 1)
  AND amount = 10
  AND status = 'approved'
  AND payment_type != 'commission';

-- Verify the fix
SELECT 
  id, 
  amount, 
  payment_type, 
  status, 
  created_at
FROM staff_payments
WHERE 
  staff_id = (SELECT id FROM users WHERE email ILIKE '%jane%' LIMIT 1)
ORDER BY created_at DESC
LIMIT 10;
