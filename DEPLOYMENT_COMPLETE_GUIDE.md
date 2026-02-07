# 🚀 Complete Deployment Guide
## Vercel + Koyeb + Supabase Production Deployment

This comprehensive guide covers deploying your ABI Fresh & Kiddies Ventures application with all optimizations applied for maximum performance.

---

## 🎯 Performance Optimizations Already Applied

### ✅ What We've Done to Make Your App Faster:

1. **Next.js Configuration Optimized**
   - PWA disabled in development (faster dev experience)
   - SWC minification enabled
   - Console logs removed in production
   - Font optimization enabled
   - Image optimization (AVIF, WebP formats)
   - CSS optimization enabled
   - Powered-by header removed

2. **Link Prefetching Enabled**
   - All navigation links now prefetch pages in the background
   - When you hover over a menu item, the page starts loading
   - Result: Near-instant page transitions

3. **Loading States Added**
   - Immediate visual feedback when navigating
   - Loading spinners show while pages load
   - No more blank screens

4. **Production-Ready Code**
   - Optimized bundle sizes
   - Code splitting enabled
   - Tree shaking enabled
   - Dead code elimination

**Result:** Pages should now load instantly or show loading feedback immediately!

---

## 📋 Deployment Architecture

```
┌─────────────────┐
│                 │
│    FRONTEND     │
│   (Next.js)     │──► Deployed to VERCEL
│                 │    https://your-app.vercel.app
└────────┬────────┘
         │
         │ API Calls
         │
         ▼
┌─────────────────┐
│                 │
│    BACKEND      │
│ (Node/Express)  │──► Deployed to KOYEB
│                 │    https://your-api.koyeb.app
└────────┬────────┘
         │
         │ Database Queries
         │
         ▼
┌─────────────────┐
│                 │
│   DATABASE      │
│  (PostgreSQL)   │──► Hosted on SUPABASE
│                 │    https://xxx.supabase.co
└─────────────────┘
```

---

## Part 1: Supabase Database Setup (15 minutes)

### Step 1: Create Supabase Project

1. Visit **[supabase.com](https://supabase.com)** → Sign in/Sign up
2. Click **"New Project"**
3. Configure:
   ```
   Organization: Create new or select existing
   Name: abifresh-production
   Database Password: [Generate strong password - SAVE THIS!]
   Region: Choose closest to your users
   ```
4. Click **"Create new project"** (waittakes ~2 minutes)

### Step 2: Save Your Credentials

Go to **Settings** → **API**, copy and save these:

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (⚠️ SECRET!)
```

### Step 3: Create Database Schema

Go to **SQL Editor** → Click **"New query"** → Paste this:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'sales', 'staff_commission', 'staff_non_commission')),
  store_location TEXT DEFAULT 'Jalingo',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items table
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  description TEXT,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales table
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_person_id UUID REFERENCES public.users(id),
  item_id UUID REFERENCES public.items(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  buyer_type TEXT,
  buyer_id UUID,
  store_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posted Items table
CREATE TABLE IF NOT EXISTS public.posted_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_person_id UUID REFERENCES public.users(id),
  receiver_staff_id UUID REFERENCES public.users(id),
  item_id UUID REFERENCES public.items(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff Payments table
CREATE TABLE IF NOT EXISTS public.staff_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.users(id),
  posted_item_id UUID REFERENCES public.posted_items(id),
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  receipt_reference TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.users(id),
  expense_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create performance indexes
CREATE INDEX idx_sales_person ON sales(sales_person_id);
CREATE INDEX idx_sales_date ON sales(created_at DESC);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_posted_items_status ON posted_items(status);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
```

Click **"Run"** ✅

### Step 4: Enable Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posted_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow service role to bypass RLS (for your backend)
CREATE POLICY "Service role bypass" ON public.users FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

---

## Part 2: Backend Deployment to Koyeb (20 minutes)

### Step 1: Prepare Your Code

1. **Create `.gitignore` in backend folder:**
```
node_modules/
dist/
.env
.env.local
.env.production
*.log
```

2. **Update `backend/package.json`:**
```json
{
  "name": "abifresh-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc",
    "dev": "nodemon src/index.ts"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

3. **Verify `tsconfig.json` has:**
```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

### Step 2: Push to GitHub

```bash
# Navigate to backend folder
cd C:\Users\LuckyGold\Desktop\AKV\backend

# Initialize git
git init
git add .
git commit -m "Initial backend commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/abifresh-backend.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Koyeb

1. Go to **[app.koyeb.com](https://app.koyeb.com)** → Sign in

2. Click **"Create App"**

3. **Select GitHub:**
   - Connect your GitHub account
   - Select `abifresh-backend` repository
   - Branch: `main`

4. **Configure Build:**
   ```
   Builder: Buildpack
   Build command: npm install && npm run build
   Run command: npm start
   ```

5. **Set Environment Variables:**
   Click **"Advanced"** → **"Environment variables"**:
   ```
   NODE_ENV=production
   PORT=8000
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   JWT_SECRET=super-secret-key-minimum-32-characters-long-random
   JWT_EXPIRY=7d
   CORS_ORIGIN=*
   ```

6. **Choose Instance:**
   - Free tier: 512MB RAM (good for starting)
   - Or Nano: $5/month for better performance

7. Click **"Deploy"** 🚀

8. **Wait ~5-10 minutes**, then copy your URL:
   ```
   https://your-app-name.koyeb.app
   ```

9. **Test it:**
   ```
   https://your-app-name.koyeb.app/health
   ```
   Should return: `{"status":"OK","service":"ABIFRESH..."}`

---

## Part 3: Frontend Deployment to Vercel (15 minutes)

### Step 1: Prepare Frontend

1. **Create `.env.production` in frontend folder:**
```env
NEXT_PUBLIC_API_URL=https://your-app-name.koyeb.app
```

2. **Create `.gitignore` in frontend folder:**
```
node_modules/
.next/
out/
.env.local
.env.production
*.log
```

3. **Verify `package.json`:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Step 2: Push to GitHub

```bash
# Navigate to frontend
cd C:\Users\LuckyGold\Desktop\AKV\frontend

git init
git add .
git commit -m "Initial frontend commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/abifresh-frontend.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Vercel

1. Go to **[vercel.com](https://vercel.com)** → Sign in

2. Click **"Add New"** → **"Project"**

3. **Import Repository:**
   - Connect GitHub
   - Select `abifresh-frontend`
   - Click **"Import"**

4. **Configure:**
   ```
   Framework Preset: Next.js (auto-detected)
   Root Directory: ./
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

5. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-app-name.koyeb.app
   ```

6. Click **"Deploy"** 🚀

7. **Wait ~2-5 minutes**

8. You'll get a URL:
   ```
   https://abifresh-frontend.vercel.app
   ```

### Step 4: Update CORS on Backend

1. Go back to **Koyeb** → Your app → **Settings** → **Environment**

2. Update `CORS_ORIGIN`:
   ```
   CORS_ORIGIN=https://abifresh-frontend.vercel.app
   ```

3. Click **"Save"** → Backend will redeploy

---

## Part 4: Final Configuration & Testing

### Test Your Deployment

1. **Visit your Vercel URL**
2. **Login with:**
   ```
   Email: admin@abifresh.com
   Password: admin123
   ```
3. **Test features:**
   - [ ] Dashboard loads
   - [ ] Make a sale
   - [ ] Add inventory
   - [ ] View reports
   - [ ] Check browser console (no errors)

### Set Up Custom Domain (Optional)

#### Vercel Domain:
1. **Settings** → **Domains**
2. Add `abifresh.com`
3. Configure DNS:
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   ```

#### Koyeb Domain:
1. **Settings** → **Domains**
2. Add `api.abifresh.com`
3. Configure DNS:
   ```
   Type: CNAME
   Name: api
   Value: your-app.koyeb.app
   ```

---

## 🔧 Additional Optimizations

### Enable Vercel Analytics

1. Go to your project → **Analytics**
2. Enable Web Analytics (free)
3. Get insights on page performance

### Set Up Supabase Backups

1. Supabase auto-backs up daily (free tier)
2. For manual backups: **Database** → **Backups**

### Enable Koyeb Monitoring

1. **Metrics** tab shows:
   - CPU usage
   - Memory usage
   - Request count
   - Response times

---

## 💰 Cost Breakdown

### Free Tier Limits:
- **Vercel:** 100GB bandwidth/month, unlimited deployments
- **Koyeb:** $5 free credit, then ~$5-10/month for Nano instance
- **Supabase:** 500MB database, 2GB bandwidth, 50K monthly users

### Recommended for Production:
- **Vercel Pro:** $20/month (better performance, analytics)
- **Koyeb Standard:** $10-20/month (dedicated resources)
- **Supabase Pro:** $25/month (8GB database, priority support)

**Total:** $55-65/month for serious production use

---

## 🚨 Common Issues & Solutions

### "Cannot connect to backend"
```bash
# Check backend is running
curl https://your-app.koyeb.app/health

# Verify NEXT_PUBLIC_API_URL in Vercel
# Should be: https://your-app.koyeb.app (no trailing slash)
```

### "Database connection failed"
```bash
# Verify Supabase credentials in Koyeb
# Check Supabase project is active
# Test connection in Supabase SQL Editor
```

### "Build failed"
```bash
# Test locally first
npm run build

# Check logs in Vercel/Koyeb dashboard
# Fix errors, commit, push → auto-redeploy
```

---

## 📈 Performance Monitoring

### Vercel Analytics
- Page load times
- Core Web Vitals
- Traffic analytics

### Koyeb Logs
- Request/response logs
- Error tracking
- Resource usage

### Supabase Logs
- Query performance
- Slow queries
- Connection pool status

---

## 🔐 Security Checklist

Before going live:
- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (min 32 chars random)
- [ ] Enable Supabase RLS policies
- [ ] Set specific CORS origins (not *)
- [ ] Enable HTTPS only
- [ ] Regular security audits
- [ ] Monitor for unauthorized access

---

## ✅ Deployment Checklist

- [ ] Supabase project created & configured
- [ ] Database tables created
- [ ] Database indexes created
- [ ] RLS policies enabled
- [ ] Backend pushed to GitHub
- [ ] Backend deployed to Koyeb
- [ ] Backend health check passing
- [ ] Frontend pushed to GitHub
- [ ] Frontend deployed to Vercel
- [ ] Frontend loads successfully
- [ ] Environment variables set correctly
- [ ] CORS configured properly
- [ ] Test user can login
- [ ] All features tested
- [ ] Analytics enabled
- [ ] Monitoring set up
- [ ] Custom domain configured (optional)
- [ ] SSL certificates active
- [ ] Backups configured

---

## 🎉 Success!

Your application is now live at:
- **Frontend:** https://your-app.vercel.app
- **Backend API:** https://your-api.koyeb.app
- **Database:** Supabase Cloud

### Performance Improvements:
- ✅ Pages load instantly (prefetching enabled)
- ✅ Loading states provide immediate feedback
- ✅ Optimized builds (smaller bundles)
- ✅ CDN distribution (faster global access)
- ✅ Auto-scaling on demand
- ✅ Production-grade infrastructure

Enjoy your blazing-fast, production-ready application! 🚀

---

## 📞 Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **Koyeb Docs:** https://www.koyeb.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs

---

**Last Updated:** January 2026
**Status:** Production Ready ✅
