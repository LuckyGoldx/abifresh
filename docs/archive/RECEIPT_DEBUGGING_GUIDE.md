# Receipt Preview Debugging Guide

## Issue: Receipt preview showing blank/empty in /admin/payments

The fix includes enhanced debugging to help identify exactly where the problem is occurring.

---

## **Step 1: Check Frontend Debug Info**

After rebuilding, go to `/admin/payments`:

1. **Click "View" on a payment with a receipt**
2. **Scroll down to the Receipt section**
3. **Click "Debug Info"** to expand the debug panel
4. **Check what's shown:**
   - `url` - Should be a long Supabase URL (https://...)
   - `urlLength` - Should be > 100 (not 0 or null)
   - `isValidUrl` - Should be `true`

**If debug info shows:**
- ✅ `url: "https://xxx.supabase.co/storage/..."`  → Issue is not with URL storage
- ❌ `url: null` or `url: ""` → **Receipt URL not being saved to database**
- ❌ `isValidUrl: false` → **URL format is wrong**

---

## **Step 2: Check Browser Console**

Press **F12** to open Developer Tools → **Console** tab

**Look for messages from the receipt image:**
- ✅ `✅ Receipt image loaded successfully` → Image loads fine, rendering issue
- ❌ `❌ Receipt image failed to load from: https://...` → **File not accessible or wrong URL**
- No messages → **Image element not rendering**

---

## **Step 3: Test URL Directly**

Copy the URL from the debug info and paste it in a new browser tab.

**What you should see:**
- ✅ **Image displays** → Supabase is serving it correctly, issue is rendering
- ❌ **Blank page** → Supabase has the file but can't serve it (permissions issue)
- ❌ **404 error** → File doesn't exist in bucket
- ❌ **JSON error** → Wrong bucket or API endpoint

---

## **Step 4: Check Backend Logs**

Watch the backend console when you submit a payment. Look for:

```
✅ Payment request created: {
  id: "...",
  amount: 3700,
  staff: "Seller Staff",
  method: "online",
  items: 2,
  receipt_url: "https://xxx.supabase.co/storage/v1/object/public/payments/receipt_xxx" or "No receipt uploaded"
}
```

**Meanings:**
- ✅ URL present → File uploaded successfully, issue is in displaying it
- ❌ "No receipt uploaded" → **File upload failed** - check upload error logs
- Check for `❌ File upload error:` messages above

---

## **Step 5: Common Issues & Solutions**

### Issue: `receipt_url: null` in debug, or "No receipt uploaded"

**Cause:** File failed to upload

**Solution:**
1. Check backend logs for `❌ File upload error:` messages
2. Ensure file size is < 5MB
3. Try uploading a different file type (JPG, PNG)
4. Check that `/sales/payments` or `/staffs/payments` shows upload field

### Issue: URL shows in debug but image still blank

**Cause:** Supabase bucket permissions not fully set

**Solution:** Run this SQL again in Supabase SQL Editor:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('payments', 'payments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Enable RLS (Row Level Security)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'payments');

-- Authenticated upload policy  
CREATE POLICY "Authenticated upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payments' AND auth.role() = 'authenticated');
```

### Issue: "Image not found" placeholder shows

**Cause:** URL exists but file not in bucket

**Solution:**
1. Check Supabase dashboard Storage → payments bucket
2. Verify files are actually there
3. Check file names match what's in database
4. Delete database record and upload receipt again

---

## **What to Check Systematically**

```
┌─────────────────────────────────────┐
│  Is receipt_url in database?        │
│  (Check debug info in modal)        │
├─────────────────────────────────────┤
│  ❌ NO  → Upload failed              │
│          Check backend upload logs   │
├─────────────────────────────────────┤
│  ✅ YES → Is URL format correct?     │
│          Should start with https://   │
├─────────────────────────────────────┤
│  ❌ NO  → URL generation issue       │
│          Check SUPABASE_URL env var  │
├─────────────────────────────────────┤
│  ✅ YES → Does file exist in bucket? │
│          Test URL directly in browser│
├─────────────────────────────────────┤
│  ❌ NO  → Upload succeeded but file  │
│          not saved. Check perms.     │
├─────────────────────────────────────┤
│  ✅ YES → Does image display?        │
│          Check browser console logs  │
├─────────────────────────────────────┤
│  ❌ NO  → Rendering/CSS issue        │
│          Check React component       │
└─────────────────────────────────────┘
```

---

## **Quick Checklist**

After making a new payment with receipt:

- [ ] Backend shows: `receipt_url: "https://xxx.supabase.co/..."` in logs
- [ ] Frontend debug shows URL is not null/empty
- [ ] Opening receipt URL directly in browser shows image
- [ ] Browser console shows "✅ Receipt image loaded successfully"
- [ ] Receipt thumbnail displays in admin modal
- [ ] Fullscreen view button opens with image

---

## **Report Issues With**

When troubleshooting, provide:

1. **Backend console output** when payment is submitted
2. **Frontend debug info** from the Debug Info section
3. **What happens when you visit receipt URL directly** (blank, 404, image, etc.)
4. **Browser console errors** (F12 → Console)
5. **Supabase Storage** verification (is file actually there?)

---

## **Quick Test**

1. Go to `/sales/payments`
2. Submit payment with ANY receipt file
3. Go to `/admin/payments`
4. Expand Debug Info
5. Copy receipt_url
6. Paste in new browser tab
7. Does image display? 
   - YES → Issue is React rendering
   - NO → Issue is Supabase file/permissions

