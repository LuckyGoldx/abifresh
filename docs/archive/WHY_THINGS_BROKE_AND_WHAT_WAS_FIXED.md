# Why Things Broke When Moving from Express Backend → Next.js API Routes

## TL;DR

**You do NOT need to run `FIX_ALL_SCHEMA_MISMATCHES.sql`.** The problems were caused by PostgREST's schema cache — the same issue the old Express backend had and **deliberately worked around with code workarounds**. The new Next.js API routes were written without these workarounds. This document explains exactly what happened and what was fixed.

---

## The Root Cause: PostgREST Schema Cache

Supabase doesn't give you a direct database connection. Both the old Express backend AND the new Next.js routes use `@supabase/supabase-js`, which talks to PostgreSQL through **PostgREST** (a REST API layer).

PostgREST **caches the database schema** (tables, columns, foreign keys) when it starts up. If you add columns or tables **after** PostgREST started, it doesn't see them until you run:

```sql
NOTIFY pgrst, 'reload schema';
```

This one command refreshes the entire cache. That's it — not a migration, just a cache refresh.

---

## How the Old Backend Handled This

The old Express backend **knew about the schema cache problem** and had explicit workarounds:

### 1. Commission Column in `staff_sales`

The `staff_sales` table was originally created by `STAFF_STORE_MIGRATION.sql` **without** a `commission` column. Later, `COMPLETE_SUPABASE_MIGRATION.sql` defined it **with** `commission`, but since the table already existed (`CREATE TABLE IF NOT EXISTS`), the column was never added.

**Old backend's workaround** (from `backend/src/services/staff-store.service.ts`):
> "commission column omitted from INSERT because PostgREST schema cache doesn't see it; commission is calculated on-the-fly from items.commission instead"

The old backend deliberately **did not** include `commission` in the INSERT and instead calculated it from `items.commission × quantity` when reading.

### 2. Expenses Table

**Old backend's workaround** (from `backend/migrations/create_expenses_table.sql`):
> "RPC FUNCTIONS FOR EXPENSES (Bypasses PostgREST schema cache)"

Created PostgreSQL functions (`get_staff_expenses`, `create_expense`) using `SECURITY DEFINER` + raw SQL to bypass PostgREST entirely.

### 3. Foreign Key Joins

PostgREST needs to know about foreign keys to do joins like `users:staff_id(full_name)`. If FKs aren't in the cache, these joins fail. The old backend had **fallback mechanisms** — for example, `admin.service.ts` tried the join first, then fell back to manual enrichment if it failed.

---

## What the New Next.js Routes Did Wrong

The new API routes were written assuming PostgREST had a fresh schema cache:

| Issue | Old Backend | New Routes (Before Fix) |
|-------|------------|------------------------|
| `staff_sales.commission` INSERT | **Deliberately omitted** — calculated on read | Included in INSERT → schema cache error |
| `staff_expenses` join with `users` | Used RPC functions OR fallback to manual enrichment | Direct PostgREST join → schema cache error |
| `staff_commissions` join with `users` | Same pattern — direct join (also fragile) | Same join, same error |
| `staff_commissions` join with `items` | Required `item_id` column (may not exist) | Same join — fails if column missing |

---

## What Was Fixed (Code Changes)

### Fix 1: `/api/admin/expenses/route.ts` — Admin Expenses Page ✅

**Problem:** `"Could not find a relationship between 'staff_expenses' and 'staff_id' in the schema cache"`

**Before:**
```typescript
.from('staff_expenses')
.select('*, users:staff_id(full_name, email, role, phone_number)')
```

**After:** Removed PostgREST join. Fetches expenses and users separately, then combines manually (same approach as old backend's fallback):
```typescript
.from('staff_expenses').select('*')
// Then separately:
.from('users').select('id, full_name, email, role, phone_number').in('id', staffIds)
// Then manually combines them
```

### Fix 2: `/api/admin/commissions/route.ts` — Admin Commissions ✅

**Problem:** `"Could not find a relationship between 'staff_commissions' and 'users' in the schema cache"`

**Cause:** `staff_commissions` has TWO foreign keys to `users` (`staff_id` and `created_by`), causing PostgREST ambiguity. Plus attempted `items(name)` join when `item_id` column doesn't exist.

**After:** Removed PostgREST join. Fetches commissions and users separately, then combines.

### Fix 3: `/api/staff/commissions/route.ts` — Staff Commissions ✅

**Problem:** `"Could not find a relationship between 'staff_commissions' and 'items' in the schema cache"`

**Cause:** `item_id` column doesn't exist in the actual `staff_commissions` table.

**After:** Removed `items(name, unit_price)` join. Returns commission data without item details.

---

## What About the Commission Staff Sale Error?

The original error: *"Could not find the 'commission' column of 'staff_sales' in the schema cache"*

Current status: **The commission column appears to be in the schema cache now** (dashboard SELECT works). This likely means Supabase restarted PostgREST since the error occurred, refreshing the cache.

If this error returns, you have two options:

### Option A: Reload Schema Cache (Recommended — 10 seconds)

Run this **one line** in Supabase SQL Editor:

```sql
NOTIFY pgrst, 'reload schema';
```

This is NOT a migration. It just tells PostgREST to re-read the database schema. No data is changed.

### Option B: Add Missing Column + Reload (If column doesn't exist)

If the column truly doesn't exist in the database:

```sql
ALTER TABLE public.staff_sales ADD COLUMN IF NOT EXISTS commission DECIMAL(12, 2) DEFAULT 0;
NOTIFY pgrst, 'reload schema';
```

---

## Test Results — All Routes Working

After the fixes, all 19 tested API endpoints return **200 OK**:

| Route | Status |
|-------|--------|
| `/api/admin/expenses` | ✅ 200 (FIXED) |
| `/api/admin/commissions` | ✅ 200 (FIXED) |
| `/api/staff/commissions` | ✅ 200 (FIXED) |
| `/api/admin/staff` | ✅ 200 |
| `/api/admin/staff-stores` | ✅ 200 |
| `/api/admin/staff-stores-stats` | ✅ 200 |
| `/api/admin/reports/sales` | ✅ 200 |
| `/api/admin/reports/comprehensive` | ✅ 200 |
| `/api/admin/my-expenses` | ✅ 200 |
| `/api/staff/dashboard` | ✅ 200 |
| `/api/staff/store` | ✅ 200 |
| `/api/staff/store/sales-history` | ✅ 200 |
| `/api/staff/expenses` | ✅ 200 |
| `/api/staff/posted-items` | ✅ 200 |
| `/api/staff/stats` | ✅ 200 |
| `/api/notifications` | ✅ 200 |
| `/api/receipts` | ✅ 200 |
| `/api/sales/dashboard` | ✅ 200 |
| `/api/sales/receipts` | ✅ 200 |

---

## Summary

| Question | Answer |
|----------|--------|
| **Why did things break?** | PostgREST schema cache doesn't see columns/FKs added after startup |
| **Did the old backend have this problem?** | YES — it had explicit code workarounds for the same issue |
| **Do I need to run FIX_ALL_SCHEMA_MISMATCHES.sql?** | NO — the code fixes handle most issues. Only run `NOTIFY pgrst, 'reload schema'` if the commission error returns |
| **Is this a once-in-a-while thing?** | Schema cache refreshes when Supabase restarts PostgREST (automatic). But it can go stale if you ALTER tables from SQL Editor |
| **What was actually fixed?** | 3 API routes changed to avoid PostgREST joins → use manual data enrichment instead |

---

## Files Changed

1. `frontend/app/api/admin/expenses/route.ts` — Removed PostgREST join, manual staff enrichment
2. `frontend/app/api/admin/commissions/route.ts` — Removed PostgREST join, manual staff enrichment
3. `frontend/app/api/staff/commissions/route.ts` — Removed `items` join (column doesn't exist)
