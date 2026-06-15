# 🔐 Supabase User Management Guide

## Complete Guide to Managing Users in Supabase

This guide shows how to add users, set roles, manage passwords, and test authentication in your ABIFRESH application.

---

## Part 1: Accessing Supabase Console

### Step 1: Open Supabase Dashboard
1. Go to https://app.supabase.com
2. Sign in with your account (email: provided credentials)
3. Select project: **Abifresh (akv)**
4. You'll see the dashboard with menu on left

### Step 2: Navigate to Authentication
1. Click **Authentication** in left sidebar
2. You'll see multiple tabs:
   - **Users** - All registered users
   - **Providers** - OAuth/Social login
   - **Policies** - RLS (Row Level Security)
   - **Settings** - Auth configuration

---

## Part 2: Adding New Users

### Method 1: Add User via Supabase Console (Recommended)

#### Step 1: Go to Users Tab
1. Click **Authentication** → **Users**
2. Click **Add User** button (top right)
3. Or click **Invite user** for email invitation

#### Step 2: Create User
```
Email:        admin@abifresh.com
Password:     [Leave auto-generated or enter custom]
Auto Confirm: Toggle ON (to confirm immediately)
```

**Important Fields:**
- **Email:** Must be unique
- **Password:** At least 6 characters (recommended: complex password)
- **Auto Confirm:** ON = user active immediately, OFF = requires email confirmation

#### Step 3: Set User Metadata/Role
After user is created:
1. Click on the user row to open details
2. Scroll down to **User metadata** section
3. Click **Edit** in user metadata
4. Add JSON:
```json
{
  "role": "admin",
  "full_name": "Admin User",
  "store_location": "Jalingo"
}
```
5. Click **Save**

#### Step 4: Link to Database
The user is now in Auth system. To link to your `users` table:
1. Go to **SQL Editor**
2. Run this query:
```sql
INSERT INTO users (id, email, full_name, role, is_active, store_location)
SELECT 
  id,
  email,
  'Admin User',
  'admin',
  true,
  'Jalingo'
FROM auth.users
WHERE email = 'admin@abifresh.com'
AND NOT EXISTS (
  SELECT 1 FROM users WHERE id = auth.users.id
);
```

### Method 2: Add via SQL (For Bulk Users)

1. Go to **SQL Editor** in Supabase console
2. Run this query:

```sql
-- First create auth user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@abifresh.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "admin", "full_name": "Admin User"}'::jsonb
);

-- Then create user profile
INSERT INTO users (
  id,
  email,
  full_name,
  role,
  is_active,
  store_location
)
SELECT 
  id,
  email,
  'Admin User',
  'admin',
  true,
  'Jalingo'
FROM auth.users
WHERE email = 'admin@abifresh.com';
```

**Note:** The `crypt()` function hashes the password securely. Password will be: `admin123`

---

## Part 3: Managing User Roles

### Available Roles in ABIFRESH

| Role | Description | Dashboard | Permissions |
|------|-------------|-----------|-------------|
| **admin** | Full access, analytics, reports | /admin/dashboard | All features |
| **sales** | Inventory & sales management | /sales/dashboard | Add items, record sales |
| **staff_commission** | Staff with commission tracking | /staff/dashboard | Commission view, commission section visible |
| **staff_non_commission** | Staff without commission | /staff/dashboard | Staff dashboard, commission section hidden |

### Update User Role

#### Via Console (UI)
1. **Authentication** → **Users**
2. Find user, click to open details
3. Scroll to **User metadata**
4. Click **Edit**, update role:
```json
{
  "role": "sales",
  "full_name": "Sales Person",
  "store_location": "Jalingo"
}
```
5. Click **Save**
6. Also update in `users` table (see below)

#### Via SQL
```sql
-- Update role in auth.users metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"sales"'::jsonb
)
WHERE email = 'sales@abifresh.com';

-- Update role in users table
UPDATE users
SET role = 'sales'
WHERE email = 'sales@abifresh.com';
```

---

## Part 4: Changing User Passwords

### Method 1: Reset Password (User Resets Own)

#### Via Console - Send Password Reset Email
1. **Authentication** → **Users**
2. Find user
3. Click **...** menu (three dots)
4. Click **Send password reset email**
5. User receives email with reset link

#### In Your App - Users Self-Service
Users can use `/forgot-password` page:
1. Enter their email
2. Click "Send Reset Link"
3. Check email for reset link
4. Click link (valid 24 hours)
5. Enter new password
6. Password updated

### Method 2: Admin Changes Password (Console)

1. **Authentication** → **Users**
2. Find user, click to expand
3. Click **Reset password** button
4. Enter new password
5. **Important:** User won't be notified - tell them the new password

### Method 3: Change via SQL

```sql
-- For Supabase, use the admin API
-- Update password hash using crypt
UPDATE auth.users
SET 
  encrypted_password = crypt('admin123', gen_salt('bf')),
  updated_at = now()
WHERE email = 'admin@abifresh.com';
```

### Method 4: User Changes Their Own Password (In App)

Users can go to **Account Settings** → **Change Password**:
1. Enter current password
2. Enter new password
3. Confirm new password
4. Click "Update Password"
5. Done - password changed

---

## Part 5: Complete User Setup Example

### Create 6 Test Users

#### User 1: Admin
```
Email:      admin@abifresh.com
Password:   admin123
Role:       admin
Full Name:  Admin User
```

**SQL:**
```sql
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), 'authenticated', 'authenticated',
  'admin@abifresh.com',
  crypt('admin123', gen_salt('bf')), now(),
  now(), now(),
  '{"role":"admin","full_name":"Admin User","store_location":"Jalingo"}'::jsonb
);

INSERT INTO users (id, email, full_name, role, is_active, store_location)
SELECT id, email, 'Admin User', 'admin', true, 'Jalingo'
FROM auth.users WHERE email = 'admin@abifresh.com';
```

#### User 2: Sales Person 1
```
Email:      sales@abifresh.com
Password:   sales123
Role:       sales
Full Name:  John Sales
```

#### User 3: Sales Person 2
```
Email:      seller@abifresh.com
Password:   seller123
Role:       sales
Full Name:  Mary Seller
```

#### User 4: Staff Commission
```
Email:      staff.comm@abifresh.com
Password:   staffcomm123
Role:       staff_commission
Full Name:  David Staff (Commission)
```

#### User 5: Staff Non-Commission
```
Email:      staff@abifresh.com
Password:   staff123
Role:       staff_non_commission
Full Name:  Sarah Staff
```

#### User 6: Finance (Optional)
```
Email:      finance@abifresh.com
Password:   finance123
Role:       admin (or create new "finance" role)
Full Name:  Finance Manager
```

---

## Part 6: Verify Users in Database

### Check Users in Supabase Console

#### View Auth Users
1. **Authentication** → **Users**
2. Table shows: Email, Created, Confirmed status
3. Click user to see full metadata

#### View User Profiles (Database)
1. Go to **SQL Editor**
2. Run query:
```sql
SELECT id, email, full_name, role, is_active, created_at
FROM users
ORDER BY created_at DESC;
```

3. Should show all users with their roles

#### Check Auth Metadata
```sql
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  created_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;
```

---

## Part 7: Login Testing Workflow

### Test Each User

#### Test Admin Login
1. Open http://localhost:3000/login
2. Email: `admin@abifresh.com`
3. Password: `admin123`
4. Expected: Redirects to `/admin/dashboard`
5. Should see: Analytics, reports, all features

#### Test Sales Login
1. Open http://localhost:3000/login
2. Email: `sales@abifresh.com`
3. Password: `sales123`
4. Expected: Redirects to `/sales/dashboard`
5. Should see: Inventory, sales features

#### Test Staff Commission Login
1. Open http://localhost:3000/login
2. Email: `staff.comm@abifresh.com`
3. Password: `staffcomm123`
4. Expected: Redirects to `/staff/dashboard`
5. Should see: Commission section visible

#### Test Staff Non-Commission Login
1. Open http://localhost:3000/login
2. Email: `staff@abifresh.com`
3. Password: `staff123`
4. Expected: Redirects to `/staff/dashboard`
5. Should see: Commission section hidden

### Verify in Browser Console
Press F12 → Console tab, you should see:
```
Login successful: { user: {...}, role: 'admin' }
Redirecting with role: admin
```

### Verify in Network Tab
Press F12 → Network tab, login, check:
1. POST `/api/auth/login` → Status **200** (not 401)
2. Response contains: `user`, `token`, `message`

---

## Part 8: Troubleshooting

### Login Returns 401 - Invalid Credentials
- ✅ Check email matches exactly (case sensitive)
- ✅ Check password is correct
- ✅ Check user exists in `auth.users` table
- ✅ Check `email_confirmed_at` is not NULL
- ✅ Verify user in `users` table too

### User Created but Can't Login
1. Check user in **Authentication** → **Users**
2. Verify **Auto confirm** was enabled (show green checkmark)
3. Check `email_confirmed_at` is set (has date/time)
4. If empty, click user and **Confirm identity**

### Wrong Dashboard After Login
1. Check user's `role` in metadata matches dashboard type
2. Admin → admin, Sales → sales, Staff → staff_commission or staff_non_commission
3. Run SQL to verify:
```sql
SELECT email, role, raw_user_meta_data->>'role' 
FROM auth.users 
WHERE email = 'sales@abifresh.com';
```

### Frontend Still Using Hardcoded Users
1. Check `backend/src/services/localhost-auth.service.ts`
2. Should be deleted or not used
3. Backend should call `authService.login()` from Supabase
4. Rebuild and restart backend: `npm run build && npm start`

---

## Part 9: Bulk User Import (Advanced)

### Import Multiple Users at Once

Save as `import_users.sql`:

```sql
-- Admin
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@abifresh.com', crypt('admin123', gen_salt('bf')), now(), now(), now(), '{"role":"admin","full_name":"Admin User"}'::jsonb);

-- Sales 1
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'sales@abifresh.com', crypt('sales123', gen_salt('bf')), now(), now(), now(), '{"role":"sales","full_name":"John Sales"}'::jsonb);

-- Sales 2
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'seller@abifresh.com', crypt('seller123', gen_salt('bf')), now(), now(), now(), '{"role":"sales","full_name":"Mary Seller"}'::jsonb);

-- Staff Commission
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'staff.comm@abifresh.com', crypt('staffcomm123', gen_salt('bf')), now(), now(), now(), '{"role":"staff_commission","full_name":"David Staff"}'::jsonb);

-- Staff Non-Commission
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'staff@abifresh.com', crypt('staff123', gen_salt('bf')), now(), now(), now(), '{"role":"staff_non_commission","full_name":"Sarah Staff"}'::jsonb);

-- Then populate users table
INSERT INTO users (id, email, full_name, role, is_active, store_location)
SELECT id, email, raw_user_meta_data->>'full_name', raw_user_meta_data->>'role', true, 'Jalingo'
FROM auth.users
WHERE email IN ('admin@abifresh.com', 'sales@abifresh.com', 'seller@abifresh.com', 'staff.comm@abifresh.com', 'staff@abifresh.com')
AND NOT EXISTS (SELECT 1 FROM users WHERE id = auth.users.id);
```

Run in **SQL Editor** → Click **Run**

---

## Part 10: Password Change via Supabase CLI

### Using Supabase CLI (Advanced Users)

```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Change password
supabase auth admin changepassword \
  --project-id akv \
  --email admin@abifresh.com \
  --new-password "NewPassword123"
```

---

## Summary Checklist

### Setting Up Users
- [ ] 1. Go to Supabase Console (app.supabase.com)
- [ ] 2. Select "Abifresh (akv)" project
- [ ] 3. Click Authentication → Users
- [ ] 4. Add 6 users with emails and passwords
- [ ] 5. Set roles in user metadata for each user
- [ ] 6. Run SQL to populate users table
- [ ] 7. Verify users exist in both auth and users table

### Testing Users
- [ ] 1. Test admin@abifresh.com / admin123 → /admin/dashboard
- [ ] 2. Test sales@abifresh.com / sales123 → /sales/dashboard
- [ ] 3. Test seller@abifresh.com / seller123 → /sales/dashboard
- [ ] 4. Test staff.comm@abifresh.com / staffcomm123 → /staff/dashboard (with commission)
- [ ] 5. Test staff@abifresh.com / staff123 → /staff/dashboard (no commission)
- [ ] 6. Open F12 → Network tab → verify 200 status on login
- [ ] 7. Check F12 → Console → verify no red errors

### Managing Users
- [ ] To change password: Auth → Users → click user → Reset password
- [ ] To change role: Auth → Users → click user → Edit metadata
- [ ] To deactivate: Update `is_active = false` in users table
- [ ] To delete: Delete from users table first, then from auth.users

---

## Quick Reference Commands

### View All Users
```sql
SELECT email, role, created_at FROM users ORDER BY created_at DESC;
```

### Update User Role
```sql
UPDATE users SET role = 'sales' WHERE email = 'user@example.com';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"sales"'::jsonb) WHERE email = 'user@example.com';
```

### Change User Password
```sql
UPDATE auth.users SET encrypted_password = crypt('newpassword', gen_salt('bf')) WHERE email = 'user@example.com';
```

### Deactivate User
```sql
UPDATE users SET is_active = false WHERE email = 'user@example.com';
```

### Delete User
```sql
DELETE FROM users WHERE email = 'user@example.com';
DELETE FROM auth.users WHERE email = 'user@example.com';
```

### Reset All Demo Users
```sql
DELETE FROM users;
DELETE FROM auth.users WHERE email LIKE '%@abifresh.com%';
```

---

## Support & Issues

### If something goes wrong:
1. Check Supabase status: https://status.supabase.com
2. Check project logs: **Logs** → **Auth** in Supabase console
3. Check backend logs: Terminal running `npm start`
4. Check frontend console: F12 → Console tab
5. Check network: F12 → Network tab (filter by auth/login)

---

**Last Updated:** January 25, 2026
**For:** ABIFRESH & KIDDIES VENTURES
**Database:** Supabase (cifzlksxpjghpgxhrwkg)

