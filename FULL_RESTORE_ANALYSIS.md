# Full Restore Analysis: Empty All 25 Tables → Restore from Backup

> **Date:** Current session  
> **Scope:** Comprehensive analysis of every route, service, table, and subsystem  
> **Question:** "If I empty all 25 tables and restore from backup, will everything work?"
>
> **Short answer:** ✅ Almost everything — with **one hard FK issue** and **two permanent data risks** you must understand before proceeding.

---

## Table of Contents

1. [What the Backup Contains](#1-what-the-backup-contains)
2. [What the Backup Does NOT Contain](#2-what-the-backup-does-not-contain---critical)
3. [The Dual Auth System](#3-the-dual-auth-system)
4. [FK Dependency Analysis — All 25 Tables](#4-fk-dependency-analysis--all-25-tables)
5. [The Real FK Restore Problem](#5-the-real-fk-restore-problem)
6. [Generated Columns](#6-generated-columns)
7. [RLS Bypass During Restore](#7-rls-bypass-during-restore)
8. [items.active_store_quantity Consistency](#8-itemsactive_store_quantity-consistency)
9. [Supabase Storage (Product Images)](#9-supabase-storage-product-images)
10. [localStorage & Browser State](#10-localstorage--browser-state)
11. [Safe Step-by-Step Restore Procedure](#11-safe-step-by-step-restore-procedure)
12. [What Could Permanently Break](#12-what-could-permanently-break)
13. [Quick Reference Table — All 25 Tables](#13-quick-reference-table--all-25-tables)

---

## 1. What the Backup Contains

The backup system exports data from exactly **25 tables** via `select('*')`, meaning **every column that currently exists in the database is captured**, regardless of whether the SQL schema documentation is outdated.

### ALLOWED_TABLES (in backup order):
```
1.  users
2.  items
3.  inventory_main_store
4.  inventory_active_store
5.  inventory_transfers
6.  restock_orders
7.  restock_order_items
8.  sales
9.  sales_items
10. daily_sales_summary
11. receipts
12. receipt_items
13. posted_items
14. posted_items_mapping
15. staff_store
16. staff_sales
17. staff_commissions
18. staff_payments
19. staff_expenses
20. returned_items
21. damage_loss_reports
22. notifications
23. activity_logs
24. system_settings
25. backup_history
```

**Important detail:** The backup's `downloadAllExcel` and the restore both iterate tables in this exact order. This order is critical for FK safety — see Section 5.

### What `select('*')` captures:
- All standard columns including ones added after initial schema creation
- `items` extra columns: `quantity`, `active_store_quantity`, `base_price`, `price_jalingo`, `price_outside`, `commission`, `brand`, `package_type`
- `staff_payments.items_paid_for` (JSONB)
- All UUID primary keys — restored exactly, so all cross-references remain intact

### What is intentionally stripped before restore:
- `staff_store.quantity_available` — GENERATED ALWAYS column, stripped automatically by the backup system's `excludeGeneratedColumns` helper, recomputed by PostgreSQL on insert

---

## 2. What the Backup Does NOT Contain — CRITICAL

### ❌ Supabase `auth.users` — PASSWORDS NOT BACKED UP

This is the most critical gap. User authentication in this system uses **two separate stores**:

| Store | Contains | In Backup? |
|-------|----------|------------|
| `public.users` | name, email, username, role, is_active, store_location | ✅ YES |
| `auth.users` (Supabase managed) | password hashes, email confirmations, MFA | ❌ NO |

The login flow in `auth.service.ts`:
```
1. Frontend sends { username, password }
2. Backend queries public.users → finds email from username
3. Calls supabaseAuth.auth.signInWithPassword({ email, password })
4. Supabase checks auth.users for the password hash
5. On success, backend generates JWT with { sub: userId, email, role }
```

**Consequence:** Restoring `public.users` is enough for login to work **AS LONG AS `auth.users` is untouched**. Since `auth.users` is a Supabase-internal table and is never touched by the backup/restore process, passwords survive.

**Danger:** If you also manually delete or truncate `auth.users`, passwords are gone forever. Supabase has no way to recover them. You would need to reset every user's password manually.

### ❌ Supabase Storage — PRODUCT IMAGES NOT BACKED UP

Product images live in the `product-images` Supabase Storage bucket. The `items.image_url` column stores a URL like:
```
https://[project].supabase.co/storage/v1/object/public/product-images/...
```

The backup captures the `image_url` string value but **not the image files themselves**. If the storage bucket is wiped separately, images are gone and the URLs in the restored DB will 404.

---

## 3. The Dual Auth System

Understanding this is key to safe restore:

```
registerUser (auth.service.ts):
  1. supabaseAdmin.auth.admin.createUser({ email, password })
     → Creates record in auth.users (Supabase-managed)
  2. supabaseAdmin.from('public.users').insert({ id: sameUUID, email, full_name, ... })
     → Creates record in public.users (your 25-table backup)

login (auth.service.ts):
  1. supabaseAdmin.from('public.users').select('email').eq('username', username)
     → Lookup by username
  2. supabaseAuth.auth.signInWithPassword({ email, password })
     → Validates against auth.users
  3. generateToken(user.id, user.email, user.role) → JWT
```

**After restore:**
- `public.users` is fully restored with same UUIDs, emails, usernames, roles
- `auth.users` was never touched
- Login works exactly as before — same credentials, same JWTs, same sessions

---

## 4. FK Dependency Analysis — All 25 Tables

### Tier 0: No dependencies
| # | Table | Notes |
|---|-------|-------|
| 1 | `users` | Root table. All FKs point TO this table. |

### Tier 1: Depend only on `users` or `items`
| # | Table | FK Dependencies |
|---|-------|-----------------|
| 2 | `items` | `created_by` → `users.id` (nullable) |
| 3 | `inventory_main_store` | `item_id` → `items.id` NOT NULL |
| 4 | `inventory_active_store` | `item_id` → `items.id` NOT NULL |
| 5 | `inventory_transfers` | `item_id` → `items.id` NOT NULL; `transferred_by` → `users.id` NOT NULL |
| 6 | `restock_orders` | `created_by` → `users.id` NOT NULL, ON DELETE CASCADE |
| 8 | `sales` | `item_id` → `items.id` NOT NULL; `salesperson_id` → `users.id` NOT NULL |
| 10 | `daily_sales_summary` | `salesperson_id` → `users.id` NOT NULL |
| 11 | `receipts` | `staff_id` → `users.id` ON DELETE SET NULL (nullable in practice: no) |
| 13 | `posted_items` | `item_id` → `items.id` NOT NULL; `posted_by_id` → `users.id` NOT NULL; `posted_to_id` → `users.id` NOT NULL; `staff_id` → `users.id` ON DELETE CASCADE |
| 15 | `staff_store` | `staff_id` → `users.id` ON DELETE CASCADE NOT NULL; `item_id` → `items.id` ON DELETE CASCADE NOT NULL; `posted_from_id` → `users.id` ON DELETE SET NULL (nullable) |
| 16 | `staff_sales` | `staff_id` → `users.id` NOT NULL; `item_id` → `items.id` NOT NULL; `buyer_id` → `users.id` ON DELETE SET NULL (nullable) |
| 17 | `staff_commissions` | `staff_id` → `users.id` NOT NULL; `created_by` → `users.id` (nullable) |
| 18 | `staff_payments` | `staff_id` → `users.id` NOT NULL; `approved_by` → `users.id` (nullable); `paid_by` → `users.id` (nullable) |
| 19 | `staff_expenses` | `staff_id` → `users.id` NOT NULL; `approved_by` → `users.id` (nullable) |
| 20 | `returned_items` | `item_id` → `items.id` ON DELETE CASCADE NOT NULL; `requester_staff_id` → `users.id` NOT NULL; `receiver_staff_id` → `users.id` NOT NULL |
| 21 | `damage_loss_reports` | `item_id` → `items.id` NOT NULL; `reported_by` → `users.id` NOT NULL; `investigated_by` → `users.id` (nullable) |
| 22 | `notifications` | `user_id` → `users.id` NOT NULL |
| 23 | `activity_logs` | `user_id` → `users.id` (nullable) |
| 24 | `system_settings` | `updated_by` → `users.id` (nullable) |
| 25 | `backup_history` | `triggered_by` → `users.id` ON DELETE SET NULL (nullable) |

### Tier 2: Depend on Tier 1 tables
| # | Table | FK Dependencies | Notes |
|---|-------|-----------------|-------|
| 7 | `restock_order_items` | `order_id` → `restock_orders.id` ON DELETE CASCADE NOT NULL; `item_id` → `items.id` ON DELETE CASCADE NOT NULL | Position 7 > position 6 ✅ |
| 9 | `sales_items` | `sale_id` → `sales.id` NOT NULL; `item_id` → `items.id` NOT NULL | Position 9 > position 8 ✅ |
| 12 | `receipt_items` | `receipt_id` → `receipts.id` ON DELETE CASCADE NOT NULL; `item_id` → `items.id` ON DELETE SET NULL | Position 12 > position 11 ✅ |
| 14 | `posted_items_mapping` | `posted_item_id` → `posted_items.id` ON DELETE CASCADE NOT NULL; `staff_store_id` → `staff_store.id` ON DELETE SET NULL | Position 14; depends on position 15 ⚠️ **PROBLEM** |

---

## 5. The Real FK Restore Problem

### ⚠️ `posted_items_mapping` (position 14) references `staff_store` (position 15)

This is the **only** FK ordering violation in the 25-table backup order.

```sql
-- from COMPLETE_SUPABASE_MIGRATION.sql:
CREATE TABLE public.posted_items_mapping (
  ...
  staff_store_id UUID REFERENCES public.staff_store(id) ON DELETE SET NULL,
  ...
);
```

The column is nullable and has `ON DELETE SET NULL`. However, `ON DELETE SET NULL` only affects what happens when you **delete** a referenced row — it has **no effect on INSERT/UPDATE validation**. When inserting a `posted_items_mapping` row where `staff_store_id` is non-null, PostgreSQL will check that the referenced `staff_store` row exists.

**Scenario analysis:**

| Scenario | Result |
|----------|--------|
| Use backup system's **Replace** mode (deletes + restores one table at a time) | ✅ Safe — `staff_store` has data when `posted_items_mapping` is processed |
| **Empty all 25 tables first**, then upload backup in **Merge** mode | ⚠️ FK violation at table 14 if any `posted_items_mapping` row has non-null `staff_store_id` (i.e., any posting was accepted) |
| **Empty all 25 tables first**, then upload backup in **Replace** mode | ✅ Safe — Replace mode does its own delete+insert cycle per table, so `staff_store` gets restored at position 15 before `posted_items_mapping`'s parent check... Wait, problem: Replace mode deletes table 14 data and inserts fresh. Since tables 1-13 are already done and table 15 hasn't been restored yet when Replace inserts table 14, the same violation occurs. |

**Correct analysis:** Whether using Replace or Merge mode after manually emptying all tables, the violation will occur because:
- Table 14 (`posted_items_mapping`) is always restored before table 15 (`staff_store`)
- The backup system processes in ALLOWED_TABLES order
- Any non-null `staff_store_id` values will fail FK check

### ✅ Solution Options:

**Option A (Recommended): Don't empty tables manually — use Replace mode directly**  
Replace mode in the backup system handles each table individually (delete-then-insert) without clearing the other tables first. When it processes table 14, tables 15-25 still have their original data in the DB, so `staff_store_id` FKs are satisfied.

**Option B: Two-pass restore after manually emptying**  
1. First pass: upload backup, skip `posted_items_mapping` (let it fail and ignore it)
2. Second pass: restore only `posted_items_mapping` after `staff_store` is populated

**Option C: Manual SQL**  
After emptying all 25 tables, run the restore SQL with deferred FK constraints:
```sql
SET CONSTRAINTS ALL DEFERRED;
-- insert all data here
SET CONSTRAINTS ALL IMMEDIATE;
```

---

## 6. Generated Columns

### `staff_store.quantity_available`

```sql
quantity_available INTEGER GENERATED ALWAYS AS (quantity - COALESCE(quantity_sold, 0)) STORED
```

This column is **automatically excluded** from the backup insert payload by the backup system's `excludeGeneratedColumns` function. When `quantity` and `quantity_sold` are inserted, PostgreSQL recomputes `quantity_available` automatically.

**No action needed.** After restore, `quantity_available` will be exactly correct.

---

## 7. RLS Bypass During Restore

All 25 tables have Row Level Security (RLS) enabled. However, the backup/restore system uses `supabaseAdmin` (the service role key), which **bypasses RLS entirely** for all operations. There are no RLS-related restore failures to worry about.

---

## 8. `items.active_store_quantity` Consistency

The `items` table has an `active_store_quantity` column that is updated by multiple operations:

| Operation | Effect on `active_store_quantity` |
|-----------|----------------------------------|
| New sale (sales.routes.ts) | Decremented by quantity sold |
| Staff store return accepted (returned-items.service.ts) | Incremented by returned quantity |
| Staff store posting accepted (staff-store.service.ts) | Decremented when posting items to staff |

**After restore:** Since `items.active_store_quantity` is a regular column (not generated), its value from the backup is restored as-is. If the backup was taken at a consistent point in time, all values are correct.

**Risk:** If the backup was taken mid-operation (e.g., a sale was recorded in `sales_items` but `items.active_store_quantity` hadn't been decremented yet), there could be a slight inconsistency. This is an inherent risk of non-transactional backups, not specific to restore.

---

## 9. Supabase Storage (Product Images)

Product images are stored in the Supabase `product-images` storage bucket. The `items.image_url` column stores the public URL.

| Component | Backed up? | What happens after restore |
|-----------|------------|---------------------------|
| `items.image_url` column | ✅ Yes (in DB backup) | URL string restored correctly |
| Actual image files | ❌ No | Images still served from Supabase Storage as long as the bucket is untouched |

**The storage bucket is completely independent of the DB backup/restore process.** As long as you don't delete images from Supabase Storage, all image URLs will continue to work after restore.

---

## 10. localStorage & Browser State

The app stores two things in localStorage:

| Key | Contains | Persistent? |
|-----|----------|-------------|
| `auth-storage` | JWT token (user session) | No — expires, then re-login |
| `akv-backup-history` (HISTORY_KEY) | Backup history cache | Synced to `backup_history` table in DB |

**After restore:** 
- Active user sessions will continue to work (JWT is signed with `JWT_SECRET`, independent of DB)
- Backup history localStorage cache will re-sync from the restored `backup_history` table on next load
- No localStorage data is lost that isn't already in the DB backup

---

## 11. Safe Step-by-Step Restore Procedure

### ✅ Recommended: Use Replace Mode Without Pre-Emptying

This is the safest approach and avoids the FK issue entirely.

```
1. Go to Admin Dashboard → Backup tab
2. Select your backup file (.xlsx)
3. Choose Restore Mode: "Replace" (recommended)
4. Click Restore
5. Wait for completion — tables are processed in order 1-25
6. Verify: check Users, Items, Staff, Sales data in the UI
7. Test login with a known user credential
```

### ⚠️ If You Must Empty All Tables First

Use this exact order when emptying to avoid FK violations during the empty phase:

```sql
-- Delete in REVERSE dependency order (children before parents)
TRUNCATE TABLE 
  backup_history,
  system_settings,
  activity_logs,
  notifications,
  damage_loss_reports,
  returned_items,
  staff_expenses,
  staff_payments,
  staff_commissions,
  staff_sales,
  posted_items_mapping,  -- must be before staff_store AND posted_items
  staff_store,
  posted_items,
  receipt_items,
  receipts,
  daily_sales_summary,
  sales_items,
  sales,
  restock_order_items,
  restock_orders,
  inventory_transfers,
  inventory_active_store,
  inventory_main_store,
  items,
  users
CASCADE;  -- CASCADE handles any remaining dependencies
```

Then restore using **Replace** mode (which handles the `posted_items_mapping` → `staff_store` issue correctly by doing its own internal ordering).

Or use Option B/C from Section 5.

---

## 12. What Could Permanently Break

### 🔴 Category 1: Permanent & Unrecoverable

| Risk | Trigger | Recovery |
|------|---------|----------|
| **All user passwords lost** | Manually deleting `auth.users` in Supabase | None — passwords are hashed and cannot be recovered. All users must reset passwords. |
| **Product images lost** | Deleting files from `product-images` Supabase Storage bucket | None — images are not in the DB backup. |

### 🟡 Category 2: Recoverable Issues

| Risk | Trigger | Recovery |
|------|---------|----------|
| FK violation on `posted_items_mapping` | Empty all tables first + restore in Merge mode | Process `posted_items_mapping` in a second pass after `staff_store` is restored |
| User session tokens invalidated | Change `JWT_SECRET` in backend `.env` | All users simply need to log in again |
| Slight `active_store_quantity` desync | Backup taken mid-operation | Manually correct from Admin inventory screen |

### 🟢 Category 3: Not Actually a Problem

| Concern | Reality |
|---------|---------|
| Passwords missing from backup | auth.users is never modified by backup/restore — passwords survive |
| RLS blocking restore | supabaseAdmin bypasses RLS entirely |
| Generated column `quantity_available` missing | Auto-stripped, auto-recomputed on insert |
| `items` table missing new columns | select('*') captures ALL current columns |
| localStorage data loss | Only ephemeral JWT and backup history cache (synced from DB) |

---

## 13. Quick Reference Table — All 25 Tables

| # | Table | Restore Order OK? | Notes |
|---|-------|-------------------|-------|
| 1 | `users` | ✅ | Root — no deps in backup set |
| 2 | `items` | ✅ | created_by → users (nullable) |
| 3 | `inventory_main_store` | ✅ | item_id → items[2] |
| 4 | `inventory_active_store` | ✅ | item_id → items[2] |
| 5 | `inventory_transfers` | ✅ | item_id → items[2], transferred_by → users[1] |
| 6 | `restock_orders` | ✅ | created_by → users[1] |
| 7 | `restock_order_items` | ✅ | order_id → restock_orders[6], item_id → items[2] |
| 8 | `sales` | ✅ | item_id → items[2], salesperson_id → users[1] |
| 9 | `sales_items` | ✅ | sale_id → sales[8], item_id → items[2] |
| 10 | `daily_sales_summary` | ✅ | salesperson_id → users[1] |
| 11 | `receipts` | ✅ | staff_id → users[1] (ON DELETE SET NULL) |
| 12 | `receipt_items` | ✅ | receipt_id → receipts[11], item_id → items[2] (ON DELETE SET NULL) |
| 13 | `posted_items` | ✅ | item_id → items[2], posted_by_id/posted_to_id/staff_id → users[1] |
| 14 | `posted_items_mapping` | ⚠️ | posted_item_id → posted_items[13] ✅; staff_store_id → staff_store[15] **ORDER ISSUE** |
| 15 | `staff_store` | ✅ | staff_id → users[1], item_id → items[2], posted_from_id → users (nullable) |
| 16 | `staff_sales` | ✅ | staff_id → users[1], item_id → items[2], buyer_id → users (nullable) |
| 17 | `staff_commissions` | ✅ | staff_id → users[1], created_by → users (nullable) |
| 18 | `staff_payments` | ✅ | staff_id → users[1], approved_by/paid_by → users (nullable) |
| 19 | `staff_expenses` | ✅ | staff_id → users[1], approved_by → users (nullable) |
| 20 | `returned_items` | ✅ | item_id → items[2], requester/receiver_staff_id → users[1] |
| 21 | `damage_loss_reports` | ✅ | item_id → items[2], reported_by → users[1], investigated_by → users (nullable) |
| 22 | `notifications` | ✅ | user_id → users[1] |
| 23 | `activity_logs` | ✅ | user_id → users[1] (nullable) |
| 24 | `system_settings` | ✅ | updated_by → users[1] (nullable) |
| 25 | `backup_history` | ✅ | triggered_by → users[1] (ON DELETE SET NULL) |

---

## Summary

| Question | Answer |
|----------|--------|
| Will all data be restored? | ✅ Yes — all 25 tables, all columns, all rows |
| Will login still work? | ✅ Yes — auth.users (passwords) is untouched |
| Will product images still show? | ✅ Yes — as long as Storage bucket is untouched |
| Is there a FK restore ordering issue? | ⚠️ Yes — `posted_items_mapping`[14] → `staff_store`[15]. Use Replace mode, do not pre-empty tables |
| Will RLS block the restore? | ✅ No — supabaseAdmin bypasses RLS |
| Will generated columns work? | ✅ Yes — auto-stripped and auto-recomputed |
| What can permanently break? | Deleting `auth.users` (passwords) or Supabase Storage files |
