# Credit Payment Receipt System - Complete Implementation Guide

## ✅ What's Already Implemented

### Backend Receipt Upload
- **Route:** `POST /api/credits/payments`
- **File handling:** Accepts multipart/form-data with `receipt` file
- **Storage path:** `credit-payments/{creditor_id}/` (organized by creditor)
- **Supported formats:** JPG, PNG, PDF (up to 5MB)
- **Storage service:** Uses Supabase Storage with auto-generated filenames

### Database Integration
- **Table:** `credit_payments`
- **Column:** `receipt_url` - Stores the public URL of uploaded receipt
- **Audit logging:** Activity logged in `credit_activities` table with file metadata

### Frontend Upload (Sales Staff)
**File:** `/frontend/app/sales/credits/page.tsx`

```typescript
// In ManageCreditorsTab Payment Modal
<div className="border-2 border-dashed border-gray-300 rounded p-4 text-center cursor-pointer">
  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
  <p className="text-sm text-gray-600">Click to upload receipt image</p>
  {receiptFile && <p className="text-sm text-green-600 mt-2">✓ {receiptFile.name}</p>}
</div>
<input
  ref={receiptInputRef}
  type="file"
  accept="image/*,.pdf"
  onChange={(e) => e.target.files && handleReceiptSelect(e.target.files[0])}
  className="hidden"
/>
```

**Upload requirements:**
- POS payment: Receipt **REQUIRED**
- Online Transfer: Receipt **REQUIRED**
- Cash payment: Receipt **OPTIONAL** (no receipt needed for cash)

### Frontend Receipt Viewing (Admin)
**File:** `/frontend/app/admin/credits/page.tsx`

In the payment details modal:
```typescript
{selectedPayment.receipt_url && (
  <div className="bg-purple-50 p-3 rounded">
    <a
      href={selectedPayment.receipt_url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-purple-600 hover:text-purple-800 flex items-center gap-2"
    >
      <Download className="w-4 h-4" />
      View Receipt
    </a>
  </div>
)}
```

## 🔧 Required Setup in Supabase

### Step 1: Create Storage Bucket

**Location:** Supabase Dashboard → Storage → Create Bucket

```
Bucket Name: credit-payments
Public: YES (toggle ON)
```

### Step 2: Add Storage Policies

Go to **Storage → Policies** tab for `credit-payments` bucket

**Policy 1 - Authenticated Upload:**
```sql
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'credit-payments');
```

**Policy 2 - Public Read:**
```sql
CREATE POLICY "Public can read receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'credit-payments');
```

**Policy 3 - Service Role:**
```sql
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'credit-payments');
```

### Step 3: Verify Environment Variables

In your `.env.local` (backend):
```bash
SUPABASE_URL=https://[PROJECT_ID].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
```

## 📁 Receipt Organization

Receipts are stored in this folder structure:

```
credit-payments/
└── [CREDITOR_UNIQUE_CODE]/
    ├── payment_[PAYMENT_ID]_[TIMESTAMP].jpg
    ├── payment_[PAYMENT_ID]_[TIMESTAMP].pdf
    └── ...
```

**Example:**
```
credit-payments/
├── CRED-1234/
│   ├── payment_abc123_1704067200000.jpg
│   └── payment_def456_1704153600000.pdf
└── CRED-5678/
    └── payment_ghi789_1704240000000.jpg
```

## 🧪 Testing Receipt Upload

### Test Scenario 1: Upload Receipt for POS Payment

1. **Sales Staff:**
   - Go to `/sales/credits` → Manage Creditors tab
   - Click "Payment" on any creditor
   - Fill in amount: 5000
   - Select method: "POS"
   - Enter reference: POS123456
   - **Click upload area and select a JPG/PDF file**
   - Click "Submit Payment"

2. **Expected Result:**
   - Success message appears
   - Payment appears in admin queue as "pending"

3. **Admin View:**
   - Go to `/admin/credits`
   - Click "View" on the pending payment
   - Scroll to "Receipt" section
   - Click "📥 View Receipt" link
   - Receipt image/PDF opens in new tab

### Test Scenario 2: Online Transfer with Receipt

Same as above but:
- Method: "Online Transfer"
- Reference: Must enter (not auto-generated)

### Test Scenario 3: Cash Payment (No Receipt)

Same process but:
- Method: "Cash"
- Reference: Auto-generated (don't enter)
- Receipt upload: **SKIP** (optional)
- Should still work without receipt

## 🔍 Verifying Storage

### In Supabase Console:

1. Go to **Storage** → `credit-payments` bucket
2. Navigate to creditor folder (e.g., `CRED-1234`)
3. See all receipts for that creditor
4. Click file → **Get public URL** (copy and test in browser)

### Get Public URL Format:
```
https://[PROJECT_ID].supabase.co/storage/v1/object/public/credit-payments/[CREDITOR_ID]/[FILENAME]
```

## 📊 Database Queries

### Find all receipts for a creditor:
```sql
SELECT 
  cp.id as payment_id,
  cp.amount,
  cp.payment_method,
  cp.receipt_url,
  cp.created_at
FROM credit_payments cp
JOIN creditors c ON cp.creditor_id = c.id
WHERE c.unique_code = 'CRED-1234'
  AND cp.receipt_url IS NOT NULL
ORDER BY cp.created_at DESC;
```

### Find payments without receipts:
```sql
SELECT id, creditor_id, payment_method, created_at
FROM credit_payments
WHERE receipt_url IS NULL
  AND payment_method IN ('pos', 'online_transfer');
```

### Count receipts by method:
```sql
SELECT 
  payment_method,
  COUNT(*) as total_payments,
  COUNT(receipt_url) as receipts_uploaded
FROM credit_payments
GROUP BY payment_method;
```

## 🚨 Troubleshooting

### Issue: File upload shows in form but not sent
**Solution:** Check browser console for errors, verify file size < 5MB

### Issue: "Receipt upload failed" error
**Solution:**
- Verify `credit-payments` bucket exists in Supabase
- Check bucket is PUBLIC (toggle ON)
- Verify storage policies are created
- Check service role key is correct

### Issue: Receipt URL returns 404
**Solution:**
- Verify file exists in Supabase console
- Check URL format is correct
- Try copying public URL from Supabase and test directly

### Issue: Can't see "View Receipt" link in admin
**Solution:**
- Check `credit_payments.receipt_url` column has data in database
- Reload admin page (Ctrl+F5)
- Verify payment was actually created in database

### Issue: Storage quota exceeded
**Solution:**
- Enable billing in Supabase (free tier has limited storage)
- Or delete old receipts you no longer need

## 🔐 Security Notes

✅ **Public readable** - Anyone with creditor ID can view their receipts  
✅ **Authenticated upload** - Only logged-in staff can upload  
✅ **Service role** - Backend can manage all receipts  
✅ **Audit trail** - All uploads logged in `credit_activities`  
✅ **File type validation** - Only image/PDF files accepted  
✅ **Size limit** - 5MB maximum per file  

## 📋 Receipt Metadata Logged

When a receipt is uploaded, this is stored in `credit_activities`:

```json
{
  "action": "PAYMENT_RECORDED",
  "receipt_filename": "payment_abc123_1704067200000.jpg",
  "receipt_size": 245000,
  "mime_type": "image/jpeg",
  "uploaded_by": "[STAFF_ID]",
  "upload_time": "2024-01-01T10:00:00Z"
}
```

## 📱 Future Enhancements

- [ ] Receipt preview modal (show image before approval)
- [ ] Multi-file upload (multiple receipts per payment)
- [ ] Receipt OCR for amount verification
- [ ] Receipt comments/annotations
- [ ] Email receipt to creditor
- [ ] Mobile camera capture for receipt
- [ ] Bulk receipt download (zip)
- [ ] Receipt storage expiry policy

## ✨ Workflow Summary

```
Sales Staff Records Payment
    ↓
[POS/Transfer] → Uploads Receipt → Sends to Supabase Storage
[Cash] → No Receipt Needed
    ↓
Payment appears in Admin Queue
    ↓
Admin clicks "View" → Sees Receipt Link
    ↓
Admin clicks link → Opens Receipt in Browser
    ↓
Admin Approves/Rejects Payment
    ↓
Payment Status Updated
    ↓
Receipt Available in Payment History
```

**That's it!** The entire receipt system is production-ready. Just set up the Supabase bucket and storage policies.
