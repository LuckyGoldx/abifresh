-- ========================================
-- COMPLETE SETUP SQL SCRIPT
-- Run these commands in Supabase SQL Editor
-- ========================================

-- Step 1: Ensure all items have inventory records in main_store
-- (Inserts only for items that don't have records yet)
INSERT INTO inventory_main_store (item_id, quantity_in_stock, reorder_level, last_restocked)
SELECT id, 0, 10, NOW() FROM items
WHERE id NOT IN (SELECT DISTINCT item_id FROM inventory_main_store)
ORDER BY id LIMIT 10
ON CONFLICT DO NOTHING;

-- Step 2: Ensure all items have inventory records in active_store
-- (Inserts only for items that don't have records yet)
INSERT INTO inventory_active_store (item_id, quantity_available, quantity_sold)
SELECT id, 0, 0 FROM items
WHERE id NOT IN (SELECT DISTINCT item_id FROM inventory_active_store)
ORDER BY id LIMIT 10
ON CONFLICT DO NOTHING;

-- Step 3: Update inventory_main_store with random quantities
-- Adds 50-200 units to each item
UPDATE inventory_main_store
SET quantity_in_stock = FLOOR(RANDOM() * 151 + 50)::INT
WHERE item_id IN (
  SELECT id FROM items ORDER BY id LIMIT 10
);

-- Step 4: Update inventory_active_store with random quantities
-- Adds 10-80 units to each item
UPDATE inventory_active_store
SET quantity_available = FLOOR(RANDOM() * 71 + 10)::INT
WHERE item_id IN (
  SELECT id FROM items ORDER BY id LIMIT 10
);

-- Step 5: Verify the data was populated correctly
SELECT 
  i.id,
  i.name,
  i.sku,
  ims.quantity_in_stock as "Main Store",
  ias.quantity_available as "Active Store",
  (ims.quantity_in_stock + ias.quantity_available) as "Total Qty",
  i.unit_price,
  (ims.quantity_in_stock + ias.quantity_available) * i.unit_price as "Total Value",
  i.commission
FROM items i
LEFT JOIN inventory_main_store ims ON i.id = ims.item_id
LEFT JOIN inventory_active_store ias ON i.id = ias.item_id
ORDER BY i.id
LIMIT 10;

-- Step 6: Show summary statistics
SELECT 
  COUNT(DISTINCT i.id) as "Total Items",
  SUM(ims.quantity_in_stock) as "Total Main Store",
  SUM(ias.quantity_available) as "Total Active Store",
  SUM(ims.quantity_in_stock + ias.quantity_available) as "Total Quantity",
  SUM((ims.quantity_in_stock + ias.quantity_available) * i.unit_price) as "Total Inventory Value"
FROM items i
LEFT JOIN inventory_main_store ims ON i.id = ims.item_id
LEFT JOIN inventory_active_store ias ON i.id = ias.item_id
WHERE i.id IN (SELECT id FROM items ORDER BY id LIMIT 10);

-- ========================================
-- VERIFICATION: Check each item has quantities
-- ========================================

-- Quick Check: Show all 10 items with their quantities
SELECT 
  ROW_NUMBER() OVER (ORDER BY i.id) as "#",
  i.name,
  COALESCE(ims.quantity_in_stock, 0) as "Main Store Qty",
  COALESCE(ias.quantity_available, 0) as "Active Store Qty",
  (COALESCE(ims.quantity_in_stock, 0) + COALESCE(ias.quantity_available, 0)) as "Total Qty",
  CASE 
    WHEN (COALESCE(ims.quantity_in_stock, 0) + COALESCE(ias.quantity_available, 0)) = 0 THEN '❌ MISSING'
    ELSE '✅ OK'
  END as "Status"
FROM items i
LEFT JOIN inventory_main_store ims ON i.id = ims.item_id
LEFT JOIN inventory_active_store ias ON i.id = ias.item_id
ORDER BY i.id
LIMIT 10;

-- Uncomment to reset all quantities to 0
/*
UPDATE inventory_main_store SET quantity_in_stock = 0;
UPDATE inventory_active_store SET quantity_available = 0;
*/

-- ========================================
-- OPTIONAL: Delete and recreate inventory
-- (Only if data is corrupt)
-- ========================================

/*
-- Delete all inventory records
DELETE FROM inventory_main_store;
DELETE FROM inventory_active_store;

-- Recreate for all items
INSERT INTO inventory_main_store (item_id, quantity_in_stock, reorder_level, last_restocked)
SELECT id, 0, 10, NOW() FROM items;

INSERT INTO inventory_active_store (item_id, quantity_available, quantity_sold)
SELECT id, 0, 0 FROM items;

-- Then run Step 3 and 4 above to populate with random data
*/
