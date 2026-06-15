# LOCAL DEVELOPMENT GUIDE
## ABIFRESH & KIDDIES VENTURES PWA

### How to Install Dependencies & Run on Localhost

---

## 📋 Prerequisites

Before starting, ensure you have installed:
- **Node.js 18+** ([Download](https://nodejs.org))
- **npm** (comes with Node.js) or **yarn**
- **Git** ([Download](https://git-scm.com))
- **VSCode** or any code editor

Verify installations:
```powershell
node --version      # Should be v18.0.0 or higher
npm --version       # Should be 9.0.0 or higher
git --version       # Should be 2.0.0 or higher
```

---

## 🔧 Step 1: Backend Setup (Express.js)

### 1.1 Navigate to Backend Directory

```powershell
cd c:\Users\LuckyGold\Desktop\AKV\backend
```

### 1.2 Install Dependencies

```powershell
npm install
```

This will install:
- `express` - Web framework
- `typescript` - Type safety
- `@supabase/supabase-js` - Database client
- `jsonwebtoken` - JWT authentication
- `bcrypt` - Password hashing
- `cors` - Cross-origin requests
- `dotenv` - Environment variables
- And other dependencies...

**Expected Output:**
```
added 150+ packages in 30-45 seconds
```

### 1.3 Create Environment Variables

Create a file named `.env` in the `backend` folder:

```bash
# Backend Configuration
NODE_ENV=development
PORT=5000

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRY=7d

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

**Where to get these values:**
1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Go to **Settings** → **API**
4. Copy **Project URL** and keys
5. Use a random JWT secret (can be any 32+ character string)

### 1.4 Start Backend Server

```powershell
npm run dev
```

**Expected Output:**
```
✓ Backend server running on http://localhost:5000
✓ CORS enabled for http://localhost:3000
✓ Connected to Supabase
```

**Keep this terminal open!** The backend runs on **port 5000**.

---

## 🎨 Step 2: Frontend Setup (Next.js)

### 2.1 Open New Terminal/Powershell

Open a **second** Powershell window (important - keep backend running in first terminal!)

```powershell
cd c:\Users\LuckyGold\Desktop\AKV\frontend
```

### 2.2 Install Dependencies

```powershell
npm install
```

This will install:
- `next` - React framework
- `react` - UI library
- `tailwindcss` - Styling
- `zustand` - State management
- `axios` - HTTP client
- `recharts` - Charts
- And other dependencies...

**Expected Output:**
```
added 200+ packages in 45-60 seconds
```

### 2.3 Create Environment Variables

Create a file named `.env.local` in the `frontend` folder:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**These values must match your Supabase setup from Backend Step 1.3**

### 2.4 Start Frontend Server

```powershell
npm run dev
```

**Expected Output:**
```
  ▲ Next.js 14.0
  - Local:        http://localhost:3000
  - Environments: .env.local

  ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

The frontend runs on **port 3000**.

---

## 🧪 Step 3: Test on Localhost

### 3.1 Open the Application

In your web browser, go to:
```
http://localhost:3000
```

You should see the **Login Page**.

### 3.2 Login with Default Credentials

```
Email: admin@abifresh.com
Password: SecurePassword123!
```

**Note:** You'll need to create this user first. See "Create Admin User" below.

### 3.3 Test Different Roles

After login, you can test:

**Admin Dashboard:**
- View all staff
- Manage inventory
- Approve payments
- Configure commissions

**Sales Dashboard:**
- Record sales
- View available items
- Post items to staff
- View daily statistics

**Staff Dashboard:**
- View posted items
- Accept/reject items
- Make payments
- Track expenses

---

## 👤 Create Admin User (First Time Setup)

### Using Supabase UI

1. Go to [Supabase Console](https://supabase.com/dashboard)
2. Click your project
3. Go to **Authentication** → **Users**
4. Click **Add User**
5. Fill in:
   - **Email**: `admin@abifresh.com`
   - **Password**: `SecurePassword123!`
   - **Auto confirm user**: Enable
6. Click **Create User**

### Using API (Optional)

```bash
# In backend terminal
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@abifresh.com",
    "password": "SecurePassword123!",
    "full_name": "Admin User",
    "role": "admin"
  }'
```

### Update User Role (If Needed)

In Supabase Console:
1. Go to **Authentication** → **Users**
2. Click the admin user
3. Go to **User Metadata** tab
4. Add:
```json
{
  "role": "admin",
  "store_location": "Jalingo"
}
```

---

## 🌐 Access Different Pages

After login, you can access:

| Role | URL | Purpose |
|------|-----|---------|
| Admin | `http://localhost:3000/admin/dashboard` | Manage system |
| Sales | `http://localhost:3000/sales/dashboard` | Record sales |
| Staff | `http://localhost:3000/staff/dashboard` | View posted items |

---

## 🌙 Test Dark Mode

1. Click the **Moon Icon** in the top right
2. The app should switch to dark theme
3. Refresh page - theme should persist

---

## 📱 Test PWA (Progressive Web App)

### Desktop
1. Open Chrome DevTools (`F12`)
2. Go to **Application** tab
3. Check **Service Workers** - should show `sw.ts`
4. Go to **Manifest** - should show app metadata

### Mobile
1. Open on iPhone/Android Chrome
2. Tap menu (3 dots)
3. Click **Add to Home Screen**
4. App installs like native app

---

## 🐛 Troubleshooting Local Setup

### Problem: "Cannot find module 'express'"
**Solution:**
```powershell
cd backend
npm install
```

### Problem: Port 5000 already in use
**Solution:** Change PORT in `.env`:
```
PORT=5001
```

### Problem: "SUPABASE_URL is required"
**Solution:** Check `.env` file has Supabase credentials

### Problem: "CORS error" in browser console
**Solution:** Ensure `.env` has correct FRONTEND_URL:
```
FRONTEND_URL=http://localhost:3000
```

### Problem: Cannot login with default credentials
**Solution:** Create user in Supabase console (see "Create Admin User" above)

### Problem: Styles not loading (no colors/tailwind)
**Solution:**
```powershell
cd frontend
npm run build
npm run dev
```

---

## 🚀 Quick Reference Commands

### Backend
```powershell
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Check for errors
npm run lint
```

### Frontend
```powershell
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Check for errors
npm run lint
```

---

## 📊 Test API Endpoints

### Using Postman or Curl

#### 1. Register a New User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sales@abifresh.com",
    "password": "Password123!",
    "full_name": "Sales User",
    "role": "sales"
  }'
```

#### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sales@abifresh.com",
    "password": "Password123!"
  }'
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "sales@abifresh.com",
    "role": "sales"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### 3. Get User Profile
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 4. Get Available Items
```bash
curl -X GET http://localhost:5000/api/sales/available-items \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 💾 Database Setup (Local Testing)

### Option 1: Use Supabase Cloud (Recommended)
Just use Supabase project from Step 1 - it's already cloud-hosted.

### Option 2: Use Local PostgreSQL (Advanced)

If you want to run PostgreSQL locally:

```powershell
# Install PostgreSQL 14+
# Then create database
psql -U postgres

# In psql:
CREATE DATABASE abifresh_local;
```

Update `.env`:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/abifresh_local
```

---

## 🔄 Workflow Tips

### Work with Inventory Items

1. **Go to Admin Dashboard**
   - Add items with name, price, category
   - Items appear in inventory

2. **Move Items to Active Store**
   - Click "Move to Active"
   - Select quantity to move
   - Items available for sale

3. **Record a Sale**
   - Go to Sales Dashboard
   - Select item and quantity
   - Choose payment method
   - Inventory auto-updates

### Work with Staff

1. **Create Staff User**
   - Admin Dashboard → Add Staff
   - Choose role (commission/non-commission)
   - Staff can login

2. **Post Items to Staff**
   - Sales Dashboard → Post Items
   - Select staff member
   - Select items and quantity
   - Staff gets notification

3. **Approve Payment**
   - Admin Dashboard → Pending Payments
   - Review amount and reference
   - Approve or Reject

---

## 📞 Need Help?

| Issue | Location |
|-------|----------|
| Setup issues | See "Troubleshooting" section above |
| API endpoints | See `docs/API_DOCUMENTATION.md` |
| Database schema | See `docs/DATABASE_SCHEMA.md` |
| Features | See `README.md` |

---

## ✅ Checklist - You're Ready When:

- [ ] Node.js 18+ installed
- [ ] Backend `.env` file created with Supabase credentials
- [ ] Frontend `.env.local` file created
- [ ] `npm install` run in both folders
- [ ] Backend running on `http://localhost:5000`
- [ ] Frontend running on `http://localhost:3000`
- [ ] Can login with default credentials
- [ ] See Admin Dashboard after login
- [ ] Dark mode toggle works
- [ ] Can navigate between pages

---

## 🎉 You're All Set!

Your local development environment is ready. Start building! 🚀

Next steps:
1. Explore all dashboard pages
2. Test different roles
3. Play with inventory and sales
4. Read API documentation for custom features
5. Plan your Python AI integration (see `AI_INTEGRATION.md`)
