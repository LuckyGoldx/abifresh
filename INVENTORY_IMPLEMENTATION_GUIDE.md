# Inventory System Implementation Guide

## Overview
Complete inventory management system with dual-store tracking (Active Store & Main Store), admin transfers, and automatic stock status indicators.

---

## Phase 1: Database Schema Updates (Required First)

### SQL Migration for Supabase
Run these queries in your Supabase SQL editor (or via migrations if you have a proper setup):

```sql
-- Add new columns to items table for store-based quantity tracking
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS active_store_quantity INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS main_store_quantity INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0;

-- Update existing items with 50/50 split
-- If quantity = 10, then active = 5 (Math.ceil), main = 5 (Math.floor)
-- If quantity = 11, then active = 6 (Math.ceil), main = 5 (Math.floor)
UPDATE items 
SET 
  active_store_quantity = CEIL(quantity::numeric / 2),
  main_store_quantity = FLOOR(quantity::numeric / 2),
  commission_amount = 0
WHERE active_store_quantity = 0 AND main_store_quantity = 0;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_items_active_store ON items(active_store_quantity);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(quantity);
```

**Expected Result:** Items table now has three new columns with initial data populated.

---

## Phase 2: Backend Code Updates (Already Complete ✅)

### Files Modified

#### 1. **backend/src/types/index.ts** ✅
Updated `Item` interface with new fields:
```typescript
export interface Item {
  id: string;
  name: string;
  category: string;
  base_price: number;
  commission_amount: number;
  quantity: number;                    // Total (active + main)
  active_store_quantity: number;       // Available for sales
  main_store_quantity: number;         // Reserve stock
  is_available: boolean;
  created_at: string;
  updated_at: string;
}
```

#### 2. **backend/src/services/inventory.service.ts** ✅
Complete rewrite with new methods:

- **getAllItems()** - Get all items with quantities
- **addItem(name, category, price, qty, commission)** - Create item with 50/50 auto-split
- **editItem(itemId, {name, price, qty, category, commission})** - Update fields, recalculate split if qty changes
- **reduceActiveStoreQuantity(itemId, qty)** - Called on sales, deducts from active store
- **transferFromMainToActive(itemId, qty)** - Admin: move from main to active
- **transferFromActiveToMain(itemId, qty)** - Admin: move from active to main
- **deleteItem(itemId)** - Remove item entirely

#### 3. **backend/src/routes/inventory.routes.ts** ✅
New endpoints:

```
GET    /api/inventory/items                          - Get all items
GET    /api/inventory/items/:id                      - Get single item
POST   /api/inventory/items                          - Create item (admin only)
PUT    /api/inventory/items/:id                      - Edit item (admin only)
DELETE /api/inventory/items/:id                      - Delete item (admin only)
POST   /api/inventory/transfer/main-to-active        - Transfer main→active (admin)
POST   /api/inventory/transfer/active-to-main        - Transfer active→main (admin)
GET    /api/inventory/summary                        - Inventory stats
```

#### 4. **backend/src/services/sales.service.ts** ✅
Updated `deductInventory()` method to use new system:
- Now queries `items` table directly
- Validates against `active_store_quantity` only
- Updates both `active_store_quantity` and `quantity` fields
- Prevents sales from main store reserves

---

## Phase 3: Frontend Implementation (Complete ✅)

### File: **frontend/app/admin/inventory/page.tsx**

#### Features Implemented:

**1. Edit Item Form**
- Item Name (text input)
- Price (₦) (number input)
- Quantity (number input)
- Category (select dropdown with options: Fruits, Vegetables, Dairy, Beverages, Grains, Other)
- Commission (number input)

**2. Inventory Table (10 Columns)**
| Column | Type | Notes |
|--------|------|-------|
| Item Name | Text | Editable via modal |
| Price (₦) | Currency | Formatted as Nigerian Naira |
| Quantity | Number | Total (active + main) |
| Active Store | Number | Read-only, = Qty - Main |
| Main Store | Number | Read-only, = Qty - Active |
| Category | Text | Fruits, Vegetables, etc |
| Commission | Currency | Per-unit commission amount |
| Total Value (₦) | Currency | Calculated: Qty × Price |
| Status | Badge | Low Stock, Out of Stock, In Stock |
| Actions | Buttons | Edit, Transfer, Delete |

**3. Status Indicators**
```
quantity = 0        → "Out of Stock" (red with XCircle icon)
0 < quantity < 5    → "Low Stock" (amber with AlertCircle icon)
quantity >= 5       → "In Stock" (green with CheckCircle2 icon)
```

**4. Stock Transfer Modal (Admin Only)**
- Current Active Store / Main Store display
- Direction selector (Main→Active or Active→Main)
- Quantity input with max validation
- Shows available quantity for direction selected
- Submit/Cancel buttons

**5. Create New Item Dialog**
- All 5 edit fields
- Auto-split note: "Will be split 50/50 between stores"
- Creates item with 50/50 quantity distribution

#### Key Behaviors:

1. **Quantity Split Logic (Automatic)**
   - When item created: `activeStore = Math.ceil(qty/2)`, `mainStore = Math.floor(qty/2)`
   - When quantity edited: Recalculates split
   - Example: 11 units → 6 active, 5 main

2. **Sales Integration**
   - Sales page calls inventory service's `reduceActiveStoreQuantity()`
   - Only deducts from `active_store_quantity`
   - Total quantity also decreases
   - Main store stays unchanged

3. **Admin Transfers**
   - Can move stock between Active ↔ Main stores
   - Total quantity remains constant
   - Real-time validation prevents overselling

4. **Currency Formatting**
   - All prices/commissions: Nigerian Naira (₦)
   - Format: `₦1,234,567.00`
   - Remove decimals for whole numbers in display

---

## Phase 4: Sales System Integration ✅

The sales system has been updated to use the new inventory method:

**In sales.service.ts:**
```typescript
// OLD (deprecated)
await deductInventory(itemId, quantity);  // Used inventory_active_store table

// NEW (implemented)
await deductInventory(itemId, quantity);  // Uses items table with active_store_quantity
```

**What happens during a sale:**
1. Sale created with item_id and quantity
2. `deductInventory()` is called
3. Validates sufficient quantity in `active_store_quantity`
4. Updates both:
   - `active_store_quantity -= qty`
   - `quantity -= qty` (total)
5. Main store is NOT affected

---

## Phase 5: Testing Checklist

### Backend Tests
- [ ] Can create item with 10 units → gets split 5/5
- [ ] Can edit item name, price, category, commission
- [ ] Can edit quantity to 11 units → gets split 6/5
- [ ] Can transfer 2 units main→active → active becomes 7, main becomes 3
- [ ] Can't transfer more than available (validation works)
- [ ] Sales reduce active_store_quantity only
- [ ] Total quantity updates on sales
- [ ] Deleting item removes it completely

### Frontend Tests
- [ ] Can see all items in table with correct quantities
- [ ] Can click "Add Item" and create new item
- [ ] Can click "Edit" and modify all 5 fields
- [ ] Status indicators show correctly:
  - Out of Stock (0)
  - Low Stock (<5)
  - In Stock (≥5)
- [ ] Can click "Transfer" and move stock between stores
- [ ] Can delete items with confirmation
- [ ] Total Value calculates correctly (Qty × Price)
- [ ] Commission displays in currency format

### Integration Tests
- [ ] Make a sale → inventory decreases from active store
- [ ] Make a sale → total quantity decreases
- [ ] Make a sale → main store stays same
- [ ] Transfer 5 units to active → new sales have more available
- [ ] After transfer, total quantity unchanged

---

## Phase 6: Deployment Steps

1. **Backup Database** (CRITICAL)
   ```
   In Supabase Dashboard:
   Settings → Backups → Create Backup
   ```

2. **Run SQL Migration**
   ```
   Copy SQL code above → Supabase SQL Editor → Execute
   Verify columns exist: SELECT * FROM items LIMIT 1;
   ```

3. **Rebuild Backend**
   ```bash
   cd backend
   npm run build
   npm run dev
   ```
   Check for TypeScript errors.

4. **Rebuild Frontend**
   ```bash
   cd frontend
   npm run build
   npm run dev
   ```
   Check for React errors.

5. **Test APIs** (Using Postman/curl or browser)
   ```
   GET http://localhost:5000/api/inventory/items
   POST http://localhost:5000/api/inventory/items
   {
     "name": "Tomatoes",
     "category": "Vegetables",
     "base_price": 500,
     "quantity": 20,
     "commission_amount": 50
   }
   ```

6. **Test UI**
   - Navigate to Admin → Inventory
   - Create, edit, transfer, delete items
   - Verify all quantities update correctly

---

## API Endpoint Examples

### Create Item
```bash
POST /api/inventory/items
Content-Type: application/json

{
  "name": "Bananas",
  "category": "Fruits",
  "base_price": 2500,
  "quantity": 30,
  "commission_amount": 100
}

# Response:
{
  "id": "uuid-here",
  "name": "Bananas",
  "category": "Fruits",
  "base_price": 2500,
  "quantity": 30,
  "active_store_quantity": 15,    // Math.ceil(30/2)
  "main_store_quantity": 15,      // Math.floor(30/2)
  "commission_amount": 100,
  "is_available": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Transfer Stock
```bash
POST /api/inventory/transfer/main-to-active
Content-Type: application/json

{
  "item_id": "uuid-here",
  "quantity": 5
}

# Result: active_store += 5, main_store -= 5
```

### Edit Item
```bash
PUT /api/inventory/items/:id
Content-Type: application/json

{
  "name": "Bananas (Updated)",
  "base_price": 2700,
  "quantity": 35,          // Will trigger recalculation: 18 active, 17 main
  "category": "Fruits",
  "commission_amount": 120
}
```

---

## Common Issues & Solutions

**Issue:** Quantity values are 0 in table
- **Solution:** Run the SQL UPDATE statement above to populate existing items

**Issue:** Sales not reducing quantity
- **Solution:** Ensure sales.service.ts is using updated deductInventory() method

**Issue:** Can't transfer more than available
- **Solution:** This is working correctly - validation prevents overselling

**Issue:** Status shows "In Stock" for 0 items
- **Solution:** Check status calculation logic: `if (quantity === 0) return "Out of Stock"`

---

## Summary

✅ **Complete Implementation:**
- Database schema with dual-store tracking
- Backend service layer with all operations
- New API endpoints for CRUD and transfers
- Frontend inventory page with modals and transfers
- Sales system integration
- Automatic status indicators
- Admin-only transfer capability

🎯 **Key Features:**
- Quantity = Active Store + Main Store
- Auto 50/50 split on item creation/update
- Sales deduct from active store only
- Admins can transfer between stores
- Stock status auto-calculated
- Commission tracking per item
- Total value calculation
- Full CRUD operations with validation

📝 **Next:** Run SQL migration, rebuild both services, and test thoroughly.
