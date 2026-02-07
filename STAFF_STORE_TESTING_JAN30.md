# Staff Store Fixes - Quick Testing Guide

## What Was Fixed

### 1. **Accepting Posted Items Now Works** ✅
- Error: "Cannot insert a non-DEFAULT value into column quantity_available"
- Cause: Trying to manually set a GENERATED ALWAYS column
- Fix: Removed `quantity_available` from INSERT and UPDATE operations

### 2. **Make-Sale Page Shows Only Accepted Items** ✅
- Issue: Fallback to active store was allowing staff to sell non-accepted items
- Fix: Removed fallback, staff can only sell items explicitly accepted to their store

### 3. **Quantity Tracking is Automatic** ✅
- `quantity_available` = `quantity` - `quantity_sold`
- Auto-updates on every sale
- No manual calculation needed

---

## Testing Workflow

### Step 1: Test Item Acceptance
```
1. Log in as SALES PERSON
2. Go to Sales Portal → Post Items
3. Select an item (e.g., Laptop)
4. Post quantity: 15
5. Select a staff member to post to
6. Click "Post Items"
```

✅ **Expected**: Success message, items deducted from active store

---

### Step 2: Accept Posted Items (THE FIX)
```
1. Log in as the STAFF MEMBER who received items
2. Go to Staff Portal → Posted Items
3. Find the pending item posted by sales person
4. Click "Accept" button
5. (Optional) Add comment
6. Click "Confirm Accept"
```

✅ **Expected**: 
- NO ERROR about "quantity_available"
- Success message
- Item should appear in make-sale page
- Quantity should show as 15

---

### Step 3: Verify Make-Sale Shows Only Accepted Items
```
1. Stay logged in as STAFF MEMBER
2. Go to Staff Portal → Make Sale
3. Look at available items
```

✅ **Expected**:
- ONLY items accepted to this staff member appear
- NO items from other staff stores
- NO items from active store
- Quantity shows: 15 (the quantity_available, which = 15 - 0)

❌ **NOT Expected**:
- Items from active store appearing
- Non-accepted posted items
- Other staff's items

---

### Step 4: Test Sales and Quantity Tracking
```
1. In Make Sale page, add 5 units of Laptop to cart
2. Change payment method if needed
3. Complete checkout
```

✅ **Expected**:
- Sale recorded successfully
- Sale appears in "Sales History"
- Quantity in make-sale updates to 10 (was 15, sold 5)
- quantity_available automatically = 15 - 5 = 10

---

### Step 5: Test Multiple Acceptances (SAME ITEM)
```
1. Log in as SALES PERSON
2. Post 10 units of Laptop to same staff
3. Log in as STAFF MEMBER
4. Go to Posted Items
5. Accept first posted item (15 units)
6. Accept second posted item (10 units)
```

✅ **Expected**:
- NO ERROR on second acceptance
- Quantity in make-sale: 25 (15 + 10)
- quantity_available automatically = 25 - 5 (previous sales) = 20

---

### Step 6: Test Complete Sellout
```
1. Make sales until all quantity is sold
   (e.g., if quantity_available = 20, make 4 sales of 5 each)
2. Check make-sale page
```

✅ **Expected**:
- Item disappears from make-sale when quantity_available = 0
- Cannot add more to cart (item grayed out or hidden)

---

### Step 7: Test Rejection Flow
```
1. Log in as SALES PERSON
2. Post 10 units to staff
3. Log in as STAFF MEMBER
4. Go to Posted Items
5. Click "Reject" on pending item
6. Add optional comment
7. Confirm rejection
```

✅ **Expected**:
- Item rejected successfully
- Items returned to active store
- Posted item does NOT appear in make-sale
- Active store quantity increases by 10

---

## Expected Data Values

### After Accepting 20 Units
```
Staff Store Entry:
  quantity: 20              ← Total accepted
  quantity_sold: 0          ← Nothing sold yet
  quantity_available: 20    ← GENERATED: 20 - 0
```

### After Selling 7 Units
```
Staff Store Entry:
  quantity: 20              ← Still total of 20
  quantity_sold: 7          ← 7 sold
  quantity_available: 13    ← GENERATED: 20 - 7
```

### After Selling All 20 Units
```
Staff Store Entry:
  quantity: 20              ← Total was 20
  quantity_sold: 20         ← All sold
  quantity_available: 0     ← GENERATED: 20 - 20
  
Result: Item removed from make-sale page
```

---

## Troubleshooting

### Issue: "Cannot insert non-DEFAULT value into column quantity_available"
- ❌ Backend not restarted after code changes
- ✅ Solution: Restart backend server

### Issue: Accepting items fails with different error
- ❌ Database migrations not applied
- ✅ Solution: Check STAFF_STORE_MIGRATION.sql is applied

### Issue: Make-sale showing items not accepted by this staff
- ❌ Code changes not loaded
- ✅ Solution: Clear browser cache and refresh

### Issue: quantity_available not updating after sale
- ❌ This shouldn't happen - it's GENERATED ALWAYS
- ✅ If it does, restart backend and check quantity_sold updated

---

## SQL Queries to Verify

### Check Staff Store for a Staff Member
```sql
SELECT 
  ss.id,
  i.name,
  ss.quantity,
  ss.quantity_sold,
  ss.quantity_available,
  u.full_name as staff_name
FROM staff_store ss
JOIN items i ON ss.item_id = i.id
JOIN users u ON ss.staff_id = u.id
WHERE u.email = 'staff@example.com'
ORDER BY ss.posted_date DESC;
```

### Expected Output
```
id                | name      | quantity | quantity_sold | quantity_available | staff_name
------------------+-----------+----------+---------------+--------------------+----------
uuid-1234         | Laptop    | 20       | 7             | 13                 | John Doe
uuid-5678         | Mouse     | 50       | 50            | 0                  | John Doe
```

### Check Posted Items
```sql
SELECT 
  pi.id,
  i.name,
  pi.quantity,
  pi.status,
  u.full_name as staff_member
FROM posted_items pi
JOIN items i ON pi.item_id = i.id
JOIN users u ON pi.staff_id = u.id
WHERE pi.status = 'accepted'
ORDER BY pi.created_at DESC;
```

---

## Rollback Plan (If Needed)

If issues occur, the previous version can be recovered from:
- Backend: Revert `staff-store.service.ts` changes
- Frontend: Revert `make-sale/page.tsx` changes

But these fixes are correct - the issue was the code was trying to set a READ-ONLY column.

---

## Files Modified

1. ✅ `backend/src/services/staff-store.service.ts`
   - acceptPostedItems (2 changes)
   - recordStaffSale (1 change)

2. ✅ `frontend/app/staff/make-sale/page.tsx`
   - fetchItems (1 change - removed fallback)

---

## Key Points to Remember

1. **quantity_available is READ-ONLY**
   - It's a GENERATED ALWAYS column
   - Changes automatically based on quantity - quantity_sold
   - Don't try to set it manually

2. **Staff Store is the Source of Truth**
   - Staff can ONLY sell accepted items
   - Active store fallback removed
   - Strict separation enforced

3. **No Manual Calculations Needed**
   - Available quantity is automatically calculated
   - Always in sync with actual sales
   - Database handles the math

---

## Contact & Support

If acceptance fails:
1. Check backend is running
2. Check database migrations applied
3. Check error message for specific issue
4. Review fixes in STAFF_STORE_FIX_SUMMARY_JAN30.md

