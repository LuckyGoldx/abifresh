-- Add remittance fields to credit_payments
ALTER TABLE credit_payments ADD COLUMN IF NOT EXISTS remittance_status TEXT CHECK (remittance_status IN ('submitted', 'confirmed'));
ALTER TABLE credit_payments ADD COLUMN IF NOT EXISTS remitted_at TIMESTAMP;
ALTER TABLE credit_payments ADD COLUMN IF NOT EXISTS remittance_confirmed_at TIMESTAMP;
ALTER TABLE credit_payments ADD COLUMN IF NOT EXISTS remittance_confirmed_by UUID REFERENCES users(id);

-- Update RLS if needed (already enabled)
