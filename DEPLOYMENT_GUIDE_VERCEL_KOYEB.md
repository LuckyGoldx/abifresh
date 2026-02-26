# Complete Deployment Guide: Vercel + Koyeb

This guide provides step-by-step instructions for deploying the ABIFRESH & KIDDIES VENTURES application using Vercel (frontend) and Koyeb (backend).

**Project Structure:**
- **Frontend:** Next.js 13 application (TypeScript/React)
- **Backend:** Express.js server with TypeScript
- **Database:** Supabase (PostgreSQL)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Frontend Deployment to Vercel](#frontend-deployment-to-vercel)
3. [Backend Deployment to Koyeb](#backend-deployment-to-koyeb)
4. [Environment Variables Setup](#environment-variables-setup)
5. [Database Configuration](#database-configuration)
6. [Post-Deployment Testing](#post-deployment-testing)
7. [Troubleshooting](#troubleshooting)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

Before starting, ensure you have:

- ✅ **GitHub Account** - with this repository pushed
- ✅ **Vercel Account** - created at https://vercel.com
- ✅ **Koyeb Account** - created at https://app.koyeb.com
- ✅ **Supabase Project** - database already set up
- ✅ **Git** - installed on your machine
- ✅ **Node.js** - version 18+ installed locally

### Collect These Credentials (You'll Need Them)

```
Supabase:
  - Project URL: https://your-project.supabase.co
  - Anon Key: your_anon_key
  - Service Role Key: your_service_role_key

GitHub:
  - Repository URL: https://github.com/your-username/your-repo
  - Personal Access Token (for Koyeb integration)
```

---

## Frontend Deployment to Vercel

### Step 1: Prepare Your Repository

**1.1 - Ensure your code is clean:**
```bash
cd c:\Users\LuckyGold\Desktop\AKV
git status
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

**1.2 - Verify frontend structure:**
```
frontend/
├── app/
├── components/
├── lib/
├── public/
├── .env.local.example
├── next.config.js
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

### Step 2: Connect Vercel to GitHub

**2.1 - Login to Vercel:**
- Go to https://vercel.com/dashboard
- Click **"Add New..."** → **"Project"**

**2.2 - Import from GitHub:**
- Click **"Import Project"**
- Authorize Vercel to access your GitHub account
- Find and click your repository
- Click **"Import"**

**2.3 - Select Root Directory:**
- When prompted for "Root Directory", select **"frontend"**
- Click **"Continue"**

### Step 3: Configure Build Settings

**3.1 - Project Settings:**

| Setting | Value |
|---------|-------|
| **Framework** | Next.js |
| **Node Version** | 18.x |
| **Install Command** | `npm install` |
| **Build Command** | `npm run build` |
| **Output Directory** | (auto-detected) |
| **Start Command** | `npm start` |

**3.2 - Environment Variables:**

Click **"Environment Variables"** and add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `NEXT_PUBLIC_API_URL` | `https://your-koyeb-backend-url.koyeb.app` |
| `NEXT_PUBLIC_APP_NAME` | `ABIFRESH & KIDDIES VENTURES` |

**Note:** Replace Koyeb URL after you deploy the backend (come back to update this).

**3.3 - Advanced Settings (Optional):**
- **Auto-redeployment on push:** Enabled (default)
- **Source GitHub Repository:** Your repo
- **Automatic deployment from:** `main` branch

### Step 4: Deploy

**4.1 - Click "Deploy"**
- Vercel will start building and deploying
- Wait for the build to complete (usually 2-5 minutes)
- You'll see a success message with your deployment URL

**4.2 - Get Your Frontend URL:**
```
Example: https://your-project.vercel.app
```

### Step 5: Post-Deployment Vercel Configuration

**5.1 - Set up custom domain (optional):**
- In Vercel dashboard, go to **Settings** → **Domains**
- Add your custom domain
- Update DNS records as instructed

**5.2 - Enable Analytics (optional):**
- Dashboard → **Settings** → **Analytics**
- Enable Web Analytics (free)

**5.3 - Set up Preview Deployments:**
- Go to **Settings** → **Git** → **Deployments**
- Toggle "Preview Deployments" to **On**
- This creates preview URLs for PRs

---

## Backend Deployment to Koyeb

### Step 1: Push Backend to GitHub

**1.1 - Ensure backend is in your repo:**
```bash
cd c:\Users\LuckyGold\Desktop\AKV
git add backend/
git commit -m "Add backend for Koyeb deployment"
git push origin main
```

**1.2 - Verify backend structure:**
```
backend/
├── src/
│   ├── routes/
│   ├── middleware/
│   ├── controllers/
│   ├── models/
│   └── index.ts
├── dist/
├── Dockerfile
├── .env.example
├── package.json
└── tsconfig.json
```

### Step 2: Koyeb Account Setup

**2.1 - Login to Koyeb:**
- Go to https://app.koyeb.com
- Sign in/create account
- Accept the terms and complete the setup

**2.2 - Connect GitHub:**
- Dashboard → **Settings** → **Integrations**
- Click **"Connect GitHub"**
- Authorize Koyeb to access your repositories
- Return to Koyeb dashboard

### Step 3: Create a New Service

**3.1 - Deploy from GitHub:**
- Click **"Create Web Service"** or **"Create Services"**
- Select **"GitHub"** as deployment method
- Choose your repository
- Select the **`main`** branch

**3.2 - Configure Service:**

| Setting | Value |
|---------|-------|
| **Name** | `abifresh-backend` |
| **Builder** | `Docker` |
| **Dockerfile Path** | `backend/Dockerfile` |
| **Port** | `5000` |
| **Environment** | `Production` |

**3.3 - Set Instance Type:**
- Select **"Free"** or **"Starter"** plan
- 512 MB RAM is sufficient for your backend

### Step 4: Add Environment Variables

**4.1 - In Koyeb Service Creation:**
- Scroll to **"Environment Variables"** section
- Add the following variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
PORT=5000
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRY=7d
CORS_ORIGIN=https://your-project.vercel.app,https://localhost:3000
APP_NAME=ABIFRESH & KIDDIES VENTURES
LOG_LEVEL=info
```

**Important:** 
- Never commit `.env` files to GitHub
- All secrets must be added via Koyeb dashboard
- Make `JWT_SECRET` a strong random string

### Step 5: Deploy Backend

**5.1 - Click "Create Service"**
- Koyeb will build your Docker image
- This may take 3-5 minutes
- You'll see a success message

**5.2 - Get Your Backend URL:**
```
Example: https://abifresh-backend-xxxxxxxxxx.koyeb.app
```

**5.3 - Wait for Health Checks:**
- Koyeb performs health checks
- Wait until status shows "healthy" (green)
- This ensures your API is running correctly

---

## Environment Variables Setup

### Summary of All Required Variables

#### Frontend (Vercel)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_API_URL=https://abifresh-backend-xxx.koyeb.app
NEXT_PUBLIC_APP_NAME=ABIFRESH & KIDDIES VENTURES
```

#### Backend (Koyeb)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
PORT=5000
NODE_ENV=production
JWT_SECRET=<generate-a-strong-random-string>
JWT_EXPIRY=7d
CORS_ORIGIN=https://your-project.vercel.app,https://localhost:3000
APP_NAME=ABIFRESH & KIDDIES VENTURES
LOG_LEVEL=info
```

### How to Get Supabase Credentials

**Step 1: Login to Supabase**
- Go to https://supabase.com
- Select your project

**Step 2: Get API Keys**
- Go to **Settings** → **API**
- Copy the following:
  - **Project URL** → Use as `SUPABASE_URL`
  - **anon (public)** → Use as `SUPABASE_ANON_KEY`
  - **service_role (secret)** → Use as `SUPABASE_SERVICE_ROLE_KEY`

**Step 3: Update Environment Variables**
- Frontend (Vercel): Update `NEXT_PUBLIC_API_URL` with your Koyeb backend URL
- Backend (Koyeb): Already set during creation

---

## Database Configuration

### Step 1: Verify Supabase Setup

**1.1 - Check database existence:**
```bash
# Access Supabase SQL Editor and verify your tables exist:
- users
- products/inventory
- payments
- orders
(and other required tables for your application)
```

**1.2 - Verify RLS Policies:**
- Go to **Authentication** → **Policies**
- Ensure proper Row Level Security is configured
- Check that service role can access data

### Step 2: Create Storage Buckets (if needed)

**2.1 - Setup Storage:**
- In Supabase, go to **Storage**
- Create bucket: `avatars` (for user avatars)
- Create bucket: `receipts` (for receipt uploads)
- Create bucket: `products` (for product images)

**2.2 - Set Public Access:**
- For each bucket, click **"Edit"**
- Set to **"Public"** if images should be public
- Set to **"Private"** if you need RLS

### Step 3: Test Database Connection

After deploying:

**3.1 - Test API endpoint:**
```bash
curl https://your-backend-url.koyeb.app/health
# Should return: { status: "ok" }
```

**3.2 - Check logs:**
- In Koyeb dashboard, click your service
- Go to **"Logs"** tab
- Verify no connection errors

---

## Post-Deployment Testing

### Test 1: Verify Frontend

**1.1 - Open frontend URL:**
```
https://your-project.vercel.app
```

**1.2 - Check functionality:**
- [ ] Page loads without errors
- [ ] Supabase connection works (check console)
- [ ] Navigation works
- [ ] Can attempt login (don't need valid credentials yet)

**1.3 - Check browser console:**
- Open DevTools (F12)
- Check **Console** tab for errors
- Check **Network** tab for API calls

### Test 2: Verify Backend API

**2.1 - Test health endpoint:**
```bash
curl https://your-backend-url.koyeb.app/health
```

**Expected response:**
```json
{
  "status": "ok"
}
```

**2.2 - Test with authentication:**
```bash
curl -X POST https://your-backend-url.koyeb.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

**2.3 - Check Koyeb logs:**
- In Koyeb dashboard, view **Logs**
- Verify requests are being received
- Check for any errors

### Test 3: Full Application Flow

**3.1 - Test login:**
1. Go to frontend URL
2. Try logging in with test credentials
3. Check browser console and network tab

**3.2 - Test API communication:**
1. Use frontend features that call the backend
2. Check Network tab in DevTools
3. Verify requests go to Koyeb backend URL

**3.3 - Test database operations:**
1. Create/read/update/delete data through frontend
2. Verify data appears in Supabase
3. No CORS errors should appear

### Test 4: Environment Verification

**4.1 - Verify Vercel env vars:**
- In Vercel dashboard → Settings → Environment Variables
- Confirm all variables are set
- Check preview deployments have correct values

**4.2 - Verify Koyeb env vars:**
- In Koyeb dashboard → Service Settings → Environment
- Confirm all variables are set
- No sensitive data in logs

---

## Troubleshooting

### Issue 1: Vercel Build Fails

**Error: "Build failed"**

**Solutions:**
```bash
# 1. Check build logs in Vercel dashboard
# 2. Verify Node.js version matches (18+)
# 3. Ensure all dependencies are in package.json

# Locally test build:
cd frontend
npm install
npm run build

# If it works locally but fails on Vercel:
# - Check node_modules size
# - Increase memory in build settings
# - Clear Vercel cache: Dashboard → Settings → Deployments → "Clear Cache"
```

### Issue 2: CORS Errors

**Error: "Access to XMLHttpRequest blocked by CORS policy"**

**Solution:**
Check backend CORS configuration:
```typescript
// In your backend Express setup
const corsOptions = {
  origin: [
    'https://your-project.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
};
app.use(cors(corsOptions));
```

Update Koyeb environment variable:
```
CORS_ORIGIN=https://your-project.vercel.app,http://localhost:3000
```

### Issue 3: Koyeb Service Won't Start

**Error: "Service failed to start" or stays in "Building" state**

**Solutions:**
```bash
# 1. Check Dockerfile is correct
# 2. Verify package.json has build and start scripts
# 3. Check Node.js compatibility

# In backend/package.json:
"scripts": {
  "dev": "ts-node src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js"
}

# 4. In Koyeb logs, look for specific errors
# 5. Rebuild service: Dashboard → Service → "Redeploy"
```

### Issue 4: Database Connection Fails

**Error: "Cannot connect to Supabase" or timeout errors**

**Solutions:**
```bash
# 1. Verify Supabase URL is correct (no trailing slash)
# 2. Check anon key is valid
# 3. Test connection locally first:

npm install @supabase/supabase-js
# Then in a test file:
import { createClient } from '@supabase/supabase-js'
const client = createClient(SUPABASE_URL, SUPABASE_KEY)

# 4. Check Supabase project is active
# 5. Verify RLS policies allow access
# 6. Test from Vercel with:
curl https://your-project.vercel.app/api/test-db
```

### Issue 5: Environment Variables Not Loading

**Error: "undefined" values for env variables in production**

**Solutions:**
```bash
# Frontend (Vercel):
# - Must use NEXT_PUBLIC_ prefix for client-side vars
# - Redeploy after adding vars to Vercel
# - Check .env.local.example vs actual values

# Backend (Koyeb):
# - Verify variables in Koyeb dashboard Environment section
# - Redeploy service after changing env vars
# - No .env file should be in Git (add to .gitignore)

# Test in Koyeb logs:
console.log(process.env.SUPABASE_URL) // Should not be undefined
```

### Issue 6: Deployment Gets Stuck

**Error: Build process hangs or times out**

**Solutions:**
```bash
# For Vercel:
# 1. Clear cache: Settings → Deployments → Clear Cache
# 2. Force redeploy: Click "Redeploy" button
# 3. Check for infinite loops in build scripts

# For Koyeb:
# 1. Cancel current deployment
# 2. Check Dockerfile for hung processes
# 3. Review logs for specific errors
# 4. Manually redeploy from dashboard
```

---

## Monitoring & Maintenance

### Monitor Vercel

**Enable Analytics:**
1. Dashboard → Settings → Analytics
2. View logs: Deployments → Click deployment → Logs
3. Monitor build times and errors

**Check Deployments:**
```bash
# View recent deployments
# Dashboard → Deployments

# Common issues:
- Failed builds (check logs)
- Slow builds (check dependencies)
- Failed health checks (check API connectivity)
```

**Environment Variables:**
- Update NEXT_PUBLIC_API_URL if backend URL changes
- Never expose secrets in public env vars

### Monitor Koyeb

**View Logs:**
1. Dashboard → Services → Your Service
2. Click "Logs" tab
3. Stream or search logs

**Health Checks:**
1. Service automatically health checks your API
2. Look for "healthy" status
3. Configure health check endpoint if needed

**Scale Service:**
1. If you get traffic, upgrade from Free to Starter
2. Settings → Instance Type
3. Increase RAM if needed

### Regular Maintenance

**Daily:**
- Check Vercel and Koyeb dashboards for errors
- Monitor application logs
- Verify API is responding

**Weekly:**
- Review build logs and performance
- Check for failed deployments
- Monitor uptime

**Monthly:**
- Review environment variables
- Update dependencies (npm)
- Check for deprecated features
- Test full deployment process

---

## Deployment Checklist

### Before First Deployment
- [ ] GitHub repository created and updated
- [ ] Backend has Dockerfile
- [ ] All sensitive data removed from code
- [ ] .env files in .gitignore
- [ ] package.json has correct scripts
- [ ] Supabase project created and tables set up
- [ ] Vercel account created
- [ ] Koyeb account created

### Vercel Deployment
- [ ] Repository connected to Vercel
- [ ] Root directory set to "frontend"
- [ ] All env vars added to Vercel
- [ ] Build completes successfully
- [ ] Frontend URL obtained
- [ ] Page loads without console errors

### Koyeb Deployment
- [ ] GitHub connected to Koyeb
- [ ] Docker build method selected
- [ ] Dockerfile path correct
- [ ] All env vars added to Koyeb
- [ ] Service built successfully
- [ ] Service status shows "healthy"
- [ ] Backend URL obtained

### Post-Deployment
- [ ] Updated frontend `NEXT_PUBLIC_API_URL` with Koyeb URL
- [ ] Tested frontend loads
- [ ] Tested backend `/health` endpoint
- [ ] Tested API communication
- [ ] Tested database operations
- [ ] Verified no CORS errors
- [ ] Checked environment variables are working

---

## Quick Command Reference

### For Vercel Redeployment
```bash
git add .
git commit -m "Update deployment"
git push origin main
# Vercel automatically redeploys
```

### For Koyeb Redeployment
```bash
# Option 1: Push to GitHub (auto-redeploys)
git push origin main

# Option 2: Manual redeploy in Koyeb dashboard
# Services → Your Service → Redeploy
```

### Local Testing Before Deployment
```bash
# Frontend
cd frontend
npm install
npm run build
npm run start
# Visit http://localhost:3000

# Backend
cd backend
npm install
npm run build
npm run start
# Test http://localhost:5000/health
```

---

## Useful Links

| Service | Link |
|---------|------|
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **Vercel Docs** | https://vercel.com/docs |
| **Koyeb Dashboard** | https://app.koyeb.com |
| **Koyeb Docs** | https://koyeb.com/docs |
| **Supabase Dashboard** | https://supabase.com/dashboard |
| **Next.js Docs** | https://nextjs.org/docs |
| **Express.js Docs** | https://expressjs.com |

---

## Support & Next Steps

1. **Read all sections** before deploying
2. **Test locally first** before pushing to production
3. **Monitor closely** after first deployment
4. **Check logs regularly** for errors
5. **Keep environment variables secure** - never commit .env files

---

**Last Updated:** February 26, 2026  
**Version:** 1.0  
**Status:** Production Ready
