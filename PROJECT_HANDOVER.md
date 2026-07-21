# AKV Sales Management System — Complete Project Handover

**Project**: ABIFRESH & KIDDIES VENTURES Sales Management System
**Repository**: `git@github.com:LuckyGoldx/abifresh.git` (production) / `abifresh-test.git` (test)
**Deployed**: Vercel (production: abifresh.vercel.app, test: abifresh-test.vercel.app)
**Database**: Supabase PostgreSQL (production: cifzlkspxjghpgxhrwkg / test: wkyakaunbejmuzqnvgno)
**Date of handover**: July 17, 2026
**Total commits**: 200+

---

## 1. Project Overview

AKV is a full-stack retail sales management system for **ABIFRESH & KIDDIES VENTURES**, a Nigerian retail business dealing in diapers, sanitary pads, wipes, and related products. The system manages:

- **4 staff types**: Admin/superadmin, Commission staff, Non-commission staff, Sales staff
- **Inventory**: Main store, Active store, Staff stores, Credit store
- **Sales workflow**: Receipt generation, staff sales tracking, credit sales
- **Payments**: Staff payment submission, admin approval/rejection, commission
- **Reports**: Comprehensive analytics, sales analysis, credit reports, export
- **Expenses**: Staff expense submission, admin approval, reporting
- **Credit system**: Creditor management, credit sales, payment installments
- **Returns**: Staff returns to sales, credit returns

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), TypeScript, React 18 |
| **Styling** | Tailwind CSS 4, Lucide React icons |
| **Backend** | Next.js API routes (serverless, 100+ endpoints) |
| **Database** | Supabase PostgreSQL with RLS |
| **Auth** | Supabase Auth + custom override credentials |
| **State** | Zustand (auth store), React context (alerts, notifications) |
| **Deployment** | Vercel (production + test instances) |
| **PWA** | next-pwa, service workers, install prompts |

---

## 3. Database Schema (34 Tables)

### Core Tables
| Table | Purpose |
|---|---|
| `users` | All staff and admin accounts |
| `items` | Product catalog with pricing (price_jalingo/price_outside) |
| `receipts` / `receipt_items` | POS transactions (till records) |
| `staff_sales` | Commission/non-commission staff sales records |
| `sales` / `sales_items` | Sales portal staff sales records |
| `staff_store` | Per-staff inventory (quantity, quantity_sold) |
| `staff_payments` | Payment submissions with items_paid_for |
| `staff_expenses` | Staff/submitted expenses |

### Credit System
| Table | Purpose |
|---|---|
| `creditors` | Credit customers |
| `credit_sales` / `credit_sale_items` | Credit transactions |
| `credit_payments` / `credit_payment_items` | Credit payment installments |
| `credit_store` | Inventory in credit store |

### Support Tables
| Table | Purpose |
|---|---|
| `notifications` | Bell icon notifications |
| `returned_items` | Staff return requests |
| `daily_sales_summary` | Aggregated daily stats |
| `backup_history` | Backup/restore tracking |
| `expense_categories` | Expense type list |

---

## 4. Staff Types & Their Flows

### Commission Staff (Ambrose, Shadrack)
- Sell from posted `staff_store` inventory
- Submit payments for collected cash
- Admin approves → commission generated at `items.commission` rate
- Returns: send unsold items back to sales

### Non-Commission Staff (Kefas, Thankgod)
- Same checkout flow but no commission
- Submit payments without commission calculations
- Payment type: `non_commission`

### Sales Staff (Blessing — portal)
- Sell from `active_store` inventory via `sales` + `sales_items`
- Auto-calculate with `price_jalingo`/`price_outside + logistics_fee`
- Payment type: `sales`

### Admin / Superadmin
- Full access to all pages
- Post inventory to staff stores
- Approve/reject payments, expenses, returns
- Manage creditors, credit sales
- Backup/restore system data
- Superadmin: additional system logs, overrides

---

## 5. Major Features Timeline

### Phase 1 — Foundation (First Commit → April 2026)
- Initial commit: commission tracking, inventory, payment processing
- User authentication with Supabase Auth
- Staff add/edit with auto-generated usernames
- Product catalog with images
- Make-sale pages for all staff types
- Payment submission and admin approval
- Expense tracking system

### Phase 2 — Reports & Analytics (April–May 2026)
- Comprehensive reports system (summary, sales, expenses, inventory, performance)
- Sales analysis dashboard
- Staff performance metrics
- PDF/Excel export
- Custom date ranges
- Low stock alerts (reorder level: 100)

### Phase 3 — Pricing & Receipts (May 2026)
- Inside/Outside Jalingo pricing (price_jalingo, price_outside)
- Logistics fees for outside Jalingo sales
- Receipt generation with correct pricing
- Admin receipts history page
- Return items workflow

### Phase 4 — UX & Mobile (May–June 2026)
- PWA support with install prompts
- Dark mode persistence
- Mobile responsive layouts
- Sidebar redesign
- Notification system (bell icon, real-time)
- Download page tracking

### Phase 5 — Credit System (June 2026)
- Creditor management
- Credit sales workflow
- Payment installments (FIFO allocation)
- Cancel credit sales (75% rule)
- Credit reports and analytics
- Credit store inventory

### Phase 6 — Security & Performance (June 2026)
- Security audit (CWE fixes)
- Rate limiting (500 req/15min, 10 login attempts)
- API auth middleware
- Backup/restore system
- N+1 query elimination
- Dynamic imports (recharts, heavy libs)

### Phase 7 — Commission Revamp (June–July 2026)
- Payment-approval-based commission system
- approved_commission column on staff_sales
- Commission accrual on payment approval
- Commission reports and analytics

### Phase 8 — Payment System Overhaul (July 13–17, 2026)
- See sections 6–8 below for full details

---

## 6. July 13–17 Audit & Fix Session (8 Commits)

### 6.1 Race Condition Fix (`467a3ba`)
Optimistic locking on `quantity_sold` and `active_store_quantity` updates. Prevents concurrent checkouts from bypassing Gate 3.

### 6.2 Payment Type Cleanup (`ddcf2d4`, `294b4b6`)
- `sales` type for sales staff (was hardcoded `commission`)
- `non_commission` type for non-commission staff (was `salary`)
- Removed `paid_by.is.null` filter hack from 11 endpoints
- Added `paid_by` audit trail on approval

### 6.3 Auto-Heal Scaling (`cb9b5a2`, `dd06a64`, `f1f4547`)
Implemented in both `sales/my-sales-history` and `staff/store/sales-history`:
- Quantity-based sequential distribution (matching admin page)
- Auto-heal scale cap at 1.0 (items never show above sell price)
- Zero-out when outstanding ≤ 0 (empty list)
- Rounding + epsilon filter (no floating point artifacts)
- Pending payments hidden from selection list

### 6.4 Staff Store Grouping Key (`51d9fec`)
Added `unit_price` to grouping key so different-price items show as separate rows.

### 6.5 Checkout Flow Reorder (`685dbf0`)
Changed from "receipt first → sale second" to "sale first → receipt second". Prevents orphaned receipts when sale fails.

### 6.6 Date Range Boundaries (`a7a1be3`, `c8d2f88`)
Custom `to` date advances by 1 day and caps at today. Applied to all report routes.

### 6.7 Loading Progress UI (`c8d2f88`)
Multi-stage realistic progress with dynamic labels.

### 6.8 Receipt ID FK (`685dbf0`)
Added `receipt_id UUID REFERENCES receipts(id)` to `staff_sales` and `sales`.

---

## 7. Ambrose −57 Oversold Analysis

**Finding**: Display artifact, not financial damage. 74 returns accepted on July 11 (day after Ambrose's last sale on July 10) reduced posted quantities below what was already sold.

**Fix**: `UPDATE staff_store SET quantity = quantity_sold WHERE quantity_sold > quantity` (not yet run on production)

**Documents**: `AMBROSE_OVERSELL_ANALYSIS.md`, `AMBROSE_OVERSELL_BEFORE_AFTER.md`

---

## 8. Ambrose ₦8M Credit Sales Gap

- **34 fully unpaid records**: 879 units, ₦7,694,600 (July 7–10, 2026)
- **1 partially unpaid record**: 43.5 units, ₦352,350
- **Total outstanding**: ₦8,062,950
- **Not a bug**: Credit sales — goods delivered, money pending collection

**Document**: `AMBROSE_8M_CREDIT_SALES_ANALYSIS.md`

---

## 9. Remaining Work

| Task | Status |
|---|---|
| Run Ambrose SQL fix on production | Done (July 17, 2026) |
| Restock Ambrose's store | Pending |
| Deploy race condition fix to Vercel | Committed, pending deploy |
| Remove temp override creds from `.env.local` | Pending |
| Frontend refactoring (see separate plan) | In progress |

---

## 10. Environment Setup

```bash
# Local development
cp .env.local.example .env.local
# Edit .env.local with Supabase test credentials

# Install dependencies
cd frontend && npm install

# Run dev server
npm run dev
```

### Environment Files
- `.env.local` — test Supabase (wkyakaunbejmuzqnvgno)
- `.env.production` — production Supabase (cifzlkspxjghpgxhrwkg)

### Override Credentials (for testing)
`.env.local` includes `OVERRIDE_CREDS` for all staff. Remove before production use.

---

## 11. Key Architecture Decisions

1. **Two separate sales tables**: `staff_sales` for commission/non-commission, `sales` + `sales_items` for portal. Keeps reporting separate for different staff types.

2. **`items_paid_for` JSON**: Flexible payment-to-sale linking without a join table. Trade-off: complex distribution logic.

3. **Serverless first**: All 100+ routes are Next.js API routes. No separate backend server.

4. **Optimistic locking**: Added July 17, 2026 to prevent checkout race conditions.

5. **Auto-heal scaling**: Display layer correction for quantity-based tracking gaps. Doesn't modify database records.

6. **PWA with service worker**: Offline capable with install prompts for mobile/desktop.

---

## 12. Known Quirks

1. **quantity_sold counter**: NOT atomic (read-then-write). Race conditions possible without optimistic locking fix.
2. **items_paid_for.sale_ids**: Arrays of IDs — sequential distribution can cause drift.
3. **Custom date picker**: `new Date('YYYY-MM-DD')` parses as UTC midnight — fixed with `setDate(getDate()+1)`.
4. **staff_sales vs receipts gap**: ₦3.69M gap exists between till records and staff records (old orphaned receipts). Fixed going forward with checkout reorder.
5. **Override credentials**: `.env.local` has staff passwords for testing. NOT for production.

---

## 13. Contact & Resources

- **Repo**: https://github.com/LuckyGoldx/abifresh (production)
- **Test Repo**: https://github.com/LuckyGoldx/abifresh-test
- **Vercel**: luckygoldprojects/abifresh (production), abifresh-test (test)
- **Supabase**: cifzlkspxjghpgxhrwkg (production), wkyakaunbejmuzqnvgno (test)
