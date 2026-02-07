-- ============================================================================
-- PAYMENT SYSTEM SCHEMA MIGRATION
-- Add missing columns to staff_payments table
-- Execute in Supabase SQL Editor
-- ============================================================================

-- Add missing columns for payment system
ALTER TABLE IF EXISTS public.staff_payments 
ADD COLUMN IF NOT EXISTS staff_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS staff_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS staff_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS items_paid_for JSONB,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_staff_payments_payment_method 
ON public.staff_payments(payment_method);

CREATE INDEX IF NOT EXISTS idx_staff_payments_reference 
ON public.staff_payments(reference_number);

CREATE INDEX IF NOT EXISTS idx_staff_payments_receipt 
ON public.staff_payments(receipt_url);

CREATE INDEX IF NOT EXISTS idx_staff_payments_rejection 
ON public.staff_payments(rejection_reason);

-- Add constraints for payment_method
ALTER TABLE public.staff_payments 
ADD CONSTRAINT check_payment_method 
CHECK (payment_method IS NULL OR payment_method IN ('cash', 'online', 'bank_deposit', 'pos'));

-- Verify all columns were added successfully
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'staff_payments' 
ORDER BY ordinal_position;

-- Display summary of new columns
SELECT COUNT(*) as total_columns,
       COUNT(CASE WHEN column_name = 'staff_name' THEN 1 END) as has_staff_name,
       COUNT(CASE WHEN column_name = 'staff_email' THEN 1 END) as has_staff_email,
       COUNT(CASE WHEN column_name = 'staff_phone' THEN 1 END) as has_staff_phone,
       COUNT(CASE WHEN column_name = 'payment_method' THEN 1 END) as has_payment_method,
       COUNT(CASE WHEN column_name = 'reference_number' THEN 1 END) as has_reference_number,
       COUNT(CASE WHEN column_name = 'receipt_url' THEN 1 END) as has_receipt_url,
       COUNT(CASE WHEN column_name = 'items_paid_for' THEN 1 END) as has_items_paid_for,
       COUNT(CASE WHEN column_name = 'rejection_reason' THEN 1 END) as has_rejection_reason
FROM information_schema.columns 
WHERE table_name = 'staff_payments';
