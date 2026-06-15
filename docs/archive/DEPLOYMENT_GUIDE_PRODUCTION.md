# 🚀 Deployment Guide - Vercel, Koyeb & Supabase

**For: ABIFRESH & KIDDIES VENTURES (AKV) - Inventory Management PWA**

This comprehensive guide covers deploying the complete AKV system to production across three platforms.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Supabase Setup](#step-1-supabase-setup)
3. [Step 2: Backend Deployment (Koyeb)](#step-2-backend-deployment-koyeb)
4. [Step 3: Frontend Deployment (Vercel)](#step-3-frontend-deployment-vercel)
5. [Step 4: Verification & Testing](#step-4-verification--testing)
6. [Post-Deployment Configuration](#post-deployment-configuration)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Accounts Required
- ✅ Supabase account (free tier available) → https://supabase.com
- ✅ Koyeb account (free tier available) → https://koyeb.com
- ✅ Vercel account (free tier available) → https://vercel.com
- ✅ GitHub account (required for all three) → https://github.com

### Local Setup
- ✅ AKV system tested on localhost
- ✅ All features verified working
- ✅ Git initialized and committed
- ✅ Environment files created

---

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to https://supabase.com
2. Sign in or create account
3. Click "New Project"
4. Fill in:
   - **Name:** akv-inventory-management
   - **Database Password:** Create strong password (save it!)
   - **Region:** Choose closest to your location
   - **Pricing Plan:** Free (for testing)
5. Click "Create new project"
6. Wait for project to initialize (5-10 minutes)

### 1.2 Get Supabase Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → `SUPABASE_URL`
   - **Anon Key** → `SUPABASE_ANON_KEY`
   - **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY`

3. Save them securely (you'll need them later)

### 1.3 Create Database Tables

1. Go to **SQL Editor** in Supabase dashboard
2. Create a new query
3. Paste the database schema SQL (from DATABASE_SCHEMA.md)
4. Click "Run"
5. Verify all 12 tables are created

**Tables to create:**
- users
- items
- categories
- sales
- inventory_active_store
- inventory_main_store
- payment_methods
- daily_sales_summary
- staff_assignments
- damage_loss_log
- chat_messages
- audit_log

### 1.4 Set Row Level Security (RLS)

1. Go to **Authentication** → **Policies**
2. For each table, create policies:
   - **SELECT:** Authenticated users can read their own data
   - **INSERT:** Users can insert their own data
   - **UPDATE:** Users can update their own data
   - **DELETE:** Only admins can delete

**Example policy for `users` table:**
```sql
-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
ON users
FOR SELECT
USING (auth.uid() = id);

-- Allow admins to read all users
CREATE POLICY "Admins can read all users"
ON users
FOR SELECT
USING (auth.jwt() ->> 'role' = 'admin');
```

### 1.5 Create Auth Users

1. Go to **Authentication** → **Users**
2. Click "Invite"
3. Add emails for each role:
   - admin@akv.com (Admin)
   - sales@akv.com (Sales)
   - staff@akv.com (Staff)
4. Users receive invite emails

---

## Step 2: Backend Deployment (Koyeb)

### 2.1 Push Backend to GitHub

```bash
# Initialize git if not already done
cd c:\Users\LuckyGold\Desktop\AKV
git init

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/akv-backend.git

# Commit code
git add .
git commit -m "Initial AKV backend commit"

# Push to GitHub
git push -u origin main
```

### 2.2 Prepare Backend for Production

1. **Update backend/.env:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET=your-very-long-random-secret-min-32-chars
CORS_ORIGIN=https://akv.vercel.app,https://www.akv.vercel.app
NODE_ENV=production
PORT=8080
PYTHON_AI_SERVICE_URL=https://akv-ai-service.koyeb.app
```

2. **Update backend/package.json scripts:**
```json
{
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc",
    "dev": "ts-node src/index.ts"
  }
}
```

3. **Create Procfile** (in backend root):
```
web: npm run build && npm start
```

### 2.3 Deploy to Koyeb

1. Go to https://app.koyeb.com
2. Click "Create Service"
3. Select "GitHub"
4. Authorize GitHub
5. Select repository: `akv-backend`
6. Fill in:
   - **Service name:** akv-backend
   - **Build:** Automatic
   - **Buildpack:** Node.js
7. Add Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `CORS_ORIGIN`
   - `NODE_ENV=production`
   - `PORT=8080`
8. Click "Deploy"
9. Wait for deployment (5-10 minutes)

### 2.4 Verify Backend Deployment

```bash
# Test health endpoint
curl https://akv-backend-{auto-generated}.koyeb.app/health

# Expected response:
# {
#   "status": "OK",
#   "service": "ABIFRESH & KIDDIES VENTURES API",
#   "timestamp": "2026-01-24T..."
# }
```

---

## Step 3: Frontend Deployment (Vercel)

### 3.1 Prepare Frontend for Production

1. **Update frontend/.env.production:**
```
NEXT_PUBLIC_API_URL=https://akv-backend-{name}.koyeb.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

2. **Update frontend/next.config.js:**
```javascript
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['your-cdn-domain.com'],
  },
  // Enable PWA in production
  productionBrowserSourceMaps: false,
};

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: false, // Enable PWA
});

module.exports = withPWA(nextConfig);
```

3. **Create vercel.json** (in frontend root):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_API_URL": "@akv_api_url",
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key"
  }
}
```

### 3.2 Deploy to Vercel

1. Go to https://vercel.com
2. Click "New Project"
3. Select "Import Git Repository"
4. Connect GitHub account
5. Select `akv-frontend` repository
6. Configure:
   - **Project Name:** akv
   - **Framework:** Next.js
   - **Root Directory:** ./frontend
7. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL` = Backend URL from Koyeb
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Anon key
8. Click "Deploy"
9. Wait for deployment (3-5 minutes)

### 3.3 Verify Frontend Deployment

Open https://akv.vercel.app in browser and verify:
- [ ] Pages load without 404 errors
- [ ] Login page displays correctly
- [ ] Can login with test credentials
- [ ] Dark mode toggle works
- [ ] All dashboards load
- [ ] API calls work (check Network tab)

---

## Step 4: Verification & Testing

### 4.1 Test All Routes

```bash
# Test backend health
curl https://akv-backend.koyeb.app/health

# Test login
curl -X POST https://akv-backend.koyeb.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@akv.com",
    "password": "password123"
  }'

# Test inventory endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://akv-backend.koyeb.app/api/inventory/items
```

### 4.2 Test Database Connection

1. Login to frontend with test account
2. Check browser Network tab
3. Verify API calls return data
4. Verify no CORS errors

### 4.3 Test All Features

- [ ] Login with different roles (Admin, Sales, Staff)
- [ ] View dashboards for each role
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Test dark/light mode
- [ ] Test navigation between pages
- [ ] Test form submissions
- [ ] Test PWA installation (click install prompt)

---

## Post-Deployment Configuration

### Update CORS in Supabase

1. Go to **Authentication** → **URL Configuration**
2. Add Authorized URLs:
   - `https://akv.vercel.app`
   - `https://www.akv.vercel.app`
   - `https://akv-backend.koyeb.app`

### Configure Email Notifications (Optional)

1. Go to **Authentication** → **Email**
2. Customize email templates
3. Enable password reset emails

### Set Up Backups

1. Go to **Backups** in Supabase
2. Enable automatic daily backups
3. Set retention period (7+ days)

### Configure Custom Domain (Optional)

**For Vercel:**
1. Go to **Settings** → **Domains**
2. Add custom domain: `akv.com`
3. Update DNS records (follow Vercel instructions)

**For Koyeb:**
1. Go to **Routes** in Koyeb
2. Add custom domain
3. Update DNS records

---

## Monitoring & Maintenance

### Set Up Monitoring

1. **Vercel Analytics:**
   - Go to **Analytics** in Vercel
   - Monitor performance metrics
   - Check error rates

2. **Supabase Monitoring:**
   - Go to **Reports** in Supabase
   - Monitor API usage
   - Check database metrics

3. **Koyeb Monitoring:**
   - Go to **Services** → Backend service
   - Check logs
   - Monitor resource usage

### Configure Alerts

**For Supabase:**
```sql
-- Monitor database size
SELECT
  schemaname,
  SUM(pg_total_relation_size(schemaname||'.'||tablename))::bigint as table_size
FROM pg_tables
GROUP BY schemaname;
```

**For Vercel:**
- Set up error tracking
- Enable performance monitoring
- Configure deployment notifications

### Regular Maintenance

- [ ] Check logs weekly
- [ ] Monitor database usage
- [ ] Review error reports
- [ ] Update dependencies monthly
- [ ] Test backup restoration quarterly
- [ ] Review and update CORS settings monthly

---

## Troubleshooting Deployment

### Backend Shows 404 on Login

**Cause:** API URL incorrect in frontend  
**Fix:**
```
1. Get correct backend URL from Koyeb
2. Update NEXT_PUBLIC_API_URL in Vercel environment
3. Redeploy Vercel
```

### CORS Errors in Browser Console

**Cause:** Frontend URL not authorized in backend  
**Fix:**
```
1. Add frontend URL to CORS_ORIGIN in backend .env
2. Redeploy backend
```

### Database Connection Failed

**Cause:** Wrong Supabase credentials  
**Fix:**
```
1. Verify SUPABASE_URL and keys
2. Check in Supabase API settings
3. Update in both Koyeb and Vercel
4. Redeploy both
```

### PWA Not Installing

**Cause:** Service worker disabled or HTTPS issues  
**Fix:**
```
1. Verify HTTPS enabled (Vercel/Koyeb handle this)
2. Check service worker loads (Network tab → /sw.js)
3. Ensure manifest.json exists in public/
```

---

## Environment Variables Summary

### Backend (Koyeb)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
JWT_SECRET=your-long-random-secret-32-chars-minimum
CORS_ORIGIN=https://akv.vercel.app
NODE_ENV=production
PORT=8080
```

### Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://akv-backend.koyeb.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## Rollback Plan

If deployment fails:

1. **Frontend:** 
   - Go to Vercel → **Deployments**
   - Click "Rollback" on previous version
   - Previous version goes live immediately

2. **Backend:**
   - Go to Koyeb → **Deployments**
   - Redeploy previous commit
   - Takes 5-10 minutes

3. **Database:**
   - Go to Supabase → **Backups**
   - Restore from previous backup
   - Choose specific timestamp

---

## Security Checklist

Before going live:

- [ ] All environment variables set (no hardcoded secrets)
- [ ] JWT_SECRET is long and random (32+ characters)
- [ ] CORS configured correctly
- [ ] RLS policies enabled on all tables
- [ ] Password reset enabled
- [ ] Email verification enabled
- [ ] Rate limiting configured
- [ ] HTTPS enabled (automatic with Vercel/Koyeb)
- [ ] Backups configured
- [ ] Monitoring enabled

---

## Post-Launch Monitoring

### Week 1
- [ ] Monitor error logs daily
- [ ] Check database performance
- [ ] Verify user authentication works
- [ ] Test all features on production

### Month 1
- [ ] Review analytics
- [ ] Monitor resource usage
- [ ] Plan scaling if needed
- [ ] Gather user feedback

### Ongoing
- [ ] Monthly dependency updates
- [ ] Weekly log reviews
- [ ] Monthly security audits
- [ ] Quarterly data backups test

---

## Support & Resources

### Supabase Documentation
https://supabase.com/docs

### Vercel Documentation
https://vercel.com/docs

### Koyeb Documentation
https://docs.koyeb.com

### Next.js Deployment
https://nextjs.org/docs/deployment

---

## Quick Reference URLs

After deployment, bookmark these:

- **Frontend:** https://akv.vercel.app
- **Backend API:** https://akv-backend.koyeb.app
- **Backend Health:** https://akv-backend.koyeb.app/health
- **Supabase Dashboard:** https://app.supabase.com
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Koyeb Dashboard:** https://app.koyeb.com

---

**Created:** January 24, 2026  
**For:** AKV (ABIFRESH & KIDDIES VENTURES)  
**Version:** 1.0  
**Last Updated:** January 24, 2026
