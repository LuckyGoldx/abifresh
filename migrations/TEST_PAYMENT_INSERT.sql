-- Test payment data insertion for admin/payments testing
-- Run this in Supabase SQL editor to create test payments

-- Get a sales staff ID first (you'll see these printed in the backend logs)
-- Example: 26d4ee08... for sales@abifresh.com
-- Example: 818d3627... for staff.comm@abifresh.com

-- Insert test pending payments
INSERT INTO public.staff_payments (
  staff_id,
  amount,
  payment_type,
  status,
  requested_date,
  notes,
  created_at,
  updated_at
) VALUES
-- Replace 26d4ee08-e0e4-4c8e-bc75-cb7aa37bef35 with actual staff ID from logs
(
  '26d4ee08-e0e4-4c8e-bc75-cb7aa37bef35',
  50000,
  'commission',
  'pending',
  NOW(),
  'Sales Payment - Method: cash | Ref: REC-001',
  NOW(),
  NOW()
),
(
  '26d4ee08-e0e4-4c8e-bc75-cb7aa37bef35',
  35000,
  'bonus',
  'pending',
  NOW() - INTERVAL '1 day',
  'Sales Payment - Method: bank_transfer | Ref: REC-002',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),
(
  '818d3627-cb00-482e-a649-1ced6b2e282e',
  75000,
  'salary',
  'pending',
  NOW() - INTERVAL '2 days',
  'Staff Payment - Method: cash',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
);

-- View all payments
SELECT * FROM public.staff_payments ORDER BY created_at DESC;

-- View pending payments only
SELECT * FROM public.staff_payments WHERE status = 'pending' ORDER BY created_at DESC;
