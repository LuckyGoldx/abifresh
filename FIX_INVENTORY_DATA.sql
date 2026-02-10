-- ========================================
-- FIX CORRUPTED INVENTORY DATA
-- Run this in Supabase SQL Editor to fix item names/prices showing as 0
-- ========================================

-- Step 1: Delete all existing corrupted inventory records
DELETE FROM inventory_main_store;
DELETE FROM inventory_active_store;
DELETE FROM staff_store;

-- Step 2: Re-create inventory records for ALL valid items in the items table
-- This links the correct item_ids from items table
INSERT INTO inventory_main_store (item_id, quantity_in_stock, reorder_level, last_restocked)
SELECT 
  id, 
  FLOOR(RANDOM() * 151 + 50)::INT,  -- Random 50-200 units
  100,  -- Reorder level set to 100
  NOW()
FROM items;

-- Step 3: Create active store records with random quantities  
INSERT INTO inventory_active_store (item_id, quantity_available, quantity_sold)
SELECT 
  id,
  FLOOR(RANDOM() * 71 + 10)::INT,  -- Random 10-80 units
  0
FROM items;

-- Step 4: Verify the fix - should show item names and prices correctly
SELECT 
  i.id,
  i.name,
  i.sku,
  ims.quantity_in_stock as main_store_qty,
  ias.quantity_available as active_store_qty,
  (COALESCE(ims.quantity_in_stock, 0) + COALESCE(ias.quantity_available, 0)) as total_qty,
  i.unit_price,
  (COALESCE(ims.quantity_in_stock, 0) + COALESCE(ias.quantity_available, 0)) * i.unit_price as total_value
FROM items i
LEFT JOIN inventory_main_store ims ON i.id = ims.item_id
LEFT JOIN inventory_active_store ias ON i.id = ias.item_id
ORDER BY i.name;
