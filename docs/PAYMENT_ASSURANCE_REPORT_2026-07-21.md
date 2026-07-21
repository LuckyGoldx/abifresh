# PAYMENT ASSURANCE REPORT: Gap Analysis & Data Integrity

**Generated**: 2026-07-21  
**Purpose**: Answer four specific concerns about payment/commission data integrity after the audit fixes

---

## 1. Will Future Payment Gaps Occur? (Blessing/Kefas/Ambrose Pattern)

### Original Bug

When `items_paid_for` contained entries with multiple `sale_ids`, the allocation logic dumped the entire paid quantity onto `saleIds[0]` instead of distributing across all sale IDs. This caused:

- **Blessing ₦22,750**: 3 sale IDs in one entry → allocation dumped onto first ID, other two received nothing
- **Kefas ₦13,500**: Same payment, multiple entries → waste instead of cross-entry allocation  
- **Ambrose ₦16,000**: 70 multi-sale entries → across-the-board dumping

### Why It Cannot Recur

The fix was **splitting multi-sale entries into individual items** in the payment UI. Every entry in `items_paid_for` now has exactly one `sale_id`:

```json
[
  { "sale_ids": ["uuid-1"], "quantity": 5, "amount": 25000 },
  { "sale_ids": ["uuid-2"], "quantity": 3, "amount": 15000 }
]
```

The commission generation loop in `approve/route.ts:70-86` processes each entry independently. With one `sale_id` per entry, it fetches one `staff_sales` record, computes commission against that single record, and moves to the next entry. There's no multi-sale distribution happening anymore — each entry maps to exactly one sale.

### What About the Zero-Rate Skip (Line 73)?

```typescript
if (commissionRate <= 0) continue;
```

This skips a sale with `commission_rate = 0`. With a single `sale_id` per entry, the inner loop runs exactly once. If that single sale has zero commission, skipping it means zero commission is generated — which is **correct**, because the item had no commission. There's no other sale in that entry to distribute to.

This code path can only cause a shortfall if:
1. A single `items_paid_for` entry has multiple `sale_ids` with **mixed** commission rates (some positive, some zero)
2. Some IDs have positive rates but not enough `remainingQty` to cover them after the zero-rate sale's proportion evaporates

**The current frontend never produces multi-ID entries.** Each selected line item creates its own entry with `sale_ids: [singleId]`. The multi-ID code path exists only for backward compatibility with legacy database records created before the fix.

### What About the UI Display Bug?

The sales-history deduction logic in `staff/store/sales-history/route.ts:65-67` and `sales/my-sales-history/route.ts:94-95` still dumps remainder on `saleIds[0]`. This affects what the user sees as "outstanding" in the payment request UI. It does **not** affect actual commission or money — it's purely a display calculation.

### Verdict

| Gap Type | Can Recur? | Severity | Reason |
|----------|-----------|----------|--------|
| Blessing-style dump on saleIds[0] | ❌ **No** | — | Each entry has one sale_id. No multi-sale distribution happens. |
| Kefas-style cross-entry waste | ❌ **No** | — | Entries are independent. Each maps to one sale. |
| Ambrose-style multi-sale gaps | ❌ **No** | — | Frontend no longer produces multi-sale entries. |
| Zero-rate skip (line 73) | ❌ **Effectively no** | — | With one sale_id per entry, skipping a zero-rate sale gives zero commission — correct behavior. |
| UI display dump (sales-history) | ⚠️ **Cosmetic only** | Low | Affects "outstanding" display in payment UI. Does not affect money. |

**Bottom line**: The original 3 gaps **cannot recur** under the current frontend. Each `items_paid_for` entry maps to one sale. The zero-rate skip bug in the code is unreachable through normal UI operation. The only remaining bug in this area is cosmetic (outstanding quantity display in the sales-history deduction).

---

## 2. Do Sales Write to `staff_sales`?

### Short Answer

**No — and that's by design.** There are two completely separate sale tables for two different user groups:

| Table | Written By | Used For |
|-------|-----------|----------|
| `sales` | Sales portal (`sales/create`, `sales/create-sale`, `sales/record`) | Sales staff who are NOT commission-based. They request payments via `staff_payments` |
| `staff_sales` | Commission staff (`staff/store/make-sales`) | Commission/non-commission staff who sell from their store. Commissions are computed from THIS table |

### Routes That Write to Each Table

**`sales` table** (3 routes):
| Route | Also Writes |
|-------|-------------|
| `sales/create/route.ts` | `sales_items`, inventory deduction |
| `sales/create-sale/route.ts` | `sales_items`, `daily_sales_summary`, inventory deduction |
| `sales/record/route.ts` | `sales_items`, `daily_sales_summary`, inventory deduction |

**`staff_sales` table** (1 route):
| Route | Also Writes |
|-------|-------------|
| `staff/store/make-sales/route.ts` | inventory deduction, `receipts` table linkage |

**No route writes to BOTH tables.** There is no sync process between them.

### Implications

| Question | Answer |
|----------|--------|
| Can a sale be created without a `staff_sales` record? | ✅ **Yes** — ALL sales portal sales (3 routes) write only to `sales`, never to `staff_sales`. This is correct behavior. |
| Can a `staff_sales` record exist without a corresponding `sales` record? | ✅ **Yes** — commission staff sales write directly to `staff_sales`, never to `sales`. This is also correct behavior. |
| Is commission data complete? | ✅ **Yes for commission staff** — `staff_sales` has all their sales. The `sales` table is irrelevant for commission calculation. |
| Are sales-portal staff missing commission tracking? | ✅ **By design** — they are non-commission roles. They get paid via payment requests, not commission. |

### Verdict

There is no data integrity issue. The two tables serve separate roles. Sales-portal staff don't earn commissions, so there's no gap in commission tracking. The schema separation is intentional.

---

## 3. Will Fractional Commissions Recur?

### Short Answer

**Yes — the fix was a one-time SQL data patch, not a code change.**

### What Was Done

`docs/FIX_FRACTIONAL_COMMISSIONS.sql` ran 31 hardcoded `UPDATE` statements that snapped existing fractional commissions to the nearest ₦50 (e.g. ₦6,361.79 → ₦6,350, ₦1,285.21 → ₦1,300). Total shift: ₦964,029.13 → ₦963,900.00 (diff −₦129.13).

### What Was NOT Done

The commission calculation code in `approve/route.ts:80` was never changed:

```typescript
// Current code — rounds to 2 decimal places only
const commissionEarned = finalAllocated * commissionRate;
const updateEntry = { id: sale.id, approved_commission: Math.round(commissionEarned * 100) / 100 };
```

No `ROUND(x / 50) * 50` was added. Every new payment approval will produce fractional commission values.

### How Bad is It?

| Factor | Value |
|--------|-------|
| Rounding precision | 2 decimal places (Math.round * 100 / 100) |
| Max error per commission entry | ±₦0.005 per `Math.round` call |
| Accumulation error | ±₦0.01 per entry (two rounding points: line 80 + line 95) |
| Practical drift for 20 items | ±₦0.20 — negligible in monetary terms |
| But UX result | Staff see ₦428.57 instead of ₦400/₦450 |

The monetary difference is tiny. The **visual/UX complaint** persists — staff see odd-looking amounts like ₦15.49 or ₦428.57 instead of round figures. This was the original complaint that triggered the audit.

### To Fix Permanently

One line change in `approve/route.ts:80`:

```typescript
// Before: Math.round(commissionEarned * 100) / 100      → ₦428.57
// After:  Math.round(commissionEarned / 50) * 50          → ₦400
// Or:     Math.ceil(commissionEarned / 50) * 50           → ₦450 (upward rounding)
// Or:     Math.floor(commissionEarned / 50) * 50          → ₦400 (downward rounding)
```

`ROUND(x / 50) * 50` snaps to the nearest 50. For ₦428.57: `ROUND(428.57 / 50) * 50 = ROUND(8.5714) * 50 = 9 * 50 = ₦450`. This will make the total slightly higher than the true proportional amount (by ~₦21.43 in this case), which is usually acceptable as it rounds in the staff member's favor.

---

## 4. Can Orphaned Receipts Occur?

### Short Answer

**Yes — every receipt-generating route writes the parent record BEFORE the children, with NO rollback on child failure.**

### Each Route's Orphan Risk

| Route | What Creates | Parent Written First | Children | Orphanable? |
|-------|-------------|---------------------|----------|-------------|
| `sales/create/route.ts` | `sales` + receipt# | ✅ Line 27-39 | `sales_items` (line 53) + inventory (line 67) | 🔴 Yes — if items/inventory fails after line 39 |
| `sales/record/route.ts` | `sales` + receipt# | ✅ Line 37-49 | `sales_items` (line 54) + inventory (line 68) + dss (line 72-96) | 🔴 Yes — same pattern |
| `sales/create-sale/route.ts` | `sales` + receipt# | ✅ Line 21-34 | `sales_items` (line 66) + dss (line 82-101) + inventory (line 104-126) | 🔴 Yes — same pattern |
| `credit/give/route.ts` | `credit_sales` + receipt# | ✅ Line 67-76 | `credit_sale_items` (line 88) + inventory (line 107) + `credit_store` (line 130) + activity (line 133) | 🔴 Yes — 4 potential failure points after parent |
| `receipts/create/route.ts` | `receipts` + receipt# | ✅ Line 22-36 | `receipt_items` (line 63) | 🔴 Yes — if items insert fails |

### Is This Actually Happening?

**No evidence found.** The routes on this system are fast and single-instance. A parent write that succeeds but a child write that fails would require:
- A schema constraint violation (e.g., invalid `item_id` foreign key)
- A Supabase transient failure mid-request
- A serverless function timeout mid-execution

None of these have been observed in production.

### Cross-Table Dangling References

| Reference | Source | Target | Can Dangle? |
|-----------|--------|--------|-------------|
| `staff_sales.receipt_id` → `receipts.id` | Staff sale | receipts table | 🔴 Yes — ADMIN can delete a receipt that a staff_sale references. No cascade. `ON DELETE` is probably `RESTRICT` or `NO ACTION` in Postgres by default, but this should be verified. |
| `staff_sales.receipt_number` (denormalized string) | Staff sale | sales table (conceptual) | No — it's a denormalized string stored on the record itself. Not a FK. |

---

## 5. Summary — Assurance Answers

| Question | Answer | Confidence |
|----------|--------|------------|
| Will Blessing/Kefas/Ambrose gaps recur? | **No** — each `items_paid_for` entry now maps to one sale. No multi-sale distribution happens. | ✅ High |
| Is there a NEW payment gap? | **No** — the zero-rate skip (line 73) can't trigger with single-sale entries. Each entry's commission is correctly zero or correct. | ✅ High |
| Do all sales write to `staff_sales`? | **No** — and that's correct. `sales` and `staff_sales` serve different roles for different user groups. | ✅ High |
| Will fractional commissions recur? | **Yes** — the fix was a one-time SQL patch, not a code change. Every new approval produces fractions. | 🔴 Will recur |
| Can orphaned receipts occur? | **Theoretically yes** — every route writes parent before children with no rollback. No evidence in production. | ⚠️ Low likelihood |
| Is the UI display bug fixed? | **No** — sales-history deduction still dumps remainder on `saleIds[0]`. This affects the "outstanding" display only, not money. | 🔴 Cosmetic only |

---

## 6. Recommended Action Items

| Priority | Fix | Effort | Impact |
|----------|-----|--------|--------|
| **Medium** | Add `ROUND(x / 50) * 50` to commission calculation in `approve/route.ts:80` | 1 line | Prevents fractional commissions permanently — fixes the UX complaint |
| **Low** | Fix sales-history deduction dump in `staff/store/sales-history/route.ts` and `sales/my-sales-history/route.ts` | 10 min | Corrects "outstanding" display in payment UI |
| **Low** | Add `ON DELETE RESTRICT` or cleanup when `receipts` row is deleted to prevent dangling `staff_sales.receipt_id` | 15 min | Prevents broken receipt references |
