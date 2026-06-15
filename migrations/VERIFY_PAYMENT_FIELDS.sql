-- ============================================================================
-- VERIFY ALL PAYMENT FIELDS HAVE DATABASE COLUMNS
-- Check that every field submitted from frontend has a corresponding column
-- ============================================================================

-- List all required fields and verify they exist
SELECT 
  'amount' as field_name, 
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='staff_payments' AND column_name='amount') THEN '✅ EXISTS' ELSE '❌ MISSING' END as status,
  'DECIMAL - Payment amount' as description
UNION ALL
SELECT 'staff_name', CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='staff_payments' AND column_name='staff_name') THEN '✅ EXISTS' ELSE '❌ MISSING' END, 'VARCHAR - Staff member name'
UNION ALL
SELECT 'items_paid_for', CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='staff_payments' AND column_name='items_paid_for') THEN '✅ EXISTS' ELSE '❌ MISSING' END, 'JSONB - Array of items with qty/amount'
UNION ALL
SELECT 'reference_number', CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='staff_payments' AND column_name='reference_number') THEN '✅ EXISTS' ELSE '❌ MISSING' END, 'VARCHAR - Transfer/payment reference'
UNION ALL
SELECT 'payment_method', CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='staff_payments' AND column_name='payment_method') THEN '✅ EXISTS' ELSE '❌ MISSING' END, 'VARCHAR - cash/online/bank_deposit/pos'
UNION ALL
SELECT 'notes', CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='staff_payments' AND column_name='notes') THEN '✅ EXISTS' ELSE '❌ MISSING' END, 'TEXT - Additional notes'
UNION ALL
SELECT 'receipt', CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='staff_payments' AND column_name='receipt_url') THEN '✅ EXISTS' ELSE '❌ MISSING' END, 'TEXT - Receipt file URL'
UNION ALL
SELECT 'status', CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='staff_payments' AND column_name='status') THEN '✅ EXISTS' ELSE '❌ MISSING' END, 'VARCHAR - pending/approved/rejected'
UNION ALL
SELECT 'staff_id', CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='staff_payments' AND column_name='staff_id') THEN '✅ EXISTS' ELSE '❌ MISSING' END, 'UUID - User ID'
UNION ALL
SELECT 'payment_type', CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='staff_payments' AND column_name='payment_type') THEN '✅ EXISTS' ELSE '❌ MISSING' END, 'VARCHAR - commission/salary/other'
UNION ALL
SELECT 'staff_email', CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='staff_payments' AND column_name='staff_email') THEN '✅ EXISTS' ELSE '❌ MISSING' END, 'VARCHAR - Staff email'
UNION ALL
SELECT 'staff_phone', CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='staff_payments' AND column_name='staff_phone') THEN '✅ EXISTS' ELSE '❌ MISSING' END, 'VARCHAR - Staff phone number'
UNION ALL
SELECT 'rejection_reason', CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='staff_payments' AND column_name='rejection_reason') THEN '✅ EXISTS' ELSE '❌ MISSING' END, 'TEXT - Why payment was rejected'
UNION ALL
SELECT 'requested_date', CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='staff_payments' AND column_name='requested_date') THEN '✅ EXISTS' ELSE '❌ MISSING' END, 'TIMESTAMP - When payment was requested'
ORDER BY field_name;

-- Show detailed staff_payments table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'staff_payments'
ORDER BY ordinal_position;

-- Count total records
SELECT COUNT(*) as total_payment_records FROM staff_payments;
