# 🚀 Complete Startup Guide - AKV System on Localhost

## ⚡ Quick Start (2 minutes)

### Option 1: Using Built Binaries (RECOMMENDED - More Stable)

**Terminal 1 - Start Backend:**
```powershell
cd C:\Users\LuckyGold\Desktop\AKV\backend
npm start
```

Expected output:
```
✅ Server running on port 5000
📍 Environment: development
🔗 Health check: http://localhost:5000/health
```

**Terminal 2 - Start Frontend:**
```powershell
cd C:\Users\LuckyGold\Desktop\AKV\frontend
npm run dev
```

Expected output:
```
▲ Next.js 13.5.11
- Local:        http://localhost:3000
✓ Ready in 6.2s
```

### Then Access:
- **Frontend:** http://localhost:3000
- **Backend Health:** http://localhost:5000/health

---

## 🔧 Detailed Startup Guide

### Prerequisites
- ✅ Node.js v24.10.0 (already installed)
- ✅ npm packages (already installed - 335 backend, 480 frontend)
- ✅ Dependencies fixed (jsonwebtoken, all types, etc.)
- ✅ Built files generated (dist/ folder with compiled JS)

### Current Project Structure
```
AKV/
├── backend/
│   ├── src/              # TypeScript source files
│   │   ├── index.ts      # Express server entry
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Database services
│   │   └── middleware/   # Auth, CORS, etc.
│   ├── dist/             # ✅ Compiled JavaScript (from npm run build)
│   ├── package.json      # Scripts: dev, build, start, lint
│   ├── tsconfig.json     # TypeScript config
│   ├── .env              # Environment variables (DB creds placeholder)
│   └── node_modules/     # ✅ Dependencies installed (335 packages)
│
├── frontend/
│   ├── app/              # Next.js pages/routes
│   │   ├── page.tsx      # / (home redirect)
│   │   ├── login/        # /login page
│   │   ├── admin/        # /admin/dashboard
│   │   ├── sales/        # /sales/dashboard
│   │   └── staff/        # /staff/dashboard
│   ├── components/       # React components
│   ├── .next/            # ✅ Compiled Next.js build cache
│   ├── public/           # Static files + PWA assets
│   ├── package.json      # Scripts: dev, build, start
│   ├── .env.local        # Environment variables
│   └── node_modules/     # ✅ Dependencies installed (480 packages)
│
├── STARTUP_GUIDE.md      # ← You are here
├── LOCALHOST_SETUP.md    # Feature documentation
└── AI_INTEGRATION.md     # AI chatbot configuration
```

---

## 🎯 Method 1: Using Compiled Version (BEST FOR STABILITY)

This method runs pre-compiled JavaScript (fastest, most stable).

### Terminal 1: Start Backend
```powershell
# Open PowerShell and navigate to AKV
cd C:\Users\LuckyGold\Desktop\AKV\backend

# Run the compiled version
npm start
```

**What happens:**
- Runs `node dist/index.js` (pre-compiled JavaScript)
- Starts Express server on port 5000
- Loads .env configuration
- Initializes all routes and middleware
- **Takes ~2 seconds to start**

**Success indicators:**
```
> abifresh-backend@1.0.0 start
> node dist/index.js

✅ Server running on port 5000
📍 Environment: development
🔗 Health check: http://localhost:5000/health
```

**Keep this terminal running** (don't close it)

---

### Terminal 2: Start Frontend
```powershell
# Open another PowerShell and navigate to frontend
cd C:\Users\LuckyGold\Desktop\AKV\frontend

# Run Next.js development server
npm run dev
```

**What happens:**
- Starts Next.js development server on port 3000
- Loads .env.local configuration
- Compiles React components
- Enables hot module reloading (auto-refresh on file changes)
- **Takes ~6-8 seconds to start**

**Success indicators:**
```
> abifresh-frontend@1.0.0 dev
> next dev

> [PWA] PWA support is disabled
▲ Next.js 13.5.11
- Local:        http://localhost:3000
- Environments: .env.local

✓ Ready in 6.2s
```

**Keep this terminal running** (don't close it)

---

## 🎯 Method 2: Using TypeScript Directly (NOT RECOMMENDED - Slower)

This method runs TypeScript on-the-fly using ts-node (slower startup).

```powershell
cd C:\Users\LuckyGold\Desktop\AKV\backend
npm run dev  # Uses ts-node to compile and run TypeScript
```

⚠️ **Issues with this method:**
- Takes 15-20 seconds to start (ts-node compilation overhead)
- Higher CPU usage
- Harder to debug if compilation fails

**Recommended:** Use `npm start` instead (Method 1).

---

## 📱 Accessing the Application

### After Both Servers Are Running:

1. **Open Frontend** (the main interface)
   ```
   http://localhost:3000
   ```
   - Should redirect to `/login`
   - Shows login form for all user types
   - Auto-registers service worker

2. **Backend Health Check** (verify backend is alive)
   ```
   http://localhost:5000/health
   ```
   - Returns JSON with server status
   - Shows timestamp
   - Confirms backend is responding

3. **Login Page**
   ```
   http://localhost:3000/login
   ```
   - Unified login for Admin, Salesperson, Staff
   - Test with placeholder credentials

4. **Admin Dashboard** (after login as admin)
   ```
   http://localhost:3000/admin/dashboard
   ```
   - Revenue overview
   - Sales analytics
   - Inventory management
   - User management

5. **Sales Dashboard** (after login as salesperson)
   ```
   http://localhost:3000/sales/dashboard
   ```
   - Quick sale entry
   - Daily performance
   - Commission tracking

6. **Staff Dashboard** (after login as staff)
   ```
   http://localhost:3000/staff/dashboard
   ```
   - Inventory tasks
   - Stock level monitoring
   - Transfer requests

---

## 🧪 Testing the Backend API

### 1. Health Check (No Auth Required)
```powershell
# Simple health check
Invoke-WebRequest http://localhost:5000/health
```

**Expected response:**
```json
{
  "status": "OK",
  "timestamp": "2026-01-24T18:00:00.000Z",
  "service": "ABIFRESH & KIDDIES VENTURES API"
}
```

### 2. Test Routes (Examples)

**Get all inventory items:**
```powershell
$headers = @{
  "Authorization" = "Bearer YOUR_JWT_TOKEN"
  "Content-Type" = "application/json"
}
Invoke-WebRequest -Uri http://localhost:5000/api/inventory/items `
  -Headers $headers `
  -UseBasicParsing
```

**Create a sale:**
```powershell
$body = @{
  item_id = "1"
  quantity = 5
  total_amount = 7500
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:5000/api/sales/create `
  -Method POST `
  -Headers @{"Authorization" = "Bearer TOKEN"; "Content-Type" = "application/json"} `
  -Body $body
```

---

## 🧐 Troubleshooting

### Problem 1: "This site can't be reached" (Port Not Listening)

**Symptoms:**
```
localhost refused to connect
ERR_CONNECTION_REFUSED
```

**Cause:** Backend not running or exited unexpectedly

**Solution:**
```powershell
# 1. Check if backend process is running
Get-Process | Where-Object {$_.ProcessName -match "node"}

# 2. Kill any stuck processes
Get-Process node | Stop-Process -Force

# 3. Verify port is free
netstat -ano | findstr :5000  # Should be empty

# 4. Rebuild and restart
cd C:\Users\LuckyGold\Desktop\AKV\backend
npm run build    # Recompile
npm start        # Start fresh
```

---

### Problem 2: Frontend Page Blank or Won't Load

**Symptoms:**
- Next.js running but page shows nothing
- Console shows 404 errors

**Cause:** Frontend build cache corrupted or pages not found

**Solution:**
```powershell
# 1. Clear Next.js cache
cd C:\Users\LuckyGold\Desktop\AKV\frontend
rm -r .next

# 2. Reinstall dependencies if needed
rm package-lock.json
npm install

# 3. Restart dev server
npm run dev
```

---

### Problem 3: Module Not Found Errors

**Symptoms:**
```
Error: Cannot find module 'express'
Error: Cannot find module '@supabase/supabase-js'
```

**Cause:** Dependencies not installed

**Solution:**
```powershell
# Reinstall dependencies
cd C:\Users\LuckyGold\Desktop\AKV\backend
npm install --legacy-peer-deps

# For frontend:
cd C:\Users\LuckyGold\Desktop\AKV\frontend
npm install --legacy-peer-deps
```

---

### Problem 4: TypeScript Compilation Errors

**Symptoms:**
```
error TS2307: Cannot find module
error TS1205: Re-exporting a type when '--isolatedModules' is set
```

**Cause:** TypeScript config or missing type files

**Solution:**
```powershell
# For backend:
cd C:\Users\LuckyGold\Desktop\AKV\backend
npm run build

# For frontend:
cd C:\Users\LuckyGold\Desktop\AKV\frontend
npm run build
```

---

### Problem 5: Port Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE :::5000
```

**Cause:** Another process using port 5000 or 3000

**Solution:**
```powershell
# Find process on port 5000
netstat -ano | findstr :5000

# Kill it (replace PID with actual number)
taskkill /PID 12345 /F

# Or change port in .env
# Add: PORT=5001
```

---

## 🛠️ Rebuild & Clean Start

If you encounter persistent issues, do a complete clean rebuild:

```powershell
# === BACKEND ===
cd C:\Users\LuckyGold\Desktop\AKV\backend

# Remove old builds
rm -r dist node_modules package-lock.json

# Reinstall everything
npm install --legacy-peer-deps

# Build TypeScript
npm run build

# Start
npm start

# === FRONTEND ===
cd C:\Users\LuckyGold\Desktop\AKV\frontend

# Remove cache
rm -r .next node_modules package-lock.json

# Reinstall
npm install --legacy-peer-deps

# Start
npm run dev
```

---

## 📊 Expected Behavior

### Backend (Terminal 1)
```
✅ Server running on port 5000
📍 Environment: development
🔗 Health check: http://localhost:5000/health
```
- Stays running indefinitely
- Shows logs for each API request
- No errors during normal operation

### Frontend (Terminal 2)
```
▲ Next.js 13.5.11
- Local:        http://localhost:3000
✓ Ready in 6.2s
```
- Stays running indefinitely
- Shows compilation updates for file changes
- Hot-reloads when you save files

### Browser
- http://localhost:3000 loads login page
- http://localhost:5000/health returns JSON
- Pages are responsive (work on mobile too)
- Dark mode toggle works

---

## 🔒 Environment Configuration

Before testing with real data, set your Supabase credentials:

### Backend .env
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secret-key-min-32-chars
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
PORT=5000
PYTHON_AI_SERVICE_URL=http://localhost:8000
```

### Frontend .env.local
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Note:** Don't share these keys! Use .env files (already in .gitignore).

---

## 🎓 Terminal Tips

### Keeping Terminals Open
- **Never close Terminal 1 or 2** while testing
- If a terminal closes, just restart the command
- Both servers can run simultaneously

### Viewing Logs
- Backend logs appear in Terminal 1
- Frontend logs appear in Terminal 2
- Browser console (F12) shows client-side logs

### Restarting
```powershell
# In any terminal:
# Press Ctrl+C to stop the server
# Then run the command again
```

---

## ✅ Verification Checklist

After starting both servers:

- [ ] Terminal 1 shows "✅ Server running on port 5000"
- [ ] Terminal 2 shows "✓ Ready in X seconds"
- [ ] http://localhost:3000 loads without errors
- [ ] http://localhost:5000/health returns JSON
- [ ] Can navigate between pages
- [ ] Dark mode toggle works
- [ ] Console shows no major errors (warnings OK)
- [ ] All dashboards load

---

## 🚀 Next Steps

1. **Configure Supabase** (if not done)
   - Create project at supabase.com
   - Add credentials to .env and .env.local
   - Run database migrations

2. **Test Real Data Flow**
   - Create test users
   - Add inventory items
   - Record sample sales
   - Verify calculations

3. **Test AI Chat** (when Python service is running)
   - Ask "How many items available?"
   - Ask "What's today's sales?"
   - Verify responses from Supabase data

4. **Deploy to Production**
   - Build with `npm run build`
   - Use `npm start` in production (not `npm run dev`)
   - Configure real environment variables
   - Set up HTTPS and domain

---

## 📞 Common Commands Reference

| Command | Purpose | Terminal |
|---------|---------|----------|
| `npm start` | Start compiled backend | Backend only |
| `npm run dev` | Start frontend dev server | Frontend only |
| `npm run build` | Build TypeScript/Next.js | Either |
| `npm install` | Install dependencies | Either |
| `npm test` | Run tests (if configured) | Either |
| `Ctrl+C` | Stop running server | Current |

---

## 💡 Pro Tips

1. **Use two separate terminals** - Keep them side-by-side
2. **Check logs first** - Terminal logs show most errors
3. **Clear browser cache** - If pages look wrong (Ctrl+Shift+Delete)
4. **Check .env files** - Most issues are missing credentials
5. **Rebuild if stuck** - Clean rebuild usually fixes issues

---

**You're all set! Your system is ready to use on localhost.** 🎉

Questions? Check:
- [LOCALHOST_SETUP.md](LOCALHOST_SETUP.md) - Feature guide
- [AI_INTEGRATION.md](AI_INTEGRATION.md) - AI chatbot details
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Database structure (if exists)
