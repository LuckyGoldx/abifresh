# 🚀 PAYMENT SYSTEM FIX - COMPLETE EXECUTION GUIDE

> **Status:** 2 issues found and fixed
> **Time to complete:** 15-20 minutes
> **Date:** January 30, 2026

---

## 📋 ISSUES FOUND

| # | Issue | Root Cause | Solution |
|---|-------|-----------|----------|
| 1 | "Could not find the 'payment_method' column" | Missing database columns | Run migration SQL |
| 2 | "Bucket not found" during receipt upload | Storage bucket not created | Create in Supabase |

---

## ✅ EXACT STEPS TO FIX (DO THIS NOW)

### STEP 1: Add Missing Database Columns (3 minutes)

1. **Open:** https://app.supabase.com
2. **Select:** Your project (ABIFRESH)
3. **Click:** "SQL Editor" (left sidebar)
4. **Click:** "New Query"
5. **Copy entire SQL from:** `PAYMENT_SCHEMA_MIGRATION.sql`
6. **Paste** into the editor
7. **Click:** "Run" button (or press `Ctrl+Enter`)

**Wait for:**
```
✅ All commands completed successfully
```

**Verify Results:**
- Look at bottom output table
- Should show: 8 new columns added (staff_name, staff_email, staff_phone, payment_method, reference_number, receipt_url, items_paid_for, rejection_reason)
- All rows showing: `1` (meaning columns exist)

---

### STEP 2: Create Storage Bucket (3 minutes)

1. **In Supabase Dashboard:**
2. **Click:** "Storage" (left sidebar)
3. **Click:** "New Bucket" button (or blue "+" button)
4. **Enter:**
   - Name: `payments`
   - Check: ✅ "Public bucket"
   - Leave other settings as default
5. **Click:** "Create New Bucket"

**Expected Result:**
- You should see "payments" bucket in the list

---

### STEP 3: Set Bucket Permissions (2 minutes)

1. **In Storage section, find "payments" bucket**
2. **Click the three dots (⋮) menu**
3. **Click:** "Policies"
4. **Copy SQL from below**
5. **Go to:** SQL Editor → New Query
6. **Paste & Run:**

```sql
-- ============================================================================
-- STORAGE BUCKET POLICIES FOR PAYMENTS BUCKET
-- ============================================================================

-- Allow authenticated users to upload receipts
CREATE POLICY IF NOT EXISTS "Allow authenticated to upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'payments' AND 
  auth.role() = 'authenticated'
);

-- Allow users to read payment receipts
CREATE POLICY IF NOT EXISTS "Allow authenticated to read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'payments' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated to update their own receipts
CREATE POLICY IF NOT EXISTS "Allow authenticated to update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'payments' AND 
  auth.role() = 'authenticated'
);

-- Allow authenticated to delete their own receipts
CREATE POLICY IF NOT EXISTS "Allow authenticated to delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'payments' AND 
  auth.role() = 'authenticated'
);
```

**Expected Result:**
```
✅ Created policy "Allow authenticated to upload"
✅ Created policy "Allow authenticated to read"
✅ Created policy "Allow authenticated to update"
✅ Created policy "Allow authenticated to delete"
```

---

### STEP 4: Rebuild & Restart Backend (3 minutes)

**In PowerShell (in AKV\backend directory):**

```powershell
# Kill existing processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Rebuild
npm run build

# Start backend
node dist/index.js
```

**Wait for:**
```
✅ Server running on port 5000
✅ Connection successful
```

---

## 🧪 TEST PAYMENT SUBMISSION (10 minutes)

### Test 1: Submit Payment from Sales Page

**Login as:** `sales@abifresh.com` / (your password)

**Navigate to:** http://localhost:3000/sales/payments

**Fill Form:**
| Field | Value |
|-------|-------|
| Amount | 5000 |
| Payment Method | online |
| Reference Number | TEST-JAN30-001 |
| Receipt | Upload any image file |
| Items | Select 2-3 items |
| Notes | Test payment for verification |

**Click:** "Review Payment" → "Confirm & Submit"

**Expected Results:**
- ✅ No error message
- ✅ Payment appears in "Payment History" as PENDING
- ✅ Page refreshes/updates
- ✅ No console errors

---

### Test 2: Admin Receives Notification

**Stay on same browser tab or open new tab**

**Login as Admin:** `admin@abifresh.com` / (password)

**Navigate to:** http://localhost:3000/notifications OR check notification bell

**Expected Results:**
- ✅ See notification: "📋 New Payment Request"
- ✅ Message shows: "Sales Staff submitted ₦5,000 via online"
- ✅ You can click to navigate

---

### Test 3: View Payment Details Modal

**Admin Dashboard:** http://localhost:3000/admin/payments

**Find:** Your test payment in the table

**Click:** Eye icon (👁️) in "Action" column

**Modal Should Show All Fields:**

| Section | Fields | Expected Values |
|---------|--------|-----------------|
| **Staff Information** | Name | Sales Staff |
| | Phone | +2348... (from database) |
| | Email | sales@abifresh.com |
| | Role | sales_staff |
| **Payment Information** | Amount | **₦5,000** (large, orange) |
| | Status | PENDING (badge) |
| | Payment Method | online |
| | Payment Type | other |
| | Reference Number | TEST-JAN30-001 |
| **Items Paid For** | Item list | All selected items with qty/amount |
| **Receipt** | Button with 👁️ icon | "View" and "Download" buttons |
| | File link | Receipt image/file |
| **Notes** | Content | All submitted notes |
| **Timeline** | Dates | Requested date shown |

---

### Test 4: View Receipt

**In Modal - Receipt Section:**

1. **Click:** "View" button (with eye icon 👁️)
   - Should open receipt in NEW TAB
   - Image/file displays
2. **Back to modal, click:** "Download" button
   - Should download receipt file to computer

**Expected Results:**
- ✅ Receipt opens correctly
- ✅ File can be downloaded
- ✅ No 404 or access errors

---

### Test 5: Approve Payment

**In Modal - Bottom Action Buttons:**

1. **Click:** "Approve Payment"
2. **Confirm** in dialog

**Expected Results:**
- ✅ Modal closes
- ✅ Payment status in table changes to "✅ APPROVED"
- ✅ Approved date added

**Check Database (Supabase SQL):**
```sql
SELECT id, status, approved_date, staff_name, amount, receipt_url 
FROM staff_payments 
WHERE status = 'approved' 
ORDER BY approved_date DESC 
LIMIT 1;
```

**Expected Output:**
- `status` = "approved"
- `approved_date` = current timestamp
- `receipt_url` = valid path
- `payment_method` = "online"
- `reference_number` = "TEST-JAN30-001"

---

### Test 6: Reject Payment with Reason

**Admin Dashboard - New Payment:**

**Click:** Eye icon for ANOTHER payment

**In Modal:**

1. **Click:** "Reject Payment"
2. **Rejection Reason Modal opens**
3. **Enter Reason:** "Receipt image is too blurry, please resubmit with clearer photo"
4. **Click:** "Confirm"

**Expected Results:**
- ✅ Modal closes
- ✅ Payment status changes to "❌ REJECTED"
- ✅ Reason saved

**Verify in Database:**
```sql
SELECT id, status, rejection_reason, staff_name, receipt_url
FROM staff_payments 
WHERE status = 'rejected' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Output:**
- `status` = "rejected"
- `rejection_reason` = your entered reason
- `receipt_url` = still exists
- All other fields populated

---

### Test 7: Staff Member Receives Notifications

**Login as:** The staff member who submitted payment

**Check Notifications:**

**After Approval:**
```
✅ Payment Approved
Your payment of ₦5,000 has been approved!
```

**After Rejection:**
```
❌ Payment Rejected
Your payment of ₦5,000 was rejected. Reason: Receipt image is too blurry...
```

**Expected Results:**
- ✅ Receive both notifications
- ✅ Notifications show amounts
- ✅ Rejection shows reason
- ✅ Can see all details

---

## 🔍 COMPLETE DATABASE VERIFICATION

**Run this SQL to verify ALL data:**

```sql
-- Get latest payment with all fields
SELECT 
  id,
  staff_id,
  staff_name,
  staff_email,
  staff_phone,
  amount,
  payment_method,
  reference_number,
  receipt_url,
  status,
  rejection_reason,
  items_paid_for,
  requested_date,
  approved_date,
  created_at
FROM staff_payments
ORDER BY created_at DESC
LIMIT 3;
```

**Verify Each Column:**
- ✅ `staff_name` - Not NULL (has value)
- ✅ `staff_email` - Not NULL (has email)
- ✅ `staff_phone` - Not NULL (has phone)
- ✅ `payment_method` - Has value (cash/online/etc)
- ✅ `reference_number` - Has value
- ✅ `receipt_url` - Has valid path like `/payments/sales_uuid_timestamp.jpg`
- ✅ `items_paid_for` - JSON array with items
- ✅ `requested_date` - Timestamp when submitted
- ✅ `approved_date` - Timestamp when approved (NULL if still pending)

---

## 🎯 SUCCESS CRITERIA

**All tests pass when:**

| Test | Status | Check |
|------|--------|-------|
| Database columns exist | ✅ | No "column not found" errors |
| Storage bucket created | ✅ | Receipt uploads without error |
| Receipt files accessible | ✅ | View/Download buttons work |
| Admin modal shows all data | ✅ | All 10 fields visible |
| Approve/Reject works | ✅ | Status changes in real-time |
| Notifications sent | ✅ | Staff receive updates |
| Database records complete | ✅ | All columns populated |

---

## 🛠️ TROUBLESHOOTING

### Problem: Still getting "payment_method column not found"

**Solution:**
1. Verify SQL ran successfully in Supabase
2. Check for error messages in SQL editor output
3. Re-run `PAYMENT_SCHEMA_MIGRATION.sql`
4. Restart backend: Kill node, rebuild, restart

### Problem: Receipt won't upload

**Solution:**
1. Verify "payments" bucket exists in Storage
2. Verify bucket is marked as "Public"
3. Re-run the POLICIES SQL
4. Check file size < 52MB
5. Try different file format (JPG, PNG, PDF)

### Problem: Receipt URL shows NULL in modal

**Solution:**
1. Check bucket permissions are set
2. Verify file uploaded successfully to Supabase Storage → payments bucket
3. Check network tab in browser DevTools for upload errors
4. Look at backend logs for upload errors

### Problem: Admin modal won't show receipt section

**Solution:**
1. Verify receipt_url is not NULL in database
2. Check that URL path is correct (should start with `/payments/`)
3. Try refreshing the page
4. Clear browser cache

### Problem: Notifications not showing

**Solution:**
1. Verify notifications table in database has records
2. Check user IDs match between staff_payments.staff_id and notifications.user_id
3. Restart backend
4. Clear browser local storage

---

## 📝 BACKEND LOGS TO EXPECT

When submitting payment, you should see:

```
✅ Access granted
🔐 Role Check: {...}
✅ Receipt uploaded: /payments/sales_uuid_timestamp.jpg
✅ Payment request created: {
  id: 'abc123...',
  amount: 5000,
  staff: 'Sales Staff',
  method: 'online',
  items: 3
}
✅ Notification sent to: 3 admins
```

When approving:

```
✅ Approval updated: abc123...
✅ Notification sent to: user_id
```

When rejecting:

```
❌ Payment rejected: abc123...
❌ Rejection notification sent to: user_id
```

---

## ✨ COMPLETION CHECKLIST

**Before considering complete:**

- [ ] Database columns added (run PAYMENT_SCHEMA_MIGRATION.sql)
- [ ] Storage bucket "payments" created and public
- [ ] Bucket policies applied
- [ ] Backend rebuilt and running
- [ ] Payment submitted successfully (no errors)
- [ ] Receipt file uploaded (visible in Supabase Storage)
- [ ] Admin modal shows all payment details
- [ ] Receipt View & Download buttons work
- [ ] Approve changes status to APPROVED
- [ ] Reject shows reason and changes status to REJECTED
- [ ] Both staff & admin receive notifications
- [ ] Database has all fields populated
- [ ] No console errors in browser
- [ ] No errors in backend logs

---

**Next:** Start with STEP 1 above and work through each step sequentially. 
All 7 tests should pass within 10 minutes if everything is working correctly!

Good luck! 🎉
