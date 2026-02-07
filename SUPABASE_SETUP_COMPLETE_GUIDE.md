# Complete Supabase Setup Guide
**ABIFRESH & KIDDIES VENTURES**

---

## 📋 Table of Contents
1. [Run SQL Script to Create Users](#step-1-run-sql-script)
2. [Set Up Row Level Security (RLS)](#step-2-set-up-rls)
3. [Verify Connection](#step-3-verify-connection)
4. [Test All Endpoints](#step-4-test-endpoints)
5. [Troubleshooting](#troubleshooting)

---

## Step 1: Run SQL Script to Create Users

### Option A: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `cifzlksxpjghpgxhrwkg`

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Copy and Run the Script**
   - Open the file: `SUPABASE_FRESH_USER_SETUP.sql`
   - Copy ALL the content
   - Paste into the SQL Editor
   - Click "Run" button (or press Ctrl+Enter)

4. **Verify Success**
   - Scroll down to see query results
   - You should see 6 users listed in two tables
   - Check for any error messages

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Run the SQL script
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.cifzlksxpjghpgxhrwkg.supabase.co:5432/postgres" < SUPABASE_FRESH_USER_SETUP.sql
```

---

## Step 2: Set Up Row Level Security (RLS)

### 2.1: Disable RLS for Users Table (Simplest Approach)

**In Supabase Dashboard:**

1. Go to **Database** → **Tables**
2. Find the `users` table
3. Click on the table name
4. Go to **Settings** tab
5. Find "Enable Row Level Security (RLS)"
6. **Toggle it OFF** (disable)
7. Click "Save"

**OR run this SQL:**

```sql
-- Disable RLS on users table (allows backend to query freely)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

### 2.2: Create RLS Policies (Advanced - Optional)

If you want to keep RLS enabled, create these policies:

```sql
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow service role to do everything
CREATE POLICY "Service role has full access" ON public.users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy 2: Users can read their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 3: Users can update their own data
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 4: Allow authenticated users to read all users (for admin features)
CREATE POLICY "Authenticated users can view all users" ON public.users
  FOR SELECT
  USING (auth.role() = 'authenticated');
```

---

## Step 3: Verify Supabase Connection

### 3.1: Check Backend Environment Variables

Open `backend/.env` and verify:

```env
SUPABASE_URL=https://cifzlksxpjghpgxhrwkg.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...  # Your anon key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # Your service role key
```

**How to get these keys:**
1. Supabase Dashboard → Settings → API
2. Copy "Project URL" → paste as `SUPABASE_URL`
3. Copy "anon public" key → paste as `SUPABASE_ANON_KEY`
4. Copy "service_role secret" key → paste as `SUPABASE_SERVICE_ROLE_KEY`

### 3.2: Test Supabase Connection

**Create a test script:**

```javascript
// test-supabase-connection.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cifzlksxpjghpgxhrwkg.supabase.co';
const supabaseKey = 'YOUR_SERVICE_ROLE_KEY_HERE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...\n');
  
  // Test 1: Check if we can query users table
  console.log('Test 1: Query users table');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('email, role');
  
  if (usersError) {
    console.error('❌ Failed:', usersError.message);
  } else {
    console.log('✅ Success! Found', users.length, 'users');
    users.forEach(u => console.log(`  - ${u.email} (${u.role})`));
  }
  
  console.log('\nTest 2: Test authentication');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@abifresh.com',
    password: 'admin123'
  });
  
  if (authError) {
    console.error('❌ Auth failed:', authError.message);
  } else {
    console.log('✅ Auth successful! User ID:', authData.user.id);
  }
}

testConnection();
```

**Run the test:**
```bash
node test-supabase-connection.js
```

---

## Step 4: Test All Endpoints

### 4.1: Restart Backend Server

```bash
cd C:\Users\LuckyGold\Desktop\AKV\backend
npm run build
node dist/index.js
```

Expected output:
```
✅ Server running on port 5000
📍 Environment: production
🔗 Health check: http://localhost:5000/health
```

### 4.2: Test Login Endpoint

**Using PowerShell:**

```powershell
# Test admin login
$body = @{email="admin@abifresh.com"; password="admin123"} | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:5000/api/auth/login -Method POST -Headers @{"Content-Type"="application/json"} -Body $body -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**Expected Response:**
```json
{
  "user": {
    "id": "...",
    "email": "admin@abifresh.com",
    "full_name": "Admin User",
    "role": "admin",
    "is_active": true,
    "store_location": "Jalingo"
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Login successful"
}
```

### 4.3: Test All 6 Users

```powershell
# Test all users
$users = @(
  @{email="admin@abifresh.com"; password="admin123"},
  @{email="sales@abifresh.com"; password="sales123"},
  @{email="seller@abifresh.com"; password="seller123"},
  @{email="staff.comm@abifresh.com"; password="staffcomm123"},
  @{email="staff@abifresh.com"; password="staff123"},
  @{email="finance@abifresh.com"; password="finance123"}
)

foreach ($user in $users) {
  Write-Host "`nTesting: $($user.email)" -ForegroundColor Cyan
  $body = $user | ConvertTo-Json
  try {
    $response = Invoke-WebRequest -Uri http://localhost:5000/api/auth/login -Method POST -Headers @{"Content-Type"="application/json"} -Body $body -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    Write-Host "  ✅ Success! Role: $($result.user.role)" -ForegroundColor Green
  } catch {
    Write-Host "  ❌ Failed: $_" -ForegroundColor Red
  }
}
```

### 4.4: Test Inventory Endpoint

```powershell
# First login to get token
$loginBody = @{email="admin@abifresh.com"; password="admin123"} | ConvertTo-Json
$loginResponse = Invoke-WebRequest -Uri http://localhost:5000/api/auth/login -Method POST -Headers @{"Content-Type"="application/json"} -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token

# Test inventory endpoint
$headers = @{
  "Content-Type"="application/json"
  "Authorization"="Bearer $token"
}
Invoke-WebRequest -Uri http://localhost:5000/api/inventory/items -Method GET -Headers $headers -UseBasicParsing | Select-Object -ExpandProperty Content
```

---

## Step 5: Test Frontend Login

### 5.1: Start Frontend

```bash
cd C:\Users\LuckyGold\Desktop\AKV\frontend
npm run dev
```

### 5.2: Test Login in Browser

1. Open http://localhost:3000/login
2. Enter credentials:
   - Email: `admin@abifresh.com`
   - Password: `admin123`
3. Click "Login"

**Expected Behavior:**
- ✅ No errors in browser console
- ✅ Redirected to `/admin/dashboard`
- ✅ User info displayed in header
- ✅ Sidebar shows admin menu items

**Check Browser Console (F12):**
- Should see: "Login successful"
- Should NOT see: "Invalid credentials"
- Should NOT see: "Network error"

---

## Troubleshooting

### Issue 1: "Invalid credentials" Error

**Possible Causes:**
- Users not created in Supabase
- Password mismatch
- RLS blocking queries

**Solutions:**

1. **Verify users exist in Supabase:**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT email, email_confirmed_at FROM auth.users;
   SELECT email, role FROM public.users;
   ```

2. **Reset a user's password manually:**
   ```sql
   -- Update password for admin user
   UPDATE auth.users
   SET encrypted_password = crypt('admin123', gen_salt('bf'))
   WHERE email = 'admin@abifresh.com';
   ```

3. **Check RLS is disabled:**
   ```sql
   -- Check RLS status
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' AND tablename = 'users';
   
   -- Should show: rowsecurity = false
   -- If true, disable it:
   ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
   ```

### Issue 2: "Network Error" or "Supabase Unavailable"

**Solutions:**

1. **Check Supabase project status:**
   - Go to Supabase Dashboard
   - Check if project is paused (free tier auto-pauses after 7 days)
   - Click "Restore" if paused

2. **Verify environment variables:**
   - Check `backend/.env` has correct `SUPABASE_URL`
   - Check `SUPABASE_SERVICE_ROLE_KEY` is correct
   - Restart backend after changing `.env`

3. **Test connection manually:**
   ```bash
   curl https://cifzlksxpjghpgxhrwkg.supabase.co/rest/v1/
   ```
   - Should return: `{"message":"Welcome to PostgREST"}`

### Issue 3: Backend Logs Show "User profile not found"

**This means:**
- User exists in `auth.users` but not in `public.users`

**Solution:**
```sql
-- Manually sync user profiles
INSERT INTO public.users (id, email, full_name, role, is_active, store_location)
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name',
  'admin',  -- Change this for each user
  true,
  'Jalingo'
FROM auth.users
WHERE email = 'admin@abifresh.com'
ON CONFLICT (id) DO NOTHING;
```

### Issue 4: CORS Errors in Browser

**Solution:**

Check `backend/src/index.ts` has proper CORS config:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

Restart backend after changes.

---

## ✅ Final Checklist

After setup, verify:

- [ ] SQL script ran without errors
- [ ] All 6 users visible in Supabase Dashboard → Authentication
- [ ] All 6 users visible in Supabase Dashboard → Database → users table
- [ ] RLS disabled on users table (or policies created)
- [ ] Backend starts without errors
- [ ] Can login via PowerShell/curl
- [ ] Can login via frontend
- [ ] Backend logs show: `✅ Supabase auth successful`
- [ ] Backend logs show: `✅ User profile retrieved`
- [ ] Inventory endpoint returns data
- [ ] Theme toggle works
- [ ] JWT token expires in 30 days

---

## 📞 Quick Reference

### Test Commands

```bash
# Rebuild backend
cd backend && npm run build

# Start backend
node dist/index.js

# Start frontend
cd frontend && npm run dev

# Test login (PowerShell)
$body = '{"email":"admin@abifresh.com","password":"admin123"}' ; Invoke-WebRequest -Uri http://localhost:5000/api/auth/login -Method POST -Headers @{"Content-Type"="application/json"} -Body $body -UseBasicParsing | % Content | ConvertFrom-Json
```

### User Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@abifresh.com | admin123 | admin |
| sales@abifresh.com | sales123 | sales |
| seller@abifresh.com | seller123 | sales |
| staff.comm@abifresh.com | staffcomm123 | staff_commission |
| staff@abifresh.com | staff123 | staff_non_commission |
| finance@abifresh.com | finance123 | admin |

---

**Last Updated:** January 25, 2026  
**Version:** 3.0.0 (Fresh User Setup)
