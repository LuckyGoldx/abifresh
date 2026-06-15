-- Check ALL payments for Jane to see what we're working with
SELECT 
  id,
  amount,
  payment_type,
  status,
  created_at
FROM staff_payments
WHERE 
  staff_id = (SELECT id FROM users WHERE email ILIKE '%jane%' LIMIT 1)
ORDER BY created_at DESC;
