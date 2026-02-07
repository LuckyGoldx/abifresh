# 🚀 SUPABASE SETUP GUIDE - ABIFRESH (AKV)

**Date:** January 25, 2026  
**Project:** Abifresh & Kiddies Ventures PWA  
**Status:** Setting up Supabase for localhost testing

---

## 📋 Table of Contents

1. [Supabase Project Credentials](#supabase-project-credentials)
2. [Creating Database Tables](#creating-database-tables)
3. [Setting Up Environment Variables](#setting-up-environment-variables)
4. [Creating Admin User](#creating-admin-user)
5. [Linking to Local Project](#linking-to-local-project)
6. [Testing Authentication](#testing-authentication)
7. [Troubleshooting](#troubleshooting)

---

## 🔐 Supabase Project Credentials

Your Supabase project has been created with the following details:

### Project Information
```
Project Name:      Abifresh (akv)
Project Reference: cifzlksxpjghpgxhrwkg
Region:            (Check in Supabase dashboard)
Status:            Active
```

### API Keys

**ANON KEY (Public - Safe to expose in frontend):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZnpsa3NweGpnaHBneGhyd2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzAxMzAsImV4cCI6MjA4NDkwNjEzMH0.cISR5lepMEqmsQOeCnXsJ0-QlDqxTEH1Yda7ysWmyss
```

**SERVICE ROLE KEY (Secret - Never expose in frontend):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZnpsa3NweGpnaHBneGhyd2tnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMzMDEzMCwiZXhwIjoyMDg0OTA2MTMwfQ.7Eg2j5-16Mr97DvRhipQ8XSq-BCkDcKiO5NRqkwfHm4
```

**SUPABASE URL:**
```
https://cifzlksxpjghpgxhrwkg.supabase.co
```

---

## 📊 Creating Database Tables

### Step 1: Access Supabase SQL Editor

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in to your account
3. Click on your **"Abifresh (akv)"** project
4. In the left sidebar, click **"SQL Editor"**
5. Click **"New Query"**

### Step 2: Copy and Execute SQL Schema

1. Open file: `SUPABASE_SQL_SCHEMA.sql` in this project (in VS Code)
2. Select all content (**Ctrl+A**)
3. Copy it (**Ctrl+C**)
4. Paste into Supabase SQL Editor (**Ctrl+V**)
5. Click **"Run"** button (green play icon)
6. Wait for execution to complete

### ✅ Expected Result

You should see:
```
Query executed successfully
Rows returned: 0
Execution time: 1.234s
```

And in the left sidebar under "Tables", you should now see:
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

## 🔧 Setting Up Environment Variables

### Step 1: Backend Environment Setup

Edit `backend/.env` file:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://cifzlksxpjghpgxhrwkg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZnpsa3NweGpnaHBneGhyd2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzAxMzAsImV4cCI6MjA4NDkwNjEzMH0.cISR5lepMEqmsQOeCnXsJ0-QlDqxTEH1Yda7ysWmyss
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZnpsa3NweGpnaHBneGhyd2tnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMzMDEzMCwiZXhwIjoyMDg0OTA2MTMwfQ.7Eg2j5-16Mr97DvRhipQ8XSq-BCkDcKiO5NRqkwfHm4

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=24h
```

### Step 2: Frontend Environment Setup

Edit `frontend/.env.local` file:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://cifzlksxpjghpgxhrwkg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZnpsa3NweGpnaHBneGhyd2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzAxMzAsImV4cCI6MjA4NDkwNjEzMH0.cISR5lepMEqmsQOeCnXsJ0-QlDqxTEH1Yda7ysWmyss

# Application
NEXT_PUBLIC_APP_NAME=Abifresh & Kiddies Ventures
```

### ⚠️ Important Security Notes

- 🔴 **NEVER** commit `.env` files to Git
- 🔴 **NEVER** share SERVICE_ROLE_KEY with anyone
- 🟢 ANON_KEY is safe for frontend (it's already in the files)
- 🟢 SERVICE_ROLE_KEY should only be on backend

---

## 👤 Creating Admin User

### Option 1: Via Supabase Dashboard (Recommended for Testing)

1. Go to your Supabase project
2. Click **"Authentication"** in left sidebar
3. Click **"Users"** tab
4. Click **"Add user"** button
5. Fill in details:

```
Email:    admin@abifresh.com
Password: Admin@123456 -- admin123
```

6. Click **"Create user"**

### Option 2: Insert Directly into Database

1. Go to **SQL Editor** in Supabase
2. Click **"New Query"**
3. Execute this SQL:

```sql
-- Insert admin user
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

-- Insert other demo users for testing
INSERT INTO public.users (email, full_name, role, is_active, store_location) VALUES
  ('sales@abifresh.com', 'John Salesman', 'sales', true, 'Jalingo'),
  ('seller@abifresh.com', 'Mary Seller', 'sales', true, 'Jalingo'),
  ('staff.comm@abifresh.com', 'David Staff', 'staff_commission', true, 'Jalingo'),
  ('staff@abifresh.com', 'Sarah Staff', 'staff_non_commission', true, 'Jalingo');
```

4. Click **"Run"**

---

## 🔗 Linking to Local Project

### Step 1: Update Backend Auth Service

The backend is configured to automatically use Supabase when credentials are provided in `.env`.

Check file: `backend/src/routes/auth.routes.ts`

It will:
- ✅ Use Supabase auth if `SUPABASE_URL` is configured
- ✅ Fall back to localhost demo auth if not configured

### Step 2: Verify Configuration

Run this command to check if Supabase is connected:

```bash
curl -X GET http://localhost:5000/health
```

Should return:
```json
{
  "status": "healthy",
  "server": "Abifresh API",
  "environment": "development",
  "supabase": "connected"
}
```

### Step 3: Test Login Endpoint

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@abifresh.com",
    "password": "Admin@123456"
  }'
```

Expected response:
```json
{
  "user": {
    "id": "uuid-here",
    "email": "admin@abifresh.com",
    "full_name": "Admin User",
    "role": "admin",
    "is_active": true,
    "store_location": "Jalingo",
    "created_at": "2026-01-25T10:00:00Z",
    "updated_at": "2026-01-25T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

---

## 🧪 Testing Authentication

### Test Data

Use these credentials to test different roles:

```
ADMIN
  Email:    admin@abifresh.com
  Password: Admin@123456
  Role:     admin
  Expected: /admin/dashboard

SALES - User 1
  Email:    sales@abifresh.com
  Password: (same as created)
  Role:     sales
  Expected: /sales/dashboard

SALES - User 2
  Email:    seller@abifresh.com
  Password: (same as created)
  Role:     sales
  Expected: /sales/dashboard

STAFF - WITH COMMISSION
  Email:    staff.comm@abifresh.com
  Password: (same as created)
  Role:     staff_commission
  Expected: /staff/dashboard (with commission visible)

STAFF - WITHOUT COMMISSION
  Email:    staff@abifresh.com
  Password: (same as created)
  Role:     staff_non_commission
  Expected: /staff/dashboard (no commission)
```

### Browser Testing

1. Start both servers:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm start

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. Open http://localhost:3000/login

3. Test each credential and verify:
   - ✅ Login succeeds
   - ✅ Redirects to correct dashboard
   - ✅ User info displays correctly
   - ✅ Can navigate dashboard
   - ✅ Can logout

---

## 📝 Admin Login Credentials (Secure)

**For Testing on Localhost:**

```
Email:    admin@abifresh.com
Password: Admin@123456
```

**⚠️ IMPORTANT SECURITY NOTES:**

1. **Change Default Password Immediately**
   - This is temporary for setup only
   - Change in production before deployment

2. **Enable Two-Factor Authentication**
   - In Supabase: Settings → Authentication
   - Enable 2FA for admin account

3. **Use Strong Passwords in Production**
   - Use at least 16 characters
   - Mix uppercase, lowercase, numbers, special characters
   - Example: `Adm!nP@ssw0rd#2026@Abifresh`

4. **Rotate Keys Periodically**
   - Every 90 days in production
   - In Supabase: Settings → API

---

## 🔄 Complete Startup Process

### First Time Setup

```bash
# 1. Navigate to project
cd C:\Users\LuckyGold\Desktop\AKV

# 2. Update environment files with Supabase keys
# Edit backend/.env
# Edit frontend/.env.local

# 3. Start backend
cd backend
npm start
# Should show: ✅ Server running on port 5000

# 4. In new terminal, start frontend
cd frontend
npm run dev
# Should show: ✓ Ready in X.Xs

# 5. Open browser
# http://localhost:3000/login

# 6. Login with admin credentials
# Email: admin@abifresh.com
# Password: Admin@123456

# 7. Verify you see admin dashboard
```

### Daily Startup

```bash
# Terminal 1
cd backend && npm start

# Terminal 2
cd frontend && npm run dev

# Open http://localhost:3000/login
```

---

## 🐛 Troubleshooting

### Problem: "Supabase connection failed"

**Solution:**
```bash
# 1. Verify .env has correct keys
cat backend/.env | grep SUPABASE

# 2. Test Supabase connectivity
curl https://cifzlksxpjghpgxhrwkg.supabase.co

# 3. Restart backend
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
cd backend && npm start
```

### Problem: "User not found" during login

**Solution:**
```bash
# 1. Verify user exists in Supabase
# Go to Supabase Dashboard → SQL Editor
# Run: SELECT * FROM public.users WHERE email = 'admin@abifresh.com';

# 2. If user doesn't exist, create via dashboard
# Authentication → Users → Add user

# 3. Verify email exactly matches (case-sensitive!)
```

### Problem: "401 Unauthorized" after login

**Solution:**
```bash
# 1. Check password is correct
# 2. Verify JWT_SECRET in backend/.env
# 3. Clear browser localStorage
#    F12 → Application → Local Storage → Clear

# 4. Try login again
```

### Problem: "CORS error" when calling API

**Solution:**

Add CORS headers to backend. Edit `backend/src/index.ts`:

```typescript
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
}));
```

---

## ✅ Verification Checklist

Before moving to Koyeb/Vercel deployment:

- [ ] All 15 tables created in Supabase
- [ ] Admin user created and password set
- [ ] Backend .env updated with Supabase keys
- [ ] Frontend .env.local updated with Supabase keys
- [ ] Backend server starts without errors
- [ ] Frontend server starts without errors
- [ ] Admin login works
- [ ] Admin redirects to /admin/dashboard
- [ ] Sales login works
- [ ] Staff login works
- [ ] Logout functionality works
- [ ] Network tab shows no 404 errors
- [ ] Console has no error messages
- [ ] Dark mode toggle works
- [ ] Responsive design works (F12 mobile mode)

---

## 🚀 Next Steps

Once everything is working on localhost:

1. **Create Koyeb Account**
   - Go to https://www.koyeb.com
   - Sign up
   - Create new service

2. **Create Vercel Account**
   - Go to https://vercel.com
   - Sign up
   - Link GitHub

3. **Push to GitHub**
   - Create repository
   - Push code with .env files in .gitignore

4. **Follow DEPLOYMENT_GUIDE_PRODUCTION.md**
   - Deploy backend to Koyeb
   - Deploy frontend to Vercel
   - Configure production Supabase URL

---

## 📞 Support

If you encounter issues:

1. Check console logs (F12 in browser)
2. Check terminal output
3. Verify .env files have correct keys
4. Restart both servers
5. Clear browser cache (Ctrl+Shift+Delete)

---

**Created:** January 25, 2026  
**Project:** Abifresh & Kiddies Ventures  
**Status:** ✅ Ready for localhost testing
