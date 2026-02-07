# Staff Store - Quantity Tracking Guide

## Quantity Fields Reference

### In `items` table
- **`active_store_quantity`**: Total items available for posting to staff
- **`quantity`**: Total items in system (active + main + other stores)

### In `staff_store` table
- **`quantity`**: Total items posted to this staff
- **`quantity_sold`**: Items sold by this staff
- **`quantity_available`**: Calculated field = quantity - quantity_sold (READ-ONLY)

### In `staff_sales` table
- **`quantity`**: Number of units sold in this transaction

---

## Quantity Flow Diagram

```
SALES STAFF POSTS ITEMS:
  items.active_store_quantity: 100
  ↓ POST /api/sales/post-items (quantity: 20)
  items.active_store_quantity: 80 ✓ DEDUCTED
  ↓
  posted_items.status = "pending"
  posted_items.quantity = 20

COMMISSION STAFF ACCEPTS:
  posted_items.quantity: 20
  ↓ POST /api/staff/store/accept-items
  staff_store.quantity = 20 ✓ CREATED
  staff_store.quantity_sold = 0 ✓ INITIALIZED
  staff_store.quantity_available = 20 ✓ CALCULATED
  ↓
  posted_items.status = "accepted"

COMMISSION STAFF MAKES SALE:
  staff_store.quantity_available = 20
  ↓ POST /api/staff/store/make-sale (quantity: 5)
  staff_store.quantity_sold = 5 ✓ INCREMENTED
  staff_store.quantity_available = 15 ✓ RECALCULATED
  ↓
  staff_sales entry created with quantity = 5

MULTIPLE SALES:
  staff_store.quantity = 20 (never changes)
  ↓
  staff_store.quantity_sold = 5 (after first sale)
  staff_store.quantity_available = 15
  ↓
  staff_store.quantity_sold = 12 (after second sale: 7 more)
  staff_store.quantity_available = 8
  ↓
  ... continues until quantity_available = 0
```

---

## Validation Rules

### Rule 1: Cannot post more than available
```typescript
if (item.active_store_quantity < quantity) {
  throw new Error("Insufficient quantity in active store")
}
// VALID: active_store_quantity >= post_quantity
```

### Rule 2: Cannot sell more than available in staff store
```typescript
if (staff_store.quantity_available < quantity) {
  throw new Error("Insufficient quantity in staff store")
}
// VALID: quantity_available >= sale_quantity
// VALID: (quantity - quantity_sold) >= sale_quantity
```

### Rule 3: Quantity sold cannot exceed total quantity
```typescript
// Guaranteed by Rule 2 + increment logic
staff_store.quantity_sold <= staff_store.quantity
// Always true
```

### Rule 4: Quantity available is never negative
```typescript
// Calculated as: quantity - quantity_sold
// Since quantity_sold is only incremented when available > 0,
// quantity_available can never go below 0
```

---

## Transaction Sequence Examples

### Example 1: Complete Flow

```
1. Sales: 100 active items of Product A
   items.active_store_quantity = 100

2. Sales staff posts 30 units to John (commission staff)
   POST /api/sales/post-items
   - items.active_store_quantity = 70 (100 - 30)
   - posted_items.quantity = 30, status = pending

3. John reviews and accepts items
   POST /api/staff/store/accept-items
   - staff_store.quantity = 30
   - staff_store.quantity_sold = 0
   - staff_store.quantity_available = 30

4. John sells 10 units for cash
   POST /api/staff/store/make-sale (quantity: 10)
   - staff_store.quantity_sold = 10
   - staff_store.quantity_available = 20
   - staff_sales entry created

5. John sells 15 more units for transfer
   POST /api/staff/store/make-sale (quantity: 15)
   - staff_store.quantity_sold = 25 (10 + 15)
   - staff_store.quantity_available = 5 (30 - 25)
   - staff_sales entry created

6. John tries to sell 10 more units
   POST /api/staff/store/make-sale (quantity: 10)
   - ERROR: Insufficient quantity (available: 5, requested: 10)
   - No changes made

7. John sells remaining 5 units
   POST /api/staff/store/make-sale (quantity: 5)
   - staff_store.quantity_sold = 30 (25 + 5)
   - staff_store.quantity_available = 0 (30 - 30)
   - staff_sales entry created
   - John's store now empty for this product

State after all operations:
  - items.active_store_quantity: 70 (down from 100)
  - staff_store (John): 0 available (30 received, 30 sold)
  - staff_sales: 3 entries (10 + 15 + 5 units sold)
  - Total in system: 70 + 30 = 100 ✓ (conserved)
```

### Example 2: Rejection Flow

```
1. Sales staff posts 20 units to Jane (non-commission staff)
   - items.active_store_quantity: 80 → 60
   - posted_items.quantity = 20, status = pending

2. Jane rejects the items
   POST /api/staff/store/reject-items
   - items.active_store_quantity: 60 → 80 (restored)
   - posted_items.status = rejected
   - staff_store entry NOT created

State after rejection:
  - items.active_store_quantity: 80 (back to what it was before post)
  - posted_items: 1 entry with status = rejected
  - staff_store (Jane): No entry for this product
  - Total in system: Unchanged
```

---

## Admin Dashboard Calculations

### Total Quantity for Staff
```sql
SELECT staff_id, SUM(quantity) as total_posted
FROM staff_store
GROUP BY staff_id
```

### Total Sold for Staff
```sql
SELECT staff_id, SUM(quantity) as total_sold
FROM staff_sales
GROUP BY staff_id
```

### Available for Staff
```sql
SELECT staff_id, 
       SUM(quantity) - COALESCE(SUM(quantity_sold), 0) as total_available
FROM staff_store
GROUP BY staff_id
```

### Sell-Through Rate
```sql
SELECT staff_id,
       ROUND(
         SUM(quantity_sold)::numeric / SUM(quantity) * 100, 2
       ) as sell_through_rate
FROM staff_store
GROUP BY staff_id
```

---

## Data Consistency Checks

### Check 1: No orphaned quantities
```sql
-- Verify all staff_sales reference valid staff_store items
SELECT * FROM staff_sales s
LEFT JOIN staff_store st ON s.staff_id = st.staff_id 
  AND s.item_id = st.item_id
WHERE st.id IS NULL;
-- Should return 0 rows
```

### Check 2: Quantity sold never exceeds total
```sql
-- Verify quantity_sold <= quantity for all staff_store
SELECT * FROM staff_store
WHERE quantity_sold > quantity;
-- Should return 0 rows
```

### Check 3: Active store not overcounted
```sql
-- Verify all posted items sum to valid quantity
SELECT i.id, i.active_store_quantity,
       COALESCE(SUM(ss.quantity), 0) as in_staff_stores,
       i.active_store_quantity + COALESCE(SUM(ss.quantity), 0) as total
FROM items i
LEFT JOIN staff_store ss ON i.id = ss.item_id
GROUP BY i.id
HAVING i.active_store_quantity + COALESCE(SUM(ss.quantity), 0) > i.quantity;
-- Should return 0 rows if total never exceeds original
```

---

## Performance Considerations

### Optimized Queries
1. **Get staff store with availability**
   - Uses single SELECT with calculated field
   - Indexes on staff_id, item_id

2. **Get sales history**
   - Uses limit and order by sale_date desc
   - Indexes on staff_id, sale_date

3. **Admin dashboard summary**
   - Uses GROUP BY with SUM aggregates
   - Efficient for reasonable staff count

### Slow Queries to Avoid
- Large date range queries without indexing
- Calculating sell-through on-the-fly without aggregates
- Loading all sales without pagination

---

## Reconciliation Procedure

If quantities get out of sync:

1. **Find the discrepancy**
   ```sql
   SELECT i.id, i.name, i.active_store_quantity,
          SUM(ss.quantity) as in_staff_stores,
          i.active_store_quantity + COALESCE(SUM(ss.quantity), 0) as total
   FROM items i
   LEFT JOIN staff_store ss ON i.id = ss.item_id
   GROUP BY i.id
   WHERE i.active_store_quantity + COALESCE(SUM(ss.quantity), 0) != i.quantity;
   ```

2. **Review posted items**
   ```sql
   SELECT * FROM posted_items 
   WHERE item_id = 'affected-item-id'
   ORDER BY created_at DESC;
   ```

3. **Check staff sales**
   ```sql
   SELECT staff_id, SUM(quantity) as total_sold
   FROM staff_sales
   WHERE item_id = 'affected-item-id'
   GROUP BY staff_id;
   ```

4. **Manually correct if needed**
   ```sql
   UPDATE items 
   SET active_store_quantity = [correct_value]
   WHERE id = 'affected-item-id';
   ```

---

## Summary

- **Active Store**: Controlled by sales/admin via post-items action
- **Staff Store**: Created when staff accepts, updated when staff sells
- **Quantity Available**: Always calculated as (quantity - quantity_sold)
- **Never negative**: Validation prevents selling more than available
- **Traceable**: Every transaction logged in staff_sales or activity_logs

The system maintains data integrity through:
1. Validation rules at API level
2. Database constraints
3. Calculated fields (triggers/generated columns)
4. Proper error handling
5. Activity logging for audit trail
