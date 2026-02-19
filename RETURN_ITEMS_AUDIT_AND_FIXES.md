# Return Items System — Comprehensive Audit & Bug Fixes

**Date:** February 19, 2026  
**Scope:** Full end-to-end audit of the return items flow across all backend services, routes, database tables, and frontend pages.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Bugs Found During Audit](#bugs-found-during-audit)
4. [Fixes Applied](#fixes-applied)
5. [How The System Works Now (Post-Fix)](#how-the-system-works-now-post-fix)
6. [Files Modified](#files-modified)
7. [Quantity Sync Flow Diagram](#quantity-sync-flow-diagram)
8. [API Endpoints Reference](#api-endpoints-reference)
9. [Database Tables Involved](#database-tables-involved)
10. [Frontend Pages Involved](#frontend-pages-involved)

---

## Executive Summary

A comprehensive audit of the **Return Items** feature uncovered **6 critical inventory bugs** that could cause:

- **Inventory inflation** — rejected returns added quantity back to staff_store even though it was never deducted
- **Inventory duplication** — accepted returns added to active store without deducting from staff_store
- **Overselling** — staff could sell items that were pending return via direct API calls
- **Returning sold items** — validation checked `quantity` (total) instead of `quantity_available` (unsold)

All 6 bugs have been fixed. The system now maintains accurate inventory across all flows.

---

## System Architecture Overview

### The Return Items Flow

```
Staff Store (staff has items) 
    → Staff creates return request → status: 'pending'
        → Sales staff ACCEPTS → items move to Active Store (items.active_store_quantity)
        → Sales staff REJECTS → items stay in Staff Store (virtual lock released)
```

### Key Design Decision: Virtual Locking

The system uses a **virtual locking** approach:
- When a return request is created, `staff_store.quantity` is **NOT** physically deducted
- Instead, `getStaffStore()` and `getAvailableItemsForReturn()` calculate available quantity by subtracting pending/accepted return quantities at query time
- This avoids complex rollback logic and keeps the source of truth clean

### Database: `staff_store.quantity_available` is a GENERATED column

```sql
quantity_available GENERATED ALWAYS AS (quantity - quantity_sold) STORED
```

This means:
- You can only update `quantity` or `quantity_sold`
- `quantity_available` auto-calculates and cannot be directly written to

---

## Bugs Found During Audit

### Bug 1: CRITICAL — Reject Inflates Inventory

**File:** `returned-items.service.ts` → `rejectReturnedItems()`  
**Problem:** When rejecting a return, the code added the quantity BACK to `staff_store.quantity`. But the create flow never deducted it — so rejecting a return **inflated** the staff's inventory.

**Example:**
- Staff has 10 items → Creates return for 3 → staff_store.quantity still = 10
- Sales rejects → code does `quantity + 3` = **13** (should still be 10!)

### Bug 2: CRITICAL — Accept Duplicates Inventory

**File:** `returned-items.service.ts` → `acceptReturnedItems()`  
**Problem:** When accepting a return, the code added quantity to `items.active_store_quantity` but **never deducted** from `staff_store.quantity`. The virtual locking hid this from the UI, but the physical database had duplicate inventory.

**Example:**
- Staff has 10 items, returns 3, accepted
- `items.active_store_quantity` += 3 ✓
- `staff_store.quantity` still = 10 (should be 7!)

### Bug 3: HIGH — Could Return Already-Sold Items

**File:** `returned-items.service.ts` → `createReturnRequest()`  
**Problem:** Validation checked `staff_store.quantity` (total including sold) instead of `quantity_available` (only unsold). A staff member could return items they'd already sold.

**Example:**
- Staff has quantity=10, quantity_sold=8, quantity_available=2
- Old code allowed returning up to 10 items (should only allow 2)

### Bug 4: HIGH — Available Items For Return Showed Sold Items

**File:** `returned-items.service.ts` → `getAvailableItemsForReturn()`  
**Problem:** Queried `.gt('quantity', 0)` and calculated remaining from `item.quantity` instead of `item.quantity_available`. Sold items were counted as returnable.

### Bug 5: MEDIUM — Inflated Available-For-Return Stats

**File:** `returned-items.service.ts` → `getReturnStatsForRequester()`  
**Problem:** Used `item.quantity` instead of `item.quantity_available` when calculating the `available_for_return` stat. The stats card showed inflated numbers.

### Bug 6: HIGH — Staff Could Sell Items Pending Return

**File:** `staff-store.service.ts` → `recordStaffSale()`  
**Problem:** The old code completely blocked sales if ANY return existed for the item. The new approach allows partial sales up to the truly available quantity (total available minus locked returns). The validation also checked raw `quantity_available` from DB without accounting for locked return quantities, meaning direct API calls could bypass the virtual locking shown in the UI.

---

## Fixes Applied

### Fix 1: `createReturnRequest()` — Validate Against Actual Available

```typescript
// OLD: checked raw quantity (includes sold items)
if (staffStoreItem.quantity < item.quantity) { ... }

// NEW: checks quantity_available minus already-locked returns
const lockedQty = lockedQuantities.get(item.item_id) || 0;
const actualAvailable = Math.max(0, (staffStoreItem.quantity_available || 0) - lockedQty);
if (actualAvailable < item.quantity) { ... }
```

Also pre-fetches all existing pending/accepted returns for the staff member to prevent double-counting within the same batch.

### Fix 2: `acceptReturnedItems()` — Physically Deduct From Staff Store

```typescript
// NEW: After adding to active store, deduct from staff_store.quantity
const { data: staffStoreItem } = await supabaseAdmin
  .from('staff_store')
  .select('*')
  .eq('staff_id', returnedItem.requester_staff_id)
  .eq('item_id', returnedItem.item_id)
  .single();

if (staffStoreItem) {
  const newStaffQty = Math.max(0, staffStoreItem.quantity - returnedItem.quantity);
  await supabaseAdmin
    .from('staff_store')
    .update({ quantity: newStaffQty, last_updated: new Date().toISOString() })
    .eq('id', staffStoreItem.id);
}
```

### Fix 3: `rejectReturnedItems()` — Remove Inventory Modification

```typescript
// OLD: Added quantity back to staff_store (BUG - it was never deducted!)
const newQty = staffStoreItem.quantity + returnedItem.quantity;
await supabaseAdmin.from('staff_store').update({ quantity: newQty })...

// NEW: Do nothing to staff_store. Just change status.
// Virtual lock is automatically released when status becomes 'rejected'
```

### Fix 4: `getAvailableItemsForReturn()` — Use `quantity_available`

```typescript
// OLD
.gt('quantity', 0)
const remainingQty = Math.max(0, item.quantity - lockedQty);

// NEW
.gt('quantity_available', 0)
const remainingQty = Math.max(0, (item.quantity_available || 0) - lockedQty);
```

### Fix 5: `getReturnStatsForRequester()` — Use `quantity_available`

```typescript
// OLD
.select('quantity, item_id')
const remainingQty = Math.max(0, item.quantity - lockedQty);

// NEW
.select('quantity_available, item_id')
const remainingQty = Math.max(0, (item.quantity_available || 0) - lockedQty);
```

### Fix 6: `recordStaffSale()` — Account For Locked Returns

```typescript
// OLD: Blocked ALL sales if any return existed (too restrictive)
// AND didn't account for locked qty in validation

// NEW: Allows partial sales, properly validates against actual available
const lockedQty = (pendingReturns || []).reduce((sum, r) => sum + r.quantity, 0);
const actualAvailable = Math.max(0, (storeItem.quantity_available || 0) - lockedQty);
if (actualAvailable < quantity) {
  throw new Error(`Insufficient quantity. Available: ${actualAvailable} (${lockedQty} locked in pending returns)`);
}
```

---

## How The System Works Now (Post-Fix)

### Create Return Request
1. Staff selects items and quantities from their store
2. System validates: `quantity_available - locked_returns >= requested_quantity`
3. A `returned_items` record is created with status `'pending'`
4. **No physical change** to `staff_store.quantity`
5. Virtual locking automatically reduces visible quantities in make-sale and return pages

### Accept Return (Sales Staff)
1. Sales staff clicks Accept on a pending return
2. `items.active_store_quantity` += returned quantity (item goes back to active store)
3. `staff_store.quantity` -= returned quantity (physically deducted now)
4. `returned_items.status` = `'accepted'`
5. Staff's `quantity_available` (generated) auto-decreases

### Reject Return (Sales Staff)
1. Sales staff clicks Reject with a reason
2. `returned_items.status` = `'rejected'`
3. **No change** to `staff_store` — item was never physically removed
4. Virtual lock released — item becomes visible again in make-sale and return pages

### Make Sale (Staff)
1. Staff sees available items via `getStaffStore()` which returns `quantity_available - locked_returns`
2. Frontend filters items with `quantity > 0`
3. Sale validates: `quantity_available - locked_returns >= sale_quantity`
4. `staff_store.quantity_sold` += sale_quantity (increases sold count)
5. `staff_store.quantity_available` auto-recalculates (generated column)

---

## Files Modified

| File | Changes |
|------|---------|
| `backend/src/services/returned-items.service.ts` | Fixed 5 bugs: create validation, accept deduction, reject removal, available items query, stats calculation |
| `backend/src/services/staff-store.service.ts` | Fixed `recordStaffSale()` to account for locked return quantities |

---

## Quantity Sync Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      INVENTORY FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Active Store (items.active_store_quantity)                  │
│       │                          ▲                          │
│       │ Post to Staff            │ Accept Return            │
│       ▼                          │                          │
│  Staff Store (staff_store)                                  │
│    quantity        = total posted to staff                   │
│    quantity_sold   = items sold by staff                     │
│    quantity_available = quantity - quantity_sold (GENERATED)  │
│                                                             │
│  Virtual Available = quantity_available - locked_returns     │
│    (shown in make-sale & return-items pages)                 │
│                                                             │
│       │                                                     │
│       │ Create Return Request                               │
│       ▼                                                     │
│  Returned Items (returned_items)                            │
│    status: pending  → locked (cannot sell, cannot re-return)│
│    status: accepted → deducted from staff_store,            │
│                       added to active_store                 │
│    status: rejected → lock released, items available again  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints Reference

### Staff Endpoints (staff.routes.ts)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/staff/store` | Get staff store with virtual locking |
| GET | `/api/staff/store/summary` | Get raw store summary (no locking) |
| POST | `/api/staff/store/make-sale` | Record single sale |
| POST | `/api/staff/store/make-sales` | Record batch sales |
| POST | `/api/staff/returns` | Create return request |
| GET | `/api/staff/returns` | Get own return requests |
| GET | `/api/staff/returns/stats` | Get return stats |
| GET | `/api/staff/available-items-for-return` | Get items available to return |
| GET | `/api/staff/sales-staff` | Get sales staff for return dropdown |

### Sales Endpoints (sales.routes.ts)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sales/returned-items` | Get items returned to this sales staff |
| POST | `/api/sales/returned-items/:id/accept` | Accept return → active store |
| POST | `/api/sales/returned-items/:id/reject` | Reject return → stays in staff store |

### Inventory Endpoints (inventory.routes.ts)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/inventory/active-store` | Get active store items for sales make-sale |

---

## Database Tables Involved

### `returned_items`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| item_id | uuid | FK to items |
| requester_staff_id | uuid | Staff who created the return |
| receiver_staff_id | uuid | Sales staff who receives the return |
| quantity | integer | Quantity being returned |
| unit_price | numeric | Price per unit |
| status | text | 'pending', 'accepted', 'rejected' |
| reject_reason | text | Reason for rejection (nullable) |
| created_at | timestamp | When return was created |
| updated_at | timestamp | When status was last changed |

### `staff_store`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| staff_id | uuid | FK to users |
| item_id | uuid | FK to items |
| quantity | integer | Total quantity posted to staff |
| quantity_sold | integer | Quantity sold by staff |
| quantity_available | integer | **GENERATED**: quantity - quantity_sold |
| posted_from_id | uuid | Who posted the items |
| posted_date | timestamp | When items were posted |

### `items`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Item name |
| active_store_quantity | integer | Quantity in active store |
| main_store_quantity | integer | Quantity in main store |

---

## Frontend Pages Involved

### `/staff/make-sale` (Staff Make Sale)
- Fetches from `GET /api/staff/store`
- Receives quantities already reduced by virtual locking
- Filters `item.quantity > 0` to only show sellable items
- `updateQuantity()` clamps between 0 and item.quantity (the virtual-locked value)

### `/staff/return-items` (Staff Return Items)
- Fetches available items from `GET /api/staff/available-items-for-return`
- Fetches stats from `GET /api/staff/returns/stats`
- Fetches return history from `GET /api/staff/returns`
- Uses checkboxes for item selection
- Quantity validation: min=1, max=available_quantity
- Shows remaining available after selections

### `/sales/returned-items` (Sales Staff Accept/Reject)
- Fetches from `GET /api/sales/returned-items`
- Accept calls `POST /api/sales/returned-items/:id/accept`
- Reject calls `POST /api/sales/returned-items/:id/reject`
- Filters by status tabs: all/pending/accepted/rejected

---

## Summary of Changes

All 6 bugs have been resolved:

1. **Reject no longer inflates inventory** — removed erroneous `quantity += returnQuantity` on reject
2. **Accept now properly deducts from staff store** — `staff_store.quantity -= returnQuantity` on accept
3. **Cannot return sold items** — validation uses `quantity_available` instead of `quantity`
4. **Available items list excludes sold items** — query uses `quantity_available > 0`
5. **Stats card shows accurate numbers** — uses `quantity_available` in calculation
6. **Make-sale validates against true available** — accounts for locked return quantities

The return items system now maintains **perfect sync** between:
- `/staff/make-sale` quantities
- `/staff/return-items` available quantities
- `/sales/returned-items` accept/reject flows
- `staff_store` database values
- `items.active_store_quantity` database values
