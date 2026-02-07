# TROUBLESHOOTING: "Invalid Credentials" Issue

## Current Issue
You're getting "Invalid credentials" when trying to login, which means one of these problems:

1. **Supabase project is paused or unavailable**
2. **Users don't exist in Supabase database**
3. **Network connectivity issue**
4. **Wrong Supabase URL or keys in .env file**

---

## 🔍 STEP-BY-STEP DIAGNOSIS

### Step 1: Check if Supabase Project is Active

**Go to Supabase Dashboard:**
1. Open browser and go to: https://supabase.com/dashboard
2. Login with your account
3. Look for your project (should start with `cifzlksxpj...`)

**Check Project Status:**
- ✅ **ACTIVE**: Green indicator, no "Paused" message
- ❌ **PAUSED**: Red/orange indicator, "Project is paused" message

**If Paused:**
- Click "Restore Project" or "Resume" button
- Wait 2-3 minutes for project to fully restart
- Then proceed to next steps

---

### Step 2: Verify Supabase Connection Settings

**Check Your Project URL:**
1. In Supabase Dashboard → Settings → API
2. Look for "Project URL"
3. It should match what's in your backend `.env` file

**Open:**  `C:\Users\LuckyGold\Desktop\AKV\backend\.env`

**Verify these values:**
```env
SUPABASE_URL=https://cifzlksxpjghpgxhrwkg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Get the correct keys from Supabase:**
1. Supabase Dashboard → Settings → API
2. Copy "Project URL" → paste as `SUPABASE_URL`
3. Copy "anon public" key → paste as `SUPABASE_ANON_KEY`
4. Copy "service_role secret" key → paste as `SUPABASE_SERVICE_ROLE_KEY`

---

### Step 3: Check if Users Exist in Supabase

**Method 1: Via Supabase Dashboard**

1. Go to Supabase Dashboard
2. Click "Authentication" in left sidebar
3. Look for users in the list

**Expected Result:**
- Should see 6 users:
  - admin@abifresh.com
  - sales@abifresh.com
  - seller@abifresh.com
  - staff.comm@abifresh.com
  - staff@abifresh.com
  - finance@abifresh.com

**If no users found:**
- Proceed to Step 4 to create them

---

### Step 4: Create Users Using SQL Script

**Follow these steps exactly:**

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "+ New query" button

3. **Copy the SQL Script**
   - Open file: `SUPABASE_FRESH_USER_SETUP.sql`
   - Press Ctrl+A to select all
   - Press Ctrl+C to copy

4. **Paste and Run**
   - Paste into SQL Editor (Ctrl+V)
   - Click "Run" button at bottom right
   - Wait for execution (may take 5-10 seconds)

5. **Check Results**
   - Scroll down to see results
   - Should show "6 rows" or "Success" messages
   - If errors appear, see "Common Errors" section below

---

### Step 5: Verify Users Were Created

**Check Authentication Tab:**
1. Go to Authentication → Users
2. You should see 6 users now
3. Each should have "Email confirmed" status

**Check Database Tab:**
1. Go to Database → Tables
2. Click on "users" table
3. Should see 6 rows with roles

**If users still not showing:**
- See "Common Errors" section below

---

### Step 6: Test Login After Creating Users

**Restart Backend:**
```powershell
# Stop all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait a moment
Start-Sleep -Seconds 2

# Start backend
cd C:\Users\LuckyGold\Desktop\AKV\backend
node dist/index.js
```

**Wait for:**
```
✅ Server running on port 5000
📍 Environment: production
```

**Test Login via Frontend:**
1. Open http://localhost:3000/login
2. Enter:
   - Email: `admin@abifresh.com`
   - Password: `admin123`
3. Click Login

**Expected Result:**
- ✅ Redirected to `/admin/dashboard`
- ✅ User info shows in header
- ✅ No errors in browser console (F12)

**If still getting "Invalid credentials":**
- Check browser console (F12) for error messages
- Check backend terminal for error messages
- See "Common Errors" section below

---

## 🐛 COMMON ERRORS & SOLUTIONS

### Error 1: "relation 'auth.users' does not exist"

**Cause:** You're trying to insert into auth.users directly (not allowed in newer Supabase versions)

**Solution:** Use the Supabase Dashboard UI instead:

1. Go to Authentication → Users
2. Click "+ Add user"
3. Fill in:
   - Email: admin@abifresh.com
   - Password: admin123
   - Email Confirm: checked
   - Auto Confirm User: checked
4. Click "Create user"
5. Repeat for all 6 users

Then run this SQL to create profiles:
```sql
-- Create user profiles
INSERT INTO public.users (id, email, full_name, role, is_active, store_location)
VALUES 
  ((SELECT id FROM auth.users WHERE email = 'admin@abifresh.com'), 'admin@abifresh.com', 'Admin User', 'admin', true, 'Jalingo'),
  ((SELECT id FROM auth.users WHERE email = 'sales@abifresh.com'), 'sales@abifresh.com', 'Sales Representative', 'sales', true, 'Jalingo'),
  ((SELECT id FROM auth.users WHERE email = 'seller@abifresh.com'), 'seller@abifresh.com', 'Seller User', 'sales', true, 'Jalingo'),
  ((SELECT id FROM auth.users WHERE email = 'staff.comm@abifresh.com'), 'staff.comm@abifresh.com', 'Staff Commission', 'staff_commission', true, 'Jalingo'),
  ((SELECT id FROM auth.users WHERE email = 'staff@abifresh.com'), 'staff@abifresh.com', 'Staff User', 'staff_non_commission', true, 'Jalingo'),
  ((SELECT id FROM auth.users WHERE email = 'finance@abifresh.com'), 'finance@abifresh.com', 'Finance Manager', 'admin', true, 'Jalingo');
```

---

### Error 2: "permission denied for table users"

**Cause:** RLS (Row Level Security) is blocking queries

**Solution 1 - Disable RLS (Simplest):**
```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

**Solution 2 - Create RLS Policies:**
```sql
-- Allow service role full access
CREATE POLICY "Service role full access" ON public.users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

---

### Error 3: "table 'users' does not exist"

**Cause:** Users table hasn't been created yet

**Solution:** Create the users table first:
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

-- Create index for faster lookups
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- Disable RLS for simplicity
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

---

### Error 4: "Invalid credentials" but users exist

**Possible causes:**
1. Wrong password
2. Email not confirmed
3. User not active in public.users table

**Solution - Reset password manually:**
```sql
-- Reset admin password to admin123
UPDATE auth.users
SET 
  encrypted_password = crypt('admin123', gen_salt('bf')),
  email_confirmed_at = NOW()
WHERE email = 'admin@abifresh.com';
```

**Verify user is active:**
```sql
-- Check user status
SELECT email, is_active, role FROM public.users WHERE email = 'admin@abifresh.com';

-- If not active, activate it:
UPDATE public.users SET is_active = true WHERE email = 'admin@abifresh.com';
```

---

### Error 5: "fetch failed" or "ENOTFOUND"

**Cause:** Network cannot reach Supabase

**Possible reasons:**
1. Internet connection down
2. Supabase project paused
3. Firewall blocking request
4. VPN interfering

**Solutions:**
1. Check internet connection
2. Check Supabase project status (Step 1)
3. Try accessing Supabase Dashboard in browser
4. Disable VPN temporarily
5. Check Windows Firewall settings

---

## ✅ VERIFICATION CHECKLIST

After running the SQL script, verify all these:

- [ ] Supabase project is ACTIVE (not paused)
- [ ] Supabase Dashboard → Authentication shows 6 users
- [ ] Supabase Dashboard → Database → users table shows 6 rows
- [ ] All users have "Email confirmed" status
- [ ] Backend `.env` has correct SUPABASE_URL
- [ ] Backend `.env` has correct SUPABASE_ANON_KEY
- [ ] Backend `.env` has correct SUPABASE_SERVICE_ROLE_KEY
- [ ] RLS is disabled on users table OR policies are created
- [ ] Backend server is running (port 5000)
- [ ] Can access http://localhost:5000/health in browser

---

## 📞 QUICK REFERENCE COMMANDS

**Restart Everything:**
```powershell
# Stop all
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Start backend
cd C:\Users\LuckyGold\Desktop\AKV\backend
node dist/index.js

# In another terminal, start frontend
cd C:\Users\LuckyGold\Desktop\AKV\frontend
npm run dev
```

**Test Login:**
```powershell
# Test via API
$body = '{"email":"admin@abifresh.com","password":"admin123"}'
Invoke-RestMethod -Uri http://localhost:5000/api/auth/login -Method POST -ContentType "application/json" -Body $body
```

**Check Supabase Connection:**
```sql
-- In Supabase SQL Editor
SELECT email, role, is_active FROM public.users;
SELECT email, email_confirmed_at FROM auth.users WHERE email LIKE '%@abifresh.com';
```

---

## 🎯 EXPECTED FINAL STATE

After successful setup:

**Supabase Authentication Tab:**
```
✓ admin@abifresh.com (Confirmed)
✓ sales@abifresh.com (Confirmed)
✓ seller@abifresh.com (Confirmed)
✓ staff.comm@abifresh.com (Confirmed)
✓ staff@abifresh.com (Confirmed)
✓ finance@abifresh.com (Confirmed)
```

**Supabase public.users Table:**
```
| email                     | role                    | is_active |
|--------------------------|-------------------------|-----------|
| admin@abifresh.com       | admin                   | true      |
| sales@abifresh.com       | sales                   | true      |
| seller@abifresh.com      | sales                   | true      |
| staff.comm@abifresh.com  | staff_commission        | true      |
| staff@abifresh.com       | staff_non_commission    | true      |
| finance@abifresh.com     | admin                   | true      |
```

**Backend Logs (when testing login):**
```
🔐 Login attempt for: admin@abifresh.com
Authenticating with Supabase...
✅ Supabase auth successful for user: <uuid>
✅ User profile retrieved: <uuid>, role: admin
```

**Frontend:**
- Login works
- Redirects to correct dashboard
- No console errors

---

**If you still have issues after following all steps, check:**
1. Is Supabase project on free tier and paused?
2. Did SQL script run without errors?
3. Are passwords exactly: admin123, sales123, etc. (case-sensitive)?
4. Is backend reading from correct .env file?

**Last Updated:** January 25, 2026
