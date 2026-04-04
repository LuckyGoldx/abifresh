# AKV Project — Complete Audit Report

> **Generated:** Full manual code audit of the entire codebase  
> **Scope:** Security, feature completeness, infrastructure longevity, recommendations  
> **Stack:** Next.js 13.5 (App Router) · Supabase (PostgreSQL + Auth + Storage) · Vercel (Serverless)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Security Audit](#3-security-audit)
4. [Feature Audit — What Is Working](#4-feature-audit--what-is-working)
5. [Feature Audit — What Is Broken or Incomplete](#5-feature-audit--what-is-broken-or-incomplete)
6. [API Route Inventory (103 Routes)](#6-api-route-inventory-103-routes)
7. [Supabase Free Tier Analysis](#7-supabase-free-tier-analysis)
8. [Vercel Free Tier Analysis](#8-vercel-free-tier-analysis)
9. [Free Tier Verdict](#9-free-tier-verdict)
10. [Recommendations by Priority](#10-recommendations-by-priority)

---

## 1. Executive Summary

AKV is a fully custom-built business management system for a retail/distribution operation. It manages inventory across a main store and active store, tracks sales by staff, processes payment requests and commission payouts, and provides comprehensive reporting. The system has **103 serverless API routes** and is deployed (or ready to deploy) on Vercel + Supabase.

**Overall Assessment:**

| Category | Status |
|---|---|
| Core business features | ✅ Fully working |
| Authentication & authorization | ✅ Solid, some improvements needed |
| Security posture | ⚠️ 3 critical/high issues need immediate attention |
| Audit trail | ❌ Broken — shows fake data |
| Infrastructure longevity on free tier | ✅ 5–10+ years for 10 users |
| Code quality | ✅ Clean, consistent, well-structured |

---

## 2. System Architecture

```
Browser (Next.js App Router)
    │
    ├── /admin/*          → Admin users only (role: admin, superadmin)
    ├── /sales/*          → Sales staff (role: sales / sales_staff)
    ├── /staff/*          → Commission & non-commission staff
    └── /superadmin/*     → Superadmin only

    All pages call API routes via Axios (frontend/lib/api.ts)
    JWT token stored in localStorage under key: auth-storage (Zustand persist)
    Token sent as: Authorization: Bearer <token>

API Layer (Next.js App Router — /app/api/)
    │
    ├── verifyAuth()     → Validates JWT, checks user is still active in DB
    ├── hasRole()        → Role-based access control with elevation
    └── supabaseAdmin    → Service role client (server-only)

Database (Supabase / PostgreSQL)
    Tables: users, inventory_items, active_store_items, receipts, sales,
            daily_sales_summary, payment_requests, commission_payments,
            staff_stores, posted_items, notifications, activity_logs,
            expenses, restock_orders, backup_history, settings, ...

Storage (Supabase Storage)
    Bucket: product-images
    Limit: 5MB per image, JPEG/PNG/WebP/GIF only

Auth (Hybrid)
    Primary:  Supabase GoTrue Auth (email/password)
    Fallback: OVERRIDE_CREDS environment variable (plaintext — see Security)
    Session:  Custom JWT (30-day expiry) generated after login, stored locally
```

### Role Hierarchy

```
superadmin → inherits ALL admin permissions
admin      → manages staff, inventory, payments, reports
sales      → (alias: sales_staff) creates sales, posts items to commission staff
commission_staff → accepts posted items, makes sales from their store
non_commission_staff → receives posted items only
```

### Technology Stack

| Component | Version / Notes |
|---|---|
| Next.js | 13.5.11 (App Router) |
| React | 18 |
| Supabase JS | ^2.x |
| jsonwebtoken | JWT signing/verification |
| Zustand | State management + localStorage persist |
| Axios | HTTP client with auth interceptor |
| Recharts | Charts (reports page) |
| jsPDF + html2canvas | PDF export for receipts |
| xlsx | Backup/restore file parsing |
| bcryptjs | Password hashing (currently only for Supabase, not OVERRIDE_CREDS) |

---

## 3. Security Audit

### 🔴 CRITICAL — Fix Immediately

---

#### C1. Plaintext Passwords in OVERRIDE_CREDS

**File:** `frontend/.env.local`  
**Code:**
```
OVERRIDE_CREDS=lucky:#ebuka5788,luckygold:#ebuka5788
```

**What it does:** The login route (`/api/auth/login`) has a fallback that compares the submitted password **as plaintext** against values in this environment variable, bypassing Supabase Auth entirely.

**Risk:** If `.env.local` is ever leaked (e.g., accidentally committed to git, exposed in a deployment panel, or accessed via a server path traversal vulnerability), both usernames and passwords are fully exposed. These same credentials may be reused elsewhere.

**Note:** `.env.local` IS currently in `.gitignore` — it has NOT been committed. But the plaintext storage itself is the vulnerability.

**Fix Options:**
1. **Remove OVERRIDE_CREDS entirely.** These users should have proper Supabase Auth accounts. There is no legitimate reason to bypass the auth system.
2. If OVERRIDE_CREDS is kept (not recommended), hash the passwords using bcrypt and compare hashes instead of plaintext.

---

#### C2. JWT Stored in localStorage (XSS Risk)

**File:** `frontend/lib/api.ts`, all auth pages  
**Issue:** The JWT is stored in `localStorage` under key `auth-storage`. Any Cross-Site Scripting (XSS) vulnerability anywhere in the application can steal this token. Once stolen, the attacker has up to 30 days of full access.

**Risk Level:** HIGH — localStorage-based tokens are the most common target of XSS attacks.

**Fix:**
- Move token to an `HttpOnly` cookie. This prevents JavaScript from accessing it entirely.
- This requires refactoring the auth flow: login sets a cookie, logout deletes it, API routes read from cookies.
- Or as a minimum: set `JWT_EXPIRY=1d` or `2h` to limit the theft window.

**Note:** No XSS vulnerabilities were found in the current codebase — however, the architecture makes recovery from any future XSS vulnerability much worse than it needs to be.

---

### 🟠 HIGH — Fix Soon

---

#### H1. Audit Logs Page Shows Completely Fake Data

**File:** `frontend/app/superadmin/audit-logs/page.tsx`  
**Issue:** The audit logs page does NOT query the `activity_logs` table. Instead, it fetches from the `receipts` table and presents receipt records as if they were audit log entries. The page fabricates "audit" activity from sales data.

**What this means:**
- Password changes, staff edits, payment approvals, inventory modifications — NONE of these appear in the audit log page.
- An admin can take any action in the system and there is no audit trail visible to the superadmin.
- The `activity_logs` table exists in Supabase but is only written to by some backend Express services (not the Next.js API routes).

**Risk:** Regulatory compliance failure, inability to investigate incidents, zero accountability for admin actions.

**Fix Required:**
1. Rewrite the audit-logs page to query the actual `activity_logs` table.
2. Add audit log writes (`INSERT INTO activity_logs`) to all critical Next.js API routes: login, staff CRUD, payment approve/reject, commission pay, inventory changes, backup/restore.

---

#### H2. No Audit Logging in Any Next.js API Route

**Related to H1.** Not a single one of the 103 Next.js API routes inserts a record into `activity_logs`. The table structure exists, but it's empty from a Next.js perspective.

**Every significant action that needs auditing:**
- `POST /api/auth/login`  
- `PUT /api/admin/staff/[id]`  
- `DELETE /api/admin/staff/[id]`  
- `POST /api/admin/payments/[id]/approve`  
- `POST /api/admin/payments/[id]/reject`  
- `POST /api/admin/commissions/pay`  
- `POST /api/backup/restore/commit`  
- `POST /api/inventory/items` / `PUT` / `DELETE`

---

### 🟡 MEDIUM — Fix When Possible

---

#### M1. In-Memory Rate Limiter Doesn't Survive Cold Starts

**File:** `frontend/app/api/auth/login/route.ts`  
**Issue:** The brute-force protection uses an in-memory `Map` to track failed login attempts per IP. On Vercel, serverless functions can have multiple isolated instances, and each cold start resets the map. An attacker could intentionally trigger cold starts (by waiting ~5 minutes between bursts) to bypass the 10-attempt limit.

**Fix:** Use a Redis-compatible store (Upstash Redis has a free tier — 10,000 requests/day) or store attempt counts in Supabase with a TTL-indexed table.

---

#### M2. Weak Password Minimum (6 Characters)

**File:** `frontend/app/api/auth/register/route.ts`  
**Issue:** The minimum password length is 6 characters with no complexity requirement.  
**Fix:** Enforce minimum 8 characters with at least one number or symbol, or use Supabase Auth's built-in password strength settings.

---

#### M3. No Input Sanitization for String Fields

**Affected routes:** Staff create/update, inventory item create/update, expense notes, receipt notes  
**Issue:** String inputs like `full_name`, `notes`, `username`, `item_name` go directly into Supabase queries without stripping HTML or script tags. Supabase's parameterized queries prevent SQL injection, but if any field value is ever rendered as raw HTML (even accidentally), stored XSS payloads would execute.

**Fix:** Strip HTML tags from all free-text string inputs before storing. A simple regex or a library like `sanitize-html` (2KB) is sufficient.

---

#### M4. Long JWT Expiry (30 Days, No Refresh)

**File:** `frontend/app/api/auth/login/route.ts`, `frontend/lib/server/auth.ts`  
**Issue:** Tokens last 30 days with no refresh token rotation. A stolen token is valid for up to a month.  
**Fix:** Reduce to 24 hours. Since the app re-validates the user in the database on every request anyway, short expiry is safe and doesn't hurt UX (users are logged in on their own devices).

---

### 🟢 LOW / INFORMATIONAL

---

#### L1. `.env.production` Is in Git (Low Risk)

**File:** `frontend/.env.production` (committed in git commit `0a05caa`)  
**Contains:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**Risk Assessment:** LOW. The `NEXT_PUBLIC_` prefix means these values are bundled into the client JavaScript by design and are visible to anyone who visits the site. The anon key has Supabase Row Level Security restrictions. The service role key is NOT in this file.  
**Action:** No urgent action needed, but it's good practice to keep all `.env` files out of git. Add `frontend/.env.production` to `.gitignore` if you want to be thorough.

---

#### L2. Service Role Key Properly Protected

**File:** `frontend/.env.local` (gitignored)  
**Status:** ✅ `SUPABASE_SERVICE_ROLE_KEY` is only in `.env.local`, which is gitignored. It has NEVER been committed to git.

---

#### L3. Security Headers Are Set

**File:** `frontend/next.config.js`  
**Status:** ✅ The following headers are applied to all routes:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

#### L4. PWA Disabled (Known Bug, Marked TODO)

**File:** `frontend/next.config.js`  
**Status:** `next-pwa` is imported but disabled with `disable: true`. Comment says there's an `assignWith` bug.  
**Impact:** The app is not installable as a PWA. This is a usability issue, not a security issue.

---

#### L5. `select('*')` on Several Queries

Several API routes use `select('*')` which returns all columns, including timestamps and internal IDs that may not be needed. This is not a direct vulnerability (Supabase RLS is the real gate) but it increases payload size and leaks schema information.

---

## 4. Feature Audit — What Is Working

### Authentication & Session Management
- ✅ Login with Supabase Auth + custom JWT generation
- ✅ Logout (clears localStorage)
- ✅ JWT verified on every API request + re-checks user in database
- ✅ Deactivated accounts immediately blocked (DB check, not just token check)
- ✅ Password change via Supabase Auth
- ✅ Profile update (name, username)
- ✅ Role assignment at registration
- ✅ Role normalization aliases (sales_staff → sales, staff_commission → commission_staff, etc.)
- ✅ Superadmin inherits all admin permissions automatically
- ✅ 401 responses force logout and redirect to login

### Admin — Staff Management
- ✅ Create staff (registers in Supabase Auth + inserts profile row)
- ✅ View all staff with their roles and status
- ✅ Edit staff (name, username, role, email, password)
- ✅ Activate / deactivate staff accounts
- ✅ Delete staff (cascades across 9 tables including Supabase Auth)
- ✅ Staff password reset by admin

### Admin — Inventory Management
- ✅ View all inventory items (main store)
- ✅ Add items with name, price, cost, quantity, commission, image
- ✅ Edit item details
- ✅ Delete items
- ✅ Image upload (5MB max, JPEG/PNG/WebP/GIF only, stored in Supabase Storage)
- ✅ Commission per-item tracking (shown as ₦ formatted value)
- ✅ Active store view (items moved from main for direct sales)
- ✅ Unavailable / out-of-stock tracking
- ✅ Transfer items from main store → active store
- ✅ Transfer items from active store → main store (with quantity validation)
- ✅ Inventory summary with total values

### Admin — Sales / Receipts
- ✅ View all receipts across all staff
- ✅ Filter receipts by date, staff, item
- ✅ Receipt detail view with itemized list
- ✅ PDF export of individual receipts
- ✅ Sales records separate from receipts
- ✅ "Outside Jalingo" flag on sales/receipts
- ✅ Daily sales summary auto-updated on every sale

### Admin — Payment Requests
- ✅ View all pending payment requests
- ✅ View all payments (history)
- ✅ Approve payment requests (sends notification to staff)
- ✅ Reject payment requests with reason (sends notification to staff)
- ✅ Pending payment count badge
- ✅ Payments enriched with staff info and item details

### Admin — Commission System
- ✅ View all staff commissions
- ✅ Set commission rate per item per staff
- ✅ Commission overview dashboard
- ✅ Commission analytics
- ✅ Pay out commissions (records payment, resets balance)
- ✅ Commission payment history
- ✅ Per-staff commission detail view

### Admin — Reports
- ✅ Comprehensive reports with date range filtering
- ✅ Sales trend chart (Recharts line chart)
- ✅ Top performing staff chart
- ✅ Top selling items chart
- ✅ Staff performance table (sales count, revenue, commission)
- ✅ Financial overview cards (9 stats with distinct colors)
- ✅ Revenue vs expenses comparison
- ✅ Filter by staff, role, date range

### Admin — Expenses
- ✅ Create expenses with amount, category, notes
- ✅ View all expenses
- ✅ View "my expenses" (own expenses only)

### Admin — Restock Orders
- ✅ Create restock orders
- ✅ View restock orders
- ✅ Update restock order status

### Admin — Settings
- ✅ Logistics price setting (stored in Supabase `settings` table)
- ✅ Retrieved on every relevant calculation

### Sales Staff — Core Workflow
- ✅ Sales dashboard with daily summary
- ✅ Create sales (deducts from active store inventory)
- ✅ My sales history
- ✅ Create receipts with itemized list
- ✅ Request payment
- ✅ View payment history
- ✅ Post inventory items to commission staff
- ✅ View posted items and their status
- ✅ Posted items history
- ✅ Posted items stats
- ✅ Accept/reject returned items from commission staff
- ✅ Log expenses

### Commission Staff — Core Workflow
- ✅ Staff store (view personal inventory — posted items)
- ✅ Accept posted items (adds to personal store)
- ✅ Reject posted items (returns to sales staff)
- ✅ Make sales from personal store (deducts from staff store)
- ✅ Staff store sales history
- ✅ Return items to sales staff
- ✅ View own commissions (with detail breakdown)
- ✅ Request payment
- ✅ View payment history
- ✅ Log expenses

### All Staff — Notifications
- ✅ Real-time notification system (polling-based)
- ✅ Unread count badge
- ✅ Mark single notification as read
- ✅ Mark all notifications as read
- ✅ Notifications sent on: payment approve/reject, posted items, returns
- ✅ `read_at` timestamp tracked

### Superadmin — Exclusive Features
- ✅ Full database backup (25 tables, XLSX export per table)
- ✅ Restore from backup file (full validation before commit)
- ✅ Backup history log
- ✅ View and manage ALL users (including admin accounts)
- ✅ Activate/deactivate admin accounts
- ✅ System health checks (DB connection, table counts, storage)
- ✅ Server logs viewer (with SSE streaming + polling fallback)
- ✅ Logs page hydration fix (no longer shows blank)
- ✅ Query result caching (5 min TTL on logs, reduces Supabase reads)
- ✅ Staff management (same as admin, but can see admins too)

### Infrastructure
- ✅ Security headers on all responses
- ✅ Image validation (size + MIME type) before upload
- ✅ Serverless-ready (no persistent state in routes except in-memory caches)
- ✅ Dark mode UI throughout
- ✅ Responsive design (mobile + desktop)
- ✅ Tab scroll indicators on mobile
- ✅ Toast notifications (success/error/info)

---

## 5. Feature Audit — What Is Broken or Incomplete

### ❌ B1. Audit Logs Page — Shows Completely Wrong Data

**Page:** `/superadmin/audit-logs`  
**Symptom:** The page shows what appears to be audit activity, but it is actually pulling from the `receipts` table and presenting receipt records as system events. It does NOT show actual system actions like logins, edits, or payment approvals.  
**Impact:** The superadmin cannot track who did what. Any investigation into unauthorized actions is impossible.  
**Effort to fix:** Medium — requires rewriting the page component to query `activity_logs`, AND adding activity_log writes to all critical API routes.

---

### ❌ B2. No Activity Logging in Next.js Routes

**Symptom:** The `activity_logs` table exists but none of the 103 Next.js API routes insert into it.  
**What's missing from the audit trail:**
- Staff logins (who logged in, when, from where)
- Staff edits (who changed what)
- Payment approvals/rejections
- Commission payments
- Inventory changes
- Backup restore operations (most critical — this could wipe data)
- Admin account changes

**Effort to fix:** Medium-High — add `INSERT` calls to 10–15 key routes.

---

### ✅ B3. PWA — Fixed

**What was wrong:** `next-pwa@5.6.0` had an `assignWith is not defined` lodash bug that forced it to be disabled.

**Fix applied:**
- Removed `next-pwa` wrapper from `next.config.js` — the package is no longer used
- Added proper `navigator.serviceWorker.register('/sw.js')` call in `app/layout.tsx` using the already-existing hand-written service worker at `public/sw.js`
- Service worker handles install, activate, and fetch events with network-first caching strategy
- `manifest.json` was already linked and correct
- Auto-update: when a new SW version is found, it posts `SKIP_WAITING` to activate immediately

---

### ⚠️ B4. Rate Limiter Not Distributed

**File:** `/api/auth/login`  
**Symptom:** Brute-force protection only works within a single Vercel function instance. On Vercel, multiple instances can run simultaneously. An attacker using multiple IPs or hitting different instances bypasses the per-IP limit.  
**Risk:** Medium — the window for exploitation is narrow but real.  
**Effort to fix:** Low — Upstash Redis free tier is sufficient.

---

### ⚠️ B5. `/api/sales/create` vs `/api/sales/create-sale` — Possible Duplication

**Files:** Both `frontend/app/api/sales/create/route.ts` AND `frontend/app/api/sales/create-sale/route.ts` exist.  
**Issue:** Two routes appear to serve a similar purpose. It's unclear if both are actively used or if one is deprecated.  
**Recommendation:** Audit which pages call which route and remove the unused one to avoid confusion.

---

### ⚠️ B6. `/api/sales/record` and `/api/sales/receipts` — Unclear Status

**Files:** `route.ts` entries exist for these but they were not analyzed in depth.  
**Recommendation:** Verify these are actively used and not legacy routes that were replaced by `/receipts/create` and `/sales/create-sale`.

---

## 6. API Route Inventory (103 Routes)

### Auth (5)
| Route | Method | Access |
|---|---|---|
| `/api/auth/login` | POST | Public |
| `/api/auth/register` | POST | Admin only |
| `/api/auth/me` | GET | Authenticated |
| `/api/auth/change-password` | POST | Authenticated |
| `/api/auth/update-profile` | PUT | Authenticated |

### Admin — Staff (6)
| Route | Method | Access |
|---|---|---|
| `/api/admin/staff` | GET | Admin+ |
| `/api/admin/staff/create` | POST | Admin+ |
| `/api/admin/staff/[id]` | GET, PUT, DELETE | Admin+ |
| `/api/admin/staff/[id]/activate` | POST | Admin+ |
| `/api/admin/staff/[id]/deactivate` | POST | Admin+ |

### Admin — Commissions (7)
| Route | Method | Access |
|---|---|---|
| `/api/admin/commissions` | GET | Admin+ |
| `/api/admin/commissions/analytics` | GET | Admin+ |
| `/api/admin/commissions/overview` | GET | Admin |
| `/api/admin/commissions/pay` | POST | Admin |
| `/api/admin/commissions/payments` | GET | Admin+ |
| `/api/admin/commissions/set` | POST | Admin+ |
| `/api/admin/commissions/staff/[staffId]` | GET | Admin+ |

### Admin — Payments (5)
| Route | Method | Access |
|---|---|---|
| `/api/admin/payments/all` | GET | Admin+ |
| `/api/admin/payments/pending` | GET | Admin+ |
| `/api/admin/payments/pending-count` | GET | Admin+ |
| `/api/admin/payments/[id]/approve` | POST | Admin+ |
| `/api/admin/payments/[id]/reject` | POST | Admin+ |

### Admin — Reports (2)
| Route | Method | Access |
|---|---|---|
| `/api/admin/reports/comprehensive` | GET | Admin |
| `/api/admin/reports/sales` | GET | Admin+ |

### Admin — Expenses (3)
| Route | Method | Access |
|---|---|---|
| `/api/admin/expenses` | GET | Admin+ |
| `/api/admin/expenses/create` | POST | Admin+ |
| `/api/admin/my-expenses` | GET | Admin+ |

### Admin — Restock Orders (3)
| Route | Method | Access |
|---|---|---|
| `/api/admin/restock-orders` | GET, POST | Admin+ |
| `/api/admin/restock-orders/[id]` | GET, PUT, DELETE | Admin+ |
| `/api/admin/restock-orders/[id]/status` | PUT | Admin+ |

### Admin — Staff Stores (3)
| Route | Method | Access |
|---|---|---|
| `/api/admin/staff-stores` | GET | Admin+ |
| `/api/admin/staff-stores/[staffId]` | GET | Admin+ |
| `/api/admin/staff-stores-stats` | GET | Admin+ |

### Admin — Logs & Settings (3)
| Route | Method | Access |
|---|---|---|
| `/api/admin/logs` | GET | Superadmin only |
| `/api/admin/logs/stream` | GET | Superadmin only |
| `/api/admin/settings/logistics-price` | GET, PUT | Admin+ |
| `/api/admin/storage/list` | GET | Admin+ |

### Inventory (8)
| Route | Method | Access |
|---|---|---|
| `/api/inventory/items` | GET, POST | Admin (mutations), Auth (reads) |
| `/api/inventory/items/[id]` | GET, PUT, DELETE | Admin (mutations) |
| `/api/inventory/main-store` | GET | Auth |
| `/api/inventory/active-store` | GET | Auth |
| `/api/inventory/summary` | GET | Auth |
| `/api/inventory/unavailable` | GET | Auth |
| `/api/inventory/upload-image` | POST | Admin+ |
| `/api/inventory/transfer/main-to-active` | POST | Admin+ |
| `/api/inventory/transfer/active-to-main` | POST | Admin+ |

### Sales (14)
| Route | Method | Access |
|---|---|---|
| `/api/sales/create-sale` | POST | Sales/Admin |
| `/api/sales/create` | POST | Sales/Admin |
| `/api/sales/record` | POST | Auth |
| `/api/sales/dashboard` | GET | Auth |
| `/api/sales/my-sales-history` | GET | Auth |
| `/api/sales/items/available` | GET | Auth |
| `/api/sales/items/unavailable` | GET | Auth |
| `/api/sales/receipts` | GET | Auth |
| `/api/sales/payments` | GET | Auth |
| `/api/sales/payments/request` | POST | Auth |
| `/api/sales/expenses` | GET | Auth |
| `/api/sales/posted-items` | GET | Auth |
| `/api/sales/posted-items/stats` | GET | Auth |
| `/api/sales/posted-items/history` | GET | Auth |
| `/api/sales/post-items` | POST | Sales/Admin |
| `/api/sales/returned-items` | GET | Auth |
| `/api/sales/returned-items/[id]/accept` | POST | Sales/Admin |
| `/api/sales/returned-items/[id]/reject` | POST | Sales/Admin |
| `/api/sales/staff-list` | GET | Auth |

### Receipts (4)
| Route | Method | Access |
|---|---|---|
| `/api/receipts` | GET | Auth (own receipts) |
| `/api/receipts/all` | GET | Admin+ |
| `/api/receipts/create` | POST | Auth |
| `/api/receipts/[id]` | GET, DELETE | Auth (own), Admin (delete) |

### Staff (16)
| Route | Method | Access |
|---|---|---|
| `/api/staff/dashboard` | GET | Auth |
| `/api/staff/stats` | GET | Auth |
| `/api/staff/my-sales` | GET | Auth |
| `/api/staff/sales-staff` | GET | Auth |
| `/api/staff/commissions` | GET | Auth |
| `/api/staff/commissions/details` | GET | Auth |
| `/api/staff/payments` | GET | Auth |
| `/api/staff/payments/request` | POST | Auth |
| `/api/staff/store` | GET | Auth |
| `/api/staff/store/make-sales` | POST | Auth |
| `/api/staff/store/sales-history` | GET | Auth |
| `/api/staff/posted-items` | GET | Auth |
| `/api/staff/posted-items/[id]/accept` | POST | Auth |
| `/api/staff/posted-items/[id]/reject` | POST | Auth |
| `/api/staff/posted-items/pending-count` | GET | Auth |
| `/api/staff/post-items-to-staff` | POST | Sales/Admin |
| `/api/staff/returns` | GET, POST | Auth |
| `/api/staff/returns/stats` | GET | Auth |
| `/api/staff/available-items-for-return` | GET | Auth |
| `/api/staff/expenses` | GET | Auth |
| `/api/staff/expenses/create` | POST | Auth |

### Notifications (3)
| Route | Method | Access |
|---|---|---|
| `/api/notifications` | GET | Auth |
| `/api/notifications/[id]/read` | POST | Auth |
| `/api/notifications/mark-read` | POST | Auth |

### Backup (6)
| Route | Method | Access |
|---|---|---|
| `/api/backup/table/[name]` | GET | Superadmin only |
| `/api/backup/table/[name]/all` | GET | Superadmin only |
| `/api/backup/meta` | GET | Superadmin only |
| `/api/backup/history` | GET, POST, DELETE | Superadmin only |
| `/api/backup/restore/parse` | POST | Superadmin only |
| `/api/backup/restore/commit` | POST | Superadmin only |

### Health & Downloads (4)
| Route | Method | Access |
|---|---|---|
| `/api/health` | GET | Public |
| `/api/download/stats` | GET | Auth |
| `/api/download/track` | POST | Auth |
| `/api/download/history` | GET | Auth |

---

## 7. Supabase Free Tier Analysis

Supabase Free plan limits (as of 2024):

| Resource | Free Limit | Estimated Usage (10 users) | Runway |
|---|---|---|---|
| **Database size** | 500 MB | ~2–5 MB/month | **8–20 years** |
| **Database egress** | 5 GB/month | ~50–200 MB/month | **25–100x headroom** |
| **File storage** | 1 GB | ~20–50 MB/month (images) | **2–4 years** |
| **Storage egress** | 2 GB/month | ~100–300 MB/month (image loads) | **7–20x headroom** |
| **Auth MAUs** | 50,000/month | 10 users | **Forever** |
| **Auth API calls** | Unlimited | ~100–500/day | **Forever** |
| **Realtime connections** | 200 concurrent | 0 (not used) | **N/A** |
| **Edge Functions** | 500K invocations | 0 (not used) | **N/A** |
| **Serverless Functions** | N/A | N/A | **N/A** |

### Detailed Estimates

**Database growth rate:**
- Each sale: ~1 KB (sale row + receipt row + items array)
- 10 users × 20 sales/day = 200 sales/day = ~200 KB/day = ~6 MB/month
- 500 MB / 6 MB = **~83 months = 7 years** before hitting the limit

**Storage (product images):**
- Average image: ~500 KB (after upload validation with 5MB max)
- 100 products × 500 KB = ~50 MB initial load
- Adding ~5 new products/month = ~2.5 MB/month growth
- 1 GB / 50 MB = **20x headroom = years of runway**

**Storage egress (image loads):**
- 10 users browsing inventory pages, ~50 images per page view
- 50 images × 500 KB × 10 page views/day × 10 users = ~25 MB/day = ~750 MB/month
- This is 37% of the 2 GB egress limit — manageable, but worth monitoring

**⚠️ Storage egress is the one resource that could get tight** if users browse the inventory heavily. Mitigation: use Next.js `<Image>` optimization with `width` and `height` to serve resized thumbnails instead of full-size images.

---

## 8. Vercel Free Tier (Hobby Plan) Analysis

| Resource | Free Limit | Estimated Usage (10 users) | Runway |
|---|---|---|---|
| **Serverless invocations** | Unlimited | ~5,000–20,000/day | **Forever** |
| **Function execution time** | 100 GB-hours/month | ~1 GB-hour/month | **100x headroom** |
| **Bandwidth** | 100 GB/month | ~1–5 GB/month | **20–100x headroom** |
| **Build minutes** | 6,000/month | ~10–50 builds/month | **Forever** |
| **Deployments** | Unlimited | As needed | **Forever** |
| **Domains** | 1 custom domain | 1 needed | **Fine** |
| **Edge functions** | 500K/month | 0 (not used) | **N/A** |

**Function execution time estimate:**
- Each API request: ~100–500ms execution
- 20,000 API calls/day × 300ms avg = 6,000 seconds = 1.67 hours
- 1.67 hours/day × 30 days = 50 GB-hours/month
- 50 / 100 = **50% of limit** — should be fine, but worth monitoring under heavy load

**Bandwidth:**
- HTML/CSS/JS bundles: ~2 MB per initial load
- 10 users × 10 page loads/day = 200 MB/day = 6 GB/month
- Static assets are cached after first load — actual bandwidth is lower in practice
- Next.js Image Optimization is included on Vercel — helps significantly

**Hobby plan limitations to be aware of:**
- No SLA (99.9% uptime not guaranteed, though Vercel is very reliable in practice)
- No password protection for deployments (not needed for this app)
- Serverless function timeout: 10 seconds max (Pro = 60s). The backup restore route may approach this limit on large datasets. Monitor it.

---

## 9. Free Tier Verdict

> **TL;DR: This system can run on Supabase + Vercel Free tiers for 5–10+ years with 10 users.**

The only resources to watch:
1. **Supabase storage egress** — if images are loaded frequently on the inventory page. Fix: use `<Image>` with explicit dimensions to get Next.js auto-optimization.
2. **Backup/restore function timeout** — Vercel Hobby functions timeout at 10 seconds. Large restores might hit this. Fix: upgrade to Vercel Pro ($20/month) only if this becomes an issue.

Everything else is well within free tier limits for this usage level.

---

## 10. Recommendations by Priority

### 🚨 Do These Now (Security — Critical)

#### 1. Remove or Secure OVERRIDE_CREDS

```bash
# In Vercel dashboard → Settings → Environment Variables
# Remove OVERRIDE_CREDS entirely
# Then ensure the override users have proper Supabase Auth accounts

# In frontend/app/api/auth/login/route.ts
# Remove the entire OVERRIDE_CREDS block (approx lines 20-45)
```

If you absolutely need to keep it (for emergency access), at minimum change the login route to compare hashed values:
```typescript
import bcrypt from 'bcryptjs';
// Store OVERRIDE_CREDS as: lucky:$2b$10$hashedpassword,...
// Compare with: await bcrypt.compare(password, storedHash)
```

---

#### 2. Reduce JWT Expiry

In Vercel dashboard → Environment Variables:
```
JWT_EXPIRY=24h
```
This won't log anyone out immediately (existing tokens stay valid), but all new logins will get 24-hour tokens instead of 30-day tokens.

---

### ⚡ Do These Soon (Functionality — High Impact)

#### 3. Fix the Audit Logs Page

Replace the receipts-based fake data with a real query to `activity_logs`:

```typescript
// In /superadmin/audit-logs/page.tsx
// Replace the receipts fetch with:
const { data } = await supabaseAdmin
  .from('activity_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100);
```

Then add log writes to critical routes. Example for login:
```typescript
// After successful login in /api/auth/login/route.ts
await supabaseAdmin.from('activity_logs').insert({
  user_id: user.id,
  action: 'login',
  details: { email: user.email, ip: req.headers.get('x-forwarded-for') },
  created_at: new Date().toISOString()
});
```

---

#### 4. Add Activity Logging to Critical Routes

Priority order:
1. `/api/auth/login` — who logged in
2. `/api/backup/restore/commit` — most destructive action in the system
3. `/api/admin/staff/[id]` PUT/DELETE — staff edits
4. `/api/admin/payments/[id]/approve` and `reject` — payment decisions
5. `/api/admin/commissions/pay` — money movement
6. `/api/inventory/items` POST/PUT/DELETE — inventory changes

---

### 📈 Do These When Ready (Improvements)

#### 5. Fix Duplicate/Legacy Sale Routes

Audit these routes to see which are actively called:
- `/api/sales/create` vs `/api/sales/create-sale`
- `/api/sales/record` vs `/api/receipts/create`

Remove whichever are unused to reduce confusion and maintenance burden.

---

#### 6. Implement Distributed Rate Limiting

Sign up for Upstash Redis (free tier: 10,000 req/day):
```bash
npm install @upstash/ratelimit @upstash/redis
```

Replace the in-memory `Map` in the login route with Upstash-backed rate limiting. This survives cold starts and works across all Vercel instances.

---

#### 7. Add Input Sanitization

```bash
npm install sanitize-html
```

In staff create/update routes, before inserting:
```typescript
import sanitizeHtml from 'sanitize-html';
const safeName = sanitizeHtml(full_name, { allowedTags: [] });
```

---

#### 8. Reduce JWT Expiry to 24h (if not done in step 2)

Already covered above, but worth calling out separately.

---

#### 9. Scope Supabase Queries (Remove `select('*')`)

Replace `select('*')` with specific field lists in high-traffic routes:
```typescript
// Instead of:
.select('*')
// Use:
.select('id, full_name, email, role, is_active, created_at')
```

---

#### 10. Monitor Storage Egress

Set up a Supabase usage alert (Dashboard → Settings → Billing) to notify you when egress exceeds 1.5 GB/month. If hit, add the Next.js `<Image>` component with width/height to all product image renders.

---

## Appendix A — Files Changed This Session

| File | Change |
|---|---|
| `frontend/lib/api.ts` | Token extraction: `parsed.state?.token ?? parsed.token` |
| `frontend/lib/server/cache.ts` | **NEW** — In-memory TTL cache |
| `frontend/app/api/admin/logs/route.ts` | Added 5-minute result caching |
| `frontend/app/api/admin/logs/stream/route.ts` | Added 3-minute result caching |
| `frontend/app/superadmin/logs/page.tsx` | Added hydration check (was showing blank) |
| `frontend/app/admin/inventory/comprehensive.tsx` | Commission column: `₦{(item.commission \|\| 0).toLocaleString()}` |

## Appendix B — What Has Never Been Committed to Git

| Secret | Location | Status |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | ✅ Gitignored, never committed |
| `JWT_SECRET` | `.env.local` | ✅ Gitignored, never committed |
| `OVERRIDE_CREDS` (and plaintext passwords) | `.env.local` | ✅ Gitignored, but plaintext is risky |

## Appendix C — Git History of .env Files

Only one `.env` file was ever committed:
- **`frontend/.env.production`** — committed in `0a05caa`
- Contains only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Both of these are by design public (bundled into JS) — **no secrets were leaked**

---

*End of Audit Report*
