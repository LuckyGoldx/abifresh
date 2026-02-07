# 📊 INVENTORY SYSTEM - VISUAL REFERENCE

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Admin → Inventory Page (/admin/inventory)           │   │
│  │                                                        │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │ Add Item    │  │  Edit Item   │  │ Delete     │ │   │
│  │  │ Dialog      │  │  Modal       │  │ Item       │ │   │
│  │  └─────────────┘  └──────────────┘  └────────────┘ │   │
│  │                                                        │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │  Inventory Table (10 Columns)                │   │   │
│  │  │  ┌─────────────────────────────────────┐    │   │   │
│  │  │  │ Name│Price│Qty│Active│Main│Cat│Com│    │   │   │
│  │  │  │     │  ₦ │   │Store │Store│   │   │    │   │   │
│  │  │  │     │    │   │      │     │   │   │    │   │   │
│  │  │  │ Value │ Status │ Actions   │         │    │   │   │
│  │  │  └─────────────────────────────────────┘    │   │   │
│  │  │                                               │   │   │
│  │  │  ┌─────────────────────────────────────┐    │   │   │
│  │  │  │ Transfer Stock Modal (Admin)        │    │   │   │
│  │  │  │ Active: 5 | Main: 5                 │    │   │   │
│  │  │  │ Direction: Main → Active / Active → Main │   │
│  │  │  │ Qty: [____]  Available: 5           │    │   │   │
│  │  │  └─────────────────────────────────────┘    │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              ↓ API Calls
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Express)                 │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Inventory Routes (/api/inventory)                   │   │
│  │  ├─ GET    /items              → getAllItems()      │   │
│  │  ├─ GET    /items/:id          → getItemById()      │   │
│  │  ├─ POST   /items              → addItem()          │   │
│  │  ├─ PUT    /items/:id          → editItem()         │   │
│  │  ├─ DELETE /items/:id          → deleteItem()       │   │
│  │  ├─ POST   /transfer/main-to-active → transfer()   │   │
│  │  ├─ POST   /transfer/active-to-main → transfer()   │   │
│  │  └─ GET    /summary            → getInventorySummary()│   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Inventory Service                                   │   │
│  │  ├─ getAllItems()                                    │   │
│  │  ├─ addItem() → Auto-split 50/50                    │   │
│  │  ├─ editItem() → Recalc if qty changed              │   │
│  │  ├─ deleteItem()                                    │   │
│  │  ├─ reduceActiveStoreQuantity() → Called by Sales   │   │
│  │  ├─ transferFromMainToActive()                      │   │
│  │  └─ transferFromActiveToMain()                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Sales Service (Updated)                             │   │
│  │  deductInventory()                                   │   │
│  │    └─ Now calls inventoryService.reduceActiveStore()│   │
│  │    └─ Only deducts from active_store_quantity       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              ↓ SQL Queries
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE (Supabase PostgreSQL)             │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  items table                                          │   │
│  │  ├─ id (UUID)                                        │   │
│  │  ├─ name (VARCHAR)                                   │   │
│  │  ├─ base_price (DECIMAL)                             │   │
│  │  ├─ quantity (INT)                        ← TOTAL   │   │
│  │  ├─ active_store_quantity (INT)   ← NEW - SALES     │   │
│  │  ├─ main_store_quantity (INT)     ← NEW - RESERVES  │   │
│  │  ├─ commission_amount (DECIMAL)   ← NEW - COMMISSION│   │
│  │  ├─ category (VARCHAR)                               │   │
│  │  ├─ is_available (BOOLEAN)                           │   │
│  │  ├─ created_at (TIMESTAMP)                           │   │
│  │  └─ updated_at (TIMESTAMP)                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Creating an Item (50/50 Auto-Split)
```
User Input
  ↓
Name: "Bananas"
Price: 2500
Quantity: 10           ← User enters total
Category: "Fruits"
Commission: 100
  ↓
API: POST /api/inventory/items
  ↓
Service: addItem()
  ├─ activeStore = Math.ceil(10 / 2) = 5
  └─ mainStore = Math.floor(10 / 2) = 5
  ↓
Database Insert
  ├─ quantity: 10
  ├─ active_store_quantity: 5
  └─ main_store_quantity: 5
  ↓
Response to Frontend
  ├─ Item created
  └─ Shows in table with correct split
```

### Recording a Sale
```
Sales Page
  ↓
Sale: 3 units of "Bananas"
  ↓
API: POST /api/sales/record
  ↓
Sales Service: recordSale()
  ├─ Calls deductInventory(itemId, 3)
  ↓
Updated deductInventory()
  ├─ Queries: SELECT active_store_quantity, quantity
  ├─ Validates: 5 >= 3? ✓ YES
  ├─ Updates:
  │  ├─ active_store_quantity: 5 - 3 = 2
  │  ├─ quantity: 10 - 3 = 7
  │  └─ main_store_quantity: 5 (UNCHANGED)
  ↓
Result in Database
  ├─ quantity: 7
  ├─ active_store_quantity: 2
  └─ main_store_quantity: 5
```

### Admin Transfer (Main → Active)
```
Admin clicks Transfer
  ↓
Selects: Main Store → Active Store
Quantity: 2
  ↓
API: POST /api/inventory/transfer/main-to-active
  ├─ item_id: uuid
  └─ quantity: 2
  ↓
Service: transferFromMainToActive()
  ├─ Validates: main_store_quantity (5) >= 2? ✓ YES
  ├─ Updates:
  │  ├─ main_store_quantity: 5 - 2 = 3
  │  ├─ active_store_quantity: 2 + 2 = 4
  │  └─ quantity: 7 (UNCHANGED)
  ↓
Result in Database
  ├─ quantity: 7
  ├─ active_store_quantity: 4
  └─ main_store_quantity: 3
```

---

## Quantity Relationships

```
Total Quantity = Active Store + Main Store

Create/Edit Logic:
  Input: Quantity = 10
  ├─ activeStore = Math.ceil(10/2) = 5
  └─ mainStore = Math.floor(10/2) = 5
  → Result: 5 + 5 = 10 ✓

  Input: Quantity = 11
  ├─ activeStore = Math.ceil(11/2) = 6
  └─ mainStore = Math.floor(11/2) = 5
  → Result: 6 + 5 = 11 ✓

Sale Impact:
  Before: active=5, main=5, total=10
  Sale 2 units
  ├─ active: 5 - 2 = 3
  ├─ main: 5 (unchanged)
  └─ total: 10 - 2 = 8 ✓

Transfer Impact (Main→Active):
  Before: active=3, main=5, total=8
  Transfer 2 units
  ├─ active: 3 + 2 = 5
  ├─ main: 5 - 2 = 3
  └─ total: 8 (unchanged) ✓
```

---

## Table Schema Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ITEMS TABLE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Column                │ Type      │ Purpose           │ Editable │ Auto-Calc │
├─────────────────────────────────────────────────────────────────────────────┤
│ id                    │ UUID      │ Primary Key       │ ❌       │ ❌        │
│ name                  │ VARCHAR   │ Item Name         │ ✅       │ ❌        │
│ category              │ VARCHAR   │ Category          │ ✅       │ ❌        │
│ base_price            │ DECIMAL   │ Unit Price (₦)    │ ✅       │ ❌        │
│ quantity              │ INT       │ TOTAL QTY         │ ✅       │ ⚙️*        │
│ active_store_qty      │ INT       │ Sales Source      │ ⚙️*      │ ⚙️*        │
│ main_store_qty        │ INT       │ Reserves          │ ⚙️*      │ ⚙️*        │
│ commission_amount     │ DECIMAL   │ Per-Unit Comm     │ ✅       │ ❌        │
│ is_available          │ BOOLEAN   │ Available?        │ ✅       │ ❌        │
│ created_at            │ TIMESTAMP │ Creation Date     │ ❌       │ ❌        │
│ updated_at            │ TIMESTAMP │ Last Update       │ ❌       │ ❌        │
└─────────────────────────────────────────────────────────────────────────────┘

* ⚙️ = Auto-calculated by system when quantity is edited or transfer occurs
* = Manually updated only by transfer endpoints
```

---

## Table Display Format

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                    INVENTORY TABLE                                        │
├────────────┬──────────┬────────┬──────────┬──────────┬─────────┬──────────┬──────────┬─────┤
│ Item Name  │ Price(₦) │ Qty    │ Active   │ Main     │Category │ Comm     │ Total    │Status
│            │          │(Total) │ Store    │ Store    │         │ Amount   │ Value    │
├────────────┼──────────┼────────┼──────────┼──────────┼─────────┼──────────┼──────────┼─────┤
│ Bananas    │ ₦2,500   │ 10     │ 5        │ 5        │ Fruits  │ ₦100     │ ₦25,000  │ ✅ In
│            │          │        │          │          │         │          │          │Stock
├────────────┼──────────┼────────┼──────────┼──────────┼─────────┼──────────┼──────────┼─────┤
│ Tomatoes   │ ₦500     │ 3      │ 2        │ 1        │ Veg     │ ₦25      │ ₦1,500   │ ⚠️ Low
│            │          │        │          │          │         │          │          │Stock
├────────────┼──────────┼────────┼──────────┼──────────┼─────────┼──────────┼──────────┼─────┤
│ Milk       │ ₦1,200   │ 0      │ 0        │ 0        │ Dairy   │ ₦50      │ ₦0       │ ❌ Out
│            │          │        │          │          │         │          │          │OfStock
├────────────┼──────────┼────────┼──────────┼──────────┼─────────┼──────────┼──────────┼─────┤
│ Oranges    │ ₦800     │ 25     │ 13       │ 12       │ Fruits  │ ₦40      │ ₦20,000  │ ✅ In
│            │          │        │          │          │         │          │          │Stock
└────────────┴──────────┴────────┴──────────┴──────────┴─────────┴──────────┴──────────┴─────┘

Status Calculations:
├─ if qty = 0:   ❌ Out of Stock (Red)
├─ if qty < 5:   ⚠️ Low Stock (Amber)
└─ if qty >= 5:  ✅ In Stock (Green)
```

---

## API Endpoints Map

```
Inventory Management API (/api/inventory)

│
├─── GET /items
│    └─ Returns: Array of all items
│
├─── GET /items/:id
│    └─ Returns: Single item object
│
├─── POST /items
│    ├─ Input: {name, category, base_price, quantity, commission_amount}
│    └─ Auto-splits quantity 50/50, stores in database
│
├─── PUT /items/:id
│    ├─ Input: {name, category, base_price, quantity, commission_amount}
│    ├─ If quantity changed: Recalculates split
│    └─ Updates all fields in database
│
├─── DELETE /items/:id
│    └─ Removes item entirely
│
├─── POST /transfer/main-to-active
│    ├─ Input: {item_id, quantity}
│    ├─ Validates: main_store_quantity >= quantity
│    ├─ Updates: main -= qty, active += qty
│    └─ Total quantity unchanged
│
├─── POST /transfer/active-to-main
│    ├─ Input: {item_id, quantity}
│    ├─ Validates: active_store_quantity >= quantity
│    ├─ Updates: active -= qty, main += qty
│    └─ Total quantity unchanged
│
└─── GET /summary
     └─ Returns: Inventory stats (totals, counts, etc)
```

---

## State Management (Frontend)

```
InventoryPage Component State

├─ items: Item[]                      ← All inventory items
├─ loading: boolean                   ← Fetch loading state
├─ error: string | null               ← Error messages
│
├─ Edit Dialog State:
│  ├─ editDialogOpen: boolean
│  ├─ editingItem: Item | null
│  └─ editFormData: {name, price, qty, category, commission}
│
├─ Transfer Dialog State:
│  ├─ transferDialogOpen: boolean
│  ├─ transferringItem: Item | null
│  └─ transferFormData: {direction, quantity}
│
└─ Create Dialog State:
   ├─ createDialogOpen: boolean
   └─ createFormData: {name, price, qty, category, commission}
```

---

## Permission Matrix

```
┌─────────────────────────────────────────────────────────────┐
│  ACTION                  │ Admin │ Sales │ Staff │ Guest    │
├─────────────────────────────────────────────────────────────┤
│ View Inventory Page      │ ✅    │ ❌    │ ❌    │ ❌       │
│ View Inventory Table     │ ✅    │ ✅    │ ✅    │ ❌       │
│ Create Item              │ ✅    │ ❌    │ ❌    │ ❌       │
│ Edit Item                │ ✅    │ ❌    │ ❌    │ ❌       │
│ Delete Item              │ ✅    │ ❌    │ ❌    │ ❌       │
│ Transfer Stock           │ ✅    │ ❌    │ ❌    │ ❌       │
│ Record Sale              │ ✅    │ ✅    │ ❌    │ ❌       │
│ View API Endpoints       │ ✅    │ ✅    │ ✅    │ ❌       │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
InventoryPage (Main Component)
│
├─ Header
│  ├─ Title: "Inventory Management"
│  └─ Button: "Add Item"
│
├─ Error Display (conditional)
│  └─ Error message banner
│
├─ Inventory Table
│  ├─ TableHeader (10 columns)
│  └─ TableBody (rows of items)
│     └─ Each row:
│        ├─ 9 data cells (name, price, qty, stores, etc)
│        └─ Actions cell:
│           ├─ Edit Button (opens EditModal)
│           ├─ Transfer Button (opens TransferModal)
│           └─ Delete Button (with confirmation)
│
├─ EditItemModal (Dialog)
│  ├─ Title: "Edit Item"
│  ├─ Form Fields:
│  │  ├─ Item Name (Input)
│  │  ├─ Price (₦) (Input)
│  │  ├─ Quantity (Input)
│  │  ├─ Category (Select)
│  │  └─ Commission (Input)
│  └─ Actions: Cancel | Save
│
├─ CreateItemModal (Dialog)
│  ├─ Title: "Add New Item"
│  ├─ Form Fields:
│  │  ├─ Item Name (Input)
│  │  ├─ Price (₦) (Input)
│  │  ├─ Quantity (Input)
│  │  ├─ Category (Select)
│  │  └─ Commission (Input)
│  └─ Actions: Cancel | Create
│
└─ TransferStockModal (Dialog)
   ├─ Title: "Transfer Stock - [ItemName]"
   ├─ Display:
   │  ├─ Active Store: [qty]
   │  └─ Main Store: [qty]
   ├─ Form:
   │  ├─ Direction (Select: Main→Active / Active→Main)
   │  ├─ Quantity (Input)
   │  └─ Available: [qty] (display)
   └─ Actions: Cancel | Transfer
```

---

This visual reference shows the complete system architecture, data flow, and UI structure.
