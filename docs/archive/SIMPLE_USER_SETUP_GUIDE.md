# SIMPLE USER SETUP - Using Supabase Dashboard UI

If the SQL script isn't working, follow these simple steps to create users manually using the Supabase Dashboard.

---

## Step 1: Go to Supabase Dashboard

1. Open browser: https://supabase.com/dashboard
2. Login to your account
3. Select your project

---

## Step 2: Create Users (One by One)

### Go to Authentication → Users → Click "+ Add user"

### User 1: Admin
- **Email:** `admin@abifresh.com`
- **Password:** `admin123`
- **Auto Confirm User:** ✓ (checked)
- Click "Create user"

### User 2: Sales
- **Email:** `sales@abifresh.com`
- **Password:** `sales123`
- **Auto Confirm User:** ✓ (checked)
- Click "Create user"

### User 3: Seller
- **Email:** `seller@abifresh.com`
- **Password:** `seller123`
- **Auto Confirm User:** ✓ (checked)
- Click "Create user"

### User 4: Staff Commission
- **Email:** `staff.comm@abifresh.com`
- **Password:** `staffcomm123`
- **Auto Confirm User:** ✓ (checked)
- Click "Create user"

### User 5: Staff Non-Commission
- **Email:** `staff@abifresh.com`
- **Password:** `staff123`
- **Auto Confirm User:** ✓ (checked)
- Click "Create user"

### User 6: Finance
- **Email:** `finance@abifresh.com`
- **Password:** `finance123`
- **Auto Confirm User:** ✓ (checked)
- Click "Create user"

---

## Step 3: Create User Profiles in Database

After creating all 6 auth users, run this SQL to create their profiles:

1. Go to **SQL Editor** in Supabase Dashboard
2. Click "+ New query"
3. Copy and paste this SQL:

```sql
-- First, make sure users table exists
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

-- Disable RLS for easier backend access
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Delete any existing profiles (if re-running)
DELETE FROM public.users;

-- Create profiles for each user
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
);

-- Verify all users created
SELECT 
  u.email,
  u.full_name,
  u.role,
  u.is_active,
  a.email_confirmed_at as confirmed,
  'SUCCESS' as status
FROM public.users u
JOIN auth.users a ON u.id = a.id
WHERE u.email LIKE '%@abifresh.com'
ORDER BY u.email;
```

4. Click "Run" button
5. Check results - should show 6 users with "SUCCESS" status

---

## Step 4: Verify Everything

### Check Authentication Tab
- Go to **Authentication** → **Users**
- Should see 6 users, all with "Email confirmed" status

### Check Database Tab
- Go to **Database** → **Tables** → **users**
- Click "Insert row" → Cancel (just checking table exists)
- Should see 6 rows in the table

---

## Step 5: Test Login

### Restart Backend
```powershell
# Stop all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait
Start-Sleep -Seconds 2

# Start backend
cd C:\Users\LuckyGold\Desktop\AKV\backend
node dist/index.js
```

### Start Frontend
```powershell
cd C:\Users\LuckyGold\Desktop\AKV\frontend
npm run dev
```

### Test in Browser
1. Open http://localhost:3000/login
2. Enter:
   - Email: `admin@abifresh.com`
   - Password: `admin123`
3. Click "Login"

**Expected Result:**
- ✅ Redirected to admin dashboard
- ✅ No "Invalid credentials" error

---

## If Still Having Issues

### Check Backend Logs
When you try to login, backend should show:
```
🔐 Login attempt for: admin@abifresh.com
Authenticating with Supabase...
✅ Supabase auth successful for user: <uuid>
✅ User profile retrieved: <uuid>, role: admin
```

### If Showing Different Errors:

**"❌ Supabase auth failed: Invalid login credentials"**
- Password is wrong
- User doesn't exist in auth.users
- Go back to Step 2 and recreate that user

**"❌ User profile not found in database"**
- User exists in auth.users but not in public.users
- Go back to Step 3 and run the SQL again

**"Cannot reach Supabase"**
- Project is paused - go to dashboard and click "Restore"
- Internet connection issue
- Check `.env` file has correct SUPABASE_URL

---

## Summary of All User Credentials

| Email | Password | Role | Dashboard |
|-------|----------|------|-----------|
| admin@abifresh.com | admin123 | admin | /admin/dashboard |
| sales@abifresh.com | sales123 | sales | /sales/dashboard |
| seller@abifresh.com | seller123 | sales | /sales/dashboard |
| staff.comm@abifresh.com | staffcomm123 | staff_commission | /staff/dashboard |
| staff@abifresh.com | staff123 | staff_non_commission | /staff/dashboard |
| finance@abifresh.com | finance123 | admin | /admin/dashboard |

---

**This method is simpler and more reliable than the SQL script!**

**Last Updated:** January 25, 2026
