# Commission Tracking System - Visual Architecture

## 🏗️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ADMIN USER INTERFACE                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Login as Admin
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         ADMIN SIDEBAR MENU                          │
│  📊 Dashboard  👥 Staff  🏪 Stores  💳 Payments  💵 COMMISSIONS    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Click Commissions
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     COMMISSION OVERVIEW PAGE                        │
│  /admin/commissions                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  Summary Cards                                              │   │
│  │  💰 Total Generated  ✅ Total Paid  ⏳ Pending  👥 Staff   │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  TABS:  📊 Overview | 💳 Payments | 📈 Analytics          │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  📊 OVERVIEW TAB                                                    │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │ Staff  | Items | Sales | Generated | Paid | Pending     │      │
│  ├─────────────────────────────────────────────────────────┤      │
│  │ John   | 150   | ₦50k  | ₦5,000   | ₦3k  | ₦2k [Pay]   │      │
│  │ Mary   | 200   | ₦75k  | ₦7,500   | ₦5k  | ₦2.5k [Pay] │      │
│  │        │       │       │          │      │ [Details] → │      │
│  └─────────────────────────────────────────────────────────┘      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    Click "Details" Button
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   STAFF COMMISSION DETAIL PAGE                      │
│  /admin/commissions/[staffId]                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ← Back to Commissions                Staff: John Doe              │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  💰 Commission: ₦5,000  💵 Sales: ₦50k  📦 Items: 150     │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  🗓️ Date Filters: [Start Date] [End Date] [Clear]                 │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  TABS:  📄 Receipts (25) | 📦 Items (15)                   │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  📄 RECEIPTS VIEW:                                                  │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Receipt: RCP-001  | Date: Jan 15 | Total: ₦2,500          │  │
│  │ Commission: ₦250                                            │  │
│  │  ├─ Rice (50kg)     x5  = ₦1,500  [Comm: ₦150]            │  │
│  │  └─ Beans (25kg)    x10 = ₦1,000  [Comm: ₦100]            │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  📦 ITEMS VIEW:                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Item      | Category | Qty | Sales  | Comm/Unit | Total    │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │ Rice 50kg | Grains   | 50  | ₦15k   | ₦30       | ₦1,500   │  │
│  │ Beans     | Legumes  | 100 | ₦10k   | ₦10       | ₦1,000   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React/Next.js)                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │  Commission Page │ ───> │  Staff Detail    │                │
│  │  (Overview)      │      │  Page            │                │
│  └────────┬─────────┘      └──────────────────┘                │
│           │                                                      │
│           │ Axios HTTP Requests                                 │
│           │ (JWT Token Auth)                                    │
│           ▼                                                      │
└──────────────────────────────────────────────────────────────────┘
            │
            │ API Calls
            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    BACKEND API (Express.js)                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              admin.routes.ts                              │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  GET  /api/admin/commissions/overview                    │  │
│  │  GET  /api/admin/commissions/staff/:staffId              │  │
│  │  GET  /api/admin/commissions/payments                     │  │
│  │  POST /api/admin/commissions/pay                         │  │
│  │  GET  /api/admin/commissions/analytics                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                                                      │
│           │ Supabase Client Queries                              │
│           ▼                                                      │
└──────────────────────────────────────────────────────────────────┘
            │
            │ SQL Queries
            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    DATABASE (Supabase PostgreSQL)                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐   ┌──────────────┐   ┌─────────────────┐   │
│  │  users        │   │  receipts    │   │  receipt_items  │   │
│  ├───────────────┤   ├──────────────┤   ├─────────────────┤   │
│  │ id            │   │ id           │   │ id              │   │
│  │ full_name     │   │ staff_id  ───┼──>│ receipt_id      │   │
│  │ email         │   │ total_amount │   │ item_id      ───┼┐  │
│  │ role          │   │ created_at   │   │ quantity        ││  │
│  └───────────────┘   └──────────────┘   │ unit_price      ││  │
│                                          │ total_price     ││  │
│  ┌───────────────┐   ┌──────────────────┴────────────────┐││  │
│  │ items         │<──┤                                     ││  │
│  ├───────────────┤   │                                     ││  │
│  │ id            │<──┘                                     ││  │
│  │ name          │                                          │  │
│  │ commission    │ ← Commission per unit value             │  │
│  │ category      │                                          │  │
│  └───────────────┘                                          │  │
│                                                              │  │
│  ┌───────────────────────────────────────────────────────┐  │  │
│  │  staff_payments                                        │  │  │
│  ├───────────────────────────────────────────────────────┤  │  │
│  │ id                                                     │  │  │
│  │ staff_id                                               │  │  │
│  │ amount                                                 │  │  │
│  │ payment_type = 'commission'                           │  │  │
│  │ status (pending/approved/paid)                        │  │  │
│  └───────────────────────────────────────────────────────┘  │  │
│                                                              │  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🧮 Commission Calculation Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    COMMISSION CALCULATION                      │
└────────────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │  Step 1: Get Staff Receipts         │
        │  SELECT * FROM receipts             │
        │  WHERE staff_id = :staff_id         │
        └──────────────┬──────────────────────┘
                       │
                       ▼
        ┌─────────────────────────────────────┐
        │  Step 2: Get Receipt Items          │
        │  SELECT * FROM receipt_items        │
        │  WHERE receipt_id IN (...)          │
        └──────────────┬──────────────────────┘
                       │
                       ▼
        ┌─────────────────────────────────────┐
        │  Step 3: Get Item Commission        │
        │  SELECT id, commission FROM items   │
        │  WHERE id IN (...)                  │
        └──────────────┬──────────────────────┘
                       │
                       ▼
        ┌─────────────────────────────────────┐
        │  Step 4: Calculate                  │
        │  For each receipt_item:             │
        │    commission += (item.commission   │
        │                  × item.quantity)   │
        └──────────────┬──────────────────────┘
                       │
                       ▼
        ┌─────────────────────────────────────┐
        │  Step 5: Return Result              │
        │  {                                  │
        │    total_commission: ₦5,000        │
        │    total_sales: ₦50,000            │
        │    items_sold: 150                 │
        │  }                                  │
        └─────────────────────────────────────┘
```

**Example Calculation:**

```
Receipt #1:
├─ Item A (commission: ₦50) × 10 qty = ₦500
└─ Item B (commission: ₦30) × 5 qty  = ₦150
   Receipt Total Commission: ₦650

Receipt #2:
├─ Item C (commission: ₦100) × 3 qty = ₦300
└─ Item A (commission: ₦50) × 8 qty  = ₦400
   Receipt Total Commission: ₦700

Total Commission = ₦650 + ₦700 = ₦1,350
```

---

## 🎯 User Journey Map

```
┌──────────────────────────────────────────────────────────────┐
│                      ADMIN USER JOURNEY                      │
└──────────────────────────────────────────────────────────────┘

Journey 1: View Commission Overview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Login → Dashboard
2. Click "Commissions" in sidebar
3. See overview cards (Generated, Paid, Pending)
4. Browse staff table
5. Identify staff with pending commission

Journey 2: Pay Commission
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. From Overview tab
2. Find staff row
3. Click "Pay" button
4. Review auto-filled amount
5. Add notes (optional)
6. Click "Pay Commission"
7. Success! Payment created

Journey 3: Analyze Performance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Click "Analytics" tab
2. Select time period (7/30/90/365 days)
3. Review top performers
4. Check items with highest commission
5. Analyze trends chart
6. Make strategic decisions

Journey 4: Deep Dive into Staff Details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. From Overview tab
2. Click "Details" for a staff member
3. See summary cards
4. Apply date filters (optional)
5. Switch between Receipts/Items view
6. Analyze granular data
7. Return to overview

Journey 5: Export Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. From Overview tab
2. Click "Export CSV" button
3. CSV downloads instantly
4. Open in Excel/Google Sheets
5. Use for external reporting
```

---

## 📊 Component Hierarchy

```
CommissionsPage
├── Header
│   ├── Title & Description
│   └── Action Buttons
│       ├── Export CSV Button
│       └── Refresh Button
│
├── Summary Cards
│   ├── Total Generated Card
│   ├── Total Paid Card
│   ├── Pending Card
│   └── Staff Count Card
│
├── Tab Navigation
│   ├── Overview Tab
│   ├── Payments Tab
│   └── Analytics Tab
│
├── Tab Content
│   │
│   ├─── Overview Tab Content
│   │    └── Staff Table
│   │        ├── Staff Info Column
│   │        ├── Metrics Columns
│   │        └── Actions Column
│   │            ├── Details Button → StaffDetailPage
│   │            └── Pay Button → PaymentModal
│   │
│   ├─── Payments Tab Content
│   │    └── Payments Table
│   │        ├── Date Column
│   │        ├── Staff Column
│   │        ├── Amount Column
│   │        ├── Status Badge
│   │        └── Notes Column
│   │
│   └─── Analytics Tab Content
│        ├── Period Selector
│        ├── Top Performers Table
│        ├── Top Items Table
│        └── Trends Chart
│
└── Payment Modal (conditional)
    ├── Staff Info
    ├── Pending Amount Display
    ├── Amount Input
    ├── Notes Textarea
    └── Action Buttons
        ├── Pay Button
        └── Cancel Button


StaffDetailPage
├── Header
│   ├── Back Button
│   ├── Staff Name & Email
│   └── Refresh Button
│
├── Date Filters
│   ├── Start Date Input
│   ├── End Date Input
│   └── Clear Button
│
├── Summary Cards
│   ├── Total Commission
│   ├── Total Sales
│   └── Items Sold
│
├── Tab Navigation
│   ├── Receipts Tab
│   └── Items Tab
│
└── Tab Content
    │
    ├─── Receipts Tab
    │    └── Receipt Cards (forEach)
    │        ├── Receipt Header
    │        │   ├── Number & Date
    │        │   └── Total & Commission
    │        └── Items Table
    │            └── Item Rows
    │
    └─── Items Tab
         └── Items Table
             ├── Item Rows
             └── Total Footer Row
```

---

## 🔐 Security Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                       │
└──────────────────────────────────────────────────────────────┘

Frontend Request
      ↓
┌──────────────────────┐
│  Authorization       │
│  Header: Bearer {JWT}│
└──────────────────────┘
      ↓
Backend Middleware
      ↓
┌──────────────────────┐
│  authMiddleware()    │
│  Verify JWT Token    │
│  Extract User Data   │
└──────────────────────┘
      ↓
┌──────────────────────┐
│  roleMiddleware()    │
│  Check role='admin'  │
│  Allow/Deny Access   │
└──────────────────────┘
      ↓
Route Handler Executes
      ↓
Response Returns to Frontend
```

---

## 💾 Data Storage Schema

```
TABLE: users
┌──────────────┬──────────────┬─────────────────┐
│ Column       │ Type         │ Purpose         │
├──────────────┼──────────────┼─────────────────┤
│ id           │ UUID         │ Primary Key     │
│ full_name    │ VARCHAR      │ Display Name    │
│ email        │ VARCHAR      │ Contact         │
│ role         │ VARCHAR      │ Filter by type  │
└──────────────┴──────────────┴─────────────────┘

TABLE: receipts
┌──────────────┬──────────────┬─────────────────┐
│ Column       │ Type         │ Purpose         │
├──────────────┼──────────────┼─────────────────┤
│ id           │ UUID         │ Primary Key     │
│ staff_id     │ UUID         │ Foreign Key     │
│ total_amount │ DECIMAL      │ Receipt Total   │
│ created_at   │ TIMESTAMP    │ Date Filter     │
└──────────────┴──────────────┴─────────────────┘

TABLE: receipt_items
┌──────────────┬──────────────┬─────────────────┐
│ Column       │ Type         │ Purpose         │
├──────────────┼──────────────┼─────────────────┤
│ id           │ UUID         │ Primary Key     │
│ receipt_id   │ UUID         │ Foreign Key     │
│ item_id      │ UUID         │ Foreign Key     │
│ quantity     │ INTEGER      │ Qty Sold        │
│ unit_price   │ DECIMAL      │ Price per Unit  │
│ total_price  │ DECIMAL      │ Line Total      │
└──────────────┴──────────────┴─────────────────┘

TABLE: items
┌──────────────┬──────────────┬─────────────────┐
│ Column       │ Type         │ Purpose         │
├──────────────┼──────────────┼─────────────────┤
│ id           │ UUID         │ Primary Key     │
│ name         │ VARCHAR      │ Display Name    │
│ commission   │ DECIMAL      │ ₦ per unit      │
│ category     │ VARCHAR      │ Grouping        │
└──────────────┴──────────────┴─────────────────┘

TABLE: staff_payments
┌──────────────┬──────────────┬─────────────────┐
│ Column       │ Type         │ Purpose         │
├──────────────┼──────────────┼─────────────────┤
│ id           │ UUID         │ Primary Key     │
│ staff_id     │ UUID         │ Foreign Key     │
│ amount       │ DECIMAL      │ Payment Amount  │
│ payment_type │ VARCHAR      │ 'commission'    │
│ status       │ VARCHAR      │ Payment State   │
│ notes        │ TEXT         │ Description     │
└──────────────┴──────────────┴─────────────────┘
```

---

**System Status:** ✅ Fully Operational  
**Last Updated:** February 12, 2026  
**Version:** 1.0
