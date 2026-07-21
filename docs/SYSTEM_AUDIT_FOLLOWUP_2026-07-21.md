# SYSTEM AUDIT FOLLOW-UP: Fixes Verified & Remaining Issues

**Generated**: 2026-07-21  
**Context**: Follow-up to `SYSTEM_AUDIT_COMPREHENSIVE_2026-07-20.md` — verifying fixes applied in session 2026-07-21

---

## 1. EXECUTIVE SUMMARY

This report verifies all fixes applied during the 2026-07-21 session and re-audits the remaining open issues from the original comprehensive audit.

### Fixes Applied This Session: 4 (all verified)

| Fix | Files Changed | Status |
|-----|--------------|--------|
| Optimistic locking on inventory deduction | 3 routes (`sales/create`, `sales/record`, `credit/give`) | ✅ Verified |
| Superadmin role on inventory write routes | 6 handlers across 5 files | ✅ Verified |
| Popup blocked fallback in receipt printing | `lib/receipt-utils.ts` | ✅ Verified |
| `.env.production` added to gitignore | `.gitignore` | ✅ Verified |

### Remaining Open Issues: 15 (unchanged from original audit)

| Severity | Count | Key Areas |
|----------|-------|-----------|
| Critical | 1 | No database transactions |
| High | 9 | Fire-and-forget patterns, auth orphans, role gaps |
| Medium | 1 | Pagination on inventory |
| Low | 4 | Types, date formatting, hook bugs, dead code |

---

## 2. FIXES APPLIED — VERIFIED

### 2.1 Optimistic Locking on Inventory Deduction

All 4 routes that deduct inventory now use `.eq('active_store_quantity', currentQty)` + return `409 Conflict` on failure:

| Route | Optimistic Lock | 409 on Conflict |
|-------|----------------|-----------------|
| `sales/create/route.ts` | ✅ `.eq('active_store_quantity', currentQty)` | ✅ |
| `sales/record/route.ts` | ✅ `.eq('active_store_quantity', currentQty)` | ✅ |
| `credit/give/route.ts` | ✅ `.eq('active_store_quantity', currentQty)` | ✅ |
| `sales/create-sale/route.ts` | ✅ (already had it) | ✅ |

Without this fix: two concurrent checkouts could both read `quantity=10`, both compute `10-5=5`, and both write `5` — selling 10 units but only deducting 5. Now the second update finds `quantity` is now `5` (not the `10` it expected), matches 0 rows, and returns 409.

---

### 2.2 Superadmin Role on Inventory Write Routes

All 6 inventory write handlers now check `hasRole(authResult.role, 'admin', 'superadmin')`:

| File | Handler | Before | After |
|------|---------|--------|-------|
| `inventory/items/route.ts` | POST | `'admin'` only | `'admin', 'superadmin'` |
| `inventory/items/[id]/route.ts` | PUT | `'admin'` only | `'admin', 'superadmin'` |
| `inventory/items/[id]/route.ts` | DELETE | `'admin'` only | `'admin', 'superadmin'` |
| `inventory/upload-image/route.ts` | POST | `'admin'` only | `'admin', 'superadmin'` |
| `inventory/transfer/active-to-main/route.ts` | POST | `'admin'` only | `'admin', 'superadmin'` |
| `inventory/transfer/main-to-active/route.ts` | POST | `'admin'` only | `'admin', 'superadmin'` |

Previously, superadmin users (who have elevated privileges in the app) were rejected with 403 when trying to modify inventory. Now they're properly authorized.

---

### 2.3 Popup Blocker Fix — Receipt Printing

File: `lib/receipt-utils.ts` — `printReceipt()` function

Three changes made:

1. **`window.open()` moved to function start** (line 268) — called before any `await` so the browser preserves the user gesture context and the popup is not blocked.

2. **Download fallback on block** (lines 293-297) — if popup returns `null`, creates an `<a download>` element with the receipt image and clicks it. User gets a PNG download instead of silent failure.

3. **Cleanup in `finally`** (lines 306-309) — `tempContainer` is removed from the DOM even if `html2canvas` throws. Also closes the empty popup window on error.

---

### 2.4 Gitignore — `.env.production`

`.gitignore` now has two entries:

| Line | Pattern | Purpose |
|------|---------|---------|
| 30 | `.env.production` | Root-level — defense-in-depth |
| 128 | `frontend/.env.production` | Frontend-specific (was already present) |

The original audit flagged `.env.production` as committed to git. Investigation confirmed:
- The file `frontend/.env.production` **was** committed historically (3 blobs) but only contained `NEXT_PUBLIC_*` variables (which are public by design).
- `SUPABASE_SERVICE_ROLE_KEY` and `JWT_SECRET` were **never** committed to git history. They exist only in the current local files on disk.
- Both local files are now properly gitignored.

**Recommendation**: Rotating the Supabase service role key and JWT secret is still recommended as a precaution, though git history does not contain them.

---

## 3. PRIOR SESSION FIXES (2026-07-20) — Already Verified

These fixes from the prior session were confirmed still in place:

| Fix | Status |
|-----|--------|
| Blessing payment gap (₦22,750) | ✅ |
| Kefas payment gap (₦13,500) | ✅ |
| Ambrose payment gap (₦16,000) | ✅ |
| Commission rounding (31 fractional entries) | ✅ |
| UI/UX changes (7 pages) | ✅ |
| API endpoint fixes (6 routes) | ✅ |
| SQL fix files generated | ✅ |
| Optimistic locking in `sales/create-sale/route.ts` | ✅ (reference impl) |

---

## 4. REMAINING OPEN ISSUES

### 4.1 🔴 Critical — No Database Transactions (1 issue)

| Issue | Original Severity | Status | Reason Not Fixed |
|-------|------------------|--------|------------------|
| No DB transactions on multi-step ops | 🔴 | Open | Requires SQL RPC functions or new dependency. Discussed but deferred — no evidence of partial-write failures in production. |

Affected routes:
- `sales/create/route.ts` — sale insert + items insert + inventory deduct (3 steps)
- `credit/give/route.ts` — 7 sequential writes
- `admin/staff/create/route.ts` — auth user + DB profile (cross-service, can't be in a DB transaction)
- `admin/payments/[id]/approve/route.ts` — payment approve + commission generation

**Risk**: Low in practice (single-store traffic, Supabase rarely fails mid-request). Data corruption on failure would be silent.

---

### 4.2 🟡 High — Fire-and-Forget Patterns (2 issues)

| Issue | Original Severity | Status | Reason Not Fixed |
|-------|------------------|--------|------------------|
| Commission generation in payment approval | 🟡 High | Open | Has never failed in production. User decided to defer. |
| Audit trail inserts (10 instances across credits module) | 🟡 High | Open | Identified but not addressed. All `.then(() => {}, () => {})` — silent failures. |

Affected files:
- `credits/store/route.ts:166`
- `credits/sales/route.ts:116`
- `credits/sales/[id]/payment/route.ts:201`
- `credits/sales/[id]/cancel/route.ts:61`
- `credits/payments/route.ts:214`
- `credits/payments/[id]/reject/route.ts:30`
- `credits/payments/[id]/approve/route.ts:121`
- `credits/creditors/[id]/route.ts:186, 271`
- `credits/creditors/route.ts:214`

---

### 4.3 🟡 High — Missing Role Checks (1 issue)

| Issue | Original Severity | Status |
|-------|------------------|--------|
| No `hasRole()` on staff routes (8 of 9 routes) | 🟡 High | Open |

Routes affected: `staff/payments`, `staff/payments/request`, `staff/store`, `staff/store/sales-history`, `staff/store/link-receipt`, `staff/store/make-sales`, `staff/commissions`, `staff/commissions/details`

Only `staff/post-items-to-staff/route.ts` has `hasRole`. The others rely on data scoping via `authResult.id` — any authenticated user can access but only see their own data. Functional risk is low but role-based feature gating is absent.

---

### 4.4 🟡 High — Orphaned Auth User on Register

| Route | Issue |
|-------|-------|
| `auth/register/route.ts` | Creates Supabase Auth user **before** inserting DB profile. If profile insert fails, auth user is orphaned with no cleanup. |

Fix: Reverse order (create DB record first, then auth user) or add cleanup on failure.

---

### 4.5 🟡 High — Credit Store Ownership

| Route | Issue |
|-------|-------|
| `credits/store/return/route.ts` | Return handler doesn't verify `staff_id` ownership through the `credit_sales` chain. A staff member could return items from another staff member's credit sale. |

---

### 4.6 🟡 High — Staff Name from Form Data

| Route | Issue |
|-------|-------|
| `sales/payments/request/route.ts:38` | `staff_name` read from untrusted form data instead of derived from authenticated user. Staff payment route does it correctly. |

---

### 4.7 🟡 High — Status Code Abuse

Pattern across all routes: DB errors and server errors return `{ status: 400 }` instead of `500`. 10+ routes affected. Some routes (e.g., `staff/store/make-sales`) have been partially fixed with proper 404/409 codes, but the majority still use 400 for everything.

---

### 4.8 🟢 Medium — No Pagination on Inventory

Three GET routes return all rows with no limit/offset:
- `inventory/items/route.ts`
- `inventory/main-store/route.ts`
- `active-store/route.ts`

Acceptable for current item count (<200), becomes a problem at 1000+ items.

---

### 4.9 🟢 Low — Remaining Issues

| Issue | Status | Notes |
|-------|--------|-------|
| Hook endpoint hijacking (`usePayments.ts`) | Open | `staffId` unconditionally overrides role endpoint to admin route |
| JWT in SSE URL (`admin/logs/stream`) | Acceptable | Unavoidable for EventSource — documented in code |
| Cache.ts "dead code" | ✅ False positive | Actually used by 2 route files |
| Type system issues (6 items) | Open | Union types with `\| string`, `any[]` fallbacks |
| Inline date formatting (41+ occurrences) | Open | Not using `lib/format-date.ts` |
| Receipt utils code duplication | Open | 85% shared code across 3 functions |

---

## 5. UPDATED PRIORITY ACTION PLAN

### 🔴 HIGHEST PRIORITY (Next Sprint)

| Priority | Fix | Effort | Impact |
|----------|-----|--------|--------|
| High | **Unvalidated `items_paid_for` JSON** — Add per-route structural validation to both payment request routes | 30 min | Prevents malformed data corrupting downstream payment/commission processing |
| High | **Orphaned auth user** — Reverse operation order in `auth/register/route.ts` | 15 min | Prevents unrecoverable sign-up failures |
| High | **Credit store ownership check** — Add `.eq('staff_id', authResult.id)` to return route | 10 min | Prevents staff from manipulating other staff's credit items |
| High | **Staff name from form data** — Derive from auth, not form input | 5 min | Prevents identity spoofing in payment requests |
| Medium | **Hook endpoint hijacking** — Fix `usePayments.ts` staffId logic | 15 min | Prevents 401 errors for staff using payment features |

### 🟡 NEXT DEPLOYMENT

| Priority | Fix | Effort |
|----------|-----|--------|
| Medium | **Add `hasRole()` to 8 staff routes** | 30 min |
| Medium | **Fix status code abuse** (400 → 500 on server errors) | 1 hour |
| Medium | **Fix audit trail fire-and-forget** — Add `await` to 10 `.then()` calls | 20 min |
| Low | **Add pagination to inventory routes** | 30 min |

### 🟢 FUTURE

| Priority | Fix | Effort |
|----------|-----|--------|
| Low | **Fix type unions** — Remove `\| string` from union types | 30 min |
| Low | **Consolidate Staff/StaffInfo/SalesStaff types** | 2 hours |
| Low | **Replace inline date formatting** (~41 calls) | 1 hour |
| Low | **Extract shared receipt-utils helper** | 30 min |
| Low | **Database transactions on critical paths** | 2-4 hours |

---

## 6. FILES MODIFIED THIS SESSION

| File | Change |
|------|--------|
| `.gitignore` | Added `.env.production` at root level |
| `api/sales/create/route.ts` | Added optimistic locking `.eq('active_store_quantity', currentQty)` + 409 conflict |
| `api/sales/record/route.ts` | Same |
| `api/credit/give/route.ts` | Same |
| `api/inventory/items/route.ts` | Added `'superadmin'` to role check |
| `api/inventory/items/[id]/route.ts` | Added `'superadmin'` to PUT and DELETE role checks |
| `api/inventory/upload-image/route.ts` | Added `'superadmin'` to role check |
| `api/inventory/transfer/active-to-main/route.ts` | Added `'superadmin'` to role check |
| `api/inventory/transfer/main-to-active/route.ts` | Added `'superadmin'` to role check |
| `lib/receipt-utils.ts` | Popup blocker fix + download fallback + `finally` cleanup |
| `docs/SYSTEM_AUDIT_FOLLOWUP_2026-07-21.md` | This report |
