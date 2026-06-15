# Code Changes Summary - Staff Store Fixes

## Overview
Three critical bugs were fixed in the staff store system that were preventing item acceptance and enforcing proper inventory segregation.

---

## File 1: backend/src/services/staff-store.service.ts

### Change 1: acceptPostedItems - Update Existing Entry (Line ~148)

**What**: When staff accepts a duplicate item (same item posted multiple times), update the existing staff store entry

**Problem**: Tried to update the GENERATED ALWAYS column `quantity_available`

**Before**:
```typescript
if (existing) {
  // Update existing entry
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('staff_store')
    .update({
      quantity: existing.quantity + postedItem.quantity,
      quantity_available: (existing.quantity_available || 0) + postedItem.quantity,  // ❌ BUG
      last_updated: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (updateError) throw updateError;
  staffStoreUpdates.push(updated);
}
```

**After**:
```typescript
if (existing) {
  // Update existing entry
  // NOTE: quantity_available is GENERATED ALWAYS, so we only update quantity
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('staff_store')
    .update({
      quantity: existing.quantity + postedItem.quantity,
      // ✅ REMOVED: quantity_available is auto-calculated
      last_updated: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (updateError) throw updateError;
  staffStoreUpdates.push(updated);
}
```

**Impact**: 
- ✅ Fixes update error when accepting duplicate items
- ✅ quantity_available automatically recalculates to `new_quantity - quantity_sold`
- ✅ If existing had quantity=10, sold=3, available=7, and we add 5 more:
  - New quantity: 15
  - New available: 15 - 3 = 12 ✅

---

### Change 2: acceptPostedItems - Create New Entry (Line ~166)

**What**: When staff accepts an item for the first time, create a new staff store entry

**Problem**: Tried to insert the GENERATED ALWAYS column `quantity_available`

**Before**:
```typescript
} else {
  // Create new staff store entry
  const { data: created, error: createError } = await supabaseAdmin
    .from('staff_store')
    .insert([
      {
        staff_id: staffId,
        item_id: postedItem.item_id,
        quantity: postedItem.quantity,
        quantity_available: postedItem.quantity,  // ❌ BUG - Cannot insert GENERATED column
        posted_from_id: postedItem.poster_id,
        posted_date: postedItem.created_at,
      },
    ])
    .select()
    .single();

  if (createError) throw createError;
  staffStoreUpdates.push(created);
}
```

**After**:
```typescript
} else {
  // Create new staff store entry
  // NOTE: quantity_available is GENERATED ALWAYS AS (quantity - quantity_sold), do not insert it
  const { data: created, error: createError } = await supabaseAdmin
    .from('staff_store')
    .insert([
      {
        staff_id: staffId,
        item_id: postedItem.item_id,
        quantity: postedItem.quantity,
        // ✅ REMOVED: quantity_available is auto-calculated
        posted_from_id: postedItem.poster_id,
        posted_date: postedItem.created_at,
      },
    ])
    .select()
    .single();

  if (createError) throw createError;
  staffStoreUpdates.push(created);
}
```

**Impact**:
- ✅ Fixes "Cannot insert non-DEFAULT value into column quantity_available" error
- ✅ When created, quantity_sold defaults to 0, so quantity_available = quantity - 0 = quantity ✅
- ✅ If accepting 20 units: quantity=20, quantity_sold=0, quantity_available=20

---

### Change 3: recordStaffSale - Record Staff Sale (Line ~437)

**What**: When staff makes a sale, update the quantity_sold counter

**Problem**: Tried to update the GENERATED ALWAYS column `quantity_available` manually

**Before**:
```typescript
// Update staff store: increase quantity_sold and decrease quantity_available
const newQuantityAvailable = Math.max(0, storeItem.quantity_available - quantity);
const { error: updateError } = await supabaseAdmin
  .from('staff_store')
  .update({
    quantity_sold: (storeItem.quantity_sold || 0) + quantity,
    quantity_available: newQuantityAvailable,  // ❌ BUG - Cannot update GENERATED column
    last_updated: new Date().toISOString(),
  })
  .eq('id', storeItem.id);
```

**After**:
```typescript
// Update staff store: increase quantity_sold
// NOTE: quantity_available is GENERATED ALWAYS AS (quantity - quantity_sold), so it auto-updates
const { error: updateError } = await supabaseAdmin
  .from('staff_store')
  .update({
    quantity_sold: (storeItem.quantity_sold || 0) + quantity,
    // ✅ REMOVED: quantity_available is auto-recalculated
    last_updated: new Date().toISOString(),
  })
  .eq('id', storeItem.id);
```

**Impact**:
- ✅ Sales properly recorded without update errors
- ✅ quantity_sold increases correctly
- ✅ quantity_available automatically recalculates
- ✅ Example: quantity=20, quantity_sold=5, available=15; sell 3 more → quantity_sold=8, available=12 ✅

---

## File 2: frontend/app/staff/make-sale/page.tsx

### Change: Remove Fallback to Active Store (Line ~72)

**What**: When fetching items for the make-sale page, only show accepted items from staff store

**Problem**: Had a fallback that would show active store items if staff store was empty, violating business logic

**Before**:
```typescript
const fetchItems = async () => {
  try {
    const response = await api.get('/api/staff/store', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    let availableItems = response.data.filter((item: Item) => item.quantity > 0);
    
    // If no items in staff store, fallback to active store inventory
    if (availableItems.length === 0) {
      const fallbackResponse = await api.get('/api/inventory/active-store', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      // Normalize active_store_quantity to quantity for consistency
      availableItems = fallbackResponse.data
        .filter((item: any) => item.active_store_quantity > 0)
        .map((item: any) => ({
          ...item,
          quantity: item.active_store_quantity,  // ❌ BUG - Allows selling non-accepted items
        }));
    }
    
    setItems(availableItems);
    setFilteredItems(availableItems);
  } catch (error) {
    console.error('Failed to fetch items:', error);
  } finally {
    setIsLoading(false);
  }
};
```

**After**:
```typescript
const fetchItems = async () => {
  try {
    const response = await api.get('/api/staff/store', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    // Only show items that have been accepted to staff store and have quantity available
    const availableItems = response.data.filter((item: Item) => item.quantity > 0);
    
    setItems(availableItems);
    setFilteredItems(availableItems);
  } catch (error) {
    console.error('Failed to fetch items:', error);
  } finally {
    setIsLoading(false);
  }
};
```

**Impact**:
- ✅ Staff can ONLY sell explicitly accepted items
- ✅ No fallback to active store inventory
- ✅ Enforces strict inventory separation
- ✅ Makes business rules clear: "Accepted items only"

**Behavior**:
- If staff has 0 accepted items: make-sale shows empty "No items available"
- If staff has 5 accepted items: make-sale shows exactly those 5 items
- If staff accepted other staff's items: they won't appear (different staff_id)

---

## Summary of Changes

| File | Function | Change | Reason |
|------|----------|--------|--------|
| staff-store.service.ts | acceptPostedItems | Remove `quantity_available` from UPDATE | GENERATED ALWAYS column |
| staff-store.service.ts | acceptPostedItems | Remove `quantity_available` from INSERT | GENERATED ALWAYS column |
| staff-store.service.ts | recordStaffSale | Remove `quantity_available` from UPDATE | GENERATED ALWAYS column |
| make-sale/page.tsx | fetchItems | Remove active store fallback | Business rule violation |

---

## Testing Each Fix

### Test Fix 1 & 2: Item Acceptance
```bash
# Before: Error on accept
POST /api/staff/posted-items/:id/accept
Response: "Cannot insert a non-DEFAULT value into column quantity_available"

# After: Success
POST /api/staff/posted-items/:id/accept
Response: Success, item added to staff store
```

### Test Fix 3: Sales Recording
```bash
# Before: Error on sale
POST /api/staff/store/make-sale
Response: Error updating quantity_available

# After: Success
POST /api/staff/store/make-sale
Response: Sale recorded, quantity_available auto-updates
```

### Test Fix 4: Make-Sale Display
```bash
# Before: Shows active store items too
GET /api/staff/store
Returns: [accepted_items, active_store_items]

# After: Only accepted items
GET /api/staff/store
Returns: [accepted_items_only]
```

---

## Verification Commands

### Check staff store entries
```sql
SELECT id, staff_id, item_id, quantity, quantity_sold, quantity_available 
FROM staff_store 
LIMIT 5;
```

### Check a specific staff's inventory
```sql
SELECT i.name, ss.quantity, ss.quantity_sold, ss.quantity_available
FROM staff_store ss
JOIN items i ON ss.item_id = i.id
WHERE ss.staff_id = '[STAFF_UUID]'
ORDER BY ss.quantity_available DESC;
```

### Verify GENERATED ALWAYS column
```sql
SELECT column_name, is_generated, generation_expression
FROM information_schema.columns
WHERE table_name = 'staff_store' AND column_name = 'quantity_available';
```

Expected output:
```
column_name       | is_generated | generation_expression
------------------|--------------|--------------------------
quantity_available| ALWAYS       | (quantity - COALESCE(quantity_sold, 0))
```

---

## No Breaking Changes

- ✅ API endpoints unchanged
- ✅ Database schema unchanged
- ✅ Frontend routes unchanged
- ✅ Business logic preserved
- ✅ Only internal implementation fixes

---

## Deployment Notes

1. **Backend**: Deploy both TypeScript files or update service
2. **Frontend**: Deploy updated page
3. **No database migrations needed**: Column already exists as GENERATED ALWAYS
4. **No data loss**: All existing data preserved
5. **Backward compatible**: No API changes

---

## Related Documentation

- See: `STAFF_STORE_FIX_SUMMARY_JAN30.md` for detailed explanation
- See: `STAFF_STORE_TESTING_JAN30.md` for testing procedures
- See: `STAFF_STORE_MIGRATION.sql` for schema reference

