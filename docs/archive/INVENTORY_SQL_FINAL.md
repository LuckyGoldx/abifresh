# INVENTORY SQL SETUP - FINAL VERSION

## ⚠️ IMPORTANT: Verify Your Table Structure First

Before running any SQL, run this diagnostic query in Supabase SQL Editor:

```sql
-- Check what columns your items table actually has
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'items'
ORDER BY ordinal_position;
```

This will show you exactly what columns exist. Copy the results here so we can create the right SQL.

---

## IF Your Items Table Already Has These Columns:
- id
- name
- category
- base_price (or price or unit_price)
- quantity
- created_at
- updated_at

### Then Run This First (Add Missing Columns):
```sql
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS active_store_quantity INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS main_store_quantity INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0;
```

### Then Run This (Populate Existing Items - If You Have Any):
```sql
-- Only update items that don't have the new columns filled in yet
UPDATE items 
SET 
  active_store_quantity = 0,
  main_store_quantity = COALESCE(quantity, 0),
  commission_amount = 0
WHERE active_store_quantity = 0 AND main_store_quantity = 0;
```

---

## IF Your Items Table Structure is Different:

Run the diagnostic query above and share the column names. Then I'll provide the exact SQL needed.

---

## Step 3: Insert 10 Sample Test Items

**Important:** All quantity goes to main_store, active_store = 0

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

This creates 10 items with:
- **All quantity in main_store** (the reserves)
- **active_store = 0** (nothing available for sale)
- **Different commission amounts** per item

---

## Step 4: Verify The Sample Data

```sql
SELECT 
  name, 
  base_price,
  quantity, 
  active_store_quantity, 
  main_store_quantity, 
  commission_amount
FROM items 
ORDER BY created_at DESC 
LIMIT 10;
```

**Expected result:**
```
name            | base_price | quantity | active_store | main_store | commission
Bananas         | 2500       | 50       | 0            | 50         | 100
Tomatoes        | 500        | 100      | 0            | 100        | 25
Milk (1L)       | 1200       | 30       | 0            | 30         | 50
Oranges         | 800        | 75       | 0            | 75         | 40
Lettuce         | 350        | 40       | 0            | 40         | 15
Rice (5kg)      | 4000       | 20       | 0            | 20         | 200
Eggs (Crate)    | 2800       | 15       | 0            | 15         | 150
Carrots         | 600        | 60       | 0            | 60         | 30
Apples          | 1000       | 45       | 0            | 45         | 50
Beans (1kg)     | 1500       | 35       | 0            | 35         | 75
```

---

## How To Test The Inventory System

### Test 1: Items Are Available
Items should appear in Admin → Inventory table with all data from main_store.

### Test 2: Transfer Items to Active Store
- Click Transfer on any item
- Move 5 units from Main → Active
- Main store should decrease by 5
- Active store should increase by 5
- Total stays same

### Test 3: Make a Sale
- From Sales page, sell 2 units of Bananas
- Active store should go from 5 → 3
- Total should decrease by 2
- Main store should stay unchanged

### Test 4: Edit Item Quantity
- Edit Bananas quantity from 50 → 60
- Main store should go from 50 → 60 (adds 10)
- Active store stays same (at whatever it was)

---

## Key Changes Made:

✅ **Active Store Default = 0**
   - No items available for sale by default
   - Must be transferred by admin

✅ **Main Store Gets Full Quantity**
   - All stock is in reserves initially
   - Protected from accidental sales

✅ **Edit Quantity Logic**
   - If you increase qty: extra goes to main_store
   - If you decrease qty: comes from main_store
   - active_store unaffected

✅ **10 Sample Items**
   - Various categories (Fruits, Vegetables, Dairy, Grains)
   - Different prices and commissions
   - Ready to test transfers and sales

---

## SQL Execution Order:

1. **First:** Run diagnostic query to check table structure
2. **Second:** Run ALTER TABLE to add missing columns (if needed)
3. **Third:** Run UPDATE to populate existing items (if you have any)
4. **Fourth:** Run INSERT to add 10 sample items
5. **Fifth:** Run SELECT to verify everything

---

## Troubleshooting

**Error: "column quantity does not exist"**
- Your items table might have a different column name
- Run diagnostic query to see exact column names
- Use your actual column names in the UPDATE statement

**Error: "column active_store_quantity already exists"**
- The columns were already added
- Just skip the ALTER TABLE step
- Run the INSERT to add sample data

**Error: "duplicate key value"**
- You might already have items with these names
- Either delete old items first or change the sample names

---

## Next Steps:

1. Copy the SQL from this file
2. Run diagnostic query first
3. Adjust any column names if different
4. Run the ALTER TABLE (add columns)
5. Run the UPDATE (populate existing items)
6. Run the INSERT (add 10 samples)
7. Run the SELECT (verify results)
8. Rebuild backend: `npm run build && npm run dev`
9. Rebuild frontend: `npm run build && npm run dev`
10. Test the inventory system

**That's it!** Your inventory system should now work with all qty in main_store initially.
