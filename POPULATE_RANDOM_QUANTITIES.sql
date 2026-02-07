-- ========================================
-- POPULATE RANDOM QUANTITIES FOR INVENTORY
-- Run this in Supabase SQL Editor
-- ========================================

-- This script randomly populates quantities for both Main Store and Active Store
-- for the first 10 items in the inventory system

-- Update inventory_main_store with random quantities (50-200 units)
UPDATE inventory_main_store
SET quantity_in_stock = FLOOR(RANDOM() * 151 + 50)::INT -- Random between 50-200
WHERE item_id IN (
  SELECT id FROM items ORDER BY id LIMIT 10
);

-- Update inventory_active_store with random quantities (10-80 units)
UPDATE inventory_active_store
SET quantity_available = FLOOR(RANDOM() * 71 + 10)::INT -- Random between 10-80
WHERE item_id IN (
  SELECT id FROM items ORDER BY id LIMIT 10
);

-- Verify the updates - View all items with their quantities
SELECT 
  i.id,
  i.name,
  i.sku,
  ims.quantity_in_stock as main_store,
  ias.quantity_available as active_store,
  (ims.quantity_in_stock + ias.quantity_available) as total_quantity,
  i.unit_price,
  (ims.quantity_in_stock + ias.quantity_available) * i.unit_price as total_value
FROM items i
LEFT JOIN inventory_main_store ims ON i.id = ims.item_id
LEFT JOIN inventory_active_store ias ON i.id = ias.item_id
ORDER BY i.id
LIMIT 10;

-- Show summary statistics
SELECT 
  COUNT(*) as total_items,
  SUM(ims.quantity_in_stock) as total_main_store,
  SUM(ias.quantity_available) as total_active_store,
  SUM(ims.quantity_in_stock + ias.quantity_available) as total_quantity
FROM items i
LEFT JOIN inventory_main_store ims ON i.id = ims.item_id
LEFT JOIN inventory_active_store ias ON i.id = ias.item_id;
