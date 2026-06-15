-- Backfill staff_name and staff_phone in staff_payments from users table
-- This will populate missing staff information in existing payment records

BEGIN TRANSACTION;

-- First, check how many records need updating
SELECT COUNT(*) as records_with_null_staff_name
FROM staff_payments
WHERE staff_name IS NULL OR staff_name = 'Unknown';

-- Update staff_name from users.full_name where staff_name is NULL
UPDATE staff_payments sp
SET staff_name = u.full_name
FROM users u
WHERE sp.staff_id = u.id
AND (sp.staff_name IS NULL OR sp.staff_name = 'Unknown')
AND u.full_name IS NOT NULL;

-- Update staff_phone from users.phone_number where staff_phone is NULL
UPDATE staff_payments sp
SET staff_phone = u.phone_number
FROM users u
WHERE sp.staff_id = u.id
AND sp.staff_phone IS NULL
AND u.phone_number IS NOT NULL;

-- Verify the updates
SELECT COUNT(*) as records_updated_with_staff_name
FROM staff_payments
WHERE staff_name IS NOT NULL AND staff_name != 'Unknown';

-- Show sample of updated records
SELECT 
  id,
  staff_id,
  staff_name,
  staff_phone,
  amount,
  status,
  created_at
FROM staff_payments
ORDER BY created_at DESC
LIMIT 5;

COMMIT;
