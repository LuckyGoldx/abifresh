-- ========================================
-- UPDATE ITEMS TABLE TO ADD COMMISSION
-- Run this in Supabase SQL Editor
-- ========================================

-- Add commission column to items table
ALTER TABLE items ADD COLUMN commission DECIMAL(10, 2) DEFAULT 0;

-- Verify the column was added
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'items' AND column_name = 'commission';

-- Optional: Set default commission to 0 for existing items
UPDATE items SET commission = 0 WHERE commission IS NULL;
