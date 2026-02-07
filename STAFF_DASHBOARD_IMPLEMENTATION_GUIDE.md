# Staff Dashboard Complete Implementation Guide

## Overview
Complete Staff Dashboard system for non-commission staff, allowing them to receive posted items from sales personnel, manage payments, track expenses, and receive notifications.

---

## 🎯 Features Implemented

### **For Staff (Non-Commission/Commission)**

#### 1. **Dashboard** (`/staff/dashboard`)
- Total sales amount and items sold
- Posted items received (accepted count)
- Pending items awaiting acceptance
- Pending payments awaiting admin approval
- Approved payment total
- Total expenses tracked
- Unread notifications count
- Quick action cards for all features

#### 2. **Posted Items Management** (`/staff/posted-items`)
- View all items posted by sales personnel
- Accept/Reject items with optional comments
- See who posted the items
- Track posting dates
- Filter by status (pending, accepted, rejected)
- Comments visible to admin and sales person

#### 3. **Payment Management** (`/staff/payments`)
- View total sales amount (read-only, cannot be altered)
- Select specific sales/items to pay for
- Upload payment details:
  - Amount
  - Payment method (Cash/Online Transfer)
  - Reference number (for online)
  - Optional notes
- Submit payment for admin approval
- Track payment history with status
- View approved and rejected payments

#### 4. **Expense Tracking** (`/staff/expenses`)
- Add expenses with:
  - Date (auto-captured)
  - Amount
  - Category (Transport, Supplies, Food, etc.)
  - Description
- View expense history
- Total expenses summary
- Breakdown by category

#### 5. **Notifications** (`/staff/notifications`)
- Payment approval/rejection notifications
- Posted item acceptance confirmations
- Unread notification count

### **For Sales Personnel**

#### Post Items to Staff
- Sales can post items to commission/non-commission staff
- Staff receives notification
- Track posted item status

### **For Admin**

#### 1. **Posted Items View** (`/admin/posted-items` endpoint)
- View all posted items across all staff
- See who posted, who received
- View status (pending, accepted, rejected)
- See staff comments when accepting/rejecting

#### 2. **Staff Payment Management** (`/admin/staff-payments` endpoint)
- View all payment requests from staff
- Filter by status (pending, approved, rejected)
- See payment details:
  - Staff name and role
  - Amount requested
  - Items being paid for
  - Payment method and reference
- Approve payments:
  - Can modify approved amount
  - Add notes
  - Staff receives notification
- Reject payments:
  - Provide rejection reason
  - Staff receives notification

#### 3. **Dashboard Metrics**
- Track staff payments
- Monitor posted items
- View staff expenses

---

## 📊 Database Schema Updates

### SQL Script: `STAFF_DASHBOARD_SCHEMA_UPDATE.sql`

Run this SQL in your Supabase SQL Editor to add required columns:

```sql
-- Add comment field to posted_items
ALTER TABLE IF EXISTS posted_items 
ADD COLUMN IF NOT EXISTS staff_comment TEXT;

-- Add fields to staff_payments for new functionality
ALTER TABLE IF EXISTS staff_payments 
ADD COLUMN IF NOT EXISTS items_paid_for JSONB,
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS reference_number TEXT,
ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(12,2);

-- Add expense_date to expenses table
ALTER TABLE IF EXISTS expenses 
ADD COLUMN IF NOT EXISTS expense_date DATE DEFAULT CURRENT_DATE;

-- Add notification_type to notifications
ALTER TABLE IF EXISTS notifications 
ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50);

-- Create necessary indexes
CREATE INDEX IF NOT EXISTS idx_posted_items_posted_to_status 
ON posted_items(posted_to_id, status);

CREATE INDEX IF NOT EXISTS idx_staff_payments_staff_status 
ON staff_payments(staff_id, status);

CREATE INDEX IF NOT EXISTS idx_expenses_staff_date 
ON expenses(staff_id, created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, is_read);
```

---

## 🔌 API Endpoints

### Staff Endpoints (`/api/staff`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/posted-items` | Get all posted items for logged-in staff |
| POST | `/posted-items/:id/accept` | Accept posted item (with optional comment) |
| POST | `/posted-items/:id/reject` | Reject posted item (with optional comment) |
| GET | `/my-sales` | Get staff's own sales for payment selection |
| GET | `/payments` | Get all payment requests |
| POST | `/payments/request` | Submit new payment request |
| GET | `/expenses` | Get all expenses |
| POST | `/expenses/create` | Create new expense |
| GET | `/dashboard` | Get dashboard metrics |
| GET | `/notifications` | Get notifications |
| POST | `/notifications/:id/read` | Mark notification as read |

### Admin Endpoints (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/posted-items` | View all posted items to staff |
| GET | `/staff-payments` | Get all staff payment requests |
| GET | `/staff-payments?status=pending` | Filter payments by status |
| POST | `/staff-payments/:id/approve` | Approve payment request |
| POST | `/staff-payments/:id/reject` | Reject payment request |
| GET | `/expenses` | View all staff expenses |

---

## 🚀 Testing Guide

### Step 1: Run Database Updates
1. Go to Supabase Dashboard → SQL Editor
2. Run `STAFF_DASHBOARD_SCHEMA_UPDATE.sql`
3. Verify all columns and indexes created successfully

### Step 2: Rebuild Backend
```bash
cd backend
npm run build
npm start
```

### Step 3: Rebuild Frontend
```bash
cd frontend
npm run build
npm run dev
```

### Step 4: Test Staff Login
1. Login as non-commission staff: `staff@abifresh.com` / `Staff@123456`
2. You should see the new Staff Dashboard with:
   - Stat cards showing metrics
   - Alert cards for pending items/payments
   - Quick action cards

### Step 5: Test Posted Items Flow

**As Sales User:**
1. Login as sales: `sales@abifresh.com` / `Sales@123456`
2. Go to Sales → Post Items
3. Select a staff member
4. Add items and post

**As Staff User:**
1. Login as staff
2. Go to Posted Items
3. You should see the posted item with "Pending" status
4. Click "Accept" button
5. Add optional comment (e.g., "Items received in good condition")
6. Submit

**Verify:**
- Item status changes to "Accepted"
- Comment is saved
- Sales person receives notification (if notifications enabled)

### Step 6: Test Payment System

**As Staff User:**
1. Make some sales first (or have sales data)
2. Go to Payments tab
3. Click "New Payment"
4. Select items you're paying for (optional)
5. Enter payment amount
6. Select payment method (Cash/Online)
7. Add reference number (for online)
8. Submit

**As Admin:**
1. Login as admin: `admin@abifresh.com` / `Admin@123456`
2. Use GET `/api/admin/staff-payments?status=pending` to see pending payments
3. Approve or reject payment
4. Staff should receive notification

### Step 7: Test Expenses

**As Staff User:**
1. Go to Expenses tab
2. Enter amount, category, description
3. Submit
4. Verify it appears in expense history
5. Check total updates

**As Admin:**
1. Use GET `/api/admin/expenses` to view all staff expenses
2. Filter by staff_id if needed

---

## 🎨 Frontend Pages Updated

### 1. **Staff Dashboard** - `frontend/app/staff/dashboard/page.tsx`
- Shows comprehensive metrics
- Alert system for pending actions
- Quick navigation cards

### 2. **Posted Items** - `frontend/app/staff/posted-items/page.tsx`
- Table view with accept/reject actions
- Modal for adding comments
- Status badges and filters

### 3. **Payments** - `frontend/app/staff/payments/page.tsx`
- Payment form with item selection
- Sales data integration
- Payment history with status tracking

### 4. **Expenses** - `frontend/app/staff/expenses/page.tsx`
- Expense form with categories
- History table
- Total and category summaries

---

## 🔑 Key Features

### Staff Can ONLY:
✅ View items posted to them by sales
✅ Accept/reject with comments
✅ Sell ONLY items they've accepted
✅ Submit payment requests (not direct payments)
✅ Track their own expenses
✅ Receive notifications

### Staff CANNOT:
❌ Post items to other staff (sales only)
❌ Approve their own payments
❌ Alter sales totals
❌ Delete items or sales

### Admin Can:
✅ View all posted items
✅ View all staff payments
✅ Approve/reject payments with notifications
✅ View all staff expenses
✅ Monitor all staff activities

---

## 📝 Notification System

### Payment Notifications
- **Staff Request Submitted** → Admin notified
- **Admin Approves** → Staff notified with approved amount
- **Admin Rejects** → Staff notified with reason

### Posted Items Notifications
- **Staff Accepts** → Sales person notified with comment
- **Staff Rejects** → Sales person notified with comment

---

## 🐛 Troubleshooting

### Posted Items Not Showing
- Check staff_id matches logged-in user
- Verify posted_to_id column has correct UUID
- Check RLS policies on posted_items table

### Payments Not Submitting
- Verify amount is a valid number
- Check payment_method is 'cash' or 'online'
- Ensure staff_payments table exists with all columns

### Expenses Not Saving
- Check expenses table has all required columns
- Verify staff_id is set correctly
- Check expense_type matches category

### Notifications Not Working
- Verify notifications table exists
- Check notification_type column added
- Verify user_id matches recipient

---

## 🎯 Next Steps

1. **Test Complete Flow**: Walk through all user types
2. **Verify Notifications**: Ensure all notifications send correctly
3. **Check Admin Views**: Verify admin can see all staff operations
4. **Mobile Testing**: Test on mobile devices
5. **Performance**: Monitor for any slow queries

---

## ✅ Completion Checklist

- [x] Database schema updated
- [x] Backend API endpoints created
- [x] Staff Dashboard UI implemented
- [x] Posted Items page with acceptance
- [x] Payment system with item selection
- [x] Expense tracking system
- [x] Admin endpoints for oversight
- [x] Notification system integrated
- [x] Testing guide provided

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check backend logs for API errors
3. Verify database schema is updated
4. Check user role is correct
5. Verify RLS policies allow access

All functionality has been implemented and is ready for testing!
