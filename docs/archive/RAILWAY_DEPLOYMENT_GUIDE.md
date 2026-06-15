# Complete Guide: Deploy Backend to Railway & Link to Vercel Frontend

This guide provides detailed, step-by-step instructions for deploying your Express.js backend to Railway and connecting it to your Next.js frontend on Vercel.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create Railway Account](#step-1-create-railway-account)
3. [Step 2: Prepare Your GitHub Repository](#step-2-prepare-your-github-repository)
4. [Step 3: Create Railway Project](#step-3-create-railway-project)
5. [Step 4: Connect GitHub and Deploy](#step-4-connect-github-and-deploy)
6. [Step 5: Configure Environment Variables](#step-5-configure-environment-variables)
7. [Step 6: Verify Deployment](#step-6-verify-deployment)
8. [Step 7: Get Railway Backend URL](#step-7-get-railway-backend-url)
9. [Step 8: Update Vercel Environment](#step-8-update-vercel-environment)
10. [Step 9: Test Integration](#step-9-test-integration)
11. [Troubleshooting](#troubleshooting)
12. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

Before starting, ensure you have:

✅ **GitHub Account** - with your `abifresh` repository (private or public)
✅ **Railway Account** - NOT created yet (we'll create it)
✅ **Vercel Account** - with frontend already deployed
✅ **Supabase Credentials** - ready to copy:
  - Project URL: `https://cifzlkspxjghpgxhrwkg.supabase.co`
  - Anon Key: (from Supabase settings)
  - Service Role Key: (from Supabase settings)
✅ **Backend Repository** - `backend/` folder with:
  - `Dockerfile`
  - `package.json` with build and start scripts
  - `.env.example` (reference for env vars)

**Estimated Time:** 20-30 minutes total

---

## Step 1: Create Railway Account

### 1.1 - Go to Railway Website

**Action:** Open your browser and navigate to:
```
https://railway.app
```

### 1.2 - Click "Create Account" or "Sign Up"

**You should see:**
- Large button saying "Create Account" or "Book a demo"
- Click the signup/login button in top right

### 1.3 - Choose GitHub Sign-In

**Action:** 
1. Click **"Sign up with GitHub"** (or "Continue with GitHub")
2. You'll be redirected to GitHub authorization page

### 1.4 - Authorize Railway on GitHub

**GitHub will ask:**
- "authorize Railway.app to access your account?"

**Action:**
1. Review the permissions (Railway accesses public repos)
2. Click **"Authorize railway-app"** (green button)

### 1.5 - Welcome to Railway Dashboard

**You should now see:**
- Railroad icon in top left
- "Create New Project" button
- "Deployments" section (empty)

**✅ Step 1 Complete:** You now have a Railway account!

---

## Step 2: Prepare Your GitHub Repository

Before deploying, ensure your backend is properly configured on GitHub.

### 2.1 - Verify Backend Structure

**Check that your repository has:**

```
abifresh/
├── backend/
│   ├── src/
│   │   ├── index.ts (or main server file)
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── ... (other source files)
│   ├── dist/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── .dockerignore (optional but recommended)
├── frontend/
├── .gitignore
└── README.md
```

### 2.2 - Verify Dockerfile Exists

**Action:** Open `backend/Dockerfile` and ensure it contains:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

**If missing:**
Create `backend/Dockerfile` with above content

### 2.3 - Verify package.json Scripts

**Open `backend/package.json` and check:**

```json
{
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    ...
  }
}
```

**Critical:** Must have `build` and `start` scripts

### 2.4 - Verify .env.example

**Open `backend/.env.example` (or create it):**

```env
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Server
PORT=5000
NODE_ENV=production

# Security
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRY=7d
CORS_ORIGIN=https://your-frontend-url.vercel.app

# App
APP_NAME=ABIFRESH & KIDDIES VENTURES
LOG_LEVEL=info
```

### 2.5 - Push Changes to GitHub

**Action:** Commit and push any changes:

```bash
cd c:\Users\LuckyGold\Desktop\AKV
git add backend/
git commit -m "Ensure backend ready for Railway deployment"
git push origin main
```

**✅ Step 2 Complete:** Backend is ready to deploy!

---

## Step 3: Create Railway Project

### 3.1 - Go to Railway Dashboard

**Action:**
1. Open https://railway.app
2. You should be logged in (see dashboard)
3. Look for **"Create New Project"** button (or similar)

### 3.2 - Click "Create New Project"

**You should see options:**
- "Deploy from GitHub"
- "Create from Template"
- Other options

**Action:** Click **"Deploy from GitHub"**

### 3.3 - Select Your Repository

**Railway will show:**
- List of your GitHub repositories
- Search bar to find repos

**Action:**
1. Look for **`abifresh`** in the list (or search for it)
2. Click on `LuckyGoldx/abifresh`

**Note:** If you don't see your repo:
- Check if it's private (Railway needs access)
- Click "Configure GitHub App" to grant access
- Select repositories Railway can access
- Add `abifresh` to the list

### 3.4 - Select Branch

**Railway will ask:**
- "Which branch would you like to deploy?"

**Action:**
1. Select **`main`** (your primary branch)
2. Click **"Continue"** or **"Deploy"**

### 3.5 - Wait for Initial Build

**Railway will:**
1. Start analyzing your repository
2. Detect the Dockerfile
3. Initialize the build process

**You should see:**
- A new project created
- Build starting (indicated by loading/progress)
- Status messages appearing

**✅ Step 3 Complete:** Project created on Railway!

---

## Step 4: Connect GitHub and Deploy

### 4.1 - Understand Railway's Detection

**Railway automatically:**
- Detects your `Dockerfile`
- Recognizes it as Docker deployment
- Sets up the build configuration

**You should see:**
- Project name (might be "abifresh" or "abifresh-1")
- Build status: "Building" or "Deploying"

### 4.2 - Configure Deployment Settings (Optional)

**If Railway shows configuration screen:**

**Root Directory:**
- Set to: `backend` (if it shows monorepo option)
- Or leave empty (Railway auto-detects)

**Dockerfile Path:**
- Should auto-fill: `backend/Dockerfile`
- Verify it's correct before proceeding

### 4.3 - Monitor Initial Build

**Railway will:**
1. Install Node dependencies (`npm install`)
2. Compile TypeScript (`npm run build`)
3. Build Docker image
4. Deploy container (takes 2-5 minutes)

**Look for:**
- ✅ Green checkmarks = success
- ⚠️ Yellow warnings = non-critical
- ❌ Red errors = need to fix

**Timeline:**
- 0-30 seconds: Analyzing code
- 30-60 seconds: Installing dependencies
- 60-120 seconds: Compiling TypeScript
- 120-300 seconds: Building and deploying

### 4.4 - Initial Deployment Complete

**When build succeeds, you should see:**
- ✅ "Build succeeded" or "Deployment successful"
- Green status indicator
- A generated URL (starting with random string)

**Example URL might be:**
```
https://abifresh-backend-prod-abc123.railway.app
```

**✅ Step 4 Complete:** Backend deployed to Railway!

---

## Step 5: Configure Environment Variables

### 5.1 - Navigate to Environment Variables

**In Railway Dashboard:**
1. Open your `abifresh` project (if not already open)
2. Look for **"Variables"** tab or **"Settings"** section
3. Click **"Variables"** or **"Env Variables"**

**You should see:**
- A form/panel for adding variables
- "Add Variable" button
- List of existing variables (might be empty)

### 5.2 - Add Supabase URL

**Action:**
1. Click **"Add Variable"** button
2. **Key:** `SUPABASE_URL`
3. **Value:** `https://cifzlkspxjghpgxhrwkg.supabase.co`
4. Click **"Save"** or **"Add"**

### 5.3 - Add Supabase Anon Key

**Action:**
1. Click **"Add Variable"** button
2. **Key:** `SUPABASE_ANON_KEY`
3. **Value:** (Get from Supabase)
   - Go to https://supabase.com
   - Select your project
   - Settings → API
   - Copy "anon public" key
4. Paste into Railway
5. Click **"Save"**

### 5.4 - Add Supabase Service Role Key

**Action:**
1. Click **"Add Variable"** button
2. **Key:** `SUPABASE_SERVICE_ROLE_KEY`
3. **Value:** (Get from Supabase)
   - Go to https://supabase.com
   - Select your project
   - Settings → API
   - Copy "service_role secret" key (⚠️ Keep this secret!)
4. Paste into Railway
5. Click **"Save"**

### 5.5 - Add Port

**Action:**
1. Click **"Add Variable"** button
2. **Key:** `PORT`
3. **Value:** `5000`
4. Click **"Save"**

### 5.6 - Add Node Environment

**Action:**
1. Click **"Add Variable"** button
2. **Key:** `NODE_ENV`
3. **Value:** `production`
4. Click **"Save"**

### 5.7 - Add JWT Secret

**Action:**
1. Click **"Add Variable"** button
2. **Key:** `JWT_SECRET`
3. **Value:** Generate a strong random string
   - Option A: Use Railway's generate button (if available)
   - Option B: Use online generator: https://randomkeygen.com/
   - Copy "CodeIgniter Encryption Keys" value (128-char string)
4. Paste into Railway
5. Click **"Save"**

### 5.8 - Add JWT Expiry

**Action:**
1. Click **"Add Variable"** button
2. **Key:** `JWT_EXPIRY`
3. **Value:** `7d` (7 days)
4. Click **"Save"**

### 5.9 - Add CORS Origin (Important!)

**⚠️ CRITICAL for frontend-backend communication**

**Action:**
1. Click **"Add Variable"** button
2. **Key:** `CORS_ORIGIN`
3. **Value:** Your Vercel frontend URL
   - Go to your Vercel dashboard
   - Find your deployed frontend project
   - Copy the URL (e.g., `https://abifresh-frontend.vercel.app`)
   - Paste into Railway
4. Click **"Save"**

**Note:** If you don't have Vercel URL yet, you can update this later

### 5.10 - Add App Name

**Action:**
1. Click **"Add Variable"** button
2. **Key:** `APP_NAME`
3. **Value:** `ABIFRESH & KIDDIES VENTURES`
4. Click **"Save"**

### 5.11 - Add Log Level

**Action:**
1. Click **"Add Variable"** button
2. **Key:** `LOG_LEVEL`
3. **Value:** `info`
4. Click **"Save"**

### 5.12 - Verify All Variables Added

**Your Railway dashboard should show:**

```
✓ SUPABASE_URL
✓ SUPABASE_ANON_KEY
✓ SUPABASE_SERVICE_ROLE_KEY
✓ PORT
✓ NODE_ENV
✓ JWT_SECRET
✓ JWT_EXPIRY
✓ CORS_ORIGIN
✓ APP_NAME
✓ LOG_LEVEL
```

**⚠️ Important:** After adding/updating variables, Railway automatically redeploys with new environment variables

**✅ Step 5 Complete:** All environment variables configured!

---

## Step 6: Verify Deployment

### 6.1 - Check Deployment Status

**In Railway Dashboard:**
1. Open your project
2. Look for **"Status"** or **"Deployment Status"**
3. Should show: ✅ **"Running"** or **"Healthy"**

**Expected Status:**
- 🟢 Green = Running successfully
- 🟡 Yellow = Currently deploying
- 🔴 Red = Error (check logs)

### 6.2 - Check Build Logs

**If status shows error:**
1. Click **"Logs"** or **"View Logs"** tab
2. Review error messages
3. Common issues:
   - Missing dependencies (add to package.json)
   - Dockerfile error (verify syntax)
   - Environment variable typo (recheck)

### 6.3 - Verify Container is Running

**You should see:**
- Service name: `backend` or `abifresh-backend`
- Status: **Running** with green indicator
- Uptime: Shows time running (e.g., "5m 32s")

### 6.4 - Check CPU and Memory Usage

**Click on the service to see:**
- CPU usage: Should be low (< 50%)
- Memory usage: Should be < 300MB
- Network stats: Requests being handled

**✅ Step 6 Complete:** Deployment verified and healthy!

---

## Step 7: Get Railway Backend URL

### 7.1 - Find the Deployment URL

**In Railway Dashboard:**
1. Open your `abifresh` project
2. Look for the service box (might say "backend" or service name)
3. Find **"URL"** field or **"Public URL"** field
4. Should look like:
   ```
   https://abifresh-backend-prod-[random-string].railway.app
   ```

### 7.2 - Copy the URL

**Action:**
1. Click the **copy icon** next to the URL
2. Or highlight and copy manually
3. Paste it somewhere safe (you'll need it for Vercel)

**Example:**
```
https://abifresh-backend-prod-xyz123abc.railway.app
```

**Note:** 
- Each Railway project gets a unique URL
- URL structure: `https://[project-name]-[stage]-[random].railway.app`
- This URL is stable (won't change unless you delete service)

### 7.3 - Test the URL

**Action:** Open in browser:
```
https://your-railway-url.railway.app/health
```

**Expected Response:**
```json
{
  "status": "ok"
}
```

OR just see page load successfully

**If you get error:**
- ❌ 404 (not found) = Bad URL or route doesn't exist
- ❌ 502 (bad gateway) = Backend not running
- ❌ CORS error = Backend not configured for frontend

**✅ Step 7 Complete:** Backend URL obtained and working!

---

## Step 8: Update Vercel Environment

### 8.1 - Go to Vercel Dashboard

**Action:**
1. Open https://vercel.com/dashboard
2. Find your `abifresh` (or `abifresh-frontend`) project
3. Click on it to open

### 8.2 - Open Settings

**Action:**
1. Click **"Settings"** tab (top of page)
2. Look for **"Environment Variables"** option
3. Click on it

### 8.3 - Update NEXT_PUBLIC_API_URL

**You should see environment variables listed:**

**Find:** `NEXT_PUBLIC_API_URL`

**Action:**
1. Click the **edit icon** (pencil) next to it
2. **Clear the old value** (if it points to Koyeb or localhost)
3. **Enter new value:**
   ```
   https://your-railway-url.railway.app
   ```
   (Replace with your actual Railway URL)
4. Click **"Save"** or **"Update"**

### 8.4 - Verify Other Environment Variables

**While you're here, check:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` = `https://cifzlkspxjghpgxhrwkg.supabase.co`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your key)
- ✅ `NEXT_PUBLIC_API_URL` = (your Railway URL) ← **Just updated!**
- ✅ `NEXT_PUBLIC_APP_NAME` = `ABIFRESH & KIDDIES VENTURES`

### 8.5 - Trigger Redeployment

**After changing environment variables, Vercel needs to rebuild:**

**Option A: Auto-redeploy**
- Go to "Deployments" tab
- Click the **"Redeploy"** button on latest deployment
- Or push to GitHub (auto-deploys)

**Option B: Manual redeploy**
```bash
# From your project directory
git add .env.example
git commit -m "Update API URL to Railway backend"
git push origin main
```
→ Vercel auto-detects push and redeploys

**Wait for redeployment to complete (2-5 minutes)**

**✅ Step 8 Complete:** Vercel now points to Railway backend!

---

## Step 9: Test Integration

### 9.1 - Test Backend Health Endpoint

**In browser or terminal:**
```bash
curl https://your-railway-url.railway.app/health
```

**Expected response:**
```json
{"status": "ok"}
```

✅ **Backend is running**

### 9.2 - Open Frontend in Browser

**Action:**
1. Go to your Vercel frontend URL
2. Example: `https://abifresh-frontend.vercel.app`
3. Page should load without errors

### 9.3 - Check Browser Console

**Action:**
1. Open DevTools (F12)
2. Go to **"Console"** tab
3. Look for any error messages
4. Should see **no CORS errors**

**Red flags:**
- ❌ `Access to XMLHttpRequest blocked by CORS policy` = Backend CORS not configured
- ❌ `Cannot find module` = Frontend missing something
- ❌ `net::ERR_NAME_NOT_RESOLVED` = Bad URL

### 9.4 - Test an API Call

**Action:**
1. Try an action that calls the backend
2. Examples:
   - Load product list (usually calls `/api/products`)
   - View dashboard/reports
   - Make a test transaction

**What to watch for:**
- ✅ Data loads successfully
- ✅ No network errors in DevTools → Network tab
- ✅ Requests go to Railway URL

### 9.5 - Check Network Tab

**In Browser DevTools:**
1. Open **"Network"** tab
2. Trigger an API call (click a button that fetches data)
3. Look for requests to your Railway URL
4. Should show:
   - ✅ Status: 200 (success)
   - ✅ URL: `https://your-railway-url/api/...`
   - ✅ Response: Valid JSON data

### 9.6 - Test Database Operations

**Action:** Try creating/reading/updating data:
1. Create a new product
2. Make a sale
3. View reports
4. Check that data appears and persists

**What worked:**
- ✅ Frontend talks to backend
- ✅ Backend talks to Supabase
- ✅ Data flows both directions
- ✅ Responses return in reasonable time

**✅ Step 9 Complete:** Full integration tested and working!

---

## Troubleshooting

### Issue 1: "Cannot connect to backend" or 502 Error

**Symptoms:**
- Backend URL shows error
- Firefox/Chrome shows "Bad Gateway"
- App can't load data

**Possible Causes:**
1. Backend crashed or not running
2. Port misconfigured
3. Environment variables missing

**Solutions:**

**Check Railway Status:**
- Go to Railway dashboard
- Check service status (should be 🟢 running)
- Look at logs for errors

**Review Environment Variables:**
- Verify `PORT=5000` is set
- Check `NODE_ENV=production`
- Ensure all required vars are present

**Redeploy:**
- In Railway, click "Redeploy" button
- Wait 1-2 minutes
- Try again

### Issue 2: CORS Error - "Access to XMLHttpRequest blocked by CORS policy"

**Symptoms:**
- Browser console shows CORS error
- Frontend makes request, backend rejects it
- Error message mentions "Origin not allowed"

**Cause:**
Backend CORS configuration doesn't allow Vercel URL

**Solution:**

**Update Railway Environment Variable:**
1. Go to Railway dashboard
2. Click Variables
3. Find `CORS_ORIGIN`
4. Set to: `https://your-vercel-url.vercel.app`
5. Save (triggers redeploy)

**Wait for redeploy (2-5 minutes), then:**
```bash
# Clear browser cache
# Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

**Test again:**
- Open DevTools → Network tab
- Make API call
- Look for `Access-Control-Allow-Origin` header in response
- Should show your Vercel URL

### Issue 3: "Cannot GET /api/..." or 404 Error

**Symptoms:**
- Network tab shows 404 status
- Routes don't exist
- API endpoints returning not found

**Possible Causes:**
1. Wrong URL path
2. Backend routes not deployed
3. TypeScript not compiled to JavaScript

**Solutions:**

**Check Backend Routes:**
1. Review `backend/src/routes/` files
2. Ensure routes match what frontend is calling
3. Common routes:
   ```
   GET /api/products
   GET /api/sales
   POST /api/sales
   GET /api/payments
   ```

**Verify Build Succeeded:**
- In Railway, check logs
- Look for: `successfully compiled` or `tsc` completion
- Check `dist/` folder exists

**Rebuild if Needed:**
- Railway dashboard
- Click "Redeploy"
- Check logs again

### Issue 4: "Cannot connect to Supabase" or Database Error

**Symptoms:**
- Backend running but can't access database
- Error: "connect ECONNREFUSED" or "timeout"
- Queries failing

**Possible Causes:**
1. Wrong Supabase URL
2. Invalid API key
3. Network/firewall blocking connection

**Solutions:**

**Verify Environment Variables:**
```bash
# In Railway dashboard, check:
✓ SUPABASE_URL = https://cifzlkspxjghpgxhrwkg.supabase.co
✓ SUPABASE_ANON_KEY = (45-50 character string)
✓ SUPABASE_SERVICE_ROLE_KEY = (longer string)
```

**Test Supabase Connection Locally:**
```bash
cd backend
npm install @supabase/supabase-js

# Create test-supabase.ts:
import { createClient } from '@supabase/supabase-js'
const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)
const data = await client.from('users').select('*')
console.log(data)
```

**Check Supabase Project:**
- Go to https://supabase.com
- Select your project
- Check it's "Active" (not suspended)
- Verify tables exist in "Tables" section
- Check Row Level Security (RLS) policies

### Issue 5: "Timeout" or "Connection takes too long"

**Symptoms:**
- API calls hang (no response)
- Browser waiting 30+ seconds
- Request eventually fails with timeout

**Possible Causes:**
1. Too much data being returned
2. Database query too complex
3. Memory leak causing slowdown

**Solutions:**

**Check Railway Memory Usage:**
- Dashboard → Metrics
- Look for memory trending upward
- If memory creeping up = memory leak

**Optimize Responses:**
- Return fewer fields
- Implement pagination
- Add limits to queries

**Increase Instance Size:**
- Railway → Settings
- Change instance from free to paid
- More resources = better performance

### Issue 6: Environment Variables "Not Found" or undefined

**Symptoms:**
- Backend error: "JWT_SECRET is undefined"
- Database connection fails due to missing keys
- App crashes with env var errors

**Cause:**
- Variables not saved properly
- Case-sensitive typo (e.g., `jwt_secret` vs `JWT_SECRET`)
- Redeploy didn't happen after adding vars

**Solution:**

**Verify Variables in Railway:**
1. Dashboard → Variables
2. See each variable listed correctly
3. No typos (case matters!)

**Force Redeploy:**
1. Railway → Service
2. Click **"Redeploy"** button
3. Wait for build to complete
4. Check logs for environment variables loaded message

**Test Variables in Code:**
```typescript
console.log('JWT_SECRET:', process.env.JWT_SECRET) // Should not be undefined
console.log('SUPABASE_URL:', process.env.SUPABASE_URL) // Check in logs
```

---

## Monitoring & Maintenance

### Daily Monitoring

**Check 1: Service Health**
- Go to Railway dashboard
- Verify service status = 🟢 Running
- Check uptime clock (shouldn't restart randomly)

**Check 2: Error Logs**
- Click "Logs" tab
- Scan for red error messages
- Watch for pattern of errors

**Check 3: Resource Usage**
- Click "Metrics"
- Monitor CPU (should be < 50%)
- Monitor Memory (should be < 300MB for 512MB instance)

### Weekly Monitoring

**Performance Review:**
- Check response times trending
- Look for slowdowns
- Monitor error rate

**Security Review:**
- Check logs for suspicious activity
- Look for repeated failed auth attempts
- Review any unusual database queries

**Billing Check:**
- Go to Railway Account Settings → Billing
- Check current month usage
- Verify staying within $5 free credit

### Cost Management

**Monitor Egress (Data Transfer):**
```
Target: Keep under $5/month total
├─ Compute (512MB): ~$1.68/month
├─ Egress (reasonable traffic): ~$0.50-2.00/month
└─ Total should be: $2-4/month
```

**If approaching $5 limit:**
1. Optimize API responses (return fewer fields)
2. Implement caching (reduce repeated requests)
3. Upgrade to paid plan ($10/month)

### Redeployment

**When to Redeploy:**

**Automatic (no action needed):**
- Push code to `main` branch → Auto-deploys
- Update environment variables → Auto-redeploys

**Manual (click button):**
1. Go to Railway dashboard
2. Click service
3. Click "Redeploy" button
4. Wait for build to complete

**Typical Redeploy Time:** 2-5 minutes

### Updates and Maintenance

**Keep Dependencies Current:**
```bash
# Periodically check for updates
cd backend
npm outdated

# Update packages (carefully!)
npm update
npm audit fix
git add package*.json
git commit -m "Update dependencies"
git push origin main
```

**Monitor Node.js Version:**
- Currently using Node 18 (in Dockerfile)
- LTS versions: 18, 20, 22
- Update every 2-3 years for security

---

## Quick Reference Checklist

### Before Deployment
- [ ] Backend folder has Dockerfile
- [ ] package.json has build and start scripts
- [ ] .env.example exists with all required vars
- [ ] Code pushed to GitHub main branch

### During Deployment
- [ ] Railway account created
- [ ] Project created and building
- [ ] All 10 environment variables added
- [ ] Build completed successfully (🟢)

### After Deployment
- [ ] Railway URL obtained and tested
- [ ] Vercel NEXT_PUBLIC_API_URL updated
- [ ] Vercel redeployed
- [ ] Frontend loads without errors
- [ ] API calls work (check Network tab)
- [ ] Create/read/update operations succeed
- [ ] No CORS errors in console

### Ongoing
- [ ] Monitor Railway dashboard weekly
- [ ] Check logs for errors
- [ ] Watch cost (should be ~$2-4/month)
- [ ] Update dependencies monthly

---

## Common Command Reference

```bash
# Check git status
git status

# Commit and push changes
git add .
git commit -m "Your message"
git push origin main

# Test backend locally before deploying
cd backend
npm install
npm run build
npm run start
# Visit http://localhost:5000

# Check Supabase connection
curl https://your-project.supabase.co/rest/v1/
```

---

## Success Indicators

✅ **You know deployment succeeded when:**

1. Railway dashboard shows 🟢 Running
2. Health endpoint responds: `{"status": "ok"}`
3. Vercel frontend loads at `https://your-vercel-url.vercel.app`
4. No errors in browser console
5. Network tab shows requests to Railway URL
6. API responses return data
7. Database operations (create/read/update) work
8. No CORS errors
9. Monthly cost staying under $5 credit
10. Service stays running (no random restarts)

---

## Next Steps

After successful deployment:

1. **Monitor for issues** - Check logs daily first week
2. **Optimize if slow** - Reduce response sizes, add caching
3. **Plan scaling** - If traffic grows, consider paid plan
4. **Add features** - Update backend code, push to GitHub, auto-deploys
5. **Secure database** - Review RLS policies on Supabase
6. **Set up monitoring** - Configure alerts for downtime

---

## Support & Resources

| Resource | Link |
|----------|------|
| Railway Docs | https://railway.app/docs |
| Railway Pricing | https://railway.app/pricing |
| Railway Dashboard | https://railway.app/dashboard |
| Vercel Docs | https://vercel.com/docs |
| Supabase Docs | https://supabase.com/docs |
| Express.js Docs | https://expressjs.com |

---

## Troubleshooting Contact

If stuck, check:
1. Railway dashboard logs (red errors)
2. Browser DevTools (console errors)
3. This guide's Troubleshooting section
4. Railway documentation: https://railway.app/docs

---

**Last Updated:** February 27, 2026  
**Status:** Production Ready  
**Estimated Time:** 20-30 minutes for complete setup
