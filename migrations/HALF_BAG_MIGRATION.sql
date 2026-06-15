-- ============================================================
-- Half-Bag Support Migration
-- Allows quantities to be sold in 0.5 increments (half bags)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Items table: allow fractional quantities in both stores
ALTER TABLE items ALTER COLUMN active_store_quantity TYPE NUMERIC(10,1);
ALTER TABLE items ALTER COLUMN main_store_quantity TYPE NUMERIC(10,1);

-- 2. Staff store: posted batches are still whole bags,
--    but quantity_sold decrements in 0.5 steps as staff sells halves.
--    quantity_available is GENERATED ALWAYS AS (quantity - quantity_sold) STORED
--    so we must drop it, alter base columns, then recreate it.
ALTER TABLE staff_store DROP COLUMN IF EXISTS quantity_available;
ALTER TABLE staff_store ALTER COLUMN quantity TYPE NUMERIC(10,1);
ALTER TABLE staff_store ALTER COLUMN quantity_sold TYPE NUMERIC(10,1);
ALTER TABLE staff_store
  ADD COLUMN quantity_available NUMERIC(10,1)
  GENERATED ALWAYS AS (quantity - quantity_sold) STORED;

-- 3. Staff sales: record decimal quantities sold
ALTER TABLE staff_sales ALTER COLUMN quantity TYPE NUMERIC(10,1);

-- 4. Sales items (from sales/make-sale page): record decimal quantities
ALTER TABLE sales_items ALTER COLUMN quantity TYPE NUMERIC(10,1);

-- 5. Daily sales summary: total_items_sold can now be fractional
ALTER TABLE daily_sales_summary ALTER COLUMN total_items_sold TYPE NUMERIC(10,1);

-- 6. Receipt items: record decimal quantities in receipts
ALTER TABLE receipt_items ALTER COLUMN quantity TYPE NUMERIC(10,1);

-- 7. Posted items: batches posted to staff (still whole bags, but allow decimal for consistency)
ALTER TABLE posted_items ALTER COLUMN quantity TYPE NUMERIC(10,1);

-- 8. Returned items: returned quantities can now be fractional
ALTER TABLE returned_items ALTER COLUMN quantity TYPE NUMERIC(10,1);
