# Credit System — Business Logic Reference

## Overview

The credit system allows sales staff to give items to creditors on credit, record partial or full payments against those credits, and manage the return of unpaid items when a credit is cancelled. Items are sold and tracked in **multiples of 0.5 (half-bag units)**.

---

## 1. Giving Credit (`POST /api/credits/sales`)

### Process
1. Sales staff selects a creditor and items from inventory
2. Items are deducted from `items.active_store_quantity`
3. A `credit_sales` record is created with `status: 'active'`
4. `credit_sale_items` records are created for each item
5. `credit_store` entries are created with `status: 'active'` — these track what can be returned later

### Initial State
- `credit_sales.status` = `'active'`
- `credit_sale_items.quantity_paid` = `0`
- `credit_store.status` = `'active'`

---

## 2. Recording Payments

There are **two payment endpoints**, both implementing the same business logic:

### 2a. `POST /api/credits/payments` (from creditor detail page)
- Records payment against one or more items across receipts
- Payment is immediately `'approved'`
- Admin/superadmin payments are auto-remitted (`remittance_status: 'confirmed'`)
- Sales staff payments have `remittance_status: null` (must be submitted to admin)

### 2b. `POST /api/credits/sales/{id}/payment` (from manage-credits page)
- Records payment against a single receipt
- Same approval and remittance rules

### Payment Allocation Logic (FIFO)

When a payment is recorded, the amount is distributed across unpaid items in **FIFO order** (sorted by sale `created_at`, then by item position in the receipt):

```javascript
payQty = (payAmount / effectiveTotal) * item.quantity
// where effectiveTotal = item.quantity * unit_price
```

**Example:**
- Item A: qty=1, price=10,000 (remaining=10,000)
- Item B: qty=2, price=7,500 (remaining=15,000)
- Payment: ₦12,000
- Item A receives ₦10,000 → `payQty = (10000 / 10000) * 1 = 1.0` → fully paid
- Item B receives ₦2,000 → `payQty = (2000 / 15000) * 2 = 0.267` → partially paid (0.267 out of 2)

### Quantity Paid Update
```javascript
newPaidQty = existingQuantityPaid + payQty
```

The `quantity_paid` is a cumulative sum across ALL payments for that item, stored as a decimal in `credit_sale_items.quantity_paid`.

### Credit Store Status After Payment

After each payment, the `credit_store.status` for each item is updated:

| Condition | Store Status |
|---|---|
| Paid ≤ 75% AND quantity_paid < quantity | `'partially_paid'` |
| Paid > 75% OR quantity_paid ≥ quantity | `'paid'` |

**Rule:** Once an item crosses 75% paid, it is considered "sold" from the store's perspective and cannot be returned. The creditor owns that item (or portion thereof).

### Sale Status After Payment

After all items in a receipt are processed:

| Condition | Sale Status |
|---|---|
| All items have `quantity_paid ≥ quantity` | `'paid'` |
| Any item has `quantity_paid < quantity` | `'partially_paid'` |

---

## 3. Cancelling a Credit (`POST /api/credits/sales/{id}/cancel`)

### 75% Rule (The Core Business Logic)

Each item in the cancelled receipt is evaluated independently using the **75% Rule**:

```javascript
paidPercentage = (quantity_paid / quantity) × 100

if (paidPercentage <= 75) {
  // Return the UNPAID portion (rounded UP to nearest 0.5)
  unpaid = quantity - quantity_paid
  returnableQty = Math.ceil(unpaid × 2) / 2
  
  if (returnableQty >= 0.5) {
    credit_store.status = 'available for return'
    credit_store.quantity = returnableQty
  } else {
    credit_store.status = 'paid'  // less than half a bag, not worth returning
  }
} else {
  // Above 75% paid → cannot be returned
  credit_store.status = 'paid'
}
```

### Cancellation Scenarios Walkthrough

| Scenario | Quantity | Paid Qty | Paid % | ≤75%? | Unpaid | Returnable | Result |
|---|---|---|---|---|---|---|---|
| Small partial | 1.0 | 0.5 | 50% | Yes | 0.5 | 0.5 | **Returned** (half bag) |
| Large partial | 1.0 | 0.8 | 80% | No | — | — | **Not returned** (creditor keeps it) |
| Multi-unit partial | 3.0 | 0.5 | 16.7% | Yes | 2.5 | 2.5 | **Returned** (2.5 bags) |
| Half bag, mostly paid | 0.5 | 0.4 | 80% | No | — | — | **Not returned** |
| Half bag, mostly unpaid | 0.5 | 0.1 | 20% | Yes | 0.4 | **0.5** | **Returned** (rounds up to minimum unit) |
| Almost fully paid | 2.0 | 1.9 | 95% | No | — | — | **Not returned** |
| Fully paid | 2.0 | 2.0 | 100% | No | — | — | **Not returned** |
| Zero remaining after rounding | 1.0 | 0.75 | 75% | Yes | 0.25 | 0.0 | **Not returned** (< 0.5) |

### The Returnable Quantity Formula

```javascript
returnableQty = Math.ceil(unpaid × 2) / 2
```

This rounds **up** to the nearest 0.5. Examples:

| Unpaid | Calculation | Returnable |
|---|---|---|
| 2.5 | ceil(5.0) / 2 | 2.5 |
| 0.5 | ceil(1.0) / 2 | 0.5 |
| 0.4 | ceil(0.8) / 2 | 0.5 |
| 0.25 | ceil(0.5) / 2 | 0.0 |

### After Cancellation
- `credit_sales.status` is set to `'cancelled'`
- Paid items (those >75%) retain `credit_store.status = 'paid'` — the creditor keeps them
- Returnable items get `credit_store.status = 'available for return'` with the calculated quantity
- Notifications are sent to admins and the staff member

---

## 4. Remittance & Admin Approval Workflow

### Remittance Flow

```
Sales Staff records payment 
  → payment created with status='approved', remittance_status=null
  → Staff submits collected funds via /sales/credit-payments
  → POST /api/credits/payments/request
    → Creates staff_payments record with status='pending'
    → Marks credit_payments.remittance_status='submitted'
  → Admin approves via POST /api/credits/remit/approve
    → Sets credit_payments.remittance_status='confirmed'
    → Sets remittance_confirmed_by and remittance_confirmed_at
```

### Admin Auto-Remit
When an admin or superadmin directly records a payment (not via the remittance flow):
- `remittance_status` is set to `'confirmed'` immediately
- `remittance_confirmed_by` and `remittance_confirmed_at` are recorded
- The payment never appears in the "unremitted" queue

### Payment Statuses
| Status | Meaning |
|---|---|
| `approved` | Payment approved (auto-approved on record) |
| `pending` | Payment pending admin approval (from staff request flow) |
| `rejected` | Payment rejected by admin |

---

## 5. Statistics Calculation (`GET /api/credits/creditors/{id}`)

### Lifetime Totals
```javascript
lifetimeTotalCredited = sum of total_amount for ALL non-cancelled sales
lifetimeTotalPaid    = sum of amount for ALL approved payments
lifetimeTotalQuantity = sum of total_quantity for ALL non-cancelled sales
```

### Outstanding Balance
```javascript
outstanding = sum of (sale.total_amount - approved payments per sale)
             for all non-cancelled sales
```

### Active Credit Quantity
The total original quantity of items that have NOT been fully paid:
```javascript
for each non-cancelled sale:
  for each item:
    if item is NOT fully paid (quantity_paid < quantity):
      add FULL quantity (not just remaining)
```

This means a partially paid item (e.g., quantity=2, paid=0.5) contributes its full quantity (2) to the active credit count.

### Per-Item Paid Metrics
Each item in the response is enriched with:
- `quantity_paid` — cumulative paid quantity from all approved payment items
- `paid_percentage` — `Math.round((quantity_paid / quantity) × 100)`
- `returnable_quantity` — see cancellation formula above
- `remaining_amount` — monetary amount still owed for this item
- `paid_amount` — total monetary amount paid for this item

### Unallocated Amount Fallback
If the total `paid_amount` from `credit_payment_items` is less than the payments recorded for a sale, the difference is distributed across items proportionally so the display is accurate:

```javascript
unallocatedAmount = paidAmountForSale - allocatedAmountForSale
// Distributed to items with remaining balance
```

---

## 6. Credit Store Statuses

| Status | Meaning |
|---|---|
| `active` | Item is on credit, no returns processed |
| `partially_paid` | Item has some payment but ≤75%, returnable |
| `paid` | Item is >75% paid or fully paid, not returnable |
| `available for return` | Item was cancelled and is ready for return to inventory |
| `returned` | Item has been physically returned to store |

---

## 7. Role-Based Access

| Role | Can Give Credit | Record Payment | Cancel Credit | Approve Remittance | Manage Creditors |
|---|---|---|---|---|---|
| `sales` | Yes (own) | Yes (own sales) | Yes (own) | No | Own |
| `sales_staff` | Yes (own) | Yes (own sales) | Yes (own) | No | Own |
| `admin` | Yes | Yes (all) | Yes (all) | Yes | All |
| `superadmin` | Yes | Yes (all) | Yes (all) | Yes | All |

- Sales staff can only view creditors they added (`creditor.added_by === authResult.id`)
- Sales staff can only record payments for credit sales they issued (`sale.staff_id === authResult.id`)
- Admin/superadmin can view and act on all creditors and sales

---

## 8. Give Credit Flow (POST /api/credits/sales)

1. Validate items, generate receipt number
2. Insert into `credit_sales` with `status: 'active'`
3. For each item:
   - Insert into `credit_sale_items`
   - Prepare `credit_store` entry with `status: 'active'`
4. Insert into `credit_store` (if fails, clean up and return error)
5. Update `items.active_store_quantity` (deduct given quantity)
6. Log activity, send notifications

---

## 9. Frontend Payment Modal Behavior

### Amount Entry → FIFO Auto-Selection
When a user enters a payment amount, items are auto-selected in FIFO order across all receipts (sorted by `created_at`):

1. Collect all unpaid items `(quantity > quantity_paid)` from all receipts, sorted chronologically
2. For each item, calculate the remaining monetary amount
3. Allocate the entered amount across items until exhausted
4. For each item, only the **proportionate quantity** is selected:
   ```javascript
   payQty = (payAmount / effectiveTotal) × item.quantity
   ```
5. Items with partial payment remain visible in the list (filtered by `quantity > quantity_paid`)
6. Items disappear only when fully paid (`quantity_paid >= quantity`)

### Manual Item Selection
Users can manually check/uncheck items. Checking an item auto-fills the amount with the item's remaining balance. The amount dynamically updates as items are selected/deselected.

### Cash Payment Auto-Reference
For cash payments, a reference number is auto-generated as `CASH-YYYYMMDD-HHMMSS`. For POS/Transfer, the field must be entered manually and is cleared when switching from cash.

### Receipt Upload
Receipt upload is only shown for non-cash payment methods (POS, Online Transfer).

---

## 10. Pagination Defaults

| Page | Items Per Page |
|---|---|
| `/manage-creditors` | 15 |
| `/creditor/[id]` (credit history) | 10 |
| `/creditor/[id]` (payment history) | 10 |
| `/manage-credits` | 15 |
| `/credit-history` | 15 |
| `/credit-receipts` | 15 |
| `/credit-store` (inventory) | 15 |
| `/credit-store` (returns) | 15 |
| `/admin/credit-payments` (remittances) | 15 |
| `/admin/credit-payments` (my remitted) | 15 |
