# COMMISSION COLUMN SCHEMA CACHE FIX - Step-by-Step Guide

## Problem
When commission staff try to make a sale, they get:
```
"Could not find the 'commission' column of 'staff_sales' in the schema cache"
```

## Root Cause
The `commission` column is **missing from the actual Supabase database**. The migration that created `staff_sales` (STAFF_STORE_MIGRATION.sql) didn't include it. A later migration (COMPLETE_SUPABASE_MIGRATION.sql) defined it, but since the table already existed, the column was never added.

---

## SOLUTION: 3-Step Fix (Recommended)

### Step 1: Run SQL to Add Missing Column + Reload Cache

**In Supabase Dashboard:**
1. Go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Paste this SQL:

```sql
-- STEP 1: Add commission column to staff_sales (if not already present)
ALTER TABLE IF EXISTS public.staff_sales 
ADD COLUMN IF NOT EXISTS commission DECIMAL(12, 2) DEFAULT 0;

-- STEP 2: Add sold_outside_jalingo column to staff_sales (related fix)
ALTER TABLE IF EXISTS public.staff_sales
ADD COLUMN IF NOT EXISTS sold_outside_jalingo BOOLEAN DEFAULT false;

-- STEP 3: Create index on commission for performance
CREATE INDEX IF NOT EXISTS idx_staff_sales_commission 
ON public.staff_sales(staff_id, commission);

-- STEP 4: CRITICAL - Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- STEP 5: Verify the columns now exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'staff_sales' AND column_name IN ('commission', 'sold_outside_jalingo')
ORDER BY ordinal_position;
```

4. Click **"Run"** (or Cmd+Enter)
5. Wait for completion — you should see results showing both columns exist

---

### Step 2: Restart Next.js Dev Server

**In PowerShell:**

```powershell
# Kill the dev server
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait 2 seconds
Start-Sleep 2

# Restart dev server
cd C:\Users\LuckyGold\Desktop\AKV\frontend
$env:NODE_OPTIONS="--max-old-space-size=4096"
node .\node_modules\next\dist\bin\next dev
```

Wait for it to finish compiling (look for "ready - started server on 0.0.0.0:3001")

---

### Step 3: Test the Fix

**In PowerShell (New Window):**

```powershell
# Login as admin first to check users
$body = '{"username":"admin","password":"admin123"}'
$resp = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/login' -Method POST -Body $body -ContentType 'application/json'
$token = $resp.token
$h = @{ 'Authorization' = "Bearer $token"; 'Accept' = 'application/json' }

# Check what commission staff users exist
$staff = Invoke-RestMethod -Uri 'http://localhost:3001/api/admin/staff' -Method GET -Headers $h
$staff | Where-Object { $_.role -eq 'commission_staff' } | ForEach-Object { "Username: $($_.username), Name: $($_.full_name), Role: $($_.role)" }
```

You should see commission staff users. Common ones:
- `commission` (role: commission_staff)
- `jane_commission` (role: commission_staff)
- `shadrack` (role: commission_staff)
- `ambrose` (role: commission_staff)

---

## Testing with Specific User

### If "commission" User Exists

```powershell
# Login as commission staff
$body = '{"username":"commission","password":"com123"}'
try {
  $resp = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/login' -Method POST -Body $body -ContentType 'application/json'
  $token = $resp.token
  "✅ Login successful - Role: $($resp.user.role)"
} catch {
  "❌ Login failed - Check if user exists"
}
```

### If Different User

```powershell
# Example with "shadrack" user
$body = '{"username":"shadrack","password":"admin123"}'  # or their actual password
$resp = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/login' -Method POST -Body $body -ContentType 'application/json'
$token = $resp.token
"✅ Login successful - Role: $($resp.user.role)"
```

---

## Full Test: Make a Sale as Commission Staff

```powershell
# 1. Login as commission staff
$body = '{"username":"commission","password":"com123"}'
$resp = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/login' -Method POST -Body $body -ContentType 'application/json'
$token = $resp.token
$h = @{ 'Authorization' = "Bearer $token"; 'Accept' = 'application/json' }

# 2. Check their staff store (to find item_id)
$store = Invoke-RestMethod -Uri 'http://localhost:3001/api/staff/store' -Method GET -Headers $h
"Staff store items: $($store.Count)"
if ($store.Count -gt 0) {
  $store[0]
}

# 3. If they have items, try to make a sale
if ($store.Count -gt 0) {
  $itemId = $store[0].item_id
  $saleBody = @{
    items = @(
      @{
        item_id = $itemId
        quantity = 1
        unit_price = 1000
        logistics_fee = 0
      }
    )
    payment_method = "cash"
    sold_outside_jalingo = $false
  } | ConvertTo-Json
  
  try {
    $sale = Invoke-RestMethod -Uri 'http://localhost:3001/api/staff/store/make-sales' `
      -Method POST -Body $saleBody -Headers $h -ContentType 'application/json'
    "✅ Sale created successfully!"
    $sale | ConvertTo-Json -Depth 5
  } catch {
    $s = $_.Exception.Response.GetResponseStream()
    $rd = [System.IO.StreamReader]::new($s)
    $error = $rd.ReadToEnd()
    $rd.Close()
    "❌ Sale failed: $error"
  }
}
```

---

## What If Step 1 Doesn't Work?

### If You Still Get the Schema Cache Error

The POST gREST schema cache might still be stale. Try **one of these:**

#### Option A: Use Admin Dashboard to Reload Cache
1. Go to Supabase Dashboard
2. Click **Settings** (bottom left)
3. Click **"Reload schema cache"** if available
4. Wait 10 seconds
5. Test again

#### Option B: Run Schema Reload Command in SQL Editor
```sql
NOTIFY pgrst, 'reload schema';
```

#### Option C: Restart Supabase Backend (Production)
- This is automatic via Supabase (no action needed)
- May take 5-10 minutes
- Test after wait

---

## Backup Solution: Use Route Without Commission Column

**If the schema cache issue persists**, use the backup route that doesn't store commission:

1. **Rename current route:**
   ```powershell
   mv "C:\Users\LuckyGold\Desktop\AKV\frontend\app\api\staff\store\make-sales\route.ts" `
      "C:\Users\LuckyGold\Desktop\AKV\frontend\app\api\staff\store\make-sales\route.ts.backup"
   ```

2. **Copy backup route:**
   ```powershell
   cp "C:\Users\LuckyGold\Desktop\AKV\BACKUP_make-sales_route_NO_COMMISSION_COLUMN.ts" `
      "C:\Users\LuckyGold\Desktop\AKV\frontend\app\api\staff\store\make-sales\route.ts"
   ```

3. **Restart dev server**
4. **Test again**

This route:
- ✅ Does NOT insert commission into staff_sales
- ✅ Calculates commission on-the-fly from items.commission
- ✅ Avoids schema cache issue completely
- ✅ Matches old backend's workaround

---

## Verification Checklist

After running this fix, you should be able to:

- [ ] **Admin can see staff members** → `GET /api/admin/staff`
- [ ] **Commission staff can login** → `POST /api/auth/login`
- [ ] **Commission staff can see their store** → `GET /api/staff/store`
- [ ] **Commission staff can make a sale** → `POST /api/staff/store/make-sales` ✅ **KEY TEST**
- [ ] **Sale record has commission field** → Check response includes commission
- [ ] **Non-commission staff can also make sales** (without commission) → `POST /api/staff/store/make-sales`
- [ ] **Dashboard shows commission** → `/api/staff/dashboard` returns `total_commission`

---

## Files Involved

| File | Purpose |
|------|---------|
| `FIX_COMMISSION_COLUMN_CACHE.sql` | SQL script to add column + reload cache |
| `BACKUP_make-sales_route_NO_COMMISSION_COLUMN.ts` | Alternative route without commission insert |
| `frontend/app/api/staff/store/make-sales/route.ts` | Current route (insert includes commission) |

---

## Summary

**You MUST run:**
1. SQL to add commission column + reload cache
2. Restart Next.js dev server
3. Test with commission staff user

**THEN Test:**
- Commission staff login ✅
- Make sale as commission staff ✅
- Check commission appears in response ✅

**If step 1 doesn't work:**
- Use Backup route (no commission column insert) ✅
