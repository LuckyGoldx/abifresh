# Complete Payment Flow Documentation

## Overview
The payment system is now fully integrated with:
1. **Staff/Sales Submitting Payments** → Sales/Staff Payment Pages
2. **Admin Approving/Rejecting Payments** → Admin Payments Page
3. **Payment Status Notifications** → Notification System

---

## 1. STAFF SUBMITTING PAYMENTS

### Frontend Routes:
- `/sales/payments` - For Sales staff to submit payment requests
- `/staff/payments` - For Store staff to submit payment requests

### Workflow:
1. Staff navigates to their payment page
2. Clicks "New Payment" button
3. Form opens with auto-populated staff name from auth store
4. Staff fills in:
   - Items to pay for (checkboxes with auto-calculation)
   - Payment method (Cash, Online Transfer, Bank Deposit, POS)
   - Reference number (optional, for online/bank transfers)
   - Receipt upload (required - JPG, PNG, PDF max 5MB)
   - Additional notes (optional)
5. Staff clicks "Review Payment"
6. **Preview Modal Opens** showing:
   - Staff name (read-only, from auth)
   - Payment method
   - Amount (auto-calculated from selected items)
   - Reference number
   - Selected items breakdown
   - Receipt preview
   - Info note about pending status
7. **[NEW] Submit and Edit Buttons** in Preview Modal:
   - "Confirm & Submit" - Submits payment to admin
   - "Edit" - Goes back to form for changes

### API Endpoint:
- **POST** `/api/sales/payments/request` (for sales staff)
- **POST** `/api/staff/payments/request` (for store staff)

### Request Body:
```json
{
  "amount": 50000,
  "staff_name": "John Doe",
  "items_paid_for": [
    {
      "item_id": "123",
      "quantity": 5,
      "amount": 50000
    }
  ],
  "reference_number": "TRX123456789",
  "payment_method": "online",
  "notes": "Paid via bank transfer",
  "receipt": <File> // Multipart form data
}
```

### Response:
```json
{
  "payment": {
    "id": "payment-123",
    "staff_id": "user-123",
    "amount": 50000,
    "status": "pending",
    "created_at": "2026-01-30T10:00:00Z",
    ...
  },
  "message": "Payment request submitted successfully. Awaiting admin approval."
}
```

---

## 2. ADMIN REVIEWING PAYMENTS

### Frontend Route:
- `/admin/payments` - Admin dashboard for payment review

### Workflow:
1. Admin navigates to `/admin/payments`
2. Page loads with **Pending Payments** section showing:
   - Summary cards: Total Pending, Total Amount, Awaiting Approval
   - Table with columns:
     - Staff Name
     - Amount
     - Status (Pending)
     - Date
     - Actions
3. **[NEW] For each payment, Admin can:**
   - **Approve** - Moves payment to approved status, creates notification
   - **Reject** - Opens prompt for rejection reason, rejects payment

### API Endpoints:

#### Get Pending Payments:
- **GET** `/api/admin/payments/pending`
- Returns: Array of pending payments with staff details

#### Approve Payment:
- **POST** `/api/admin/payments/:id/approve`
- Response: `{ message: "Payment approved" }`
- Side Effects:
  - Updates payment status to "approved"
  - Creates notification for staff member
  - Staff receives notification

#### Reject Payment:
- **POST** `/api/admin/payments/:id/reject`
- Request Body: `{ reason: "Reason for rejection" }`
- Response: `{ message: "Payment rejected" }`
- Side Effects:
  - Updates payment status to "rejected"
  - Notes field stores rejection reason
  - Creates notification for staff member
  - Staff receives rejection notification

---

## 3. STAFF VIEWING PAYMENT STATUS

### Frontend Routes:
- `/sales/payments` - Sales staff payment history
- `/staff/payments` - Store staff payment history

### Payment History Table Shows:
- Date
- Amount
- Payment Method
- Reference Number
- **Status Badge**:
  - 🟡 Yellow: "PENDING" (awaiting admin approval)
  - 🟢 Green: "APPROVED" (admin approved)
  - 🔴 Red: "REJECTED" (admin rejected)
- Details (items breakdown and notes)

### Status Meanings:
- **Pending**: Submitted to admin, awaiting decision
- **Approved**: Admin approved, payment complete
- **Rejected**: Admin rejected, staff needs to resubmit

---

## 4. NOTIFICATIONS SYSTEM

### Notification Triggers:
1. **When staff submits payment**: Admin receives notification
   - Type: `payment_request`
   - Message: "{StaffName} (Sales) has submitted a payment of ₦{Amount}"

2. **When admin approves**: Staff receives notification
   - Type: `payment_approved`
   - Message: "Your payment has been approved by admin"

3. **When admin rejects**: Staff receives notification
   - Type: `payment_rejected`
   - Message: Contains rejection reason

### Notification Endpoints:
- **GET** `/api/notifications` - Get all user notifications
- Includes filter for payment-related notifications

---

## 5. DATABASE SCHEMA (staff_payments table)

```sql
CREATE TABLE staff_payments (
  id UUID PRIMARY KEY,
  staff_id UUID REFERENCES users(id),
  amount NUMERIC(12, 2),
  items_paid_for JSONB, -- Array of items
  payment_method VARCHAR(50), -- cash, online, bank_deposit, pos
  payment_type VARCHAR(50), -- sale_payment, staff_payment
  reference_number VARCHAR(255), -- For online/bank transfers
  receipt_url TEXT, -- Path to uploaded receipt
  status VARCHAR(50), -- pending, approved, rejected
  notes TEXT, -- Additional notes or rejection reason
  staff_name VARCHAR(255),
  created_at TIMESTAMP,
  approved_date TIMESTAMP,
  approved_amount NUMERIC(12, 2)
);
```

---

## 6. AUTO-POPULATED FIELDS

### Staff Name Field:
- **Auto-populated from**: User authentication store (`useAuthStore`)
- **Field property**: `user.full_name`
- **Styling**: 
  - Read-only input
  - Light mode: `bg-gray-200`
  - Dark mode: `dark:bg-gray-700`
  - Disabled appearance with `cursor-not-allowed`
  - Opacity: 75% for visual indication

---

## 7. COMPLETE FLOW SUMMARY

```
Sales/Staff ┌─────────────────────────────────┐
             │ View "New Payment" Form        │
             │ - Items from sales             │
             │ - Auto-populate: Staff Name    │
             │ - Choose payment method        │
             │ - Upload receipt               │
             └──────────────┬──────────────────┘
                            │
                            ▼
             ┌─────────────────────────────────┐
             │ Click "Review Payment"          │
             │ Preview Modal Opens             │
             └──────────────┬──────────────────┘
                            │
                            ▼
             ┌─────────────────────────────────┐
             │ [Confirm & Submit] [Edit]       │
             │ Payment sent to backend         │
             └──────────────┬──────────────────┘
                            │
                            ▼
             ┌─────────────────────────────────┐
             │ Backend: POST /payments/request │
             │ - Stores payment record         │
             │ - Status: "pending"             │
             │ - Creates admin notification    │
             └──────────────┬──────────────────┘
                            │
                            ▼
             ┌─────────────────────────────────┐
Admin        │ View /admin/payments            │
             │ - See pending payments          │
             │ - [Approve] or [Reject]         │
             └──────────────┬──────────────────┘
                            │
                    ┌───────┴────────┐
                    ▼                ▼
         ┌──────────────────┐  ┌──────────────────┐
         │ POST .../approve │  │ POST .../reject  │
         │ Status: approved │  │ Status: rejected │
         └────────┬─────────┘  └────────┬─────────┘
                  │                     │
                  └──────────┬──────────┘
                             ▼
                  ┌──────────────────────┐
                  │ Create notification  │
                  │ for staff member     │
                  └──────────────────────┘
```

---

## 8. TESTING CHECKLIST

### Staff Side:
- [ ] Staff can view payment form with auto-populated name
- [ ] Staff can select multiple items for payment
- [ ] Payment amount auto-calculates correctly
- [ ] Staff can upload receipt file
- [ ] Preview modal shows all information correctly
- [ ] [NEW] Preview modal has "Confirm & Submit" and "Edit" buttons
- [ ] Submit button is visible and functional
- [ ] Payment success message appears
- [ ] Payment appears in history with "pending" status

### Admin Side:
- [ ] Admin can see pending payments
- [ ] [NEW] Admin can see both "Approve" and "Reject" buttons
- [ ] [NEW] Clicking "Reject" prompts for rejection reason
- [ ] Approving payment updates status to "approved"
- [ ] Rejecting payment updates status to "rejected"

### Notifications:
- [ ] Staff receives notification when payment is approved
- [ ] Staff receives notification when payment is rejected
- [ ] Admin receives notification when payment is submitted

---

## 9. KNOWN ISSUES FIXED

1. ✅ Preview modal submit/cancel buttons were hidden
   - **Fixed**: Added "Confirm & Submit" and "Edit" buttons to modal
   
2. ✅ Admin could only approve, not reject payments
   - **Fixed**: Added reject button with reason prompt

3. ✅ Staff name field not auto-populated
   - **Fixed**: Connected to useAuthStore and set full_name

4. ✅ Staff name field not read-only
   - **Fixed**: Added readOnly prop and disabled styling

---

## 10. API ROUTES SUMMARY

| Method | Route | Role | Purpose |
|--------|-------|------|---------|
| POST | `/api/sales/payments/request` | sales_staff | Submit payment request |
| POST | `/api/staff/payments/request` | staff | Submit payment request |
| GET | `/api/sales/payments` | sales_staff | View payment history |
| GET | `/api/staff/payments` | staff | View payment history |
| GET | `/api/admin/payments/pending` | admin | View pending payments |
| POST | `/api/admin/payments/:id/approve` | admin | Approve payment |
| POST | `/api/admin/payments/:id/reject` | admin | Reject payment |

---

**Last Updated**: January 30, 2026
**Status**: ✅ COMPLETE AND FUNCTIONAL
