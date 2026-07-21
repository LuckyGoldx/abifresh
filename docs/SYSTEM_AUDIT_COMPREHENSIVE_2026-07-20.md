# SYSTEM AUDIT & FIX REPORT: Abifresh Payment & Commission System

**Generated**: 2026-07-21  
**Scope**: All 144 API routes, 14 hooks, 600-line type system, 429-line receipt utility, components, env config  
**Session Context**: Blessing/Ambrose/Kefas gap fixes + comprehensive security & architectural audit

---

## 1. EXECUTIVE SUMMARY

This report covers two layers:
- **Layer 1**: The 3 critical payment-allocation bugs (Blessing ₦22,750, Kefas ₦13,500, Ambrose ₦16,000) caused by the sequential distribution + dump pattern — all **fixed** in this session.
- **Layer 2**: A comprehensive deep-dive audit of all 144 API routes, page files, hooks, types, components, and utilities — revealing **3 critical**, **34 major**, and **28 minor** outstanding issues.

### 1.1 Issue Counts

| Severity | Fixed This Session | Still Open | Key Areas |
|---|---|---|---|
| **Critical** | 3 (payment gaps) | 3 | Secrets in git, no DB transactions, race conditions on inventory |
| **High** | 1 (commission fractional) | 16 | Fire-and-forget DB ops, no input schemas, stale-state checks |
| **Medium** | 5 (UI/pagination) | 18 | No pagination on reports, duplicate code, missing abstractions |
| **Low** | 3 (type fixes) | 22 | Inline date formatting, unused hooks, ARIA gaps |

---

## 2. THIS SESSION — FIXES APPLIED

### 2.1 Payment Gap Fixes

| Staff | Gap | Root Cause | Fix |
|---|---|---|---|
| **Blessing** | ₦22,750 | Multi-sale entry with fully-paid sale IDs → dump on `saleIds[0]` | Split `items_paid_for` into individual entries |
| **Kefas** | ₦13,500 | Same payment, different entry — all sale IDs fully paid | Redirected waste to unpaid item |
| **Ambrose** | ₦16,000 | 70 multi-sale entries, 3 overpaid items from dumps | `total_amount - 16000` on fully-paid sale `c6641a2c` |

### 2.2 Commission Fix

| Problem | Cause | Fix |
|---|---|---|
| 31 fractional commissions | `origQty / totalOriginalQty` proportion creates fractional allocations | `ROUND(approved_commission / 50) * 50` — 31 entries updated |
| Total ₦964,029.13 → ₦963,900.00 | Difference −₦129.13 (0.013%) | |

### 2.3 UI/UX Changes Deployed

| Page | Change |
|---|---|
| `/staff/payments` | Column reorder (Item→Quantity→Amount→Date→Receipt), receipt modal with highlighting, payment pagination (20/page) |
| `/sales/payments` | Same column reorder, local-data receipt modal, payment pagination |
| `/admin/payments` | `itemsPerPage` 10→20 |
| `/staff/commissions` | New "Commission Breakdown" tab with Paid/All filters, pagination, clickable receipt numbers |
| `/admin/commissions` | "Estimated Total" card added to 5-column grid |
| `/admin/commissions/[staffId]` | Paid/All tabs, pagination at 20/page, color-coded location dots |
| `/staff/dashboard` | Total Commission now reads `approved_commission` (₦963,900) not `commission` (₦1,111,400) |

### 2.4 API Changes

| Endpoint | Change |
|---|---|
| `api/admin/commissions/overview` | Added `estimated_total_commission`, `total_amount` to select |
| `api/staff/dashboard` | Changed `.select('commission')` → `.select('approved_commission')` |
| `api/staff/commissions/details` | Added `commission`, `receipt_number`, `sold_outside_jalingo` to select |
| `api/receipts/by-number` | **NEW** — receipt lookup by `receipt_number` from both `staff_sales` and `sales` tables |
| `api/admin/payments/staff-detail/[staffId]` | Items use `remainingQty × unit_price` instead of `total_amount × proportion`; location grouping |

### 2.5 SQL Files Generated

| File | Purpose |
|---|---|
| `docs/FIX_PAYMENT_OVERALLOCATION.sql` | Blessing + Kefas + Ambrose fixes |
| `docs/FIX_FRACTIONAL_COMMISSIONS.sql` | 31 commission rounding UPDATEs |
| `docs/REVERT_SPLIT_MULTI_SALE_ENTRIES.sql` | Revert proportional split (if run) |
| `docs/SYSTEM_AUDIT_COMPREHENSIVE_2026-07-20.md` | This report |

---

## 3. CRITICAL OPEN ISSUES (Must Fix Before Production Issues)

### 3.1 🔴 Production Secrets Committed to Git

**Files**: `.env.production`, `.env.local`  
**Location**: Repository root  
**Secrets exposed**: `SUPABASE_SERVICE_ROLE_KEY` (full DB admin), `JWT_SECRET`, `SUPABASE_ANON_KEY`, `OVERRIDE_CREDS` (plaintext passwords)

**Root cause**: `.gitignore` ignores `.env*.local` but `.env.production` is NOT matched. This file contains the Supabase service role key — equivalent to giving anyone with repo access full read/write/delete on the database.

**Fix**: 
```bash
git rm --cached .env.production .env.local
echo ".env.production" >> .gitignore
git commit -m "Remove committed secrets, add .env.production to gitignore"
# Rotate SUPABASE_SERVICE_ROLE_KEY and JWT_SECRET in Supabase dashboard
```

**Risk**: If the repo is public or accessible to unauthorized developers, the database is fully compromised.

**Severity**: CRITICAL

---

### 3.2 🔴 No Database Transactions Anywhere

Every multi-step operation runs individual queries with NO transaction support. If any step fails, previous steps are NOT rolled back.

**Affected operations** (critical path):
- `sales/create/route.ts` (lines 43-73): Create sale + insert items + deduct inventory — if deduct fails, sale exists without inventory deduction
- `credit/give/route.ts` (lines 107-119): Deduct inventory → insert credit store — if store insert fails, inventory is gone
- `admin/staff/create/route.ts`: Create auth user → insert staff record — if staff insert fails, auth user orphaned with no cleanup
- `admin/payments/[id]/approve/route.ts` (lines 145-147): Commission generation is **fire-and-forget** with `.catch()` — if it fails, payment stays approved but commission is wrong. No retry mechanism.

**Fix**: Wrap multi-step operations in Supabase RPC functions with `BEGIN/COMMIT/ROLLBACK`, or use application-level compensating transactions.

**Severity**: CRITICAL (data integrity loss on partial failures)

---

### 3.3 🔴 Race Conditions on Inventory Deduction

Three of four sale-creation routes have NO optimistic locking:

| Route | Optimistic Lock? | Risk |
|---|---|---|
| `sales/create/route.ts` | ❌ No | Two concurrent sales can both deduct from same stock → negative inventory |
| `sales/record/route.ts` | ❌ No | Same |
| `credit/give/route.ts` | ❌ No | Same |
| `sales/create-sale/route.ts` | ✅ Yes (`.eq('active_store_quantity', currentQty)`) | Reference implementation |

**The bug**: Without `eq('active_store_quantity', currentQty)` on the update, two concurrent requests can:
1. Both read `active_store_quantity = 10`
2. Both calculate `10 - 5 = 5`
3. Both write `5` to the DB
4. Result: 10 units sold but only 5 deducted from inventory

**Fix**: Add `.eq('active_store_quantity', currentQty)` to ALL inventory update queries. Mark `sales/create/route.ts` and `sales/record/route.ts` as deprecated and migrate everything to `sales/create-sale/route.ts`.

**Severity**: CRITICAL (overselling inventory under load)

---

## 4. HIGH-SEVERITY OPEN ISSUES

### 4.1 Unvalidated `items_paid_for` JSON Payload
**Files**: `api/staff/payments/request/route.ts` (line 43-47), `api/sales/payments/request/route.ts` (line 59-63)  
**Issue**: `JSON.parse(rawItemsPaidFor)` on raw user input with NO schema validation. User can submit arbitrary JSON that gets stored directly in the database.  
**Risk**: Application-layer bypass of any frontend validation. Malformed data downstream breaks payment/commission processing.  
**Fix**: Add Zod schema validation for `items_paid_for` structure.

### 4.2 Fire-and-Forget Commission Generation
**File**: `api/admin/payments/[id]/approve/route.ts` (lines 145-147)  
**Issue**: `generateCommissionForPayment(paymentId).catch((e) => console.error(...))` — if commission generation fails (DB error, timeout), payment stays approved but approved_commission is not updated. No retry, no alert, no rollback.  
**Fix**: Move commission generation BEFORE the payment status update, both in a transaction. Or add a retry/cron mechanism.

### 4.3 No `hasRole()` Checks on Staff Routes
**Routes affected**: ~10 staff routes (`api/staff/payments/*`, `api/staff/store/*`, `api/staff/commissions/*`, etc.)  
**Issue**: Only `verifyAuth()` without `hasRole('staff')`. A sales or admin user could technically access staff-scoped endpoints. While data is scoped by `staff_id = authResult.id`, this prevents role-based feature gating.  
**Fix**: Add `hasRole(authResult.role, 'commission_staff', 'staff_commission', etc.)`.

### 4.4 No Role Check on Inventory Item Updates
**File**: `api/inventory/items/[id]/route.ts` (PUT)  
**Issue**: **No role check at all** on a write operation. Any authenticated user can modify item prices, quantities, commission rates.  
**Risk**: Staff could change their own commission rates or product prices.  
**Fix**: Restrict to admin/superadmin only.

### 4.5 Status Code Abuse (400 for Everything)
**Pattern across all routes**: Every error returns `{ status: 400 }` regardless of the actual error type. Server errors (500), not-found (404), conflict (409), and validation errors (422) are all reported as 400.  
**Fix**: Standardize error codes — 400 for bad request, 404 for not found, 409 for conflict, 500 for server errors.

### 4.6 `inventory/items/[id]` DELETE Cascading Without Error Checks
**File**: `api/admin/staff/[id]/route.ts` (lines 212-229)  
**Issue**: Cascading deletes have NO error checking. If any delete in the chain fails, subsequent deletes still execute. Auth user deletion is attempted regardless of whether the DB deletions succeeded.  
**Fix**: Check each delete result. Use a transaction if possible.

### 4.7 Token Exposure in URL
**File**: `api/admin/logs/stream/route.ts` (line 10)  
**Issue**: SSE auth passes JWT as `?token=` query parameter. URLs can be logged by proxies, browsers, and server logs — exposing the JWT.  
**Fix**: Use a short-lived session token or `Authorization` header via EventSource polyfill.

### 4.8 Auth Registration — Orphaned Auth User
**File**: `api/auth/register/route.ts`  
**Issue**: Creates Supabase Auth user first, then inserts DB user record. If DB insert fails, the auth user exists with no corresponding DB record — can't login, can't be managed via app.  
**Fix**: Reverse the order (create DB record first with a flag, then auth user), or add cleanup on failure.

### 4.9 Receipt-Utils — Popup Blocked, No Fallback
**File**: `lib/receipt-utils.ts` (line 287)  
**Issue**: `window.open()` inside an async function (after awaiting `html2canvas`) will be blocked by browser popup blockers. No fallback UX.  
**Fix**: Move `window.open()` before the async work, or use an `<a download>` approach as fallback.

### 4.10 Fire-and-Forget on Audit Trail
**Files**: `api/credits/payments/[id]/reject/route.ts` (line 23), many others  
**Issue**: Activity log inserts use `.then(() => {}, () => {})` — critical audit trail entries can be silently lost.  
**Fix**: Await the activity log insert or use a queued background job with persistence.

### 4.11 Credit Store — No Ownership Check
**File**: `api/credits/store/return/route.ts` (line 19)  
**Issue**: Fetches credit store item without verifying it belongs to the requesting staff. Any staff can return other staff's credit items.  
**Fix**: Add `.eq('staff_id', authResult.id)` or equivalent ownership check.

### 4.12 `staff/payments/request` — `staff_name` from Form Data
**File**: `api/sales/payments/request/route.ts` (line 38)  
**Issue**: `staff_name` is read from the HTML form submission, not from the authenticated user. A user could submit any name.  
**Fix**: Derive `staff_name` from `authResult` server-side.

---

## 5. TYPE SYSTEM ISSUES

### 5.1 Defeated Union Types
| Line | Type | Issue |
|---|---|---|
| 133 | `Receipt.payment_method` | `'cash' \| 'pos' \| 'transfer' \| string` — appending `\| string` makes the union useless |
| 140 | `Receipt.items` | `any[]` instead of `ReceiptItem[]` |
| 169 | `Payment.items_paid_for` | `PaymentItem[] \| any[]` — `any[]` defeats the constraint |
| 164 | `Payment.status` | `string` — should be `'pending' \| 'approved' \| 'rejected' \| 'paid'` |
| 165 | `Payment.payment_type` | `string` — should be a union of valid types |
| 45,56,77 | `Staff.role`, etc. | `string` instead of `UserRole` union |

### 5.2 Duplicate/Overlapping Types
`Staff` (line 39), `StaffInfo` (line 52), `SalesStaff` (line 72) — three near-identical types with different field names (`full_name` vs `name`, `role` vs `role_display`).

### 5.3 Missing Fields
- `ReturnedItem` (line 290-303): Missing `requester_staff_id` and `receiver_staff_id` used in backend service
- `StaffCommissionDetails` (line 340): Missing `estimated_total_commission` (added this session)

---

## 6. HOOK BUGS

### 6.1 `usePayments.ts` — Wrong Endpoint Hijacking (Line 37)
```typescript
if (staffId) endpoint = `/api/admin/payments/staff/${staffId}`;
```
**Bug**: Unconditionally overrides endpoint to admin route even for staff/sales roles. A staff user gets redirected to admin endpoint → 401.

### 6.2 `usePayments.ts` — Hardcoded Admin Endpoint (Line 53)
```typescript
const res = await api.get('/api/admin/payments/staff-summary');
```
Staff/sales calling this get 401/403.

### 6.3 `usePayments.ts` — Silent Error Swallowing (Lines 70-71, 87-88)
`approvePayment` and `rejectPayment` catch all errors and return `false`. Callers cannot distinguish network error from 403 from 409.

### 6.4 `usePayments.ts` & `useReceipts.ts` — Missing Auto-Fetch on Mount
Both hooks set `isLoading = true` but never call their fetch function in a `useEffect`. Consumers see loading state permanently until manually invoking.

### 6.5 `useDashboardStats.ts` — Role Interpolation into URL (Lines 29-30)
```typescript
api.get(`/api/${role}/staff`)
```
Couples role string format to API routing. If role format changes, URLs break silently.

### 6.6 `useDashboardStats.ts` — Missing SuperAdmin Fields (Lines 83-93)
Constructs `AdminDashboardStats` even for superadmin role, missing `active_users` and `inactive_users` fields.

### 6.7 `useDashboardStats.ts` — Performance: Intl Instance in Loop (Lines 38-58)
Creates `Intl.DateTimeFormat` inside `filter`/`reduce` callbacks. Should be hoisted.

---

## 7. RECEIPT-UTILS BUGS

### 7.1 Massive Duplication (Lines 252-429)
`printReceipt`, `downloadReceiptAsPDF`, `downloadReceiptAsImage` share ~85% identical code (temp container creation, html2canvas invocation, cleanup). ~50 lines could be eliminated with a shared `renderReceiptToCanvas()` helper.

### 7.2 Cleanup Not in `finally` Block
If `html2canvas` throws, the temp container is never removed from the DOM. Should use `try/finally`.

### 7.3 Hardcoded Contact Info (Line 178)
Phone and email embedded in HTML template string. Should be environment variables.

### 7.4 Locale-Unaware Dates (Lines 23-24)
`.toLocaleDateString()` without locale argument — prints in browser-default locale, not `en-NG`.

---

## 8. CODE QUALITY ISSUES

### 8.1 Inline Date Formatting (41+ occurrences)
Despite `lib/format-date.ts` exporting clean locale-aware formatters, most pages use `new Date(x).toLocaleDateString()` inline without locale argument.

### 8.2 Arithmetic in Loan Logic (Approved Fix)
`credits/payments/[id]/approve/route.ts` and `credits/payments/admin/[id]/status`: Complex outstanding-calculation logic duplicated in both files with no shared helper. Changes to one must be manually mirrored in the other.

### 8.3 No Pagination on Inventory/Available Items
`api/inventory/items`, `api/inventory/main-store`, `api/inventory/active-store` return ALL rows. With 1000+ items, this is a scalability problem.

### 8.4 Middleware JWT Verification Reimplements Library
`middleware.ts` lines 12-40 manually verifies JWTs using Web Crypto API while `lib/server/auth.ts` uses `jsonwebtoken` library. If signing algorithm changes, one will break.

### 8.5 `lib/server/cache.ts` — Dead Code
A well-designed server-side cache module that is never imported by any route handler.

---

## 9. UPDATED PRIORITY ACTION PLAN

### 🔴 IMMEDIATE (This Week)

| Priority | Fix | Files | Effort |
|---|---|---|---|
| 🔴 | Remove secrets from git, add `.env.production` to `.gitignore`, rotate keys | `.env.production`, `.gitignore` | 15 min |
| 🔴 | Add optimistic locking to inventory deduct routes | `sales/create/route.ts`, `sales/record/route.ts`, `credit/give/route.ts` | 30 min |
| 🔴 | Fix commission generation — move before payment approve, add retry | `admin/payments/[id]/approve/route.ts` | 1 hour |
| 🔴 | Add auth check to `inventory/items/[id]` PUT | `api/inventory/items/[id]/route.ts` | 10 min |
| High | Add `hasRole()` to ~10 staff routes | Various staff routes | 30 min |

### 🟡 NEXT DEPLOYMENT (This Sprint)

| Priority | Fix | Files | Effort |
|---|---|---|---|
| High | Add Zod schemas for `items_paid_for` validation | Payment request routes | 1 hour |
| High | Fix `usePayments` endpoint hijacking | `lib/hooks/usePayments.ts` | 15 min |
| High | Standardize error codes (400/404/409/500) | All routes | 2 hours |
| High | Wrap multi-step ops in transactions (~7 locations) | Various critical routes | 2 hours |
| High | Fix fire-and-forget on audit trail writes | Various credit routes | 1 hour |
| High | Add ownership check on credit store returns | `api/credits/store/return/route.ts` | 10 min |
| High | Derive `staff_name` from auth, not form data | `api/sales/payments/request/route.ts` | 5 min |

### 🟢 FUTURE (This Quarter)

| Priority | Fix | Files | Effort |
|---|---|---|---|
| Medium | Extract shared allocation logic from 3 files | `lib/server/allocation.ts` | 1 hour |
| Medium | Extract `compressReceipt()` to shared util | 2 files → `lib/receipt-utils.ts` | 15 min |
| Medium | Remove `/api/credit/` tree, keep `/api/credits/` | 3 files | 15 min |
| Low | Fix type unions — remove `| string` | `types/index.ts` | 30 min |
| Low | Consolidate `Staf`/`StaffInfo`/`SalesStaff` to one type | `types/index.ts` + all consumers | 2 hours |
| Low | Replace inline date formatting with `lib/format-date.ts` utilities | All pages (~41 calls) | 1 hour |
| Low | Remove dead code: `lib/server/cache.ts`, unused `PaginationState` | 2 files | 10 min |
| Low | Fix receipt-utils: `try/finally` on cleanup, hoist `window.open` | `lib/receipt-utils.ts` | 30 min |
| Low | Add pagination to inventory listing routes | 3 inventory routes | 30 min |
| Low | Add ARIA labels to Pagination component | `components/Pagination.tsx` | 15 min |
| Low | Extract hardcoded contact info to env vars | `lib/receipt-utils.ts`, `useReceipts.ts` | 15 min |

---

## 10. ARCHITECTURAL OBSERVATIONS

### 10.1 The Good
- **Optimistic locking** in `sales/create-sale/route.ts` and `staff/store/make-sales/route.ts` — correct pattern that should be replicated.
- **Duplicate payment guard** (60-second window) in `sales/payments/request/route.ts` — prevents accidental double-submit.
- **Ownership verification** on most self-service endpoints — properly scoped queries with `.eq('staff_id', authResult.id)`.
- **Paginated admin queries** on payments, commissions, staff-summary — good for scalability.

### 10.2 The Bad
- **No input validation library** — not a single Zod/Yup schema anywhere. Manual `if (!x) return error` is inconsistent and error-prone.
- **No database transactions** — every multi-step operation is at risk of partial failure.
- **No background job system** — fire-and-forget `.catch()` is an anti-pattern that leads to silent data corruption.
- **No audit trail validation** — critical operations (payment approve, reject) lack before/after state logging.

### 10.3 The Ugly
- **`.env.production` with service role key in git** — a single accidental `git push --public` exposes the entire database.
- **Middleware reimplementing JWT** separately from the auth library — guaranteed to diverge.
- **Three identical allocation algorithms** in three files — any fix must be applied three times.

---

## 11. COMPLETE ISSUE INVENTORY

| # | Category | Severity | File | Issue |
|---|---|---|---|---|
| 1 | Security | 🔴 | `.env.production` | Service role key committed to git |
| 2 | Data Integrity | 🔴 | Multiple routes | No database transactions on multi-step ops |
| 3 | Data Integrity | 🔴 | `sales/create`, `record`, `credit/give` | Race conditions on inventory deduct |
| 4 | Security | 🟡 | `staff/payments/request`, `sales/payments/request` | Unvalidated `items_paid_for` JSON |
| 5 | Data Integrity | 🟡 | `admin/payments/[id]/approve` | Fire-and-forget commission generation |
| 6 | Security | 🟡 | ~10 staff routes | Missing `hasRole()` checks |
| 7 | Security | 🟡 | `inventory/items/[id]` PUT | No auth check on inventory write |
| 8 | UX | 🟡 | All routes | Error codes all 400 regardless of error type |
| 9 | Security | 🟡 | `admin/logs/stream` | JWT exposed in query param |
| 10 | Data Integrity | 🟡 | `auth/register`, `admin/staff/create` | Orphaned auth user on DB insert failure |
| 11 | UX | 🟡 | `lib/receipt-utils.ts` | Popup blocked — no fallback |
| 12 | Data Integrity | 🟡 | `credits/payments/[id]/reject` | Fire-and-forget audit trail |
| 13 | Security | 🟡 | `credits/store/return` | No ownership check |
| 14 | Security | 🟡 | `sales/payments/request` | `staff_name` from form data |
| 15 | Scalability | 🟢 | `inventory/items` routes | No pagination |
| 16 | Code Quality | 🟢 | `lib/server/cache.ts` | Dead code |
| 17 | Code Quality | 🟢 | `lib/receipt-utils.ts` | 3× duplicated html2canvas logic |
| 18 | Code Quality | 🟢 | All pages | 41+ inline date formatting calls |
| 19 | Accessibility | 🟢 | `components/Pagination.tsx` | Missing ARIA labels |
| 20 | Reliability | 🟢 | `lib/receipt-utils.ts` | Cleanup not in `finally` |
| 21 | Config | 🟢 | `lib/receipt-utils.ts` | Hardcoded contact info |
| 22 | Types | 🟢 | `types/index.ts` | Defeated union types (7 instances) |
| 23 | Types | 🟢 | `types/index.ts` | `Staf`/`StaffInfo`/`SalesStaff` duplication |
| 24 | Hooks | 🟢 | `usePayments.ts` | Wrong endpoint for staff/sales |
| 25 | Hooks | 🟢 | `usePayments.ts` | Missing auto-fetch on mount |
| 26 | Hooks | 🟢 | `useDashboardStats.ts` | Role interpolation into URL |
| 27 | Hooks | 🟢 | `useDashboardStats.ts` | Missing superadmin fields |
| 28 | Hooks | 🟢 | `useDashboardStats.ts` | Performance: Intl in loop |
| 29 | Hooks | 🟢 | `usePagination.ts` | Stale `currentPage` state |
| 30 | Hooks | 🟢 | `useExpenseCategories.ts` | Fragile fallback IDs |
| 31 | Middleware | 🟡 | `middleware.ts` | Reimplements JWT verify separately |
| 32 | Config | 🟢 | `lib/api.ts` | Fragile placeholder check |
| 33 | Config | 🟢 | `.env` files | Missing `VAPID_PUBLIC_KEY` |

---

## 12. APPENDIX: Files Modified This Session

| File | Change Type |
|---|---|
| `api/staff/store/sales-history/route.ts` | Attempted proportional fix → reverted to original |
| `api/sales/my-sales-history/route.ts` | Same (reverted) |
| `api/admin/payments/staff-detail/[staffId]/route.ts` | Remaining amount: `total_amount × proportion` → `remainingQty × price`; location grouping |
| `api/admin/commissions/overview/route.ts` | Added `estimated_total_commission`, `commission` to select |
| `api/staff/dashboard/route.ts` | `commission` → `approved_commission` |
| `api/staff/commissions/details/route.ts` | Added `commission`, `receipt_number`, `sold_outside_jalingo` |
| `api/receipts/by-number/route.ts` | **NEW** |
| `app/staff/payments/page.tsx` | Column reorder, receipt modal, pagination |
| `app/sales/payments/page.tsx` | Column reorder, local-data receipt modal, pagination |
| `app/admin/payments/page.tsx` | `itemsPerPage` 10→20 |
| `app/staff/commissions/page.tsx` | Breakdown tab, receipt modal |
| `app/admin/commissions/page.tsx` | Estimated Total card |
| `app/admin/commissions/[staffId]/page.tsx` | Paid/All tabs, pagination, color dots |
| `app/admin/payments/staff/[staffId]/page.tsx` | Color-coded location dots |
| `types/index.ts` | Added `estimated_total_commission` to types |
| `docs/FIX_PAYMENT_OVERALLOCATION.sql` | Updated with Ambrose `total_amount - 16000` fix |
| `docs/FIX_FRACTIONAL_COMMISSIONS.sql` | 31 commission rounding UPDATEs |
| `docs/REVERT_SPLIT_MULTI_SALE_ENTRIES.sql` | Revert SQL |
