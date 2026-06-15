# Admin Payments - Complete Testing Guide

## 🧪 Testing Overview

This guide walks through testing the entire admin payment system from end-to-end.

**Estimated Time**: 30 minutes
**Prerequisites**: 
- Backend running on port 5000
- Frontend running
- Supabase connection active
- At least one admin account

## Part 1: Setup Test Data

### Option A: Using SQL (Recommended)

1. **Get Staff IDs from Backend Logs**
   ```
   Backend output shows:
   [0] ID: 26d4ee08-e0e4-4c8e-bc75-cb7aa37bef35 | Email: sales@abifresh.com
   [1] ID: 818d3627-cb00-482e-a649-1ced6b2e282e | Email: staff.comm@abifresh.com
   ```

2. **Update TEST_PAYMENT_INSERT.sql**
   - Open `TEST_PAYMENT_INSERT.sql`
   - Replace UUIDs with actual IDs from logs
   - Keep everything else the same

3. **Insert Test Data**
   - Go to Supabase → SQL Editor
   - Paste contents of updated TEST_PAYMENT_INSERT.sql
   - Click "Run"
   - You should see:
     ```
     INSERT 0 3
     SELECT 3
     ```

### Option B: Using Admin UI

*Coming soon: UI tool to create test payments*

## Part 2: Navigate to Admin Payments

1. **Login as Admin**
   - Email: `admin@abifresh.com`
   - Password: (from DEMO_CREDENTIALS.txt)

2. **Navigate to Payments**
   - Click on "Payment Management" in sidebar
   - Or go to: `http://localhost:3000/admin/payments`

3. **Verify Page Loaded**
   - Should see "Payment Management System" header
   - Should see statistics cards
   - Should see filters section
   - Should see empty table initially (if no test data)

## Part 3: Test Data Display

### Test 3.1: View Test Payments
```
Expected:
✅ Statistics dashboard shows:
   - Pending Payments: 3
   - Pending Amount: ₦160,000
   - Total Payments: 3
   
✅ Payment table shows:
   - Row 1: John Sales, ₦50,000, Commission, Pending
   - Row 2: John Sales, ₦35,000, Bonus, Pending
   - Row 3: Staff Comm, ₦75,000, Salary, Pending
```

### Test 3.2: Verify Staff Information
```
Click first row and verify:
✅ Staff Name: Appears correctly
✅ Email: Correct email displayed
✅ Role: Shows staff role
✅ Amount: ₦50,000 formatted correctly
✅ Type: Commission shown
✅ Status: Pending with yellow badge
✅ Notes: Shows "Sales Payment - Method: cash..."
```

## Part 4: Test Filtering

### Test 4.1: Search by Staff Name
```
1. Type "John" in search field
Expected:
✅ Table updates to show only John's payments (2 rows)
✅ Showing "2 of 3 payments" at bottom

2. Type "comm" in search
Expected:
✅ Table shows only Staff Comm (1 row)

3. Clear search
Expected:
✅ All 3 payments shown again
```

### Test 4.2: Search by Email
```
1. Type "sales@" in search
Expected:
✅ Shows John's payments (2 rows)

2. Type "staff.comm@"
Expected:
✅ Shows Staff Comm payment (1 row)
```

### Test 4.3: Filter by Status
```
1. Status Filter: "pending"
Expected:
✅ All 3 payments shown (all are pending)

2. Status Filter: "approved"
Expected:
✅ Empty table (no approved yet)

3. Status Filter: "all"
Expected:
✅ Back to 3 payments
```

### Test 4.4: Filter by Payment Type
```
1. Type Filter: "commission"
Expected:
✅ Shows 1 payment (John's commission)

2. Type Filter: "salary"
Expected:
✅ Shows 1 payment (Staff Comm's salary)

3. Type Filter: "bonus"
Expected:
✅ Shows 1 payment (John's bonus)

4. Type Filter: "all"
Expected:
✅ Back to 3 payments
```

### Test 4.5: Date Range Filter
```
1. Set From: 1/28/2026, To: 1/29/2026
Expected:
✅ Shows older payments (from test data)

2. Set From: (today)
Expected:
✅ Shows all test payments

3. Clear dates
Expected:
✅ All payments shown
```

### Test 4.6: Sorting
```
1. Sort: "Date", Order: "↓ Newest"
Expected:
✅ Most recent payments first

2. Change to "↑ Oldest"
Expected:
✅ Oldest payments first

3. Sort: "Amount", Order: "↓"
Expected:
✅ Highest amounts first:
   - ₦75,000 (first)
   - ₦50,000 (second)
   - ₦35,000 (third)

4. Sort: "Staff Name"
Expected:
✅ Alphabetical by last name
```

## Part 5: Test Payment Actions

### Test 5.1: View Payment Details
```
1. Click "View" button on first payment
Expected:
✅ Modal opens
✅ Shows all payment details
✅ Has "Approve Payment" button (green)
✅ Has "Reject Payment" button (red)

2. Click X to close
Expected:
✅ Modal closes
✅ Back to table view
```

### Test 5.2: Approve Payment
```
1. Click "Approve" on first pending payment
Expected:
✅ Alert: "Payment approved successfully!"
✅ Table refreshes
✅ That payment status changes to "Approved" (green ✅)
✅ Approved count increases by 1

2. Check statistics
Expected:
✅ Pending count decreased
✅ Approved count increased
✅ Total stays same
```

### Test 5.3: Reject Payment
```
1. Click "Reject" on another pending payment
Expected:
✅ Prompt: "Enter reason for rejection:"

2. Enter reason: "Insufficient documentation"
Expected:
✅ Click OK
✅ Alert: "Payment rejected successfully!"
✅ Table refreshes
✅ Payment status changes to "Rejected" (red ❌)

3. Check statistics
Expected:
✅ Pending count decreased
✅ Rejected count increased (if you added that column)
✅ Total stays same
```

### Test 5.4: Reject - Cancel
```
1. Click "Reject" on pending payment
2. Click Cancel on prompt
Expected:
✅ Nothing happens
✅ Payment still pending
✅ No status change
```

## Part 6: Test View Details Modal

### Test 6.1: Modal Content
```
Click "View" on payment
Expected modal shows:
✅ Staff Name
✅ Email
✅ Amount (formatted with ₦)
✅ Status (colored badge)
✅ Payment Type (capitalized)
✅ Notes (full text)
✅ Requested Date (with time)
✅ Created Date (with time)
```

### Test 6.2: Action Buttons in Modal
```
For pending payment:
Expected:
✅ "Approve Payment" button present (green)
✅ "Reject Payment" button present (red)

For approved payment:
Expected:
✅ No action buttons shown

For rejected payment:
Expected:
✅ No action buttons shown
```

### Test 6.3: Approve from Modal
```
1. View a pending payment
2. Click "Approve Payment" in modal
Expected:
✅ Alert: "Payment approved successfully!"
✅ Modal closes
✅ Table refreshes
✅ Status updated to approved
```

### Test 6.4: Reject from Modal
```
1. View a pending payment
2. Click "Reject Payment" in modal
3. Enter reason
Expected:
✅ Alert: "Payment rejected successfully!"
✅ Modal closes
✅ Table refreshes
✅ Status updated to rejected
```

## Part 7: Test User Experience Features

### Test 7.1: Refresh Button
```
1. Click "Refresh" button (top right)
Expected:
✅ Spinner appears
✅ Data fetches from backend
✅ Table updates
✅ No errors in console
```

### Test 7.2: Statistics Updates
```
1. Approve a payment
Expected:
✅ Pending count decreases
✅ Approved count increases
✅ Amounts update correctly

2. Reject a payment
Expected:
✅ Pending count decreases
✅ Rejected count increases
```

### Test 7.3: Filter Persistence
```
1. Set Status Filter to "approved"
2. Set Type Filter to "commission"
3. Sort by "Amount"
4. Approve a pending payment
Expected:
✅ Filters still applied
✅ New data still filtered
✅ Table still sorted
```

### Test 7.4: Empty State
```
1. Set Status Filter to "rejected"
2. Reject all payments
Expected:
✅ Table shows: "No payments found"
✅ Empty state icon displays
✅ Search is still functional
```

## Part 8: Test Responsive Design

### Test 8.1: Desktop View
```
Open page on full screen
Expected:
✅ 4-column statistics grid
✅ 5-column filter section
✅ Table displays all columns clearly
✅ No horizontal scroll needed
```

### Test 8.2: Tablet View
```
Resize to 768px width
Expected:
✅ 2-column statistics grid
✅ 2-column filter section (2 filters per row)
✅ Table columns adjust
✅ Still readable
```

### Test 8.3: Mobile View
```
Resize to 375px width
Expected:
✅ 1-column statistics grid
✅ Filters stack vertically
✅ Table still shows key info
✅ Action buttons stack or resize
✅ No horizontal scroll
```

## Part 9: Test Dark Mode

### Test 9.1: Enable Dark Mode
```
1. Toggle system dark mode (or browser setting)
2. Return to payments page
Expected:
✅ Dark background (#1F2937 or similar)
✅ Light text (#FFFFFF or similar)
✅ Good contrast on all text
✅ Buttons still visible
✅ Cards have dark backgrounds
```

### Test 9.2: Verify All Elements
```
Check dark mode:
✅ Header text readable
✅ Table text readable
✅ Button text readable
✅ Badge text readable
✅ Modal text readable
✅ Input fields visible
✅ Icons visible
```

## Part 10: Test Browser Console

### Test 10.1: Check for Errors
```
1. Open browser DevTools (F12)
2. Go to Console tab
3. Perform all actions above
Expected:
✅ No red error messages
✅ Maybe yellow warnings (okay)
✅ Fetch/API logs show successful calls
```

### Test 10.2: Network Tab
```
1. Open Network tab
2. Approve a payment
Expected:
✅ POST request to /api/admin/payments/:id/approve
✅ Status: 200 (success)
✅ Response: { message: "Payment approved" }

3. Reject a payment
Expected:
✅ POST request to /api/admin/payments/:id/reject
✅ Status: 200
✅ Response: { message: "Payment rejected" }
```

## Part 11: Test Backend Logging

### Test 11.1: Check Backend Console
```
1. Look at backend terminal
2. Submit actions in admin UI
Expected backend logs:
✅ "📍 GET /api/admin/payments/pending"
✅ "📥 GET /api/admin/payments/pending"
✅ "✅ Retrieved X pending payments"
✅ "📍 POST /api/admin/payments/:id/approve"
```

### Test 11.2: Check Database Logs
```
1. Watch Supabase dashboard
2. Approve/reject payments
Expected:
✅ Status column updates
✅ updated_at timestamp changes
✅ approved_by field set (if implemented)
```

## Part 12: Test Real Payment Submission

### Test 12.1: Submit from Sales
```
1. Login as: sales@abifresh.com
2. Go to /sales/payments
3. Submit a payment:
   - Amount: ₦10,000
   - Method: cash
   - Reference: TEST-001
4. Click Submit
Expected:
✅ Success message
✅ Payment added to history
```

### Test 12.2: Admin Sees New Payment
```
1. Login as: admin@abifresh.com
2. Go to /admin/payments
3. Click Refresh
Expected:
✅ New payment appears in table
✅ Status: Pending
✅ Amount: ₦10,000
✅ Staff Name: Sales Staff
```

### Test 12.3: Admin Approves
```
1. Find the new payment
2. Click Approve
Expected:
✅ Status changes to Approved
✅ Admin receives confirmation
```

### Test 12.4: Staff Receives Notification
```
1. Login as: sales@abifresh.com
2. Check notifications
Expected:
✅ Notification: "Your payment of ₦10,000 has been approved"
(or similar message)
```

## Part 13: Edge Cases

### Test 13.1: No Payments
```
1. Clear all test data from database
2. Load /admin/payments
Expected:
✅ "No payments found" message
✅ Empty state displays
✅ Filters still functional
```

### Test 13.2: Large Dataset
```
1. Insert 100+ test payments
2. Load page
Expected:
✅ Page loads within 2 seconds
✅ All data displays
✅ Filtering still fast
✅ Sorting works immediately
```

### Test 13.3: Rapid Actions
```
1. Quickly approve 5 payments in a row
Expected:
✅ All succeed
✅ No errors
✅ Table updates each time
```

### Test 13.4: Filter Edge Cases
```
1. Search for non-existent staff
Expected:
✅ Empty table
✅ "No payments found"

2. Set future date range
Expected:
✅ No payments shown

3. Combine all filters
Expected:
✅ Still functional
✅ Results accurate
```

## ✅ Sign-Off Checklist

Before considering testing complete:

- [ ] All 13 test sections completed
- [ ] No errors in browser console
- [ ] No errors in backend logs
- [ ] All UI elements responsive
- [ ] Dark mode works properly
- [ ] Database updates visible
- [ ] Notifications sent correctly
- [ ] Real-time updates working
- [ ] All filter combinations work
- [ ] Statistics calculated correctly
- [ ] Modal displays properly
- [ ] Actions complete successfully
- [ ] Page performance acceptable

## 🐛 Troubleshooting

### Issue: Payments not showing
**Solution**: 
- Check database directly: `SELECT * FROM staff_payments;`
- Run TEST_PAYMENT_INSERT.sql
- Check staff_id values are correct

### Issue: Approve/Reject button not working
**Solution**:
- Check browser console for errors
- Check backend logs for POST errors
- Verify you're logged in as admin
- Check payment status is "pending"

### Issue: Filters not working
**Solution**:
- Refresh page (F5)
- Clear all filters and try one at a time
- Check browser console for errors
- Try different filter combinations

### Issue: Modal not opening
**Solution**:
- Check browser console
- Try clicking View again
- Refresh page and try again

### Issue: Backend not running
**Solution**:
```bash
Stop-Process -Name node -Force
cd c:\Users\LuckyGold\Desktop\AKV\backend
npm run dev
```

## 📊 Test Results Template

```
Test Date: ___________
Tester: ___________
Environment: ___________

RESULTS:
- Data Display: ✅ / ⚠️ / ❌
- Filtering: ✅ / ⚠️ / ❌
- Searching: ✅ / ⚠️ / ❌
- Approving: ✅ / ⚠️ / ❌
- Rejecting: ✅ / ⚠️ / ❌
- Modals: ✅ / ⚠️ / ❌
- Responsive: ✅ / ⚠️ / ❌
- Dark Mode: ✅ / ⚠️ / ❌
- Performance: ✅ / ⚠️ / ❌

NOTES:
_________________________________
_________________________________
```

---

**Status**: ✅ Complete Testing Guide
**Updated**: January 30, 2026
**Estimated Time**: 30-60 minutes
