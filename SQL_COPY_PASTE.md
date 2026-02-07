# ⚡ QUICK SQL - Copy & Paste Ready

## First: Check Your Table Structure

**Run this in Supabase SQL Editor:**

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'items'
ORDER BY ordinal_position;
```

This will show you what columns your items table has. **Copy the results and compare with expected columns below.**

---

## Expected Items Table Columns

Your table should have at least these columns:
- `id` (UUID)
- `name` (VARCHAR)
- `category` (VARCHAR)
- `base_price` (DECIMAL or NUMERIC)
- `quantity` (INT) ← **IMPORTANT: This one might be missing/named differently**
- `is_available` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**If `quantity` column doesn't exist**, that explains the error!

---

## Solution: Add Missing Columns

If your table doesn't have the new columns, run this:

```sql
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS active_store_quantity INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS main_store_quantity INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0;
```

---

## ✅ Add 10 Sample Items (Regardless of Table Structure)

This works whether you have existing items or not:

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

**What this does:**
- Creates 10 items
- All quantity goes to `main_store`
- `active_store` = 0 (nothing for sale yet)
- Ready to test transfers and sales

---

## Verify It Worked

After running INSERT, run this:

```sql
SELECT name, quantity, active_store_quantity, main_store_quantity, commission_amount
FROM items
ORDER BY created_at DESC
LIMIT 10;
```

Should show 10 items with active_store=0 and main_store=quantity.

---

## The 3-Step SQL Process

### Step 1: Add Columns (One-time)
```sql
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS active_store_quantity INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS main_store_quantity INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0;
```

### Step 2: Insert Sample Data
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

### Step 3: Verify
```sql
SELECT name, quantity, active_store_quantity, main_store_quantity
FROM items
ORDER BY created_at DESC
LIMIT 10;
```

---

## If You Get "quantity column doesn't exist" Error

Your table structure is different. Here's the fix:

1. **Run diagnostic:**
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'items';
```

2. **Find your quantity column name** (might be `stock`, `available`, `qty`, etc.)

3. **If it's different, update the INSERT:**
   - Replace `quantity` with your actual column name
   - Replace `active_store_quantity` if yours is different
   - Replace `main_store_quantity` if yours is different

4. **Or contact me with the list of columns** and I'll write the exact SQL

---

## If Your Items Table Doesn't Have a Quantity Column

Create it first:

```sql
ALTER TABLE items 
ADD COLUMN quantity INT DEFAULT 0;
```

Then run the INSERT and the system will work.

---

## Done! Now What?

1. ✅ Run ALTER TABLE (add columns)
2. ✅ Run INSERT (add 10 items)
3. ✅ Rebuild backend: `npm run build && npm run dev`
4. ✅ Rebuild frontend: `npm run build && npm run dev`
5. ✅ Go to Admin → Inventory
6. ✅ Test: Create, Edit, Transfer, Delete items

**All 10 sample items will be there with:**
- Quantity in main_store
- 0 in active_store
- Ready to transfer and test sales

---

## Sample Data Details

| Item | Price (₦) | Qty | Main | Active |
|------|----------|-----|------|--------|
| Bananas | 2,500 | 50 | 50 | 0 |
| Tomatoes | 500 | 100 | 100 | 0 |
| Milk | 1,200 | 30 | 30 | 0 |
| Oranges | 800 | 75 | 75 | 0 |
| Lettuce | 350 | 40 | 40 | 0 |
| Rice | 4,000 | 20 | 20 | 0 |
| Eggs | 2,800 | 15 | 15 | 0 |
| Carrots | 600 | 60 | 60 | 0 |
| Apples | 1,000 | 45 | 45 | 0 |
| Beans | 1,500 | 35 | 35 | 0 |

Total: 470 units in Main Store, 0 in Active Store

---

## ✨ That's It!

Copy the SQL above, run it in Supabase, rebuild your backend and frontend, and you're ready to test!
