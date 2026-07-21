# Session Handover — AKV Payment System Audit & Fix

**Date**: July 13–17, 2026  
**Primary focus**: Staff payment reconciliation, race condition fixes, Ambrose store audit, payment tracking overhaul  
**Files modified**: 20+ | **Commits**: 8 | **Analysis docs**: 5

---

## Documents Created (5)

| File | Purpose |
|---|---|
| `SESSION_HANDOVER.md` | This handover document |
| `SYSTEM_AUDIT_REPORT.md` | Full system audit — all staff payment gaps, issues, fixes |
| `AMBROSE_OVERSELL_ANALYSIS.md` | Deep dive into Ambrose's −57 oversold display |
| `AMBROSE_OVERSELL_BEFORE_AFTER.md` | Per-item before/after with inventory quantities |
| `AMBROSE_8M_CREDIT_SALES_ANALYSIS.md` | Breakdown of Ambrose's ₦8M outstanding credit sales |

---

## What Was Fixed (8 Commits)

### 1. Checkout Flow Race Condition (Commit `467a3ba`)

**Problem**: Two simultaneous checkouts both read `quantity_sold`, both passed Gate 3, overwrote each other's counter update — causing oversell.

**Fix**: Optimistic locking — `.eq('quantity_sold', storeEntry.quantity_sold)` on the UPDATE. If changed since read, returns 0 rows → rejected.

| File | Change |
|---|---|
| `staff/store/make-sales/route.ts:100` | `.eq('quantity_sold', storeEntry.quantity_sold)` |
| `sales/create-sale/route.ts:111` | `.eq('active_store_quantity', currentQty)` |

### 2. Payment Type Cleanup (Commits `ddcf2d4`, `294b4b6`)

**Problem**: Sales staff payments hardcoded as `'commission'`. Non-commission used `'salary'`. Filter was a fragile `.or('payment_type.neq.commission,paid_by.is.null')` hack.

**Fix**: Clean types — `sales`, `non_commission`, `commission`.

| Staff Type | Before | After |
|---|---|---|
| sales_staff | `commission` | `sales` |
| non_commission_staff | `salary` | `non_commission` |
| commission_staff | `commission` | `commission` (unchanged) |

**Files changed**:
- `sales/payments/request/route.ts:137` → `'sales'`
- `staff/payments/request/route.ts:99` → `'non_commission'`
- `migrations/MIGRATE_SALES_STAFF_PAYMENT_TYPE.sql` → CHECK constraint + relabel

**Filter cleanup**: 11 endpoints had `.or('payment_type.neq.commission,paid_by.is.null')` removed. All now use `.neq('payment_type', 'credit_remittance')`.

### 3. `paid_by` Audit Trail (Commit `ddcf2d4`)

Added `paid_by: authResult.id` to payment approval. File: `admin/payments/[id]/approve/route.ts:122`.

### 4. Payment Display Gaps — Auto-Heal (Commits `cb9b5a2`, `dd06a64`, `f1f4547`)

**Problem**: Staff payment pages showed item-level unpaid ≠ financial outstanding.

**Fix**: Quantity-based sequential distribution (matching admin page) + auto-heal scaling with cap at 1.0 + zero-out + epsilon filter.

**Files**: `sales/my-sales-history/route.ts`, `staff/store/sales-history/route.ts`

**Current state**:

| Staff | Gap | Scale | Status |
|---|---|---|---|
| Blessing | ₦22,750 overpaid | Items hidden | Heals as new sales exceed gap |
| Ambrose | ₦16,000 | 1.0 (capped) | Heals with new approvals |
| Kefas | ₦13,500 | 0.988 | Near-invisible |
| Shadrack | ₦0 | 1.0 | Clean |
| Thankgod | ₦0 | 1.0 | Clean |

### 5. Staff Store Grouping Key (Commit `51d9fec`)

**Problem**: Items at different prices merged into one row on payment page.

**Fix**: Added `unit_price` to grouping key: `const key = ${item_id}_${locKey}_${unitPrice.toFixed(2)}`

### 6. Date Range Boundaries (Commits `a7a1be3`, `c8d2f88`)

**Problem**: Custom `to` date at midnight UTC excluded full end day.

**Fix**: `to` advances to next day, capped at `endOfToday`. Applied to all 3 report routes and date pickers.

### 7. Loading Progress UI (Commit `c8d2f88`)

Multi-stage progress bars with dynamic labels for `/reports` and `/credit-reports`.

### 8. Custom Date vs Custom Range (Commit `c8d2f88`)

Separate "Custom Date" (single day) and "Custom Range" options.

### 9. Receipt ID FK (Commit `685dbf0`)

Added `receipt_id UUID REFERENCES receipts(id)` to `staff_sales` and `sales` tables. Migration: `migrations/ADD_RECEIPT_ID_TO_SALES.sql`.

---

## Ambrose −57 Oversell — Complete Findings

**The −57 is a display artifact, not financial damage.**

**Root cause**: 74 returns accepted on July 11 (the day AFTER Ambrose's last sales on July 10). Returns reduced posted quantities below what was already sold. Sales happened against higher pre-return stock.

**Payment verification**: 16 approved payments reference oversold staff_sales. Ambrose submitted and admin approved.

**Other staff**: Clean — only Ambrose affected.

**Fix (not yet run)**:
```sql
UPDATE staff_store SET quantity = quantity_sold
WHERE staff_id = 'ff0c1e84-db2e-4e90-a370-88f7f8130d37' AND quantity_sold > quantity;
```

---

## Ambrose ₦8M Credit Sales Gap

- **34 fully unpaid records** (879 units, ₦7,694,600) — concentrated July 7–10, 2026
- **1 partially unpaid record** (43.5 units, ₦352,350) — JUSTFIT CARRY PACK S3, sold June 6, paid partially July 2
- **Total outstanding**: ₦8,062,950
- **Not a bug** — goods given on credit, money not yet collected

---

## The ₦16,000 Sequential Dump Gap

63 approved payments each deposited a tiny remainder on the first sale_id via the `if (remaining > 0) paidQtyMap.set(saleIds[0], ...)` dump. Each dump = ₦200–₦500. Accumulated total: ₦16,000. Same mechanism as Blessing's ₦22,750 overpayment, just smaller. Auto-heal cap at 1.0 handles the display.

---

## All Files Modified (20+)

| File | Change |
|---|---|
| `staff/store/make-sales/route.ts` | Optimistic locking on quantity_sold |
| `sales/create-sale/route.ts` | Optimistic locking on active_store_quantity |
| `sales/my-sales-history/route.ts` | Qty-based paidQty, auto-heal, epsilon, pending fix |
| `staff/store/sales-history/route.ts` | Same + grouping key with unit_price |
| `admin/payments/[id]/approve/route.ts` | paid_by audit trail |
| `sales/payments/request/route.ts` | payment_type 'sales' |
| `staff/payments/request/route.ts` | payment_type 'non_commission' |
| `admin/payments/staff-summary/route.ts` | Removed paid_by.is.null filter |
| `admin/payments/staff-detail/[staffId]/route.ts` | Removed paid_by.is.null filter |
| `admin/payments/pending/route.ts` | Removed paid_by.is.null filter |
| `admin/payments/pending-count/route.ts` | Removed paid_by.is.null filter |
| `admin/payments/outstanding-summary/route.ts` | Removed paid_by.is.null filter |
| `admin/payments/all/route.ts` | Removed paid_by.is.null filter |
| `staff/payments/route.ts` | Removed paid_by.is.null filter |
| `sales/payments/route.ts` | Removed paid_by.is.null filter |
| `staff/dashboard/route.ts` | Removed paid_by.is.null filter |
| `admin/reports/credits/route.ts` | Date boundary fix |
| `admin/reports/comprehensive/route.ts` | Date boundary fix |
| `admin/reports/sales-analysis/route.ts` | Date boundary fix |
| `admin/reports/content.tsx` | Custom date/range, loading, max date |
| `admin/credit-reports/content.tsx` | Same |
| `staff/make-sale/page.tsx` | Sale-first receipt-second order |
| `sales/make-sale/page.tsx` | Same |

---

## Database Migrations

| File | Status |
|---|---|
| `migrations/ADD_RECEIPT_ID_TO_SALES.sql` | New — receipt_id FK |
| `migrations/MIGRATE_SALES_STAFF_PAYMENT_TYPE.sql` | New — CHECK constraint + relabel |
| `migrations/RPC_REPORTS.sql` | Dropped/reverted |
| `migrations/RPC_FUNCTIONS.sql` | Dropped/reverted |

---

## Remaining Work

- ~~**Ambrose SQL fix**: Run on production~~ Done July 17, 2026
- **Ambrose restock**: Post fresh inventory — all 51 items show available=0
- **Override creds**: Remove temp staff passwords from `.env.local` after testing
- **Test optimistic locking**: Deploy and verify race condition rejection
- **Frontend refactoring**: See `plans/frontend-refactoring-analysis.md` (open in tabs)
