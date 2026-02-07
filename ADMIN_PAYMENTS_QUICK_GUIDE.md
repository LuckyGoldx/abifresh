# Admin Payments - Quick Reference Guide

## Key Features at a Glance

### Dashboard Statistics (Top of Page)
```
┌─────────────────────────────────────────────────────┐
│ Pending Payments  │ Approved Payments │ Rejected │ Total │
│      12           │        45        │   3     │  60K  │
│    ₦285,000       │    ₦1,200,000   │         │ ₦1.5M │
└─────────────────────────────────────────────────────┘
```

### Payment Table Columns
| Staff Info | Amount | Type | Status | Date | Action |
|---|---|---|---|---|---|
| Name, Email, Role | ₦Amount | Badge | 🟡/✅/❌ | Full DateTime | Buttons |

### Action Buttons
- **View Details** (👁️ icon): Opens modal with payment details
- **Approve** (✅ icon): Approves pending payment
- **Reject** (❌ icon): Rejects with reason prompt

## Common Tasks

### 1. Find a Specific Payment
1. Use **Search** field at top to search by staff name or email
2. Or use **Status Filter** to narrow down
3. Or use **Date Range** to filter by period

### 2. Approve a Payment
1. Find the payment in the table
2. Click **Approve** button (green)
3. Confirmation message appears
4. Table refreshes automatically

### 3. Reject a Payment
1. Find the payment in the table
2. Click **Reject** button (red)
3. Enter reason for rejection in prompt
4. Click OK
5. Payment status changes to "rejected"

### 4. View Full Payment Details
1. Find the payment in the table
2. Click **View** button (eye icon)
3. Modal opens showing:
   - Staff name, email, role
   - Full amount and type
   - Complete notes/metadata
   - Timestamps
   - Approve/Reject options (if pending)

### 5. Sort Payments
1. Click **Sort dropdown** (currently showing "Date")
2. Choose: Date, Amount, or Staff Name
3. Click **↑/↓ button** to toggle ascending/descending

### 6. Filter by Payment Type
1. Use **Filter by Type dropdown**
2. Choose: Commission, Salary, Bonus, Advance, or Other
3. Table updates automatically

## Payment Status Flow
```
PENDING → (Admin Reviews)
    ├─ APPROVE → APPROVED
    └─ REJECT → REJECTED
```

## Table Column Meanings
- **Staff Information**: Who made the payment request
- **Amount**: Payment value in Nigerian Naira (₦)
- **Type**: Category of payment (salary, commission, etc.)
- **Status**: Current state (pending for review, approved, or rejected)
- **Date**: When the payment was originally requested (with time)
- **Action**: Quick buttons to manage the payment

## Statistics Dashboard

### Pending Payments (Yellow border)
- Count of payments waiting for admin approval
- Total amount pending review

### Approved Payments (Green border)
- Count of payments approved by admin
- Total amount approved

### Rejected Payments (Red border)
- Count of payments rejected by admin

### Total Amount (Blue border)
- Sum of ALL payments in system

## Filters & Search Bar

### Search Field
- Type staff name, email, or payment ID
- Searches in real-time
- Shows matching results

### Status Filter
- **All**: Show all statuses
- **Pending**: Only waiting for approval
- **Approved**: Only approved payments
- **Rejected**: Only rejected payments
- **Paid**: Only marked as paid

### Payment Type Filter
- **All Types**: Show all types
- **Commission**: Commission payments
- **Salary**: Salary payments
- **Bonus**: Bonus payments
- **Advance**: Advance payments
- **Other**: Other payment types

### Date Range
- **From Date**: Start of date range
- **To Date**: End of date range
- Filters table to show only payments in range

### Sort Options
- **Date**: Newest/Oldest first
- **Amount**: Highest/Lowest first
- **Staff Name**: A-Z or Z-A

## Tips & Tricks

1. **Refresh Data**: Click "Refresh" button to fetch latest payments
2. **Dark Mode**: Page respects system dark/light mode
3. **Responsive**: Works on mobile, tablet, and desktop
4. **Filter Combination**: Use multiple filters together for precise results
5. **View Before Action**: Click View to see details before approve/reject
6. **Bulk Review**: Sort by date to review newest payments first
7. **Amount Review**: Sort by amount to see largest payments first

## Common Issues

### No Payments Showing
- ✅ Check Status Filter (might be filtering out all payments)
- ✅ Check Date Range (might be outside range)
- ✅ Click "Refresh" button
- ✅ Check if payments actually exist in system

### Can't Approve/Reject
- ✅ Payment must have "pending" status
- ✅ You must be logged in as admin
- ✅ Check browser console for errors

### Search Not Working
- ✅ Make sure exact staff name or email is entered
- ✅ It's case-insensitive, so "Sales" or "sales" works
- ✅ Try searching by email instead

## Data Displayed in Payment Details Modal

| Field | What It Means |
|-------|---|
| Staff Name | Full name of person requesting payment |
| Email | Staff member's email address |
| Amount | Payment value in ₦ |
| Status | Current state (pending/approved/rejected) |
| Payment Type | Category (salary, commission, bonus, etc) |
| Notes/Details | Additional information about payment |
| Requested Date | When payment was originally requested |
| Created Date | When record was created in system |

## Backend API Endpoints (for developers)

```
GET  /api/admin/payments/pending  - Get pending payments only
GET  /api/admin/payments/all       - Get all payments
POST /api/admin/payments/:id/approve  - Approve payment
POST /api/admin/payments/:id/reject   - Reject payment with reason
```

## Database Table Structure
```sql
staff_payments
├── id (UUID)
├── staff_id (FK to users)
├── amount (Decimal)
├── payment_type (Enum)
├── status (Enum)
├── requested_date
├── notes
├── created_at
└── updated_at
```

## Need Test Data?
Run [TEST_PAYMENT_INSERT.sql](TEST_PAYMENT_INSERT.sql) in Supabase to create sample payments for testing.

---
**Made for**: Admin dashboard payment management
**Updated**: January 30, 2026
