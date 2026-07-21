# Individual Payment Model Implementation

**Date**: July 18, 2026  
**Feature**: Individual (ungrouped) payment item tracking  
**Files changed**: 4

---

## 1. Problem

The previous system **grouped** sales items by `item_id + location + unit_price` in the payment selection UI. For example, if Blessing sold "JUSTFIT CARRY PACK S2" across 4 receipts at ₦8,100/ea, the payment page showed **one row** with a combined quantity of 4 units.

When a payment was submitted, the `items_paid_for` stored a **multi-sale array**:
```json
{ "sale_ids": ["id1", "id2", "id3", "id4"], "quantity": 4 }
```

The backend then used **sequential distribution** to allocate the paid quantity across the sale IDs. This caused two problems:

1. **Starvation** — items at the end of arrays rarely received allocation (items near the start consumed all paid quantity)
2. **Auto-heal scaling required** — because item-level tracking didn't match financial reality, a scale factor was applied to display amounts, effectively hiding the misalignment

The gap between item-level ("raw") and financial outstanding was up to ₦2.27M for some staff.

---

## 2. Solution

**Show each receipt line item as its own individual row.** No grouping. No distribution. No scaling.

Each `items_paid_for` entry stores exactly **1 `sale_id`** with the exact quantity the staff selected for that specific receipt line.

```json
{ "sale_ids": ["id1"], "quantity": 1 }
```

The backend simply subtracts the paid quantity from that specific sale. No arrays to distribute, no starvation, no gap.

---

## 3. Files Changed

| File | Change |
|---|---|
| `frontend/app/api/staff/store/sales-history/route.ts` | Return individual `staff_sales` rows instead of grouped items. Removed auto-heal scaling. |
| `frontend/app/api/sales/my-sales-history/route.ts` | Return individual `sales_items` rows per receipt instead of grouped. Removed auto-heal scaling. |
| `frontend/app/staff/payments/page.tsx` | Simplified data mapping. Added Receipt and Date columns. Uses single sale_id per payment entry. |
| `frontend/app/sales/payments/page.tsx` | Removed `getUnpaidSales()` (140 lines), `getSoldItemsGrouped()` (30 lines), and `normalizeId`. Added Receipt and Date columns. |

---

## 4. How It Works

### Backend: `staff/store/sales-history`

```
1. Query all staff_sales for the staff (excluding credit)
2. Query all payments with items_paid_for
3. Compute paid quantities per sale_id:
   - Single ID entry → directly add paidQty to that sale
   - Multi-sale entry (legacy) → sequential distribution
4. Return individual rows (one per staff_sales):
   { id, item_id, item_name, quantity (remaining), unit_price,
     total_amount, sale_date, sold_outside_jalingo,
     sale_ids: [id], receipt_number }
```

### Backend: `sales/my-sales-history`

```
1. Query sales headers + sales_items (joined with items for name)
2. Compute paid quantities same as above
3. Return individual rows (one per sales_items):
   { id, item_id, item_name, quantity (remaining), unit_price,
     total_amount, sale_date, sold_outside_jalingo,
     sale_ids: [id], receipt_number }
```

### Frontend: Payment Selection

```
1. Show each receipt line as its own row with:
   - Checkbox
   - Item name (with Outside Jalingo badge)
   - Receipt number
   - Sale date
   - Quantity input (capped at max)
   - Calculated amount
2. Staff selects individual rows, enters exact quantities
3. Payment submission stores:
   [{ sale_ids: [row.id], quantity: 3, amount: qty × price,
      item_id, item_name }]
```

---

## 5. Benefits

| Before (Grouped) | After (Individual) |
|---|---|
| Items grouped by name + price | Each receipt line is its own row |
| Multi-sale arrays in `items_paid_for` | Exactly **1 `sale_id`** per entry |
| Sequential distribution (starvation risk) | Direct quantity subtraction |
| Auto-heal scaling required | Raw = Financial (zero gap for new payments) |
| Item-level ≠ money-level | Always match for new payments |
| Client-side filtering (140 lines removed) | Backend handles filtering |
| 4 different functions for item display | Single data source: `sales` |

---

## 6. Legacy Data Transition

Existing `items_paid_for` entries with multi-sale arrays (created under the old grouped system) are handled by the same sequential distribution algorithm. These legacy entries produce small gaps between raw and financial outstanding:

| Staff | Single-ID entries | Multi-ID entries (legacy) | Current gap |
|---|---|---|---|
| Ambrose | 122 | 70 | ₦11,950 |
| Shadrack | 16 | 2 | ₦4,800 |
| Kefas | 173 | 24 | -₦42,000 |
| Thankgod | 16 | 17 | ₦467,150 |
| Blessing | 290 | 20 | -₦18,700 |

**New payments** made under the individual model store exactly **1 `sale_id`** per entry. The backend directly subtracts that quantity from the referenced sale. No distribution required. **Zero gap for new payments.**

As old multi-sale entries are gradually replaced by new individual-model payments, the gaps naturally converge to zero.

---

## 7. UI Changes

### Payment Selection Table (both `/staff/payments` and `/sales/payments`)

New columns added:

| # | Item | Receipt | Date | Qty | Amount |
|---|---|---|---|---|---|
| ☐ | JUSTFIT CARRY PACK S2 | RCP-001 | 7/15/26 | [5] / 5 | ₦40,500 |
| ☐ | JUSTFIT CARRY PACK S2 | RCP-002 | 7/16/26 | [3] / 3 | ₦24,300 |

Each row represents exactly one receipt line. Staff can see which receipt each item belongs to and select specific lines to pay.

---

## 8. Backward Compatibility

- Backend processes both single-ID (new) and multi-ID (legacy) `items_paid_for` entries
- Admin payment approval and rejection workflows unchanged
- `items_paid_for` JSON structure unchanged (just one sale_id per entry instead of arrays)
- All existing payment data continues to work
