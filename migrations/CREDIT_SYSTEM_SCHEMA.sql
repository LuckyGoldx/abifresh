-- Credit System Tables for AKV
-- Run this in Supabase SQL Editor
-- Make sure the 'users' and 'items' tables already exist

-- 1. CREDITORS TABLE
CREATE TABLE IF NOT EXISTS creditors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    email TEXT,
    address TEXT,
    added_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creditors_unique_code ON creditors(unique_code);
CREATE INDEX IF NOT EXISTS idx_creditors_phone ON creditors(phone_number);

-- 2. CREDIT_SALES TABLE (credit given to creditors)
CREATE TABLE IF NOT EXISTS credit_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creditor_id UUID NOT NULL REFERENCES creditors(id),
    staff_id UUID NOT NULL REFERENCES users(id),
    receipt_number TEXT UNIQUE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    total_quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_paid', 'paid', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_sales_creditor ON credit_sales(creditor_id);
CREATE INDEX IF NOT EXISTS idx_credit_sales_staff ON credit_sales(staff_id);
CREATE INDEX IF NOT EXISTS idx_credit_sales_status ON credit_sales(status);

-- 3. CREDIT_SALE_ITEMS TABLE (items in each credit sale)
CREATE TABLE IF NOT EXISTS credit_sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_sale_id UUID NOT NULL REFERENCES credit_sales(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    item_name TEXT NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    quantity_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_sale_items_sale ON credit_sale_items(credit_sale_id);

-- 4. CREDIT_STORE TABLE (tracks items in credit store)
CREATE TABLE IF NOT EXISTS credit_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_sale_id UUID NOT NULL REFERENCES credit_sales(id),
    credit_sale_item_id UUID NOT NULL REFERENCES credit_sale_items(id),
    creditor_id UUID NOT NULL REFERENCES creditors(id),
    item_id UUID NOT NULL REFERENCES items(id),
    item_name TEXT NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_paid', 'paid', 'returned', 'available_for_return')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_store_creditor ON credit_store(creditor_id);
CREATE INDEX IF NOT EXISTS idx_credit_store_status ON credit_store(status);
CREATE INDEX IF NOT EXISTS idx_credit_store_item ON credit_store(item_id);

-- 5. CREDIT_PAYMENTS TABLE (payments made by creditors)
CREATE TABLE IF NOT EXISTS credit_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creditor_id UUID NOT NULL REFERENCES creditors(id),
    credit_sale_id UUID NOT NULL REFERENCES credit_sales(id),
    staff_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(12,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'pos', 'online_transfer', 'bank_deposit')),
    reference_number TEXT,
    receipt_url TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    approved_by UUID REFERENCES users(id),
    approved_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_payments_creditor ON credit_payments(creditor_id);
CREATE INDEX IF NOT EXISTS idx_credit_payments_status ON credit_payments(status);
CREATE INDEX IF NOT EXISTS idx_credit_payments_staff ON credit_payments(staff_id);

-- 6. CREDIT_PAYMENT_ITEMS TABLE (items covered by each payment)
CREATE TABLE IF NOT EXISTS credit_payment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_payment_id UUID NOT NULL REFERENCES credit_payments(id) ON DELETE CASCADE,
    credit_sale_item_id UUID NOT NULL REFERENCES credit_sale_items(id),
    item_id UUID NOT NULL REFERENCES items(id),
    quantity DECIMAL(12,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_payment_items_payment ON credit_payment_items(credit_payment_id);

-- 7. CREDIT_ACTIVITIES TABLE (activity log for credit system)
CREATE TABLE IF NOT EXISTS credit_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creditor_id UUID REFERENCES creditors(id),
    credit_sale_id UUID REFERENCES credit_sales(id),
    credit_payment_id UUID REFERENCES credit_payments(id),
    staff_id UUID NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_activities_creditor ON credit_activities(creditor_id);
CREATE INDEX IF NOT EXISTS idx_credit_activities_created ON credit_activities(created_at);

-- Enable RLS on all tables
ALTER TABLE creditors ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow admin/superadmin/sales full access via service_role key
CREATE POLICY "Service role full access creditors" ON creditors FOR ALL USING (true);
CREATE POLICY "Service role full access credit_sales" ON credit_sales FOR ALL USING (true);
CREATE POLICY "Service role full access credit_sale_items" ON credit_sale_items FOR ALL USING (true);
CREATE POLICY "Service role full access credit_store" ON credit_store FOR ALL USING (true);
CREATE POLICY "Service role full access credit_payments" ON credit_payments FOR ALL USING (true);
CREATE POLICY "Service role full access credit_payment_items" ON credit_payment_items FOR ALL USING (true);
CREATE POLICY "Service role full access credit_activities" ON credit_activities FOR ALL USING (true);
