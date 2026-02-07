-- ============================================================================
-- STAFF DASHBOARD SCHEMA UPDATES
-- Ensures all necessary columns exist for the staff dashboard functionality
-- ============================================================================

-- Update posted_items table to include comment field
ALTER TABLE IF EXISTS posted_items 
ADD COLUMN IF NOT EXISTS staff_comment TEXT;

-- Update staff_payments table to support item-specific payments
ALTER TABLE IF EXISTS staff_payments 
ADD COLUMN IF NOT EXISTS items_paid_for JSONB,
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS reference_number TEXT,
ADD COLUMN IF NOT EXISTS staff_name VARCHAR(255);

-- Ensure expenses table has all needed fields
ALTER TABLE IF EXISTS expenses 
ADD COLUMN IF NOT EXISTS expense_date DATE DEFAULT CURRENT_DATE;

-- Create indexes for faster queries (using flexible column name detection)
-- Note: These will only be created if the columns exist
DO $$ 
BEGIN
    -- Index for posted_items (handles both posted_to_id and receiver_staff_id)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posted_items' AND column_name='posted_to_id') THEN
        CREATE INDEX IF NOT EXISTS idx_posted_items_posted_to_status ON posted_items(posted_to_id, status);
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posted_items' AND column_name='receiver_staff_id') THEN
        CREATE INDEX IF NOT EXISTS idx_posted_items_receiver_status ON posted_items(receiver_staff_id, status);
    END IF;
    
    -- Index for staff_payments
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_payments' AND column_name='staff_id') THEN
        CREATE INDEX IF NOT EXISTS idx_staff_payments_staff_status ON staff_payments(staff_id, status);
    END IF;
    
    -- Index for expenses
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='staff_id') THEN
        CREATE INDEX IF NOT EXISTS idx_expenses_staff_date ON expenses(staff_id, created_at);
    END IF;
    
    -- Index for notifications
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
    END IF;
END $$;

-- Add approved_amount column to track approved payments
ALTER TABLE IF EXISTS staff_payments 
ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(12,2);

-- Update notification system to support payment notifications
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='notifications' AND column_name='notification_type'
    ) THEN
        ALTER TABLE notifications ADD COLUMN notification_type VARCHAR(50);
    END IF;
END $$;

-- Add comments to document the schema (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='posted_items') THEN
        COMMENT ON TABLE posted_items IS 'Items posted from sales to staff members';
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posted_items' AND column_name='staff_comment') THEN
            COMMENT ON COLUMN posted_items.staff_comment IS 'Comment added by staff when accepting items';
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='staff_payments') THEN
        COMMENT ON TABLE staff_payments IS 'Payment requests and approvals for staff';
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_payments' AND column_name='items_paid_for') THEN
            COMMENT ON COLUMN staff_payments.items_paid_for IS 'JSON array of items being paid for';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_payments' AND column_name='reference_number') THEN
            COMMENT ON COLUMN staff_payments.reference_number IS 'Payment reference number';
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='expenses') THEN
        COMMENT ON TABLE expenses IS 'Staff expense tracking';
    END IF;
END $$;
