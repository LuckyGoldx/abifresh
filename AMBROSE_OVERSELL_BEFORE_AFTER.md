# Ambrose Chinonso Anthony — Oversold Items: Before/After Analysis

**Generated**: 2026-07-17 16:41 WAT
**Staff**: Ambrose Chinonso Anthony (commission_staff)
**Issue**: 9 items with negative available (quantity_sold > quantity)
**Root Cause**: Returns accepted on July 11, 2026 — AFTER Ambrose's last sales on July 10, 2026 — reduced posted quantities below what was already sold.

## Summary

| | All 51 Items | Only 9 Oversold Items |
|---|---|---|
| **Total posted** (before fix) | 5,559.5 | 1,657 |
| **Total sold** | 5,616.5 | 1,714 |
| **Gap** | −57 | −57 |

The 1,657 is the sum of just the 9 oversold items. The other 42 items have `quantity ≥ quantity_sold` — zero or positive available. The gap of 57 is the same across both views.

All 57 oversold units have real `staff_sales` records and verified payments. Ambrose sold from his pre-return stock, then returns were processed the next day. The fix acknowledges: `quantity = quantity_sold` for all 9 items.

---

## Per-Item Breakdown

### 1. AFRICAN TRADITIONAL BY 8+2LINER

| Field | Value |
|---|---|
| **Before** (current quantity) | 58 |
| **After** (quantity = sold) | 76 |
| **Oversell** | +18 |
| Actual staff_sales total | 111 units |
| Revenue recorded | ₦1,235,400 |
| Total returned | 69 units |
| **Current inventory — main_store** | 11 |
| **Current inventory — active_store** | 47 |
| Last return date | 2026-07-11 |

### 2. BESENSE BLUE MEGA MIX 30 PCS ZIP PAD

| Field | Value |
|---|---|
| **Before** | 34 |
| **After** | 37 |
| **Oversell** | +3 |
| Actual staff_sales total | 39 units |
| Revenue recorded | ₦1,562,300 |
| Total returned | 7 units |
| **Current inventory — main_store** | 15 |
| **Current inventory — active_store** | 11.5 |
| Last return date | 2026-07-11 |

### 3. BESENSE POCKET PACK 3

| Field | Value |
|---|---|
| **Before** | 177 |
| **After** | 184 |
| **Oversell** | +7 |
| Actual staff_sales total | 192 units |
| Revenue recorded | ₦1,531,000 |
| Total returned | 21 units |
| **Current inventory — main_store** | 136 |
| **Current inventory — active_store** | 14 |
| Last return date | 2026-07-11 |

### 4. LEB CARRY PACK S2

| Field | Value |
|---|---|
| **Before** | 23 |
| **After** | 33 |
| **Oversell** | +10 |
| Actual staff_sales total | 38 units |
| Revenue recorded | ₦336,600 |
| Total returned | 20 units |
| **Current inventory — main_store** | 0 |
| **Current inventory — active_store** | 57 |
| Last return date | 2026-07-11 |

### 5. JUSTFIT JUMBO PACK S2

| Field | Value |
|---|---|
| **Before** | 9 |
| **After** | 11 |
| **Oversell** | +2 |
| Actual staff_sales total | 11 units |
| Revenue recorded | ₦273,000 |
| Total returned | 6 units |
| **Current inventory — main_store** | 4 |
| **Current inventory — active_store** | 3 |
| Last return date | 2026-07-11 |

### 6. BESENSE WIPES BY 60PCS

| Field | Value |
|---|---|
| **Before** | 15 |
| **After** | 18 |
| **Oversell** | +3 |
| Actual staff_sales total | 20 units |
| Revenue recorded | ₦298,500 |
| Total returned | 7 units |
| **Current inventory — main_store** | 0 |
| **Current inventory — active_store** | 29.5 |
| Last return date | 2026-07-11 |

### 7. BESENSE WIPES BY 128PCS

| Field | Value |
|---|---|
| **Before** | 14 |
| **After** | 19 |
| **Oversell** | +5 |
| Actual staff_sales total | 19 units |
| Revenue recorded | ₦285,000 |
| Total returned | 14 units |
| **Current inventory — main_store** | 0 |
| **Current inventory — active_store** | 37 |
| Last return date | 2026-07-11 |

### 8. JUSTFIT ZIP PAD BY 30 PCS

| Field | Value |
|---|---|
| **Before** | 6 |
| **After** | 9 |
| **Oversell** | +3 |
| Actual staff_sales total | 12 units |
| Revenue recorded | ₦442,200 |
| Total returned | 7 units |
| **Current inventory — main_store** | 28 |
| **Current inventory — active_store** | 11 |
| Last return date | 2026-07-11 |

### 9. JUSTFIT CARRY PACK S2

| Field | Value |
|---|---|
| **Before** | 1,321 |
| **After** | 1,327 |
| **Oversell** | +6 |
| Actual staff_sales total | 1,525 units |
| Revenue recorded | ₦12,528,500 |
| Total returned | 176 units |
| Last return date | 2026-07-11 |

---

## The Fix

```sql
UPDATE staff_store
SET quantity = quantity_sold
WHERE staff_id = 'ff0c1e84-db2e-4e90-a370-88f7f8130d37'
  AND quantity_sold > quantity;
```

**Before**: posted=1,657, sold=1,714, gap=−57, 9 items with red negative display
**After**: posted=1,714, sold=1,714, gap=0, all available=0 — no negative numbers

## What This Fix Does NOT Change

- `staff_sales` records — untouched
- `staff_payments` records — untouched
- `quantity_sold` — untouched
- `returned_items` — untouched
- Commission calculations — unaffected
- Revenue reports — unaffected

The fix only changes the `quantity` column on 9 oversold rows — acknowledging what Ambrose actually sold before his returns were processed.
