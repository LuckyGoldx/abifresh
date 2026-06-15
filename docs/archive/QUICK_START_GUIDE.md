# Quick Start Guide - Inventory System

## 🚀 What You Have Now

Your inventory system has been completely overhauled with:
- ✅ Dual-store tracking (Active Store + Main Store)
- ✅ Automatic 50/50 quantity split
- ✅ Admin transfer capability between stores
- ✅ Stock status indicators (Low Stock, Out of Stock, In Stock)
- ✅ Sales integrated to deduct from active store only
- ✅ Modern UI with modals and tables

---

## 📋 BEFORE You Do Anything

### Step 1: Run SQL Migration
**CRITICAL:** Your database needs these new columns.

In Supabase Dashboard → SQL Editor, run:

```sql
-- Add new columns
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS active_store_quantity INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS main_store_quantity INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0;

-- Populate existing items
UPDATE items 
SET 
  active_store_quantity = CEIL(quantity::numeric / 2),
  main_store_quantity = FLOOR(quantity::numeric / 2),
  commission_amount = 0
WHERE active_store_quantity = 0 AND main_store_quantity = 0;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_items_active_store ON items(active_store_quantity);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(quantity);
```

**Verify:** Run `SELECT * FROM items LIMIT 1;` and confirm the 3 new columns exist.

---

## 🔨 Rebuild Services

### Backend
```bash
cd backend
npm run build      # Check for TypeScript errors
npm run dev        # Starts on port 5000
```

### Frontend
```bash
cd frontend
npm run build      # Check for React errors
npm run dev        # Starts on port 3000
```

---

## 🧪 Quick Test

1. **Go to Admin → Inventory**
2. **Click "Add Item"**
   - Name: "Test Item"
   - Price: 1000
   - Quantity: 10
   - Category: Fruits
   - Commission: 50
3. **Verify in table:**
   - Quantity shows: 10
   - Active Store shows: 5 (Math.ceil(10/2))
   - Main Store shows: 5 (Math.floor(10/2))
   - Total Value shows: 10,000 (10 × 1000)
   - Status shows: "In Stock" (green)

4. **Click Transfer button:**
   - Move 2 from Main → Active
   - Active becomes 7, Main becomes 3
   - Total still 10

5. **Click Edit:**
   - Change Quantity to 21
   - Save
   - Active becomes 11 (Math.ceil), Main becomes 10 (Math.floor)

6. **Click Delete:**
   - Confirms deletion
   - Item removed from inventory

---

## 📊 Database Schema

```
items table
├── id (UUID, primary key)
├── name (VARCHAR)
├── category (VARCHAR)
├── base_price (DECIMAL)
├── quantity (INT)                    ← Total quantity
├── active_store_quantity (INT)       ← NEW: Available for sales
├── main_store_quantity (INT)         ← NEW: Reserve stock
├── commission_amount (DECIMAL)       ← NEW: Commission per unit
├── is_available (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

---

## 🔄 How Sales Work Now

### Before (Old System)
```
Sale of 3 units
→ Queried inventory_active_store table
→ Updated inventory_active_store
❌ Could sell from main store
```

### After (New System)
```
Sale of 3 units
→ Checks items.active_store_quantity
→ Updates items.active_store_quantity -= 3
→ Updates items.quantity -= 3
→ Main store UNCHANGED ✅
```

---

## 📱 UI Overview

### Inventory Table (10 Columns)
| # | Column | What It Does |
|---|--------|-------------|
| 1 | Item Name | Product name (editable) |
| 2 | Price (₦) | Cost per unit (editable) |
| 3 | Quantity | Total: Active + Main (editable) |
| 4 | Active Store | Available for sales (auto-calculated) |
| 5 | Main Store | Reserves (auto-calculated) |
| 6 | Category | Type of item (editable) |
| 7 | Commission | Per-unit staff commission (editable) |
| 8 | Total Value | Quantity × Price (auto-calculated) |
| 9 | Status | Stock level indicator (auto-calculated) |
| 10 | Actions | Edit, Transfer, Delete buttons |

### Edit Form (5 Fields)
- Item Name (text)
- Price (₦) (number)
- Quantity (number)
- Category (dropdown)
- Commission (number)

### Transfer Modal
- Shows current Active Store & Main Store
- Choose direction: Main→Active or Active→Main
- Input quantity to transfer
- System validates availability

---

## 🎯 Key Numbers

```
Quantity Split Logic (Automatic):
├─ 1 unit  → Active: 1, Main: 0
├─ 2 units → Active: 1, Main: 1
├─ 3 units → Active: 2, Main: 1
├─ 4 units → Active: 2, Main: 2
├─ 5 units → Active: 3, Main: 2
└─ 10 units → Active: 5, Main: 5

Status Indicators:
├─ Quantity = 0     → Out of Stock (Red) 🔴
├─ Quantity < 5     → Low Stock (Amber) 🟡
└─ Quantity ≥ 5     → In Stock (Green) 🟢
```

---

## 🔐 Permissions

| Action | Admin | Sales | Staff |
|--------|-------|-------|-------|
| View inventory | ✅ | ✅ | ✅ |
| Create item | ✅ | ❌ | ❌ |
| Edit item | ✅ | ❌ | ❌ |
| Delete item | ✅ | ❌ | ❌ |
| Transfer stock | ✅ | ❌ | ❌ |
| Record sale | ✅ | ✅ | ❌ |

---

## 📞 Common Questions

**Q: What if I add 5 units? How are they split?**
A: Automatic split: Active = 3, Main = 2

**Q: Can staff sell from main store?**
A: No, sales only deduct from Active Store. Main is protected.

**Q: Can I manually adjust the split?**
A: Yes, use the Transfer modal to move units between stores.

**Q: What happens if I edit quantity?**
A: System recalculates the 50/50 split automatically.

**Q: Are transfers tracked?**
A: Currently no. Future enhancement could add transfer history.

**Q: Can I delete an item?**
A: Yes, you'll get a confirmation dialog first.

---

## ✅ Checklist Before Production

- [ ] SQL migration ran successfully
- [ ] Backend builds without errors
- [ ] Frontend builds without errors
- [ ] Can create items (split 50/50)
- [ ] Can edit items (all 5 fields)
- [ ] Can transfer between stores
- [ ] Can delete items
- [ ] Sales reduce active store only
- [ ] Status indicators work (0, <5, ≥5)
- [ ] Table displays all 10 columns correctly
- [ ] No console errors in browser
- [ ] Currency formatting is correct (₦)

---

## 🆘 Troubleshooting

**Items show quantity 0 in table:**
- Run the SQL UPDATE statement above to populate existing data

**Can't create items:**
- Check backend is running (`npm run dev` on port 5000)
- Check browser console for errors
- Verify user is admin role

**Transfer not working:**
- Verify you're trying to transfer available quantity
- Check if item has sufficient stock

**Sales not reducing inventory:**
- Confirm deductInventory() is being called in sales.service.ts
- Check sales endpoint logs for errors

**Commission field not showing:**
- Verify commission_amount column exists in database
- Run SQL migration if missing

---

## 📚 Files Modified

| File | Change | Status |
|------|--------|--------|
| backend/src/types/index.ts | Added store quantity fields | ✅ Done |
| backend/src/services/inventory.service.ts | Complete rewrite | ✅ Done |
| backend/src/routes/inventory.routes.ts | New endpoints | ✅ Done |
| backend/src/services/sales.service.ts | Updated deductInventory() | ✅ Done |
| frontend/app/admin/inventory/page.tsx | New UI design | ✅ Done |
| Supabase (items table) | 3 new columns | ⏳ Run SQL |

---

## 🎉 You're All Set!

Everything is coded and ready. Just:
1. Run the SQL migration
2. Rebuild backend & frontend
3. Start using the new inventory system!

All the requirements have been implemented:
✅ Edit form with Name, Price, Quantity, Category, Commission
✅ Table with 10 columns showing all required data
✅ Active Store & Main Store tracking
✅ Stock status indicators
✅ Admin transfer capability
✅ Sales integration (deducts from active store)
✅ Auto-split on item creation/edit

Questions? Check INVENTORY_IMPLEMENTATION_GUIDE.md for detailed docs.
