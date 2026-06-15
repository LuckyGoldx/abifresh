# 🔧 Payment System Complete Fix Guide

**Error:** `Could not find the 'payment_method' column of 'staff_payments' in the schema cache`

**Issues:**
1. ❌ Missing columns in `staff_payments` table
2. ❌ Storage bucket 'payments' not created in Supabase
3. ❌ Receipt file upload fails
4. ❌ Admin cannot view receipts

---

## ✅ STEP-BY-STEP FIX

### STEP 1: Add Missing Columns to Database (5 minutes)

**Go to:** Supabase Dashboard → SQL Editor → New Query

**Copy & Paste & Execute:**

```sql
-- ============================================================================
-- ADD MISSING COLUMNS TO STAFF_PAYMENTS TABLE
-- ============================================================================

-- Add all new columns for payment system
ALTER TABLE IF EXISTS public.staff_payments 
ADD COLUMN IF NOT EXISTS staff_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS staff_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS staff_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS items_paid_for JSONB,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_payments_payment_method 
ON public.staff_payments(payment_method);

CREATE INDEX IF NOT EXISTS idx_staff_payments_reference 
ON public.staff_payments(reference_number);

CREATE INDEX IF NOT EXISTS idx_staff_payments_receipt 
ON public.staff_payments(receipt_url);

-- Verify columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'staff_payments' 
ORDER BY ordinal_position;
```

**Expected Output:**
- ✅ Column "staff_name" created
- ✅ Column "staff_email" created
- ✅ Column "staff_phone" created
- ✅ Column "payment_method" created
- ✅ Column "reference_number" created
- ✅ Column "receipt_url" created
- ✅ Column "items_paid_for" created
- ✅ Column "rejection_reason" created
- ✅ Indexes created

---

### STEP 2: Create Storage Bucket in Supabase (3 minutes)

**Go to:** Supabase Dashboard → Storage

**Click:** "New Bucket" button

**Enter these settings:**

| Setting | Value |
|---------|-------|
| **Name** | `payments` |
| **Public** | ✅ Enable "Public bucket" |
| **File size limit** | 52 MB (default) |

**Click:** "Create New Bucket"

**Verify:** You should see "payments" bucket in the list

---

### STEP 3: Set Up Bucket Permissions (CORS & Access)

**In the same Supabase Storage section:**

1. **Click on "payments" bucket**
2. **Click the 3-dot menu → Policies**
3. **Copy & Paste this SQL in SQL Editor:**

```sql
-- ============================================================================
-- STORAGE BUCKET POLICIES FOR PAYMENTS
-- ============================================================================

-- Allow authenticated users to upload receipts
CREATE POLICY "Allow authenticated users to upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'payments' AND 
  auth.role() = 'authenticated'
);

-- Allow users to read payment receipts
CREATE POLICY "Allow users to read receipts" ON storage.objects
FOR SELECT USING (
  bucket_id = 'payments' AND
  auth.role() = 'authenticated'
);

-- Allow updating own receipts
CREATE POLICY "Allow updating own receipts" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'payments' AND 
  auth.role() = 'authenticated'
);

-- Allow deleting own receipts
CREATE POLICY "Allow deleting own receipts" ON storage.objects
FOR DELETE USING (
  bucket_id = 'payments' AND 
  auth.role() = 'authenticated'
);
```

---

### STEP 4: Update Backend Code (5 minutes)

**File:** `backend/src/routes/sales.routes.ts`

**Find:** Lines 396-480 (Payment request endpoint)

**Replace with:**

```typescript
router.post('/payments/request', authMiddleware, roleMiddleware('sales', 'sales_staff', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { amount, items_paid_for, reference_number, payment_method, notes } = req.body;

    // Validate payment_method
    if (!payment_method || !['cash', 'online', 'bank_deposit', 'pos'].includes(payment_method)) {
      return res.status(400).json({ error: 'Valid payment method required: cash, online, bank_deposit, pos' });
    }

    // Get user info
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('full_name, email, phone')
      .eq('id', req.user!.id)
      .single();

    // Handle file upload to Supabase Storage
    let receipt_url = null;
    if (req.files && 'receipt' in req.files) {
      const receiptFile = req.files.receipt as any;
      const fileName = `sales_${req.user!.id}_${Date.now()}_${receiptFile.name}`;
      
      try {
        const { data, error: uploadError } = await supabaseAdmin
          .storage
          .from('payments')
          .upload(fileName, receiptFile.data);
        
        if (!uploadError && data) {
          // Get public URL
          const { data: publicData } = supabaseAdmin
            .storage
            .from('payments')
            .getPublicUrl(fileName);
          receipt_url = publicData?.publicUrl || null;
          console.log('✅ Receipt uploaded:', receipt_url);
        } else {
          console.log('⚠️ Receipt upload failed (optional), continuing...');
        }
      } catch (uploadErr: any) {
        console.log('⚠️ Upload error (optional):', uploadErr.message);
      }
    }

    // Parse items_paid_for
    let parsedItems = [];
    try {
      if (typeof items_paid_for === 'string') {
        parsedItems = JSON.parse(items_paid_for);
      } else if (Array.isArray(items_paid_for)) {
        parsedItems = items_paid_for;
      }
    } catch (e) {
      parsedItems = [];
    }

    // Comprehensive notes
    const detailedNotes = `Sales Payment Request
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Payment Method: ${payment_method}${reference_number ? '\nReference: ' + reference_number : ''}${notes ? '\nNotes: ' + notes : ''}`;

    // Insert payment with ALL new fields
    const { data, error } = await supabaseAdmin
      .from('staff_payments')
      .insert([
        {
          staff_id: req.user!.id,
          staff_name: user?.full_name || 'Unknown',
          staff_email: user?.email || '',
          staff_phone: user?.phone || '',
          amount: parseFloat(amount),
          payment_type: 'other',
          payment_method: payment_method,
          status: 'pending',
          reference_number: reference_number || null,
          receipt_url: receipt_url,
          items_paid_for: parsedItems.length > 0 ? parsedItems : null,
          notes: detailedNotes,
          requested_date: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Insert error:', error);
      throw error;
    }

    // Notify all admins
    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('id')
      .or("role.eq.'admin',role.eq.'sales_staff'")
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      await Promise.all(admins.map(admin =>
        supabaseAdmin
          .from('notifications')
          .insert([
            {
              user_id: admin.id,
              type: 'payment_request',
              title: '📋 New Payment Request',
              message: `${user?.full_name || 'Sales Staff'} submitted ₦${parseFloat(amount).toLocaleString()} via ${payment_method}`,
              related_id: data.id,
              read: false,
            },
          ])
      ));
    }

    res.status(201).json({
      payment: data,
      message: '✅ Payment submitted successfully. Awaiting admin approval.',
    });
  } catch (error: any) {
    console.error('❌ Error creating payment request:', error);
    res.status(400).json({ error: error.message || 'Failed to create payment request' });
  }
});
```

**File:** `backend/src/routes/staff.routes.ts`

**Find:** Lines 280-380 (Payment request endpoint for staff)

**Apply IDENTICAL code as above** but change `'Sales Payment Request'` to `'Staff Payment Request'` in notes

---

### STEP 5: Update Admin Service for Better Notifications

**File:** `backend/src/services/admin.service.ts`

**Find:** Lines 162-220 (approve/reject methods)

**Replace with:**

```typescript
/**
 * Approve payment with notification
 */
async approvePayment(paymentId: string): Promise<void> {
  try {
    // Get payment details first
    const { data: payment } = await supabaseAdmin
      .from('staff_payments')
      .select('staff_id, staff_name, amount, receipt_url')
      .eq('id', paymentId)
      .single();

    if (!payment) throw new Error('Payment not found');

    // Update status and add approval date
    const { error: updateError } = await supabaseAdmin
      .from('staff_payments')
      .update({
        status: 'approved',
        approved_date: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (updateError) throw updateError;

    console.log('✅ Approval updated:', paymentId);

    // Notify staff member
    await supabaseAdmin.from('notifications').insert([
      {
        user_id: payment.staff_id,
        type: 'payment_approved',
        title: '✅ Payment Approved',
        message: `Your payment of ₦${payment.amount?.toLocaleString() || '0'} has been approved!`,
        related_id: paymentId,
        read: false,
      },
    ]);

    console.log('✅ Notification sent to:', payment.staff_id);
  } catch (error: any) {
    console.error('❌ Error approving payment:', error);
    throw error;
  }
}

/**
 * Reject payment with reason
 */
async rejectPayment(paymentId: string, reason?: string): Promise<void> {
  try {
    // Get payment details
    const { data: payment } = await supabaseAdmin
      .from('staff_payments')
      .select('staff_id, staff_name, amount')
      .eq('id', paymentId)
      .single();

    if (!payment) throw new Error('Payment not found');

    // Update status, add rejection reason
    const { error: updateError } = await supabaseAdmin
      .from('staff_payments')
      .update({
        status: 'rejected',
        rejection_reason: reason || 'No reason provided',
        notes: `REJECTED - ${reason || 'No reason provided'}`,
      })
      .eq('id', paymentId);

    if (updateError) throw updateError;

    console.log('❌ Payment rejected:', paymentId);

    // Notify staff member with reason
    await supabaseAdmin.from('notifications').insert([
      {
        user_id: payment.staff_id,
        type: 'payment_rejected',
        title: '❌ Payment Rejected',
        message: `Your ₦${payment.amount?.toLocaleString() || '0'} payment was rejected. Reason: ${reason || 'See notes'}`,
        related_id: paymentId,
        read: false,
      },
    ]);

    console.log('❌ Rejection notification sent to:', payment.staff_id);
  } catch (error: any) {
    console.error('❌ Error rejecting payment:', error);
    throw error;
  }
}
```

---

### STEP 6: Update Admin Modal to Display Receipt

**File:** `frontend/app/admin/payments/page.tsx`

**Find:** Receipt section in Payment Details Modal (around line 420)

**Replace with:**

```typescript
{/* Receipt Section */}
<div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
  <div className="flex items-center gap-2 mb-3">
    <FileText className="w-5 h-5 text-blue-600" />
    <h3 className="font-semibold">Receipt</h3>
  </div>
  {selectedPayment.receipt_url ? (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
      <a
        href={selectedPayment.receipt_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
      >
        <Download className="w-4 h-4" />
        Download Receipt
      </a>
      <button
        onClick={() => window.open(selectedPayment.receipt_url, '_blank')}
        className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
        title="View receipt in new window"
      >
        <Eye className="w-4 h-4" />
        View
      </button>
    </div>
  ) : (
    <p className="text-gray-500 text-sm">No receipt uploaded</p>
  )}
</div>
```

---

### STEP 7: Rebuild & Restart Backend (5 minutes)

**In Terminal:**

```powershell
# Kill existing processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Navigate and rebuild
cd C:\Users\LuckyGold\Desktop\AKV\backend
npm run build

# Start backend
node dist/index.js
```

**Expected Output:**
```
✅ Server running on port 5000
✅ Connection successful
```

---

## 🧪 TESTING CHECKLIST

### Test 1: Database Columns ✅
```sql
-- Run in Supabase SQL Editor
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'staff_payments' 
AND column_name IN ('payment_method', 'receipt_url', 'staff_phone');
```
Expected: 3 rows returned

### Test 2: Storage Bucket ✅
- Go to Supabase Storage
- See "payments" bucket listed
- Can download/upload files

### Test 3: Submit Payment from Sales

**Steps:**
1. Login as: `sales@abifresh.com` / (password)
2. Go to `/sales/payments`
3. Fill form:
   - Amount: 5000
   - Payment Method: online
   - Reference: TEST001
   - Receipt: Upload any image
   - Items: Select items
   - Notes: Test payment
4. Click "Submit"

**Expected Results:**
- ✅ No error
- ✅ Payment shows in list with "PENDING" status
- ✅ Admin receives notification
- ✅ Receipt saved in database

### Test 4: View Payment in Admin Dashboard

**Steps:**
1. Login as admin
2. Go to `/admin/payments`
3. Find your test payment
4. Click "View" (eye icon)

**Expected Results - Modal Shows:**
- ✅ Staff name: "Sales Staff"
- ✅ Phone: "+2348012345671"
- ✅ Amount: "₦5,000"
- ✅ Payment Method: "online"
- ✅ Reference: "TEST001"
- ✅ Items list (if selected)
- ✅ Receipt section with:
  - Download button
  - View button (eye icon)
  - Clickable link to receipt

### Test 5: Approve Payment

**Steps:**
1. In modal, click "Approve Payment"
2. Confirm in dialog

**Expected Results:**
- ✅ Modal closes
- ✅ Payment status changes to "APPROVED"
- ✅ Sales staff receives ✅ notification
- ✅ Approved date populated

### Test 6: Reject Payment with Reason

**Steps:**
1. Go to `/admin/payments`
2. Find another test payment
3. Click "View"
4. Click "Reject Payment"
5. Enter reason: "Receipt too blurry, please resubmit"
6. Click "Confirm"

**Expected Results:**
- ✅ Rejection modal appears
- ✅ Reason captured
- ✅ Payment status changes to "REJECTED"
- ✅ Staff receives ❌ notification with reason
- ✅ Reason displayed in admin view

### Test 7: Verify Database

**Run in Supabase SQL Editor:**

```sql
-- Check payment record
SELECT 
  id,
  staff_name,
  staff_phone,
  amount,
  payment_method,
  reference_number,
  receipt_url,
  status,
  rejection_reason
FROM staff_payments
WHERE status IN ('approved', 'rejected')
LIMIT 5;
```

**Expected Output:**
- All new columns populated with correct data
- Receipt URL is valid path
- Status matches modal display

---

## 🐛 TROUBLESHOOTING

### Issue: "Bucket not found" during upload

**Solution:**
1. Go to Supabase Storage
2. Verify "payments" bucket exists
3. Check bucket is PUBLIC
4. Run policies SQL again

### Issue: "payment_method column doesn't exist"

**Solution:**
1. Run the ALTER TABLE SQL again
2. Verify with verification SQL:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'staff_payments' AND column_name = 'payment_method';
   ```

### Issue: Receipt doesn't show in modal

**Solution:**
1. Check receipt_url in database is not NULL
2. Verify URL is accessible (paste in browser)
3. Check CORS settings in Supabase Storage

### Issue: Backend crashes after rebuild

**Solution:**
```powershell
cd C:\Users\LuckyGold\Desktop\AKV\backend
npm install
npm run build
node dist/index.js
```

---

## ✨ FINAL VERIFICATION

**All should be working when:**

✅ Payment submitted successfully
✅ Receipt uploaded to Supabase
✅ Admin sees all payment details in modal
✅ Admin can download/view receipt with eye icon
✅ Approve/Reject workflow works
✅ Staff receive notifications with details
✅ Database records show all new columns populated
✅ No errors in backend logs

---

**Status:** Ready to test!

**Next Step:** Follow Testing Checklist above ⬆️
