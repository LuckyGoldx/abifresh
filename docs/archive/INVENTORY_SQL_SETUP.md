# SQL Code for Inventory Setup

## Step 1: Check Existing Table Structure
Run this first to see what columns your items table has:
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'items' 
ORDER BY ordinal_position;
```

## Step 2: Add Missing Columns (If needed)
```sql
-- Add store quantity columns
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS active_store_quantity INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS main_store_quantity INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0;
```

## Step 3: Populate Existing Items (If your table already has quantity column)
```sql
-- If your items table HAS a "quantity" column, use this:
UPDATE items 
SET 
  active_store_quantity = 0,
  main_store_quantity = quantity,
  commission_amount = 0
WHERE active_store_quantity = 0 AND main_store_quantity = 0;
```

## Step 4: Create Sample Data (10 Test Items)
Insert fresh test data - all quantity goes to main_store, active_store = 0:

```sql
INSERT INTO items (name, category, base_price, quantity, active_store_quantity, main_store_quantity, commission_amount, is_available)
VALUES
  ('Bananas', 'Fruits', 2500, 50, 0, 50, 100, true),
  ('Tomatoes', 'Vegetables', 500, 100, 0, 100, 25, true),
  ('Milk (1L)', 'Dairy', 1200, 30, 0, 30, 50, true),
  ('Oranges', 'Fruits', 800, 75, 0, 75, 40, true),
  ('Lettuce', 'Vegetables', 350, 40, 0, 40, 15, true),
  ('Rice (5kg)', 'Grains', 4000, 20, 0, 20, 200, true),
  ('Eggs (Crate)', 'Dairy', 2800, 15, 0, 15, 150, true),
  ('Carrots', 'Vegetables', 600, 60, 0, 60, 30, true),
  ('Apples', 'Fruits', 1000, 45, 0, 45, 50, true),
  ('Beans (1kg)', 'Grains', 1500, 35, 0, 35, 75, true);
```

## Step 5: Verify Data
```sql
-- Check your items are inserted correctly
SELECT 
  name, 
  quantity, 
  active_store_quantity, 
  main_store_quantity, 
  commission_amount
FROM items 
ORDER BY created_at DESC 
LIMIT 10;
```

Expected result for each item:
- quantity = total amount
- active_store_quantity = 0
- main_store_quantity = quantity
- Commission varies per item

## Summary

**What's happening:**
- Active Store starts at **0** (nothing available for sale)
- Main Store gets the full **quantity** (all stock is in reserves)
- Admin must **transfer** items from Main → Active before sales can happen
- This prevents accidental sales from reserves

**How it works:**
1. Items added with all qty in main_store, active_store = 0
2. Admin transfers items to active store when ready for sale
3. Sales can only deduct from active_store
4. Main store stays protected until admin moves items

**10 Sample Items:**
1. Bananas (50 units)
2. Tomatoes (100 units)
3. Milk (30 units)
4. Oranges (75 units)
5. Lettuce (40 units)
6. Rice (20 units)
7. Eggs (15 units)
8. Carrots (60 units)
9. Apples (45 units)
10. Beans (35 units)

Run Step 1 first to check your table structure, then follow the steps above.
