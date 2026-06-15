# Image Upload Fix - Complete Guide

## Problem
When trying to upload an image in `/admin/inventory`, you get this error:
```
Failed to upload image: JSON.parse: unexpected character at line 1 column 1 of the JSON data
```

## Root Cause
The `product-images` storage bucket doesn't exist in Supabase yet. The SQL migration that creates this bucket hasn't been run.

## Solution - Two Steps

### Step 1: Run the SQL Migration in Supabase (IMPORTANT!)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. select your ABIFRESH project
3. Click on **SQL Editor** (left sidebar)
4. Click **+ New Query**
5. Copy and paste the **entire content** of this file from your workspace:
   - File: `INVENTORY_SCHEMA_UPDATE.sql`
   - Location: `C:\Users\LuckyGold\Desktop\AKV\INVENTORY_SCHEMA_UPDATE.sql`

6. Click **Run** (or Cmd+Enter)
7. You should see successful messages indicating:
   - ✅ New columns added to items table
   - ✅ Storage bucket created
   - ✅ Policies configured

**⚠️ CRITICAL: You MUST complete this step for image uploads to work!**

### Step 2: Backend is Already Updated

The backend has been updated with:
- ✅ Automatic storage bucket initialization on startup (creates bucket if it doesn't exist)
- ✅ Improved error logging for debugging
- ✅ Better error messages in responses
- ✅ Proper JSON error handling

The backend is currently running on port 5000 with these improvements.

## If Upload Still Fails After Running SQL

Try these steps:

1. **Clear browser cache**
   - Hard refresh the page: `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)

2. **Restart frontend**
   - The frontend should auto-reload, but if not:
   - Terminal: Kill the `npm run dev` process running on port 3000
   - Restart: `cd frontend && npm run dev`

3. **Check credentials**
   - Ensure your `.env.local` file in `/frontend` has correct Supabase URL and ANON_KEY
   - Ensure your `.env.local` file in `/backend` has correct SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

4. **Check Supabase Policies**
   - In Supabase Dashboard, go to **Storage** → **product-images** bucket
   - Click **Policies** tab
   - Verify these policies exist (if not, they should be created by the SQL migration):
     - `Allow authenticated uploads`
     - `Allow public read access`
     - `Allow authenticated updates`
     - `Allow authenticated deletes`

## Testing the Fix

After running the SQL migration:

1. Go to `http://localhost:3000/admin/inventory`
2. Click **Add New Item**
3. Fill in the form (you can use the cascading dropdowns we fixed earlier)
4. Click the image upload button
5. Select a PNG, JPG, WebP, or GIF image (max 5MB)
6. The image should upload successfully and show a preview

## What Was Changed in Backend

### New File: `/backend/src/config/storage-init.ts`
- Automatically creates the `product-images` bucket on backend startup
- Checks if bucket exists before creating (won't fail if already exists)
- Logs progress for debugging

### Updated File: `/backend/src/index.ts`
- Calls storage initialization on server startup
- Ensures bucket exists before accepting uploads

### Updated File: `/backend/src/routes/inventory.routes.ts`
- Added comprehensive error logging
- Better error messages for debugging
- Proper JSON response format

## Troubleshooting

If you still get JSON.parse errors:

1. **Check backend logs** - Open terminal where backend is running and look for error messages
2. **Check Supabase logs** - Go to Supabase Dashboard → Logs to see storage operation errors
3. **Verify auth token** - Make sure you're logged in as an admin user
4. **Check file size** - Image must be under 5MB
5. **Check file type** - Only JPEG, PNG, WebP, GIF allowed

## Next Steps

1. ✅ Run the SQL migration (most important!)
2. ✅ Test image upload
3. ✅ If errors persist, check the backend console logs for detailed error messages
