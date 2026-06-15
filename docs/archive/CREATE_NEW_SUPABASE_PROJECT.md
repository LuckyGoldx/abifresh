# 🚀 Create New Supabase Project & Connect

## Step 1: Create New Supabase Project

### 1.1: Go to Supabase Dashboard
1. Open browser: https://supabase.com/dashboard
2. Click "+ New Project"

### 1.2: Fill Project Details
- **Name:** `ABI Fresh Kiddies` (or any name you prefer)
- **Database Password:** Create a strong password (SAVE THIS!)
- **Region:** Choose closest to you (e.g., `West US`, `East US`, `Europe West`)
- **Plan:** Free (or paid if you prefer)

### 1.3: Click "Create New Project"
- Wait 2-3 minutes for project to be created
- You'll see a loading screen

---

## Step 2: Get Your New Project Credentials

### 2.1: Once Project is Ready
1. Go to **Settings** → **API** (in left sidebar)

### 2.2: Copy These Values:

**Project URL:**
```
https://xxxxxxxxxxxxx.supabase.co
```
Copy the entire URL

**API Keys:**

**anon public:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...
```
Copy the entire key (it's very long)

**service_role secret:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...
```
Copy the entire key (it's also very long)

---

## Step 3: Update Backend .env File

### 3.1: Open File
Open: `C:\Users\LuckyGold\Desktop\AKV\backend\.env`

### 3.2: Replace These Lines:
```env
SUPABASE_URL=https://YOUR_NEW_PROJECT_URL_HERE.supabase.co
SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_NEW_SERVICE_ROLE_KEY_HERE
```

**Example (with your new values):**
```env
# Backend Configuration
NODE_ENV=production
PORT=5000

# Supabase Configuration
SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3BxcnN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAxNTU3NjAwMH0.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3BxcnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDE1NTc2MDAwfQ.YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY

# JWT Configuration
JWT_SECRET=abifresh-kiddies-ventures-super-secret-key-2026-production-ready
JWT_EXPIRY=30d

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Logging
LOG_LEVEL=info
```

### 3.3: Save the File
Press `Ctrl+S`

---

## Step 4: Create Database Tables

### 4.1: Go to SQL Editor
1. In Supabase Dashboard → Click **SQL Editor**
2. Click "+ New query"

### 4.2: Create Users Table
Copy and paste this SQL:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'sales', 'staff_commission', 'staff_non_commission')),
  is_active BOOLEAN DEFAULT true,
  store_location TEXT DEFAULT 'Jalingo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Disable RLS for easier backend access
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Verify table created
SELECT * FROM public.users;
```

### 4.3: Click "Run"
- Should show: "Success. No rows returned"

---

## Step 5: Create All 6 Users

### Method A: Using Dashboard UI (Easier)

#### Create Each User:

**User 1:**
1. Go to **Authentication** → **Users**
2. Click "+ Add user"
3. Fill:
   - Email: `admin@abifresh.com`
   - Password: `admin123`
   - Auto Confirm User: ✓
4. Click "Create user"

**Repeat for:**
- `sales@abifresh.com` / `sales123`
- `seller@abifresh.com` / `seller123`
- `staff.comm@abifresh.com` / `staffcomm123`
- `staff@abifresh.com` / `staff123`
- `finance@abifresh.com` / `finance123`

#### Then Create Profiles:
Go to **SQL Editor** → New query → Paste:

```sql
-- Create user profiles
INSERT INTO public.users (id, email, full_name, role, is_active, store_location)
SELECT 
  id,
  email,
  CASE email
    WHEN 'admin@abifresh.com' THEN 'Admin User'
    WHEN 'sales@abifresh.com' THEN 'Sales Representative'
    WHEN 'seller@abifresh.com' THEN 'Seller User'
    WHEN 'staff.comm@abifresh.com' THEN 'Staff Commission'
    WHEN 'staff@abifresh.com' THEN 'Staff User'
    WHEN 'finance@abifresh.com' THEN 'Finance Manager'
  END as full_name,
  CASE email
    WHEN 'admin@abifresh.com' THEN 'admin'
    WHEN 'sales@abifresh.com' THEN 'sales'
    WHEN 'seller@abifresh.com' THEN 'sales'
    WHEN 'staff.comm@abifresh.com' THEN 'staff_commission'
    WHEN 'staff@abifresh.com' THEN 'staff_non_commission'
    WHEN 'finance@abifresh.com' THEN 'admin'
  END as role,
  true as is_active,
  'Jalingo' as store_location
FROM auth.users
WHERE email IN (
  'admin@abifresh.com',
  'sales@abifresh.com',
  'seller@abifresh.com',
  'staff.comm@abifresh.com',
  'staff@abifresh.com',
  'finance@abifresh.com'
)
ON CONFLICT (id) DO NOTHING;

-- Verify all users created
SELECT u.email, u.full_name, u.role, u.is_active
FROM public.users u
ORDER BY u.email;
```

Click "Run" - should show 6 users!

---

### Method B: SQL Script (Faster but Advanced)

**Note:** This method might not work on newer Supabase versions. If you get errors, use Method A instead.

Go to **SQL Editor** → Paste the entire content of `SUPABASE_FRESH_USER_SETUP.sql` → Click "Run"

---

## Step 6: Create Other Required Tables

### 6.1: Items Table
```sql
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  description TEXT DEFAULT '',
  commission_amount DECIMAL(10,2) DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.items DISABLE ROW LEVEL SECURITY;
```

### 6.2: Inventory Tables
```sql
-- Main store inventory
CREATE TABLE IF NOT EXISTS public.inventory_main_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active store inventory
CREATE TABLE IF NOT EXISTS public.inventory_active_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.inventory_main_store DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_active_store DISABLE ROW LEVEL SECURITY;
```

### 6.3: Sales Tables
```sql
-- Sales table
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  total_amount DECIMAL(10,2) NOT NULL,
  commission_earned DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales items
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;
```

### 6.4: Staff Tables
```sql
-- Posted items
CREATE TABLE IF NOT EXISTS public.posted_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  item_id UUID REFERENCES public.items(id),
  quantity INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment requests
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.posted_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
```

---

## Step 7: Restart Backend and Test

### 7.1: Stop All Servers
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### 7.2: Rebuild Backend
```powershell
cd C:\Users\LuckyGold\Desktop\AKV\backend
npm run build
```

### 7.3: Start Backend
```powershell
cd C:\Users\LuckyGold\Desktop\AKV\backend
node dist/index.js
```

Expected output:
```
✅ Server running on port 5000
📍 Environment: production
🔗 Health check: http://localhost:5000/health
```

### 7.4: Test Login
In another terminal:
```powershell
$body = '{"email":"admin@abifresh.com","password":"admin123"}'
Invoke-RestMethod -Uri http://localhost:5000/api/auth/login -Method POST -ContentType "application/json" -Body $body
```

Expected output:
```
user         : @{id=...; email=admin@abifresh.com; full_name=Admin User; role=admin; ...}
token        : eyJhbGci...
message      : Login successful
```

### 7.5: Start Frontend
```powershell
cd C:\Users\LuckyGold\Desktop\AKV\frontend
npm run dev
```

### 7.6: Test in Browser
1. Go to http://localhost:3000/login
2. Login with `admin@abifresh.com` / `admin123`
3. Should redirect to dashboard!

---

## ✅ Verification Checklist

After completing all steps:

- [ ] New Supabase project created
- [ ] Project URL and API keys copied
- [ ] Backend `.env` file updated with new credentials
- [ ] Users table created in Supabase
- [ ] All 6 auth users created in Supabase
- [ ] All 6 user profiles created in public.users table
- [ ] All other tables created (items, sales, etc.)
- [ ] Backend rebuilt and started successfully
- [ ] Login test via PowerShell works
- [ ] Login via browser works
- [ ] Redirected to correct dashboard

---

## 🐛 Troubleshooting

### "Cannot reach new Supabase URL"
- Check if project creation is complete (not still "Creating...")
- Wait 5 minutes after project creation
- Check if you're on same network (not switched to VPN)

### "Invalid credentials" after setup
- Verify users exist in **Authentication** → **Users**
- Verify profiles exist in **Database** → **users** table
- Check passwords are exactly: admin123, sales123, etc.

### "Table does not exist" errors
- Go back to Step 6 and run all table creation SQL
- Check **Database** → **Tables** to see if tables exist

### Backend still shows old Supabase URL
- Make sure you saved `.env` file
- Restart backend completely
- Check backend logs - should show new URL

---

## 📞 Quick Reference

### Test All Users After Setup:
```powershell
$users = @('admin@abifresh.com', 'sales@abifresh.com', 'seller@abifresh.com', 'staff.comm@abifresh.com', 'staff@abifresh.com', 'finance@abifresh.com')
$passwords = @('admin123', 'sales123', 'seller123', 'staffcomm123', 'staff123', 'finance123')

for ($i = 0; $i -lt $users.Length; $i++) {
  Write-Host "`nTesting: $($users[$i])" -ForegroundColor Cyan
  $body = "{`"email`":`"$($users[$i])`",`"password`":`"$($passwords[$i])`"}"
  try {
    $result = Invoke-RestMethod -Uri http://localhost:5000/api/auth/login -Method POST -ContentType "application/json" -Body $body
    Write-Host "✅ SUCCESS - Role: $($result.user.role)" -ForegroundColor Green
  } catch {
    Write-Host "❌ FAILED" -ForegroundColor Red
  }
}
```

---

**Good luck! Your new Supabase project will work perfectly! 🚀**

**Last Updated:** January 25, 2026
