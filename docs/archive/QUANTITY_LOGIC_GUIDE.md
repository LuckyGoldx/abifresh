# Quantity Logic Update - Complete Guide

## ✅ What Changed

### 1. **Quantity Goes ONLY to Main Store (Not Split)**
- When adding an item: all quantity goes to main_store
- When editing quantity: modifications ONLY affect main_store
- **Formula**: Total Quantity = Active Store + Main Store
  - Active Store = Total Quantity - Main Store
  - Main Store = Total Quantity - Active Store

### 2. **Edit Form Now Has Two Modes**

#### Mode A: "Add" (Increment)
- Used to add more quantity to existing inventory
- **Formula**: New Main = Old Main + Your Input
- **Example**:
  - Old Main: 5, You enter: 6
  - New Main: 5 + 6 = 11
  - Active stays the same: 2
  - Total becomes: 11 + 2 = 13

#### Mode B: "Update" (Replace)
- Used to correct/set quantity to a specific amount
- **Formula**: New Main = Your Input (replaces completely)
- **Example**:
  - Old Main: 5, You enter: 20
  - New Main: 20 (replaces old value)
  - Active stays the same: 2
  - Total becomes: 20 + 2 = 22

---

## 📊 Example Walkthrough

**Current State**:
- Item: Apple
- Active Store: 2
- Main Store: 5
- Total: 7

**Scenario 1: User adds 6 more units (ADD mode)**
```
Mode: ADD
Input: 6
Calculation: Main = 5 + 6 = 11
Result:
  - Active Store: 2 (unchanged)
  - Main Store: 11 (increased)
  - Total: 13 (2 + 11)
```

**Scenario 2: User wants to set quantity to 15 (UPDATE mode)**
```
Mode: UPDATE
Input: 15
Calculation: Main = 15 (replaces 5)
Result:
  - Active Store: 2 (unchanged)
  - Main Store: 15 (replaced)
  - Total: 17 (2 + 15)
```

---

## 🔧 Code Changes Made

### Frontend Changes (comprehensive.tsx)

#### 1. **Form State Added Mode**
```typescript
const [formData, setFormData] = useState({
  // ... existing fields
  quantity_mode: 'add' as 'add' | 'update',
});
```

#### 2. **Add Item Handler** (unchanged behavior)
```typescript
// All quantity goes to main_store when adding new item
const quantityToAdd = formData.main_store_quantity || 0;
body: JSON.stringify({
  quantity: quantityToAdd, // Goes to main_store
})
```

#### 3. **Edit Item Handler** (NEW logic)
```typescript
const quantityInput = formData.main_store_quantity || 0;
const currentMainQty = selectedItem.main_store_quantity || 0;

if (formData.quantity_mode === 'add') {
  // ADD: increment
  newMainQty = currentMainQty + quantityInput;
} else {
  // UPDATE: replace
  newMainQty = quantityInput;
}
```

#### 4. **Form UI Updated**
- **For Add mode**: Shows "Quantity (Main Store)" field
- **For Edit mode**: Shows dropdown with "Add" and "Update" options
- Dynamic label and helper text based on mode selected

### Form Labels

| Mode | Field Label | Helper Text |
|------|-------------|-------------|
| Add Item | "Quantity (Main Store)" | "All quantity goes to Main Store. Total = Active Store + Main Store" |
| Edit - Add | "Add Quantity" | "This amount will be added to existing Main Store quantity" |
| Edit - Update | "New Quantity" | "This amount will replace existing Main Store quantity" |

---

## 📝 Database Setup

### Step 1: Add Commission Column (If Not Done)
Run `UPDATE_SCHEMA_ADD_COMMISSION.sql`:
```sql
ALTER TABLE items ADD COLUMN commission DECIMAL(10, 2) DEFAULT 0;
```

### Step 2: Populate Random Quantities
Run `POPULATE_RANDOM_QUANTITIES.sql`:
```sql
-- Randomly adds quantities to inventory for 10 items
-- Main Store: 50-200 units
-- Active Store: 10-80 units
```

This script:
- Updates `inventory_main_store` with random quantities (50-200)
- Updates `inventory_active_store` with random quantities (10-80)
- Shows verification query with totals
- Shows summary statistics

---

## 🧪 Testing Checklist

### Test 1: Add New Item
1. Click "Add Item"
2. Fill form:
   - Item Name: "Banana"
   - Price: 3000
   - **Quantity: 100** (no mode dropdown - just quantity)
   - Category: "Fruit"
   - Commission: 200
3. Submit
4. **Expected**: Item appears with:
   - Total Qty: 100
   - Main Store: 100
   - Active Store: 0

**Console Should Show**:
```
📝 Adding item with quantity: 100 (all goes to main store)
✅ Item added successfully
```

---

### Test 2: Edit with ADD Mode
1. Find an item (e.g., Apple with Main=5, Active=2, Total=7)
2. Click Edit
3. Select Mode: **"Add (Increment existing)"**
4. Enter Quantity: **6**
5. Submit
6. **Expected**: 
   - Main Store: 11 (was 5, added 6)
   - Active Store: 2 (unchanged)
   - Total: 13

**Console Should Show**:
```
✏️ Edit (ADD mode): 1 Old Main: 5 Adding: 6 New Main: 11
✅ Item updated successfully
```

---

### Test 3: Edit with UPDATE Mode
1. Find an item (e.g., Apple with Main=11, Active=2, Total=13)
2. Click Edit
3. Select Mode: **"Update (Replace existing)"**
4. Enter Quantity: **20**
5. Submit
6. **Expected**:
   - Main Store: 20 (was 11, now replaced)
   - Active Store: 2 (unchanged)
   - Total: 22

**Console Should Show**:
```
✏️ Edit (UPDATE mode): 1 Old Main: 11 New Main: 20
✅ Item updated successfully
```

---

### Test 4: Populate Random Data
1. Go to Supabase SQL Editor
2. Run: `POPULATE_RANDOM_QUANTITIES.sql`
3. **Expected**: 10 items get random quantities
   - Main Store: 50-200 units each
   - Active Store: 10-80 units each
4. Check Inventory page → Should see all items with quantities

---

## 📊 Quantity Formula Reference

```
Total Quantity = Active Store + Main Store

Active Store = Total Quantity - Main Store
Main Store = Total Quantity - Active Store

For Adding (ADD mode):
  New Main = Current Main + User Input

For Updating (UPDATE mode):
  New Main = User Input
```

---

## 🐛 Debugging Tips

### If Quantity Doesn't Update
1. Check Browser Console (F12):
   - Look for "Edit (ADD mode):" or "Edit (UPDATE mode):" logs
   - Note the old and new values

2. Check Network Tab:
   - PUT request to `/api/inventory/items/{id}`
   - Response status should be 200
   - Check request body shows `main_store_quantity: X`

3. Check Backend Logs:
   - Should see database update query
   - Verify correct values being sent

### If Mode Dropdown Not Showing
1. Make sure you're in **Edit mode** (not Add)
2. Clear browser cache (Ctrl+Shift+Delete)
3. Rebuild frontend: `npm run build`

### If Helper Text Wrong
1. The text changes based on selected mode
2. Make sure dropdown is properly updating state
3. Check console: `formData.quantity_mode` should show 'add' or 'update'

---

## 📋 Files Modified

1. **frontend/app/admin/inventory/comprehensive.tsx**
   - Added `quantity_mode` to form state
   - Updated `handleAddItem()` logic
   - Updated `handleEditItem()` with ADD/UPDATE modes
   - Updated `openEditModal()` to reset quantity to 0
   - Added mode dropdown to form UI
   - Updated labels and helper text

2. **SQL Files Created**:
   - `UPDATE_SCHEMA_ADD_COMMISSION.sql` - Add commission column
   - `POPULATE_RANDOM_QUANTITIES.sql` - Random inventory data

---

## ✨ Key Differences from Old Logic

| Aspect | Old Logic | New Logic |
|--------|-----------|-----------|
| Add Item | Goes to main_store ✓ | Goes to main_store ✓ |
| Edit Mode | Total - Active = Main | Has two options: Add or Update |
| Edit - Add | N/A | New = Old + Input |
| Edit - Update | N/A | New = Input (replaces) |
| Formula | Total = Active + Main | Total = Active + Main |
| User Input | Meant as "total" | Means quantity change/replacement |

---

## 🚀 Deployment Checklist

- [ ] Update frontend code with new form and handlers
- [ ] Verify commission column exists in database
- [ ] Run `POPULATE_RANDOM_QUANTITIES.sql` to add test data
- [ ] Test Add Item functionality
- [ ] Test Edit with ADD mode
- [ ] Test Edit with UPDATE mode
- [ ] Verify console logs show correct calculations
- [ ] Check table displays correct totals

---

**Status**: Ready for testing
**All changes implemented and console logging enabled for debugging**
