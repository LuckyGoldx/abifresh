-- Add selling price columns to receipt_items table
-- This stores the actual prices items were sold at (not cost price)

ALTER TABLE receipt_items 
ADD COLUMN price_jalingo DECIMAL(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE receipt_items 
ADD COLUMN price_outside_jalingo DECIMAL(10, 2);

-- Create index for better query performance
CREATE INDEX idx_receipt_items_prices ON receipt_items(price_jalingo, price_outside_jalingo);
