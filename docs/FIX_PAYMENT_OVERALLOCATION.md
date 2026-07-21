# Payment Over-Allocation Fix — Blessing's ₦22,150 Correction

**Date**: July 18, 2026  
**Root cause**: Sequential distribution dump mechanism in the old grouped-item payment model caused 0.5-unit excess quantities to be dumped on first items in multi-sale arrays.

---

## The Gap

| Metric | Value |
|---|---|
| Total Sales (Blessing) | ₦15,561,840 |
| Approved Payments (current) | ₦15,553,540 |
| Financial Outstanding | ₦8,300 |
| Item-Level Outstanding (individual model) | ₦31,050 |
| **Gap** | **₦22,750** |

## The Culprits

### 1. Payment ab27737f — July 13, 2026
- **Amount**: ₦93,700 → **₦80,200** (₦13,500 removed)
- **Note**: *"Under pad half and Dele pad half that I sold on Saturday"*
- **Issue**: DELE MATERNITY PAD had qty=1.5 across 2 sale_ids. Sequential distribution dumped 0.5 on the first ID, over-allocating it by 0.5 units at ₦27,000/ea = ₦13,500.
- **Fix**: Split into two single-ID entries: qty=1 + qty=0.5

### 2. Payment d8ebf66b — May 25, 2026
- **Amount**: ₦2,286,650 → **₦2,278,000** (₦8,650 removed)
- **Note**: *"ECO SIZE 2 WAS 10 AND NOT 10 PLUS HALF BAGS — ₦1,567,800 PAID LEAVING BALANCE OF ₦710,200 BY MOHAMMED ATTAIRU AHMADU FROM GEMBU"*
- **Issue**: JUSTFIT ECO PACK S2 had qty=10.5 across 2 sale_ids. Sequential distribution dumped 0.5 on the first ID, over-allocating it by 0.5 units at ₦17,300/ea = ₦8,650.
- **Fix**: Split into two single-ID entries: qty=10 + qty=0.5

## After The Fix

| Metric | Before | After | Change |
|---|---|---|---|
| Approved Payments | ₦15,553,540 | **₦15,531,390** | -₦22,150 |
| Financial Outstanding | ₦8,300 | **₦30,450** | +₦22,150 |
| Item-Level Outstanding | ₦31,050 | **₦31,050** | unchanged |
| Gap | ₦22,750 | **₦600** (-97.4%) | healed |

## SQL

See [FIX_PAYMENT_OVERALLOCATION.sql](./FIX_PAYMENT_OVERALLOCATION.sql) for the exact SQL statements.

Run against the **production** database (`cifzlkspxjghpgxhrwkg.supabase.co`) in the Supabase SQL Editor.

## Design Impact

Both payments' `items_paid_for` still reference the same items and sale IDs. Only the structure changed from multi-sale arrays to single-ID entries. Payment history (`notes`, `created_at`, `staff_name`, `status`, `paid_by`) is unaffected.

## Remaining ₦600

After fixing these two payments, ₦600 residual gap remains — distributed across 5 older dump payments. At 1.9% of ₦31,050, it's functionally invisible and not worth intervention (those payments have no notes to justify per-ID splits).
