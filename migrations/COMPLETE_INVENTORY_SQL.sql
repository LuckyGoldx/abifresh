-- ========================================
-- COMPLETE INVENTORY SETUP SQL
-- Copy & Paste Everything Below Into Supabase SQL Editor
-- ========================================

-- STEP 0: Clear Existing Data (if database already has items)
-- This prevents duplicate key errors
DELETE FROM inventory_active_store;
DELETE FROM inventory_main_store;
DELETE FROM items;

-- STEP 1: Insert 10 Sample Test Items into Items Table with Auto-Generated SKUs
-- SKUs are auto-generated from item names in format: ABBREV-###
-- Using unit_price (the correct column name)
INSERT INTO items (name, category, unit_price, sku, description, unit_of_measurement, is_active)
VALUES
  ('Bananas', 'Fruits', 2500, 'BAN-001', 'Fresh bananas', 'kg', true),
  ('Tomatoes', 'Vegetables', 500, 'TOM-001', 'Fresh tomatoes', 'kg', true),
  ('Milk (1L)', 'Dairy', 1200, 'MIL-001', 'Fresh milk 1 liter', 'liter', true),
  ('Oranges', 'Fruits', 800, 'ORA-001', 'Fresh oranges', 'kg', true),
  ('Lettuce', 'Vegetables', 350, 'LET-001', 'Fresh lettuce', 'piece', true),
  ('Rice (5kg)', 'Grains', 4000, 'RIC-001', 'Long grain rice 5kg', 'bag', true),
  ('Eggs (Crate)', 'Dairy', 2800, 'EGG-001', 'Crate of eggs', 'crate', true),
  ('Carrots', 'Vegetables', 600, 'CAR-001', 'Fresh carrots', 'kg', true),
  ('Apples', 'Fruits', 1000, 'APP-001', 'Fresh apples', 'kg', true),
  ('Beans (1kg)', 'Grains', 1500, 'BEA-001', 'Dried beans 1kg', 'bag', true);

-- STEP 2: Add Initial Inventory to Main Store for Each Item with Random Quantities
-- Each item gets a random quantity between 20 and 100 for testing transfers
INSERT INTO inventory_main_store (item_id, quantity_in_stock, reorder_level)
SELECT id, 85, 5 FROM items WHERE sku = 'BAN-001'
UNION ALL
SELECT id, 62, 5 FROM items WHERE sku = 'TOM-001'
UNION ALL
SELECT id, 44, 5 FROM items WHERE sku = 'MIL-001'
UNION ALL
SELECT id, 91, 5 FROM items WHERE sku = 'ORA-001'
UNION ALL
SELECT id, 73, 5 FROM items WHERE sku = 'LET-001'
UNION ALL
SELECT id, 58, 5 FROM items WHERE sku = 'RIC-001'
UNION ALL
SELECT id, 37, 5 FROM items WHERE sku = 'EGG-001'
UNION ALL
SELECT id, 78, 5 FROM items WHERE sku = 'CAR-001'
UNION ALL
SELECT id, 67, 5 FROM items WHERE sku = 'APP-001'
UNION ALL
SELECT id, 51, 5 FROM items WHERE sku = 'BEA-001';

-- STEP 3: Initialize Active Store Inventory with Random Quantities for Testing
-- This allows you to immediately test transfers between stores
INSERT INTO inventory_active_store (item_id, quantity_available, quantity_sold)
SELECT id, 25, 5 FROM items WHERE sku = 'BAN-001'
UNION ALL
SELECT id, 35, 8 FROM items WHERE sku = 'TOM-001'
UNION ALL
SELECT id, 15, 3 FROM items WHERE sku = 'MIL-001'
UNION ALL
SELECT id, 28, 6 FROM items WHERE sku = 'ORA-001'
UNION ALL
SELECT id, 18, 4 FROM items WHERE sku = 'LET-001'
UNION ALL
SELECT id, 22, 5 FROM items WHERE sku = 'RIC-001'
UNION ALL
SELECT id, 12, 2 FROM items WHERE sku = 'EGG-001'
UNION ALL
SELECT id, 32, 7 FROM items WHERE sku = 'CAR-001'
UNION ALL
SELECT id, 29, 6 FROM items WHERE sku = 'APP-001'
UNION ALL
SELECT id, 20, 4 FROM items WHERE sku = 'BEA-001';

-- STEP 4: Verify Everything Worked
-- Run this query to confirm all 10 items are set up correctly
SELECT 
  i.name,
  i.sku,
  i.unit_price,
  i.category,
  COALESCE(m.quantity_in_stock, 0) as main_store_qty,
  COALESCE(a.quantity_available, 0) as active_store_qty
FROM items i
LEFT JOIN inventory_main_store m ON i.id = m.item_id
LEFT JOIN inventory_active_store a ON i.id = a.item_id
WHERE i.sku IN ('BAN-001', 'TOM-001', 'MIL-001', 'ORA-001', 'LET-001', 'RIC-001', 'EGG-001', 'CAR-001', 'APP-001', 'BEA-001')
ORDER BY i.created_at DESC;
