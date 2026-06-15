# 🧪 Complete Login Testing Guide

## Prerequisites

Before testing, you MUST:
1. ✅ Run the SQL from `SUPABASE_INSERT_TEST_USERS.sql` in Supabase SQL Editor
2. ✅ Verify all 6 users exist in Supabase
3. ✅ Start backend server: `npm start` (port 5000)
4. ✅ Start frontend server: `npm run dev` (port 3000)

---

## Test Plan Overview

| User | Email | Password | Role | Expected Dashboard |
|------|-------|----------|------|-------------------|
| 1 | admin@abifresh.com | admin123 | admin | /admin/dashboard |
| 2 | sales@abifresh.com | sales123 | sales | /sales/dashboard |
| 3 | seller@abifresh.com | seller123 | sales | /sales/dashboard |
| 4 | staff.comm@abifresh.com | staffcomm123 | staff_commission | /staff/dashboard (+ commission) |
| 5 | staff@abifresh.com | staff123 | staff_non_commission | /staff/dashboard (- commission) |
| 6 | finance@abifresh.com | finance123 | admin | /admin/dashboard |

---

## Test 1: Admin Login

### Steps
1. Open http://localhost:3000/login
2. Enter Email: `admin@abifresh.com`
3. Enter Password: `admin123`
4. Click "Login" button

### Expected Results
✅ **Status Code:** 200 (in Network tab)
✅ **Redirect:** Redirects to `/admin/dashboard`
✅ **Page Content:** 
   - Shows "Admin Dashboard" heading
   - Analytics section visible
   - Charts and reports visible
   - Admin navigation menu shows all options
✅ **Console Logs (F12 → Console):**
   - `Login successful: { user: {...}, role: 'admin' }`
   - `Redirecting with role: admin`
✅ **localStorage:** 
   - Token stored (should see in F12 → Application → Storage → localStorage)
   - User data saved

### If Login Fails
❌ Error shows "Invalid credentials"
- Check: Email is exactly `admin@abifresh.com` (case sensitive)
- Check: Password is `admin123` (case sensitive)
- Check: User exists in Supabase (Authentication → Users)
- Check: `email_confirmed_at` is set (not empty)
- Check: User role in metadata is `admin`

---

## Test 2: Sales Person Login (User 1)

### Steps
1. Log out or open new incognito window
2. Go to http://localhost:3000/login
3. Enter Email: `sales@abifresh.com`
4. Enter Password: `sales123`
5. Click "Login" button

### Expected Results
✅ **Status Code:** 200 (in Network tab)
✅ **Redirect:** Redirects to `/sales/dashboard`
✅ **Page Content:**
   - Shows "Sales Dashboard" heading
   - Inventory section visible
   - Sales features available
   - Admin/Finance sections NOT visible
   - Staff commission section NOT visible
✅ **Console Logs:**
   - `Login successful: { user: {...}, role: 'sales' }`
   - `Redirecting with role: sales`
✅ **Navigation:**
   - Left sidebar shows Sales menu items
   - No Admin menu items
   - No Staff menu items

### If Login Fails
❌ Error shows "Invalid credentials"
- Verify email: `sales@abifresh.com`
- Verify password: `sales123`
- Check Supabase that role is `sales` (not `admin`)

---

## Test 3: Sales Person Login (User 2)

### Steps
1. Log out
2. Go to http://localhost:3000/login
3. Enter Email: `seller@abifresh.com`
4. Enter Password: `seller123`
5. Click "Login" button

### Expected Results
✅ **Status Code:** 200
✅ **Redirect:** Redirects to `/sales/dashboard` (same as User 2)
✅ **Page Content:** Same as Test 2 (sales features)
✅ **Verification:**
   - Different user (`seller@abifresh.com`) but same role (`sales`)
   - Should have same dashboard and permissions

---

## Test 4: Staff with Commission

### Steps
1. Log out
2. Go to http://localhost:3000/login
3. Enter Email: `staff.comm@abifresh.com`
4. Enter Password: `staffcomm123`
5. Click "Login" button

### Expected Results
✅ **Status Code:** 200
✅ **Redirect:** Redirects to `/staff/dashboard`
✅ **Page Content:**
   - Shows "Staff Dashboard" heading
   - **Commission section VISIBLE** ⭐
   - Commission tracking available
   - Sales or items available
✅ **Console Logs:**
   - `Login successful: { user: {...}, role: 'staff_commission' }`
   - `Redirecting with role: staff_commission`
✅ **Special Check:**
   - Look for "Commission" or "Earnings" section
   - Should be visible and functional

---

## Test 5: Staff without Commission

### Steps
1. Log out
2. Go to http://localhost:3000/login
3. Enter Email: `staff@abifresh.com`
4. Enter Password: `staff123`
5. Click "Login" button

### Expected Results
✅ **Status Code:** 200
✅ **Redirect:** Redirects to `/staff/dashboard`
✅ **Page Content:**
   - Shows "Staff Dashboard" heading
   - **Commission section HIDDEN** ⭐
   - No commission tracking
   - Sales or items available
✅ **Console Logs:**
   - `Login successful: { user: {...}, role: 'staff_non_commission' }`
   - `Redirecting with role: staff_non_commission`
✅ **Critical Difference from Test 4:**
   - Commission section should be HIDDEN
   - No earnings or commission tabs
   - Should show basic staff features only

---

## Test 6: Finance Manager (Bonus)

### Steps
1. Log out
2. Go to http://localhost:3000/login
3. Enter Email: `finance@abifresh.com`
4. Enter Password: `finance123`
5. Click "Login" button

### Expected Results
✅ **Status Code:** 200
✅ **Redirect:** Redirects to `/admin/dashboard`
✅ **Page Content:**
   - Same as Test 1 (admin features)
   - Finance manager has admin privileges
✅ **Console Logs:**
   - `Login successful: { user: {...}, role: 'admin' }`
   - `Redirecting with role: admin`

---

## Network Tab Verification (All Tests)

For **EACH** test:
1. Open DevTools: Press F12
2. Go to **Network** tab
3. Clear network log (trash icon)
4. Enter credentials and click Login
5. Look for request: **POST /api/auth/login**

### Expected Network Response
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "admin@abifresh.com",
    "full_name": "Admin User",
    "role": "admin",
    "is_active": true,
    "store_location": "Jalingo",
    "created_at": "2026-01-25T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

### Status Codes
- ✅ **200** = Success
- ❌ **401** = Invalid credentials
- ❌ **400** = Missing email/password
- ❌ **500** = Server error

---

## Console Verification (All Tests)

For **EACH** test:
1. Open DevTools: Press F12
2. Go to **Console** tab
3. Look for logs (should be GREEN, no RED errors)

### Expected Console Logs
```
Login successful: { user: {...}, role: 'sales' }
Redirecting with role: sales
```

### Red Errors to Watch For
❌ `Login error: ...`
❌ `Supabase auth error: ...`
❌ `TypeError: Cannot read properties of undefined`
❌ `401 Unauthorized`

---

## Browser Storage Verification (All Tests)

After each successful login:
1. Open DevTools: Press F12
2. Go to **Application** tab
3. Click **Storage** → **localStorage**
4. Find `http://localhost:3000`

### Expected localStorage
```
auth-store: {
  user: { id: "...", email: "...", role: "..." },
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  isAuthenticated: true
}
```

---

## Complete Test Checklist

### Before Starting
- [ ] SQL script executed in Supabase
- [ ] All 6 users visible in Supabase Authentication
- [ ] Backend running (port 5000)
- [ ] Frontend running (port 3000)

### Test 1: Admin (admin@abifresh.com / admin123)
- [ ] Login successful (200 status)
- [ ] Redirect to /admin/dashboard
- [ ] Admin page displays correctly
- [ ] Console shows no red errors
- [ ] localStorage has token

### Test 2: Sales 1 (sales@abifresh.com / sales123)
- [ ] Login successful (200 status)
- [ ] Redirect to /sales/dashboard
- [ ] Sales dashboard displays
- [ ] No admin features visible
- [ ] Console clean

### Test 3: Sales 2 (seller@abifresh.com / seller123)
- [ ] Login successful (200 status)
- [ ] Redirect to /sales/dashboard
- [ ] Same dashboard as Sales 1
- [ ] Both sales users have same role

### Test 4: Staff Commission (staff.comm@abifresh.com / staffcomm123)
- [ ] Login successful (200 status)
- [ ] Redirect to /staff/dashboard
- [ ] Commission section VISIBLE ⭐
- [ ] Commission features available

### Test 5: Staff Non-Commission (staff@abifresh.com / staff123)
- [ ] Login successful (200 status)
- [ ] Redirect to /staff/dashboard
- [ ] Commission section HIDDEN ⭐
- [ ] Only basic staff features

### Test 6: Finance (finance@abifresh.com / finance123)
- [ ] Login successful (200 status)
- [ ] Redirect to /admin/dashboard
- [ ] Same as admin user

### Final Verification
- [ ] All 6 users logged in successfully
- [ ] Each user redirected to correct dashboard
- [ ] Role-based rendering working correctly
- [ ] Commission section conditional rendering works
- [ ] No console errors on any user
- [ ] Dark mode still works
- [ ] Mobile responsive still works

---

## Troubleshooting

### Problem: All users show "Invalid credentials"
**Solution:**
1. Check users exist: Supabase → Authentication → Users
2. Check email confirmed: Should show green checkmark
3. Check password hashing: Run query:
   ```sql
   SELECT email, encrypted_password FROM auth.users;
   ```
4. Verify backend can reach Supabase (check logs)

### Problem: Login succeeds but wrong dashboard shown
**Solution:**
1. Check user role in Supabase metadata
2. Verify role in `users` table matches `auth.users` metadata
3. Check browser console for role value
4. Run SQL to verify:
   ```sql
   SELECT email, role FROM users;
   SELECT email, raw_user_meta_data->>'role' FROM auth.users;
   ```

### Problem: Staff commission section not visible/hidden correctly
**Solution:**
1. Check user role in database: `SELECT role FROM users WHERE email = '...';`
2. Role must be EXACTLY `staff_commission` or `staff_non_commission`
3. Check frontend code for conditional rendering
4. Open browser DevTools → Elements → search for commission section

### Problem: Redirect goes to wrong page
**Solution:**
1. Check role returned from backend
2. Verify frontend redirect logic matches roles
3. Check browser console for redirect logs
4. Manually navigate to correct dashboard

---

## Success Criteria - Must Pass All Tests

✅ Admin can login and see admin dashboard
✅ Sales 1 can login and see sales dashboard
✅ Sales 2 can login and see sales dashboard
✅ Staff commission can login and see commission section
✅ Staff non-commission can login and commission section is hidden
✅ Finance can login and see admin dashboard
✅ No console errors on any login
✅ Network status 200 for all logins
✅ Role-based redirects work correctly
✅ All users have tokens in localStorage

---

## Testing Summary Template

Record your results:

```
Date: 2026-01-25
Tester: [Your Name]

TEST RESULTS:
✅ Admin login: PASS
✅ Sales 1 login: PASS
✅ Sales 2 login: PASS
✅ Staff Commission login: PASS
✅ Staff Non-Commission login: PASS
✅ Finance login: PASS

NETWORK STATUS: All 200 OK
CONSOLE ERRORS: None
REDIRECTS: All correct
ROLE-BASED RENDERING: Working
COMMISSION SECTION: Conditional correctly

OVERALL: ✅ ALL TESTS PASSED
```

---

**Last Updated:** January 25, 2026
**Application:** ABIFRESH & KIDDIES VENTURES
**Test Coverage:** 6 Users, All Roles, Network & Console Verification

