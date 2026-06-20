-- Add 'bank_deposit' to the credit_payments payment_method check constraint
ALTER TABLE credit_payments DROP CONSTRAINT IF EXISTS credit_payments_payment_method_check;
ALTER TABLE credit_payments ADD CONSTRAINT credit_payments_payment_method_check 
  CHECK (payment_method IN ('cash', 'pos', 'online_transfer', 'bank_deposit'));
