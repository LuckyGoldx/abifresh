# Creating Superadmin Account: luckygold

**Issue**: The `users` table doesn't have a password column - authentication is managed by Supabase Auth separately.

**Solution**: Create both the Supabase Auth user AND the user profile in one step.

---

## Option 1: Using Node.js Script (RECOMMENDED)

### Prerequisites
- Node.js installed
- `@supabase/supabase-js` package available

### Setup

1. **Get your Supabase credentials** from Supabase Dashboard:
   - Project URL
   - Service Role Key (from Project Settings → API → Service role secret)

2. **Set environment variables** (PowerShell):
   ```powershell
   $env:SUPABASE_URL = "https://your-project.supabase.co"
   $env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
   ```

   Or (Command Prompt):
   ```cmd
   set SUPABASE_URL=https://your-project.supabase.co
   set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Run the script**:
   ```bash
   node create-superadmin.js
   ```

---

## Option 2: Using Supabase CLI

```bash
# Install Supabase CLI (if needed)
npm install -g supabase

# Login to your Supabase project
supabase login

# Create Auth user
supabase auth admin create-user --email luckygold@abifresh.com --password "#lucky5788"

# Note: Save the returned user ID, then run the SQL below
```

Then create the profile with SQL (replace `USER_ID_HERE` with the returned ID):

```sql
INSERT INTO public.users (
  id,
  email,
  full_name,
  username,
  role,
  is_active,
  phone_number,
  store_location,
  created_at
) VALUES (
  'USER_ID_HERE',  -- Replace with actual UUID from Supabase Auth
  'luckygold@abifresh.com',
  'Lucky Gold - Superadmin',
  'luckygold',
  'superadmin',
  true,
  '+234802000000',
  'Jalingo',
  NOW()
);
```

---

## Option 3: Using Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Create user"
3. Enter:
   - Email: `luckygold@abifresh.com`
   - Password: `#lucky5788`
   - Auto Confirm User: ✓
4. Click "Create user"
5. For Save the User ID (UUID)
6. Then run the SQL from Option 2 to create the profile

---

## Option 4: Via Backend API

If your backend has a registration endpoint:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "luckygold@abifresh.com",
    "password": "#lucky5788",
    "fullName": "Lucky Gold - Superadmin",
    "role": "superadmin",
    "customUsername": "luckygold",
    "phoneNumber": "+234802000000"
  }'
```

---

## Verification

After creation, verify the account:

```sql
SELECT id, email, username, full_name, role, is_active, created_at 
FROM public.users 
WHERE email = 'luckygold@abifresh.com' OR username = 'luckygold';
```

---

## Login Test

**Login Credentials:**
- Username/Email: `luckygold` or `luckygold@abifresh.com`
- Password: `#lucky5788`

---

## Troubleshooting

### "Email already exists"
- The email is already registered in Supabase Auth
- Use a different email or delete the existing auth user first

### "User profile not found after login"
- The SQL INSERT didn't run or failed
- Manually run the SQL INSERT from Option 2

### "Authentication fails but profile exists"
- Auth user wasn't created in Supabase Auth
- Try Option 3 (Supabase Dashboard) to create the auth user manually
