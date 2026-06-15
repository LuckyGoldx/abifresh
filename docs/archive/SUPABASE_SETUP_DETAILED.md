# 🚀 SUPABASE SETUP - STEP BY STEP GUIDE

**Project:** Abifresh (akv)  
**Status:** Ready to configure  
**Time Required:** 15-20 minutes

---

## ✅ QUICK REFERENCE

| Item | Value |
|------|-------|
| Supabase URL | `https://cifzlksxpjghpgxhrwkg.supabase.co` |
| Project Reference | `cifzlksxpjghpgxhrwkg` |
| Anon Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZnpsa3NweGpnaHBneGhyd2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzAxMzAsImV4cCI6MjA4NDkwNjEzMH0.cISR5lepMEqmsQOeCnXsJ0-QlDqxTEH1Yda7ysWmyss` |
| Service Role | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZnpsa3NweGpnaHBneGhyd2tnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMzMDEzMCwiZXhwIjoyMDg0OTA2MTMwfQ.7Eg2j5-16Mr97DvRhipQ8XSq-BCkDcKiO5NRqkwfHm4` |

---

## 🎯 STEP 1: Access Supabase SQL Editor

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. **Sign in** with your email
3. Click on **"Abifresh (akv)"** project
4. In the **left sidebar**, click **"SQL Editor"**

   ![Step 1 Screenshot Placeholder]
   
---

## 📊 STEP 2: Create Database Tables

### 2.1 Create New Query

1. Click the **"+ New Query"** button (top right)
2. A new SQL editor window will open

### 2.2 Copy SQL Schema

1. Open this file in VS Code: **`SUPABASE_SQL_SCHEMA.sql`**
2. Press **Ctrl+A** to select all content
3. Press **Ctrl+C** to copy

### 2.3 Paste and Execute

1. In Supabase SQL Editor, press **Ctrl+V** to paste
2. Review the SQL (should see 15 CREATE TABLE statements)
3. Click the **green "Run"** button

### ✅ Success Indicators

You should see:
```
Query executed successfully!
```

And in the left sidebar under "Tables", you should see all 15 tables:
- ✅ users
- ✅ items
- ✅ inventory_main_store
- ✅ inventory_active_store
- ✅ sales
- ✅ daily_sales_summary
- ✅ posted_items
- ✅ staff_commissions
- ✅ staff_payments
- ✅ staff_expenses
- ✅ inventory_transfers
- ✅ damage_loss_reports
- ✅ notifications
- ✅ activity_logs
- ✅ system_settings

---

## 👤 STEP 3: Create Admin User via Dashboard

### 3.1 Go to Authentication

1. In Supabase, click **"Authentication"** in left sidebar
2. Click the **"Users"** tab
3. You should see an empty table

### 3.2 Add Admin User

1. Click the **"+ Add User"** button (top right)
2. Fill in the form:

```
Email:    admin@abifresh.com
Password: Admin@123456
```

3. **IMPORTANT:** Check the box: **"Auto generate password"** - UNCHECK it
4. Paste password: `Admin@123456`
5. Click **"Create User"**

### ✅ Success Indicator

You should see the user appear in the Users table with status "Verified"

---

## 👥 STEP 4: Add User Roles to Database

### 4.1 Go Back to SQL Editor

1. Click **"SQL Editor"** in left sidebar
2. Click **"+ New Query"**

### 4.2 Insert Admin User Role

Paste this SQL:

```sql
-- Insert admin user into users table
INSERT INTO public.users (
  email,
  full_name,
  role,
  is_active,
  store_location
) VALUES (
  'admin@abifresh.com',
  'Admin User',
  'admin',
  true,
  'Jalingo'
);
```

3. Click **"Run"**

### ✅ Success Indicator

```
Query executed successfully!
Rows affected: 1
```

---

## 📝 STEP 5: Add Other Test Users

### 5.1 Create New Query

1. Click **"+ New Query"**
2. Paste this SQL to add all test users:

```sql
-- Insert test users (SALES)
INSERT INTO public.users (email, full_name, role, is_active, store_location) 
VALUES ('sales@abifresh.com', 'John Salesman', 'sales', true, 'Jalingo');

INSERT INTO public.users (email, full_name, role, is_active, store_location) 
VALUES ('seller@abifresh.com', 'Mary Seller', 'sales', true, 'Jalingo');

-- Insert test users (STAFF WITH COMMISSION)
INSERT INTO public.users (email, full_name, role, is_active, store_location) 
VALUES ('staff.comm@abifresh.com', 'David Staff', 'staff_commission', true, 'Jalingo');

-- Insert test users (STAFF WITHOUT COMMISSION)
INSERT INTO public.users (email, full_name, role, is_active, store_location) 
VALUES ('staff@abifresh.com', 'Sarah Staff', 'staff_non_commission', true, 'Jalingo');
```

3. Click **"Run"**

### ✅ Success Indicator

```
Query executed successfully!
Rows affected: 4
```

---

## 🔧 STEP 6: Verify Setup

### 6.1 Check Users Table

1. In left sidebar, click **"Tables"**
2. Click **"users"**
3. You should see 5 users:
   - admin@abifresh.com
   - sales@abifresh.com
   - seller@abifresh.com
   - staff.comm@abifresh.com
   - staff@abifresh.com

### 6.2 Query Users

1. Go back to **"SQL Editor"**
2. Create **"+ New Query"**
3. Paste:

```sql
SELECT id, email, full_name, role, is_active 
FROM public.users 
ORDER BY created_at;
```

4. Click **"Run"**

You should see:

| id | email | full_name | role | is_active |
|----|-------|-----------|------|-----------|
| ... | admin@abifresh.com | Admin User | admin | true |
| ... | sales@abifresh.com | John Salesman | sales | true |
| ... | seller@abifresh.com | Mary Seller | sales | true |
| ... | staff.comm@abifresh.com | David Staff | staff_commission | true |
| ... | staff@abifresh.com | Sarah Staff | staff_non_commission | true |

---

## 🖥️ STEP 7: Update Environment Variables (Already Done!)

### ✅ Backend Configuration

Your `backend/.env` has already been updated with:

```env
SUPABASE_URL=https://cifzlksxpjghpgxhrwkg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### ✅ Frontend Configuration

Your `frontend/.env.local` has already been updated with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://cifzlksxpjghpgxhrwkg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🚀 STEP 8: Start Both Servers

### Terminal 1 - Backend

```bash
cd C:\Users\LuckyGold\Desktop\AKV\backend
npm start
```

Expected output:
```
✅ Server running on port 5000
📍 Environment: development
🔗 Health check: http://localhost:5000/health
```

### Terminal 2 - Frontend

```bash
cd C:\Users\LuckyGold\Desktop\AKV\frontend
npm run dev
```

Expected output:
```
▲ Next.js 13.5.11
  - Local:        http://localhost:3000
 ✓ Ready in X.Xs
```

---

## 🧪 STEP 9: Test Login - Admin

### 9.1 Open Browser

1. Go to: http://localhost:3000/login
2. You should see the login form

### 9.2 Enter Admin Credentials

```
Email:    admin@abifresh.com
Password: Admin@123456
```

3. Click **"Login"** button

### ✅ Success Indicators

- ✅ Login succeeds
- ✅ Redirects to http://localhost:3000/admin/dashboard
- ✅ Admin dashboard loads with charts
- ✅ Console shows no errors (F12)
- ✅ Can see sidebar with admin menu items
- ✅ Can see user info in header

### 🧭 What You'll See

Admin Dashboard should display:
- Total Revenue display
- Sales Chart (Line chart with sample data)
- User Management section
- Inventory Overview
- System Settings
- Staff Performance Metrics
- Activity Logs

---

## 🧪 STEP 10: Test Login - Sales

### 10.1 Logout

1. Click user profile in top-right corner
2. Click **"Logout"**
3. Redirects to login page

### 10.2 Login as Sales

```
Email:    sales@abifresh.com
Password: Sales@123456
```

3. Click **"Login"**

### ✅ Success Indicators

- ✅ Redirects to http://localhost:3000/sales/dashboard
- ✅ Sales dashboard loads
- ✅ Different dashboard than admin
- ✅ Shows sales-specific features

### 🧭 What You'll See

Sales Dashboard should display:
- Today's Sales Summary
- Quick Sale Entry Form
- Personal Performance Chart
- Transaction History
- Top Selling Items
- Inventory Quick Lookup

---

## 🧪 STEP 11: Test Login - Staff (Commission)

### 11.1 Logout

1. Click logout

### 11.2 Login as Staff (Commission)

```
Email:    staff.comm@abifresh.com
Password: StaffComm@123456
```

3. Click **"Login"**

### ✅ Success Indicators

- ✅ Redirects to http://localhost:3000/staff/dashboard
- ✅ Staff dashboard loads
- ✅ Commission section is visible
- ✅ Different UI than admin/sales

### 🧭 What You'll See

Staff Dashboard should display:
- Inventory Level Status
- Low-Stock Alerts
- Items Requiring Restocking
- Item Transfer Requests
- Damage/Loss Reporting
- Daily Task Checklist
- **Commission Tracking** (visible for this user)

---

## 🧪 STEP 12: Test Login - Staff (Non-Commission)

### 12.1 Logout

1. Click logout

### 12.2 Login as Staff (No Commission)

```
Email:    staff@abifresh.com
Password: Staff@123456
```

3. Click **"Login"**

### ✅ Success Indicators

- ✅ Redirects to http://localhost:3000/staff/dashboard
- ✅ Same staff dashboard loads
- ✅ Commission section is hidden or grayed out
- ✅ Different from commission staff user

### 🧭 Difference from Commission Staff

- ❌ Commission Tracking section should NOT show or be disabled
- ✅ All other features are same

---

## ✅ FINAL VERIFICATION CHECKLIST

- [ ] All 15 tables created in Supabase
- [ ] 5 test users created in authentication
- [ ] 5 users in public.users table with roles
- [ ] Backend server starts on port 5000
- [ ] Frontend server starts on port 3000
- [ ] Admin login works → Admin Dashboard
- [ ] Sales login works → Sales Dashboard
- [ ] Staff Commission login works → Staff Dashboard with commission
- [ ] Staff Non-Commission login works → Staff Dashboard without commission
- [ ] Logout works for all users
- [ ] Console has no errors
- [ ] Network tab shows successful API calls
- [ ] Dark mode toggle works
- [ ] Mobile responsive works (F12)

---

## 🎓 Passwords Reminder

Use these for localhost testing:

```
Admin:       Admin@123456
Sales:       Sales@123456
Sales2:      Seller@123456
Staff Comm:  StaffComm@123456
Staff NoComm: Staff@123456
```

⚠️ **CHANGE THESE FOR PRODUCTION!**

---

## 🐛 Troubleshooting

### Problem: "User not found" during login

**Solution:**
1. Verify user exists in Supabase Authentication
2. Verify user exists in public.users table
3. Check email exactly matches (case-sensitive!)
4. Re-create user if needed

### Problem: "Supabase connection failed"

**Solution:**
1. Verify .env files have correct keys
2. Check internet connection
3. Restart backend server
4. Check Supabase project status

### Problem: "401 Unauthorized"

**Solution:**
1. Verify password is correct
2. Verify user password matches in both Authentication and Database
3. Clear browser localStorage (F12 → Application → Local Storage)
4. Try login again

### Problem: Redirect to wrong dashboard

**Solution:**
1. Check user role in database
2. Verify role is correct (admin, sales, staff_commission, staff_non_commission)
3. Check login page redirect logic
4. Look at browser console (F12)

---

## 📞 Next Steps

Once everything is working on localhost:

1. ✅ Test all features in each dashboard
2. ✅ Create some sample items in inventory
3. ✅ Test adding a sale
4. ✅ Test posting items to staff
5. ✅ Then follow **DEPLOYMENT_GUIDE_PRODUCTION.md**

---

**Status:** ✅ Ready to begin setup  
**Last Updated:** January 25, 2026  
**Next Step:** Execute the SQL schema in Supabase
