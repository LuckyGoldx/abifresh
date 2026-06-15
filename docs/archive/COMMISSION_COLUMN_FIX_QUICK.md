# QUICK FIX: Commission Column Schema Cache Error

## ⚡ 5-Minute Quick Fix

### What's Broken
```
❌ Making a sale as commission staff → "Could not find the 'commission' column"
```

### Root Cause
The `commission` column doesn't exist in the `staff_sales` table in Supabase.

### The Fix (Copy-Paste Ready)

#### 1️⃣ Run This SQL in Supabase SQL Editor

**Go to:** Supabase Dashboard → SQL Editor → New Query

**Paste this entire block:**

```sql
-- Add missing commission column
ALTER TABLE IF EXISTS public.staff_sales 
ADD COLUMN IF NOT EXISTS commission DECIMAL(12, 2) DEFAULT 0;

-- Add related column
ALTER TABLE IF EXISTS public.staff_sales
ADD COLUMN IF NOT EXISTS sold_outside_jalingo BOOLEAN DEFAULT false;

-- Create performance index
CREATE INDEX IF NOT EXISTS idx_staff_sales_commission 
ON public.staff_sales(staff_id, commission);

-- CRITICAL: Reload PostgREST schema cache (this makes the column visible to API)
NOTIFY pgrst, 'reload schema';

-- Verify it worked
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'staff_sales' ORDER BY ordinal_position;
```

**Click:** ▶️ **Run** (or Cmd+Enter)

✅ **Expected result:** You'll see all columns listed, including `commission` and `sold_outside_jalingo`

---

#### 2️⃣ Create Test User (Optional But Recommended)

**Run this SQL immediately after:**

```sql
-- Create commission staff test user
INSERT INTO public.users (
  email, username, full_name, role, phone_number, store_location, is_active
) VALUES (
  'commission@test.com', 'commission', 'Commission Staff', 
  'commission_staff', '+2348012345681', 'Jalingo', true
) ON CONFLICT (username) DO UPDATE 
SET role = 'commission_staff', is_active = true;

-- Verify
SELECT id, username, email, role FROM public.users WHERE username = 'commission';
```

---

#### 3️⃣ Enable Login with Username/Password "com123"

**Edit:** `frontend/.env.local`

**Add this line:**
```
OVERRIDE_CREDS=admin:admin123,commission:com123,jane_commission:admin123
```

**This allows login with:**
- Username: `commission`
- Password: `com123`

---

#### 4️⃣ Restart Dev Server

**Kill current server:**
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 2
```

**Restart:**
```powershell
cd C:\Users\LuckyGold\Desktop\AKV\frontend
$env:NODE_OPTIONS="--max-old-space-size=4096"
node .\node_modules\next\dist\bin\next dev
```

Wait for: `✓ Ready in 1234ms`

---

### ✅ Test It (Copy-Paste)

```powershell
# 1. Login as commission staff
$creds = @{username="commission"; password="com123"} | ConvertTo-Json
$auth = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/login' -Method POST -Body $creds -ContentType 'application/json'
$token = $auth.token
$h = @{ 'Authorization' = "Bearer $token" }

# 2. Check dashboard
Invoke-RestMethod -Uri 'http://localhost:3001/api/staff/dashboard' -Headers $h | ConvertTo-Json

# 3. Check store items
$store = Invoke-RestMethod -Uri 'http://localhost:3001/api/staff/store' -Headers $h
"Items in store: $($store.Count)"

# 4. Make a test sale (if items exist)
if ($store.Count -gt 0) {
  $item = $store[0]
  $sale = @{
    items = @(@{
      item_id = $item.item_id
      quantity = 1
      unit_price = 1000
      logistics_fee = 0
    })
    payment_method = "cash"
    sold_outside_jalingo = $false
  } | ConvertTo-Json
  
  try {
    $result = Invoke-RestMethod -Uri 'http://localhost:3001/api/staff/store/make-sales' `
      -Method POST -Body $sale -Headers $h -ContentType 'application/json'
    "✅ SUCCESS! Sale created: $($result.count) items"
    $result.sales[0] | ConvertTo-Json
  } catch {
    $err = $_.Exception.Response.GetResponseStream()
    $reader = [System.IO.StreamReader]::new($err)
    "❌ ERROR: $($reader.ReadToEnd())"
    $reader.Close()
  }
}
```

---

## Verification Checklist

After fix, test these:

- [ ] **Login works** → `POST /api/auth/login` with username: commission
- [ ] **Dashboard loads** → `GET /api/staff/dashboard` shows no 500 error
- [ ] **Store visible** → `GET /api/staff/store` shows items
- [ ] **Sale succeeds** → `POST /api/staff/store/make-sales` returns 201 ✅
- [ ] **Commission in response** → Sale response includes `commission` field

If all pass: ✅ **FIXED**

---

## If Still Getting Error

### Try These (In Order)

**A. Clear Browser Cache**
```powershell
# Dev tools → Application → Clear all site data
# Then refresh http://localhost:3001
```

**B. Restart Completely**
```powershell
# Kill all node processes
Get-Process node | Stop-Process -Force

# Wait
Start-Sleep 5

# Restart dev server fresh
cd C:\Users\LuckyGold\Desktop\AKV\frontend
$env:NODE_OPTIONS="--max-old-space-size=4096"
node .\node_modules\next\dist\bin\next dev
```

**C. Check Column Actually Exists**
```sql
-- In Supabase SQL Editor
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'staff_sales'
ORDER BY ordinal_position;
```

If you don't see `commission` column here, the ALTER TABLE failed. Run it again.

**D. Reload Schema Cache Again**
```sql
NOTIFY pgrst, 'reload schema';
```

Wait 10 seconds before testing.

---

## Files Created

- `FIX_COMMISSION_COLUMN_CACHE.sql` — SQL commands
- `CREATE_COMMISSION_TEST_USER.sql` — Create test user
- `BACKUP_make-sales_route_NO_COMMISSION_COLUMN.ts` — Fallback route
- `FIX_COMMISSION_COLUMN_GUIDE.md` — Full detailed guide (this is the quick version)

---

## One-Liner Commands

**Just want to copy-paste everything?**

```powershell
# Kill server
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object { $_ | Stop-Process -Force }; Start-Sleep 2

# Modify .env.local (add override creds if not present)
$envPath = "C:\Users\LuckyGold\Desktop\AKV\frontend\.env.local"
$content = Get-Content $envPath -Raw
if ($content -notmatch "OVERRIDE_CREDS") {
  Add-Content $envPath "`nOVERRIDE_CREDS=admin:admin123,commission:com123,jane_commission:admin123"
  "✅ Updated .env.local"
}

# Restart server
cd C:\Users\LuckyGold\Desktop\AKV\frontend
$env:NODE_OPTIONS="--max-old-space-size=4096"
node .\node_modules\next\dist\bin\next dev
```

---

**Then in Supabase SQL Editor, run the SQL block above and test!**
