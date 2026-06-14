# AKV System — Session Handover Document

## System Overview

AKV (Abifresh & Kiddies Ventures) is a full-stack inventory, sales, and credit management system built with:

- **Frontend**: Next.js 14 App Router (React, TypeScript, Tailwind CSS)
- **Backend**: Express.js (Node.js, TypeScript) — used for legacy routes, some services
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT-based, custom implementation
- **State**: Zustand (persisted to localStorage)
- **HTTP Client**: Axios

## Directory Structure

```
akv/
├── frontend/                          # Next.js app
│   ├── app/
│   │   ├── api/                       # 148 Next.js API route files
│   │   │   ├── admin/                 # Admin API (43 files)
│   │   │   ├── auth/                  # Auth API (login, register, me, etc.)
│   │   │   ├── credits/               # Credit system API (26 files)
│   │   │   ├── expense-categories/    # Expense categories API (2 files)
│   │   │   ├── inventory/             # Inventory API (9 files)
│   │   │   ├── receipts/              # Receipts API (4 files)
│   │   │   ├── sales/                 # Sales portal API (19 files)
│   │   │   ├── staff/                 # Commission staff API (21 files)
│   │   │   └── ...                    # backup, download, health, notifications
│   │   ├── admin/                     # Admin pages (31 files)
│   │   ├── sales/                     # Sales pages (21 files)
│   │   ├── staff/                     # Staff pages (10 files)
│   │   ├── superadmin/                # Superadmin pages (35 files, most re-export admin pages)
│   │   └── ...                        # login, download, root page
│   ├── components/                    # 21 shared components
│   │   ├── Sidebar.tsx                # Responsive sidebar with credit mode toggle
│   │   ├── Header.tsx                 # Sticky top bar with notifications
│   │   ├── SalesAnalysisPage.tsx      # Sales analysis component
│   │   ├── credits/index.tsx          # Credit system components (Toast, StatsCard, ActivityLog, CreditTabs)
│   │   └── ...
│   ├── context/                       # React contexts
│   │   └── ToastContext.tsx           # Toast notification context
│   ├── lib/
│   │   ├── api.ts                     # Axios instance with JWT interceptor
│   │   ├── server/
│   │   │   ├── auth.ts                # verifyAuth, hasRole, generateToken
│   │   │   └── supabase-admin.ts      # Service-role client (bypasses RLS)
│   │   └── hooks/                     # Custom React hooks
│   ├── store/
│   │   └── auth.ts                    # Zustand auth store + theme store
│   └── types/
│       └── index.ts                   # TypeScript interfaces
├── backend/                           # Express.js backend
│   ├── src/
│   │   ├── routes/                    # 11 route files
│   │   ├── services/                  # 12 service files
│   │   └── types/                     # TypeScript interfaces
│   └── migrations/                    # SQL migration files
└── *.sql                              # Root-level SQL scripts (MASTER_MIGRATION, SUPABASE_SCHEMA, etc.)
```

## Auth System

### Roles
- `admin` — Full system access
- `superadmin` — Inherits admin access + extra privileges (can rename built-in expense categories, etc.)
- `sales` / `sales_staff` — Sales portal staff
- `commission_staff` / `staff_commission` — Commission-based store staff
- `non_commission_staff` / `staff_non_commission` — Non-commission store staff

### Role normalization (hasRole):
```
sales_staff → sales
staff_commission → commission_staff
commission_staff → commission_staff (canonical)
staff_non_commission → non_commission_staff
non_commission_staff → non_commission_staff (canonical)
superadmin automatically passes 'admin' checks
```

### Auth flow
1. Login → POST `/api/auth/login` → returns JWT + user
2. JWT stored in Zustand (→ localStorage `auth-storage`)
3. Each request: Axios interceptor attaches `Authorization: Bearer <token>`
4. Each API route: `verifyAuth(req)` decodes JWT, looks up user, checks `is_active`
5. Role check: `hasRole(user.role, 'admin', 'superadmin')`

## Database — 34 Tables

### Core Tables
- `users` — Authentication and user profiles
- `items` — Product catalog (SKU, prices for Jalingo/Outside, commission)
- `inventory_main_store` — Admin-managed main stock
- `inventory_active_store` — Active sales stock
- `sales` + `sales_items` — Sales portal transactions
- `staff_sales` — Commission staff sales (includes unit_price, total_amount)
- `staff_store` — Per-staff inventory
- `staff_expenses` — Staff expense requests (with approval workflow)
- `staff_payments` — Staff payment requests (with items_paid_for JSONB)
- `staff_commissions` — Commission rate configuration
- `receipts` + `receipt_items` — Receipt records
- `posted_items` — Items posted from sales to staff
- `posted_items_mapping` — Links posted items to staff_store
- `returned_items` — Returned item records
- `restock_orders` + `restock_order_items` — Inventory restocking
- `notifications` — System notifications
- `activity_logs` — Audit trail
- `expense_categories` — Persistent expense type categories (with scope: admin/staff/all)
- `system_settings` — Key-value config store
- `backup_history` — DB backup records

### Credit System Tables (7)
- `creditors` — Credit customers (with `is_active` for soft-delete)
- `credit_sales` + `credit_sale_items` — Credit transactions
- `credit_store` — Items held in credit store
- `credit_payments` + `credit_payment_items` — Payment tracking
- `credit_activities` — Activity audit log

### Other
- `daily_sales_summary` — Aggregated daily stats
- `inventory_transfers` — Movement between stores
- `damage_loss_reports` — Damaged/lost items
- `pwa_downloads` — PWA install tracking

## API Architecture

All frontend API routes are under `frontend/app/api/`. Key patterns:
- Service role client (`supabaseAdmin`) used for all DB operations (bypasses RLS)
- Auth via `verifyAuth(req)` + `hasRole()`
- Response format: `NextResponse.json(data)` or `NextResponse.json({ error }, { status })`

## Session Work Log

### 1. Payment Item Price Fix (Staff & Sales)
**Files changed**:
- `frontend/app/api/staff/store/sales-history/route.ts` — Changed `price_jalingo` from `items.price_jalingo` → `staff_sales.unit_price` (actual sold price)
- `frontend/app/api/staff/store/make-sales/route.ts` — Added `sold_outside_jalingo` to INSERT
- `frontend/app/staff/payments/page.tsx` — Split grouping by location (inside/outside), colored dots (green/yellow), legend
- `frontend/app/api/sales/my-sales-history/route.ts` — Joined with sales table for `sold_outside_jalingo`, computed effective unit_price including logistics
- `frontend/app/sales/payments/page.tsx` — Added location display, removed stale `price_jalingo` reference

### 2. Sales Analysis Price Fix
**Files changed**:
- `frontend/app/api/admin/reports/sales-analysis/route.ts` — Replaced receipts-based queries with direct `staff_sales` + `sales`/`sales_items` queries, fixed unit_price to actual sold price, added location to staff breakdown
- `frontend/components/SalesAnalysisPage.tsx` — Added location column, selling price column in staff breakdown

### 3. Staff Dropdown Filter
**Files changed**:
- `frontend/app/api/admin/staff/route.ts` — Added `staff_sales` aggregation for commission/non-commission staff
- `frontend/components/SalesAnalysisPage.tsx` — Filtered dropdown to show only staff with sales `(total_sales_items > 0)`

### 4. Post-Items Sidebar Layout Fix
**Files changed**:
- `frontend/app/admin/post-items/page.tsx` — Removed redundant "Selected" card, fixed `max-h` to account for header + main padding, adjusted sticky offset
- `frontend/app/sales/post-items/page.tsx` — Same fixes

### 5. Expense Categories System
**New files created**:
- `backend/migrations/create_expense_categories_table.sql` — DB table for persistent expense types
- `backend/migrations/add_scope_to_expense_categories.sql` — Added scope column for role-based filtering
- `frontend/app/api/expense-categories/route.ts` — GET (list with scope filter) + POST (create with role-based scope)
- `frontend/app/api/expense-categories/[id]/route.ts` — PUT (rename) + DELETE (soft-delete)

**Files changed**:
- `frontend/app/admin/my-expenses/page.tsx` — Replaced hardcoded list + localStorage with DB-backed categories, added scope filtering, replaced `alert()` with success modal, added inline rename, removed top-3 card limit
- `frontend/app/sales/expenses/page.tsx` — Same DB-backed categories with role-based Add Custom
- `frontend/app/staff/expenses/page.tsx` — Same as sales

**Scope-based filtering (API)**:
- Admin/superadmin: sees `scope='admin'` + `scope='all'` + their own custom categories
- Sales/staff: sees `scope='staff'` + `scope='all'` + their own custom categories

**Permissions**:
- Admin: add custom categories, rename only custom ones
- Superadmin: add custom categories, rename both built-in and custom

### 6. Report Expense Filter (Approved Only)
**Files changed**:
- `frontend/app/api/admin/reports/comprehensive/route.ts` — Added `.eq('status', 'approved')` to expenses query

### 7. Creditor System Fixes
**Files changed**:
- `frontend/app/api/credits/creditors/[id]/route.ts` — Added DELETE handler (soft-delete via `is_active=false`)
- `frontend/app/sales/manage-creditors/page.tsx` — Added `isAdding` state + button disable for Add Creditor

## Migration Files to Run

### If running on fresh database:
1. `backend/migrations/create_expense_categories_table.sql`

### If upgrading existing database (already ran `create_expense_categories_table.sql` WITHOUT scope):
1. `backend/migrations/add_scope_to_expense_categories.sql`
2. Plus fix existing custom categories:
```sql
UPDATE expense_categories SET scope = 'admin'
WHERE NOT is_built_in AND (scope IS NULL OR scope = 'all');
```

## Key Data Flows

### Payment Flow (Commission Staff)
1. Staff makes sale → `staff_sales` record created (unit_price = actual selling price incl. logistics)
2. Receipt optionally created (in try/catch)
3. Staff selects items to pay for in `/staff/payments`
4. Sales grouped by `item_id + location` so same item sold inside/outside Jalingo appears separately
5. Payment request sent → `staff_payments` created with `items_paid_for` JSONB

### Credit Flow
1. Creditor created → `creditors` (soft-delete by `is_active=false`)
2. Credit given → `credit_sales` + `credit_sale_items` + `credit_store`
3. Payment made → `credit_payments` + `credit_payment_items` (with approval workflow)
4. Remittance → `credit_payments.remittance_status` tracked

### Expense Flow
1. All users can submit expense requests → `staff_expenses` (status: pending)
2. Admin approves/rejects → status changes
3. Reports only count approved expenses
4. Expense category dropdown populated from `expense_categories` table with scope filtering

## Known Issues / Notes
- The `expense_categories` table must have the scope column properly seeded for correct role-based filtering
- Creditor deletion uses soft-delete (`is_active=false`) because `credit_sales` and `credit_payments` reference `creditors(id)` via FK
- The receipt creation in staff make-sale flow is inside a try/catch — failures are silently swallowed
- `sales_items.unit_price` does NOT include logistics fee; it's computed at query time as `unit_price + logistics_fee`
- `staff_sales.unit_price` ALREADY includes logistics fee for outside Jalingo sales

## Card Overflow Audit — Complete Fix Summary

**Audit scope**: All 34+ pages with summary cards/stat cards across admin, sales, staff, and superadmin sections.

**Fix applied**: For each unprotected card, added `overflow-hidden` to the card container and `break-words` to the value text element. Some cards also received `min-w-0` on flex children, `flex-shrink-0` on icons, and `truncate` on labels. Cards with `whitespace-nowrap` (which prevents wrapping and causes overflow) had it replaced with `break-words`.

### Files Fixed (26 total):

| # | File | Lines Fixed | Card Count |
|---|------|-------------|-----------|
| 1 | `admin/dashboard/content.tsx` | Receipt modal total | 1 |
| 2 | `admin/expenses/page.tsx` | Category cards, Role breakdown, Status cards | 10+ |
| 3 | `admin/orders/page.tsx` | Vendor order stats, Preview stats, History stats | 10+ |
| 4 | `admin/reports/content.tsx` | Expenses summary, Inventory KPI cards | 7 |
| 5 | `admin/credit-reports/content.tsx` | All 8 summary cards | 8 |
| 6 | `admin/my-expenses/page.tsx` | Total + category cards | 5+ |
| 7 | `admin/backup/page.tsx` | 5 summary cards | 5 |
| 8 | `admin/credit-payments/page.tsx` | Outstanding + 4 summary cards | 5 |
| 9 | `admin/credit-payments/staff/[staffId]/page.tsx` | 4 summary cards | 4 |
| 10 | `sales/dashboard/page.tsx` | 6 stat cards | 6 |
| 11 | `sales/payments/page.tsx` | 1st card | 1 |
| 12 | `sales/expenses/page.tsx` | 4 summary cards | 4 |
| 13 | `sales/credit-payments/page.tsx` | 4 summary cards | 4 |
| 14 | `staff/payments/page.tsx` | 1st card | 1 |
| 15 | `staff/expenses/page.tsx` | 4 summary cards | 4 |
| 16 | `staff/posted-items/page.tsx` | 3 summary cards | 3 |
| 17 | `staff/available-items/page.tsx` | 3 summary cards | 3 |
| 18 | `staff/return-items/page.tsx` | 3 summary cards | 3 |
| 19 | `staff/commissions/page.tsx` | Local StatCard component | 5 |
| 20 | `superadmin/dashboard/content.tsx` | Receipt modal total | 1 |
| 21 | `superadmin/staff/page.tsx` | 6 summary cards | 6 |
| 22 | `superadmin/users/page.tsx` | 4 summary cards | 4 |
| 23 | `superadmin/audit-logs/page.tsx` | 4 summary cards | 4 |
| 24 | `superadmin/system-health/page.tsx` | 4 summary cards | 4 |
| 25 | `superadmin/credit-payments/page.tsx` | Outstanding + 3 cards | 4 |
| 26 | `admin/credit-payments/staff/[staffId]/page.tsx` | 4 summary cards | 4 |

**Total cards protected: ~150+ across all viewport sizes (mobile, tablet, desktop).**

### Files Fixed — First Pass (26 files):
[...first pass list...]

### Files Fixed — Second Pass (10 more files):

| # | File | Fix |
|---|------|-----|
| 1 | `components/credits/index.tsx` (StatsCard) | Added `overflow-hidden`, `min-w-0`, `truncate` on label, `break-words` on value, `flex-shrink-0` on icon |
| 2 | `admin/staff-stores/page.tsx` | 11 cards across 3 grids: added overflow-hidden + break-words |
| 3 | `admin/receipts/page.tsx` | 5 cards in grid: overflow-hidden + break-words |
| 4 | `sales/receipts/page.tsx` | 1 total card: overflow-hidden + break-words |
| 5 | `staff/receipts/page.tsx` | 1 total card: overflow-hidden + break-words |
| 6 | `admin/returned-items/page.tsx` | 1 pending badge: overflow-hidden + break-words |
| 7 | `sales/returned-items/page.tsx` | Same |
| 8 | `superadmin/returned-items/page.tsx` | Same |
| 9 | `sales/post-items-to-staff/page.tsx` | 3 cards: overflow-hidden + break-words |
| 10 | `sales/make-sale/page.tsx` | 1 Amount Due card: overflow-hidden + break-words |
| 11 | `staff/make-sale/page.tsx` | Same |

**Total: 36 files fixed, ~150+ cards protected across the entire application.**

### Standard Fix Pattern:
```
Before:
  <div className="card border-l-4 ...">...

### Standard Fix Pattern:
```
Before:
  <div className="card border-l-4 ...">
    <p className="text-3xl font-bold text-blue-600">{value}</p>

After:
  <div className="card border-l-4 ... overflow-hidden">
    <p className="text-3xl font-bold text-blue-600 break-words">{value}</p>
```

### Edge Cases Handled:
- **Flexbox icon + text**: Added `min-w-0` to text container (prevents flex item from expanding beyond container), `flex-shrink-0 + ml-3` to icon
- **`whitespace-nowrap` on values**: Replaced with `break-words` to allow wrapping on small screens
- **`flex justify-between items-baseline`** layouts with value + badge: Added `gap-2` for spacing and `flex-shrink-0` on badge
- **Card class**: Checked global CSS — the `.card` class does NOT include overflow protection, so explicit `overflow-hidden` is always needed.
