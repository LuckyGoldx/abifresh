# Serverless Migration Complete — AKV Frontend API

**Date Completed:** March 30, 2026  
**Scope:** Full migration of Express.js backend (`backend/`) to Next.js App Router API routes (`frontend/app/api/`)  
**Cost:** $0/month (Vercel Free + Supabase Free tier)  
**Status:** ✅ All routes implemented — ready for local testing

---

## What Was Done

The entire Express.js backend (running on Railway) was replicated as Next.js App Router API route handlers inside the `frontend/` project. This means:

- The frontend can now run **independently of the Express backend**
- Every API call the frontend makes hits `/api/...` (relative) → Next.js `route.ts` files → direct Supabase queries
- Zero new dependencies beyond `jsonwebtoken` (already available)
- The Express backend is **untouched** — it can still be used as a fallback

---

## Architecture Before vs After

```
BEFORE (Paid — Railway):
Frontend (Vercel) → axios → http://localhost:5000 → Express.js → Supabase

AFTER (Free):
Frontend (Vercel) → axios → /api/... → Next.js Route Handlers → Supabase
```

---

## Files Created

### Server-Side Utilities (2 files)

| File | Purpose |
|------|---------|
| `frontend/lib/server/supabase-admin.ts` | Creates `supabaseAdmin` (service role) and `supabaseAuth` (anon key) Supabase clients. Uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix = server-only, never exposed to browser) |
| `frontend/lib/server/auth.ts` | `verifyAuth(req)` — extracts JWT from `Authorization: Bearer` header, verifies with `JWT_SECRET`, looks up user in `public.users`, checks `is_active`. Returns `AuthUser` or `NextResponse(401)`. Also exports `hasRole()` (with exact role normalization from Express) and `generateToken()` |

### API Route Files (63 new routes)

---

#### 🔐 Auth — `/api/auth/*` (5 routes)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/login` | POST | Login with `username` + `password`. Looks up by `ilike` (case-insensitive), verifies via Supabase `signInWithPassword`, returns a custom JWT (30-day) |
| `/api/auth/me` | GET | Returns full authenticated user record from `public.users` |
| `/api/auth/register` | POST | Creates Supabase Auth user + `public.users` profile row |
| `/api/auth/change-password` | POST | Finds auth user by email, updates password via Supabase admin API |
| `/api/auth/update-profile` | PUT | Updates `full_name`, `phone`, `address` in `public.users` |

---

#### 📊 Sales — `/api/sales/*` (12 routes)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/sales/items/available` | GET | Items with `active_store_quantity > 0` |
| `/api/sales/items/unavailable` | GET | Items with `active_store_quantity = 0` |
| `/api/sales/record` | POST | Single-item sale: creates `sales` row, deducts `active_store_quantity`, updates `daily_sales_summary` |
| `/api/sales/create-sale` | POST | Multi-item sale: creates `sales` + `sales_items` rows, deducts each item's quantity |
| `/api/sales/create` | POST | Simplified sale creation (alias for create-sale pattern) |
| `/api/sales/post-items` | POST | Posts items from active store to staff via `posted_items` table |
| `/api/sales/receipts` | GET | Returns sales receipts for the authenticated user |
| `/api/sales/staff-list` | GET | Lists `commission_staff` and `non_commission_staff` users |
| `/api/sales/posted-items/history` | GET | Posted items history for the requesting sales person |
| `/api/sales/posted-items/stats` | GET | Aggregated stats on posted items |
| `/api/sales/dashboard` | GET | Sales summary for the authenticated user |
| `/api/sales/expenses` | GET, POST | Staff expenses (GET = own; POST = create). Uses correct DB column names: `expense_category` (not `expense_type`) and `expense_amount` (not `amount`) |

---

#### 👤 Staff — `/api/staff/*` (10 routes)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/staff/my-sales` | GET | Authenticated staff member's own sales records |
| `/api/staff/posted-items` | GET | Items posted to this staff member (with item details + posted_by join) |
| `/api/staff/posted-items/pending-count` | GET | Count of pending posted items |
| `/api/staff/posted-items/[id]/accept` | POST | Accept a posted item: updates status in `posted_items`, creates/updates `staff_store` entry (avoids inserting generated column `quantity_available`), sends notification to poster |
| `/api/staff/posted-items/[id]/reject` | POST | Reject a posted item: returns quantity back to `items.active_store_quantity`, sends notification |
| `/api/staff/expenses` | GET, POST | Own expenses (GET) or create new expense (POST) |
| `/api/staff/payments` | GET | Own payment requests |
| `/api/staff/payments/request` | POST | Request a payment — supports both `multipart/form-data` (with receipt image upload to Supabase Storage `payments` bucket) and `application/json` (no file). Uses Web API `req.formData()` — no extra libraries needed |
| `/api/staff/commissions` | GET | Own commission records with item details |
| `/api/staff/stats` | GET | Parallel stats: total sales + pending posted items + payments summary |

---

#### 🛡️ Admin — `/api/admin/*` (15 routes)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/staff` | GET | All users enriched with recent sales data (Promise.all parallel fetch) |
| `/api/admin/staff/create` | POST | Creates Supabase Auth user + `public.users` profile |
| `/api/admin/staff/[id]` | GET, PUT, DELETE | GET: full profile. PUT: update profile + optional password change. DELETE: full cleanup across 9 tables (`sales`, `sales_items`, `daily_sales_summary`, `staff_payments`, `staff_expenses`, `staff_commissions`, `staff_store`, `posted_items`, `notifications`) then deletes Supabase Auth user |
| `/api/admin/staff/[id]/deactivate` | POST | Sets `is_active = false` |
| `/api/admin/staff/[id]/activate` | POST | Sets `is_active = true` |
| `/api/admin/payments/pending-count` | GET | Count of `status = 'pending'` payments |
| `/api/admin/payments/pending` | GET | All pending payments enriched with staff info |
| `/api/admin/payments/all` | GET | All payments with optional `staffId`, `status`, `startDate`, `endDate` filters, enriched with staff names |
| `/api/admin/payments/[id]/approve` | POST | Sets `status = 'approved'`, `approved_date`, sends `payment_approved` notification to staff |
| `/api/admin/payments/[id]/reject` | POST | Sets `status = 'rejected'`, saves `rejection_reason`, sends `payment_rejected` notification |
| `/api/admin/commissions` | GET | All commissions with `users(full_name, email)` + `items(name)` join |
| `/api/admin/commissions/set` | POST | Upsert commission: `{ staffId, itemId, commissionPercentage }` — uses `onConflict: 'staff_id,item_id'` |
| `/api/admin/storage/list` | GET | Lists files from Supabase Storage bucket (`?bucket=payments` by default). Returns files with public URLs |
| `/api/admin/reports/sales` | GET | Sales summary grouped by category and payment method. Optional `?staffId=` filter |
| `/api/admin/reports/comprehensive` | GET | Full business report: fetches receipts, receipt_items, expenses, items, staff_store. Calculates revenue/expenses/profit, groups by staff/role/day/item. Returns top performers, inventory stats, low-stock alerts |

---

#### 📦 Inventory — `/api/inventory/*` (7 routes)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/inventory/items` | GET, POST | GET: all items with `main_store_quantity` + `active_store_quantity`. POST (admin only): creates new item with `name, category, unit_price, sku, quantity, commission, brand, package_type, price_jalingo, price_outside, image_url` |
| `/api/inventory/items/[id]` | GET, PUT, DELETE | GET: single item. PUT (admin): partial updates including quantities, brand, price fields, image_url. DELETE (admin): removes item |
| `/api/inventory/transfer/main-to-active` | POST | Admin: transfers `quantity` from `main_store_quantity` → `active_store_quantity` (checks sufficient stock first) |
| `/api/inventory/transfer/active-to-main` | POST | Admin: transfers back from active → main |
| `/api/inventory/summary` | GET | `?view=main|active|unavailable|all` — returns totals, item counts, total value. Defaults to `all` |
| `/api/inventory/main-store` | GET | Items with `main_store_quantity > 0` |
| `/api/inventory/active-store` | GET | Items with `active_store_quantity > 0` |

---

#### 🧾 Receipts — `/api/receipts/*` (4 routes)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/receipts` | GET | Authenticated user's receipts with `?limit=&offset=` pagination |
| `/api/receipts/create` | POST | Creates receipt + `receipt_items` rows + updates `daily_sales_summary` (upsert by `sale_date + staff_id + item_id`). Deducts `active_store_quantity` per item |
| `/api/receipts/all` | GET | Admin only: all receipts, optional `?staffId=` filter |
| `/api/receipts/[id]` | GET, DELETE | GET: receipt with items. DELETE: staff can delete own, admin can delete any |

---

#### 🔔 Notifications — `/api/notifications/*` (3 routes)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/notifications` | GET | Polling-based. Returns notifications for current user since their `last_notifications_read_at`. Includes unread count. Returns both `notifications` + `posted_items` (pending) |
| `/api/notifications/mark-read` | POST | Updates `last_notifications_read_at = now()` in `users` table |
| `/api/notifications/[id]/read` | PATCH | Inserts a `virtual_read_marker` record (or marks `is_read = true` directly on the notification) |

---

#### 💾 Backup — `/api/backup/*` (6 routes)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/backup/meta` | GET | Returns `ALLOWED_TABLES` list — the 25 tables that can be backed up/restored |
| `/api/backup/table/[name]` | GET | Returns sample (first 5 rows) from a table for preview |
| `/api/backup/table/[name]/all` | GET | Returns all rows from a table (admin only, used for XLSX export) |
| `/api/backup/history` | GET | Returns `backup_history` table records |
| `/api/backup/restore/parse` | POST | Accepts multipart XLSX upload, parses sheets using `xlsx` library, returns parsed data for preview |
| `/api/backup/restore/commit` | POST | Accepts `{ tableName, rows[] }` — truncates table (or does upsert) and inserts new rows. Admin only |

**ALLOWED_TABLES** (25 tables): `users`, `items`, `inventory_main_store`, `inventory_active_store`, `inventory_transfers`, `restock_orders`, `restock_order_items`, `sales`, `sales_items`, `daily_sales_summary`, `receipts`, `receipt_items`, `posted_items`, `staff_store`, `posted_items_mapping`, `staff_sales`, `staff_commissions`, `staff_payments`, `staff_expenses`, `returned_items`, `damage_loss_reports`, `notifications`, `activity_logs`, `system_settings`, `backup_history`

---

#### 🏥 Health Check

| Route | Method | Description |
|-------|--------|-------------|
| `/api/health` | GET | Tests Supabase connection. Returns `{ status: 'ok', supabase: true/false }` |

---

## Files Modified

### `frontend/.env.local`
Added the following server-side variables (no `NEXT_PUBLIC_` prefix = never sent to browser):
```env
SUPABASE_URL=https://cifzlkspxjghpgxhrwkg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...           # Service role — full DB access
JWT_SECRET=abifresh-kiddies-ventures-super-secret-key-2026-production-ready
JWT_EXPIRY=30d

# Set to empty string so axios uses relative URLs → Next.js API routes
NEXT_PUBLIC_API_URL=
```

> **To fall back to Express backend at any time:** set `NEXT_PUBLIC_API_URL=http://localhost:5000` in `.env.local` and restart Next.js.

### `frontend/lib/api.ts`
Changed base URL resolution:
```ts
// Before:
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// After:
// Set NEXT_PUBLIC_API_URL=http://localhost:5000 to fall back to Express backend.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
```
`??` means: only use the fallback if the variable is `undefined`. Since `.env.local` sets it to `''` (empty string), axios uses relative URLs like `/api/auth/login` which Next.js handles locally.

---

## Key Technical Decisions

### 1. Direct Supabase Queries (No Service Layer)
Each `route.ts` makes direct `supabaseAdmin` calls rather than importing from `backend/src/services/`. This keeps the frontend fully independent of the backend codebase.

### 2. Role Normalization — Identical to Express
The `hasRole()` function in `lib/server/auth.ts` uses the exact same logic as `backend/src/middleware/auth.ts`:
- `sales_staff` → normalized to `sales`
- `commission_staff` → maps to `commission_staff`
- `non_commission_staff` → maps to `non_commission_staff`
- `superadmin` → has access to everything `admin` can access

### 3. File Uploads — Zero Extra Dependencies
Staff payment receipts (proof of payment) use `req.formData()` — the native Web API built into Next.js App Router. No `express-fileupload`, `multer`, or `formidable` needed. File is uploaded directly to Supabase Storage bucket `payments`.

### 4. DB Column Mapping — Critical
The `staff_expenses` table uses different column names than what the frontend expects:
- DB column `expense_category` ← frontend sends as `expense_type`
- DB column `expense_amount` ← frontend sends as `amount`
All expense routes handle this mapping correctly.

### 5. Generated Column — `staff_store.quantity_available`
Supabase computes `quantity_available` automatically (`quantity - quantity_sold`). All routes that insert into `staff_store` explicitly exclude this column to avoid Supabase's "cannot insert into a generated column" error.

### 6. JWT Authentication — Same Token Format
The JWT emitted by the new routes is **byte-for-byte identical** in format to the Express backend tokens:
```json
{ "userId": "...", "email": "...", "role": "...", "iat": ..., "exp": ... }
```
A token issued by either backend works with the other.

---

## How to Test Locally

### Step 1: Start Next.js (no Express needed)
```bash
cd frontend
npm run dev
```
The app starts at `http://localhost:3000`. All API calls go to `http://localhost:3000/api/...`.

### Step 2: Verify health check
```
GET http://localhost:3000/api/health
→ { "status": "ok", "supabase": true }
```

### Step 3: Test login
```
POST http://localhost:3000/api/auth/login
{ "username": "youruser", "password": "yourpassword" }
→ { "token": "eyJ...", "user": { ... } }
```

### Step 4: Test the full app
Log in through the browser at `http://localhost:3000`. All features should work exactly as before.

### Step 5 (Optional): Run both Express + Next.js simultaneously
To compare responses, start Express on port 5000 in a second terminal:
```bash
cd backend
npm run dev
```
Then toggle `NEXT_PUBLIC_API_URL` in `.env.local` between `http://localhost:5000` and `''` to switch backends.

---

## How to Deploy to Vercel (After Local Testing)

### 1. Add Environment Variables in Vercel Dashboard
Go to **Project → Settings → Environment Variables** and add:
```
SUPABASE_URL                = https://cifzlkspxjghpgxhrwkg.supabase.co
SUPABASE_SERVICE_ROLE_KEY   = eyJhbGci...  (the service role key)
JWT_SECRET                  = abifresh-kiddies-ventures-super-secret-key-2026-production-ready
JWT_EXPIRY                  = 30d
NEXT_PUBLIC_SUPABASE_URL    = https://cifzlkspxjghpgxhrwkg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGci...  (the anon key)
NEXT_PUBLIC_API_URL         =               (empty — use relative routes)
```

### 2. Deploy
```bash
git push origin main
```
Vercel auto-deploys. The Express backend on Railway can then be shut down.

---

## Cost Comparison

| Service | Before | After |
|---------|--------|-------|
| Railway (Express backend) | ~$5-20/month | $0 (can be cancelled) |
| Vercel (Frontend) | Free | Free |
| Supabase | Free | Free |
| **Total** | **$5-20/month** | **$0/month** |

---

## File Count Summary

| Category | Files Created |
|----------|--------------|
| Server utilities | 2 |
| Auth routes | 5 |
| Sales routes | 12 |
| Staff routes | 10 |
| Admin routes | 15 |
| Inventory routes | 7 |
| Receipts routes | 4 |
| Notifications routes | 3 |
| Backup routes | 6 |
| Health check | 1 |
| **Total new files** | **65** |
