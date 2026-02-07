#!/usr/bin/env python3
"""
ABIFRESH (AKV) - QUICK START SCRIPT
This file documents the exact commands to run for setup
"""

# ============================================================================
# 🚀 SUPABASE SETUP - EXECUTE IN ORDER
# ============================================================================

"""
STEP 1: EXECUTE SQL SCHEMA (15 MINUTES)
=======================================

Files:
  - SUPABASE_SQL_SCHEMA.sql        (Contains all 15 table definitions)
  - SUPABASE_SETUP_DETAILED.md    (Step-by-step with images)

Actions:
  1. Go to https://app.supabase.com
  2. Login to your account
  3. Click "Abifresh (akv)" project
  4. Click "SQL Editor" in left sidebar
  5. Click "+ New Query" button
  6. Open SUPABASE_SQL_SCHEMA.sql in VS Code
  7. Press Ctrl+A (select all)
  8. Press Ctrl+C (copy)
  9. Back in Supabase, press Ctrl+V (paste)
  10. Click green "Run" button
  11. Wait for: "Query executed successfully"

Expected Result:
  ✅ Query executed successfully
  ✅ 15 tables appear in left sidebar under "Tables"


STEP 2: CREATE ADMIN USER (5 MINUTES)
====================================

File:
  - ADMIN_CREDENTIALS.md (Contains all test credentials)

Actions:
  1. In Supabase, click "Authentication" in left sidebar
  2. Click "Users" tab
  3. Click "+ Add User" button
  4. Enter email: admin@abifresh.com
  5. Enter password: Admin@123456
  6. Click "Create User"

Expected Result:
  ✅ User appears in Users list with "Verified" status


STEP 3: ADD USERS TO DATABASE (5 MINUTES)
========================================

File:
  - ADMIN_CREDENTIALS.md (SQL insert statements)

Actions:
  1. In Supabase SQL Editor
  2. Click "+ New Query"
  3. Copy-paste the 5 INSERT statements from ADMIN_CREDENTIALS.md
  4. Click "Run"

SQL to paste:
  INSERT INTO public.users (email, full_name, role, is_active, store_location) 
  VALUES ('sales@abifresh.com', 'John Salesman', 'sales', true, 'Jalingo');
  
  INSERT INTO public.users (email, full_name, role, is_active, store_location) 
  VALUES ('seller@abifresh.com', 'Mary Seller', 'sales', true, 'Jalingo');
  
  INSERT INTO public.users (email, full_name, role, is_active, store_location) 
  VALUES ('staff.comm@abifresh.com', 'David Staff', 'staff_commission', true, 'Jalingo');
  
  INSERT INTO public.users (email, full_name, role, is_active, store_location) 
  VALUES ('staff@abifresh.com', 'Sarah Staff', 'staff_non_commission', true, 'Jalingo');

Expected Result:
  ✅ Rows affected: 4


STEP 4: VERIFY BOTH SERVERS ARE RUNNING
======================================

Terminal output should show:

Backend:  ✅ Server running on port 5000
Frontend: ✅ Ready in X.Xs at http://localhost:3000


STEP 5: TEST LOGIN - ADMIN (3 MINUTES)
====================================

Actions:
  1. Open http://localhost:3000/login
  2. Enter email: admin@abifresh.com
  3. Enter password: Admin@123456
  4. Click Login button

Expected Result:
  ✅ Redirects to http://localhost:3000/admin/dashboard
  ✅ Admin dashboard loads with charts
  ✅ Can see user name in top right
  ✅ Console has no errors (F12)


STEP 6: TEST LOGIN - SALES (2 MINUTES)
====================================

Actions:
  1. Click logout button
  2. Enter email: sales@abifresh.com
  3. Enter password: Sales@123456
  4. Click Login button

Expected Result:
  ✅ Redirects to http://localhost:3000/sales/dashboard
  ✅ Sales dashboard loads
  ✅ Different UI than admin


STEP 7: TEST LOGIN - STAFF COMMISSION (2 MINUTES)
==============================================

Actions:
  1. Click logout button
  2. Enter email: staff.comm@abifresh.com
  3. Enter password: StaffComm@123456
  4. Click Login button

Expected Result:
  ✅ Redirects to http://localhost:3000/staff/dashboard
  ✅ Staff dashboard loads
  ✅ Commission section visible
  ✅ Different UI than sales/admin


STEP 8: TEST LOGIN - STAFF NON-COMMISSION (2 MINUTES)
=================================================

Actions:
  1. Click logout button
  2. Enter email: staff@abifresh.com
  3. Enter password: Staff@123456
  4. Click Login button

Expected Result:
  ✅ Redirects to http://localhost:3000/staff/dashboard
  ✅ Staff dashboard loads
  ✅ Commission section NOT visible
  ✅ Same as commission staff but without commission features


TOTAL SETUP TIME: ~35 MINUTES
==========================

First 20 minutes: Supabase configuration
Last 15 minutes: Testing all logins


WHAT HAPPENS IF SOMETHING FAILS?
==============================

Problem: "Query executed successfully" but I don't see tables
Solution:
  1. Refresh Supabase page (F5)
  2. Click "Tables" in left sidebar again
  3. Should see all 15 tables

Problem: "User not found" during login
Solution:
  1. Verify user created in Authentication tab (shown as "Verified")
  2. Verify user created in SQL (SELECT * FROM public.users;)
  3. Check email exactly matches
  4. Verify password is correct

Problem: "501 Unauthorized" or "API error"
Solution:
  1. Check backend is running: curl http://localhost:5000/health
  2. Check .env files have Supabase keys
  3. Restart backend: npm start
  4. Try login again

Problem: "Wrong dashboard" after login
Solution:
  1. Check user role in database matches expected role
  2. Verify no console errors (F12 → Console)
  3. Check Network tab for failed API calls
  4. Restart both servers


KEY FILES REFERENCE
=================

Setup & Configuration:
  ✅ SUPABASE_SQL_SCHEMA.sql         - All 15 table definitions
  ✅ SUPABASE_SETUP_GUIDE.md          - Complete setup guide
  ✅ SUPABASE_SETUP_DETAILED.md       - Step-by-step guide
  ✅ SUPABASE_READY.md                - Quick reference & checklist

Credentials & Testing:
  ✅ ADMIN_CREDENTIALS.md             - Admin & test users with testing checklist
  ✅ DEMO_CREDENTIALS.txt             - Quick reference credentials

Configuration Files (Already Updated):
  ✅ backend/.env                     - Supabase keys configured
  ✅ frontend/.env.local              - Supabase keys configured


AFTER SETUP IS COMPLETE
======================

Once all logins work:
  1. Read: DEPLOYMENT_GUIDE_PRODUCTION.md
  2. Create Koyeb account for backend
  3. Create Vercel account for frontend
  4. Push code to GitHub
  5. Deploy to production


CREDENTIALS FOR THIS SESSION
==========================

ADMIN:
  Email: admin@abifresh.com
  Pass:  Admin@123456

SALES 1:
  Email: sales@abifresh.com
  Pass:  Sales@123456

SALES 2:
  Email: seller@abifresh.com
  Pass:  Seller@123456

STAFF (Commission):
  Email: staff.comm@abifresh.com
  Pass:  StaffComm@123456

STAFF (Non-Commission):
  Email: staff@abifresh.com
  Pass:  Staff@123456


SUPABASE CREDENTIALS (KEEP SECURE!)
=================================

URL:           https://cifzlksxpjghpgxhrwkg.supabase.co
Anon Key:      eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Service Key:   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Backend runs on:   http://localhost:5000
Frontend runs on:  http://localhost:3000


NEXT STEPS
=========

1. Execute SQL schema
2. Create admin user
3. Add test users to database
4. Test all 4 role logins
5. Verify each dashboard loads correctly
6. Then follow DEPLOYMENT_GUIDE_PRODUCTION.md for Koyeb/Vercel
"""

# ============================================================================
# QUICK COMMAND REFERENCE
# ============================================================================

# Check if servers are running
# powershell:
Get-Process node

# Start backend (if not running)
cd C:\Users\LuckyGold\Desktop\AKV\backend
npm start

# Start frontend (new terminal)
cd C:\Users\LuckyGold\Desktop\AKV\frontend
npm run dev

# Test backend health
# powershell:
Invoke-WebRequest -Uri http://localhost:5000/health

# Open login page
Start-Process "http://localhost:3000/login"

# Stop all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# ============================================================================
