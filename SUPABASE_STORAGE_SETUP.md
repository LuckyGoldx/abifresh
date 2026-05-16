# Supabase Storage Setup for Credit Payment Receipts

## Step 1: Create Storage Bucket in Supabase

1. Go to **Supabase Dashboard** → Your Project → **Storage**
2. Click **Create a new bucket**
3. Enter bucket name: `credit-payments`
4. Toggle **Public bucket** to **ON** (so receipts can be viewed/downloaded)
5. Click **Create bucket**

## Step 2: Set Up Bucket Policies

After creating the bucket, go to **Storage** → **Policies** for `credit-payments` bucket

### Add these policies:

#### Policy 1: Allow authenticated users to upload
```sql
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'credit-payments');
```

#### Policy 2: Allow everyone to read receipts (public view)
```sql
CREATE POLICY "Public access to read receipts"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'credit-payments');
```

#### Policy 3: Allow service role full access
```sql
CREATE POLICY "Service role full access"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'credit-payments');
```

## Step 3: Folder Structure

Receipts will be organized by creditor for easy retrieval:

```
credit-payments/
├── [creditor_id]/
│   ├── [payment_id]_receipt_[timestamp].jpg
│   ├── [payment_id]_receipt_[timestamp].pdf
│   └── ...
├── CRED-1234/
│   ├── payment_abc123_receipt_2024-01-15.jpg
│   └── payment_def456_receipt_2024-01-20.pdf
└── CRED-5678/
    └── payment_ghi789_receipt_2024-01-25.pdf
```

## Step 4: Receipt URL Format

After upload, receipts can be accessed at:

```
https://[PROJECT_ID].supabase.co/storage/v1/object/public/credit-payments/[creditor_id]/[filename]
```

**Example:**
```
https://abc123def456.supabase.co/storage/v1/object/public/credit-payments/CRED-1234/payment_abc123_receipt_2024-01-15.jpg
```

## Step 5: StorageService Implementation

The backend already has receipt upload configured. Here's what's happening:

### File Upload Location (in routes):
```typescript
// In /backend/src/routes/credit.routes.ts
receiptUrl = await storageService.uploadFile(
  receiptFile,
  `credit-payments/${creditorId}`  // Organized by creditor
);
```

### What Gets Stored:
- **Path**: `credit-payments/{creditor_id}/`
- **Filename**: Auto-generated with timestamp
- **Formats Accepted**: JPG, PNG, PDF (up to 5MB)
- **URL**: Saved to `credit_payments.receipt_url` column

## Step 6: Receipt Access & Display

### View Receipt in Admin Payment Details:
```typescript
// Receipt URL is displayed in payment modal
{receipt_url && (
  <a href={receipt_url} target="_blank" rel="noopener noreferrer">
    📎 View Receipt
  </a>
)}
```

### Download Receipt:
Users can click the receipt URL to download directly from Supabase

### Audit Trail:
- Receipt upload logged in `credit_activities` table
- `details` column stores upload metadata (filename, size, mime type)
- Timestamps track when receipt was uploaded

## Database Integration

### credit_payments table includes:
```sql
receipt_url TEXT  -- URL to stored receipt
```

### credit_activities logs include:
```json
{
  "action": "PAYMENT_RECORDED",
  "receipt_filename": "payment_abc123_2024-01-15.jpg",
  "receipt_size": 245000,
  "mime_type": "image/jpeg"
}
```

## Security Features

✅ **Public readable** - Anyone with URL can view receipts (for creditors)  
✅ **Authenticated upload** - Only staff can upload receipts  
✅ **Service role access** - Backend can manage all receipts  
✅ **File size limit** - 5MB max per receipt  
✅ **Audit trail** - All uploads logged with timestamp  
✅ **Organized by creditor** - Easy to find all receipts for one customer  

## Frontend Receipt Management

### Sales Staff:
- Uploads receipt when recording payment (POS/Online Transfer)
- Can view receipt URL in payment confirmation

### Admin:
- Views receipt in payment details modal before approval
- Can click to download/view receipt

### Creditor (if given access):
- Can view their own payment receipts via creditor portal (future enhancement)

## Manual Testing

1. **Create a test payment** with receipt upload
2. Go to Supabase **Storage** → `credit-payments` bucket
3. Verify receipt file appears in creditor folder
4. Click file → View credentials → **Public URL** to verify access
5. Copy URL and paste in browser to confirm it loads

## Common Issues & Solutions

### Issue: Receipt upload fails
**Solution:** Check file size < 5MB, verify bucket is public

### Issue: Receipt URL 404 error
**Solution:** Verify bucket exists and is public in Supabase console

### Issue: Can't see receipts in admin panel
**Solution:** Check `receipt_url` column in `credit_payments` table has data

### Issue: Storage quota exceeded
**Solution:** Enable billing in Supabase for unlimited storage
