# ABIFRESH & KIDDIES VENTURES - PWA Sales Management System

## Setup Guide for Supabase, Koyeb, and Vercel

### Table of Contents
1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [Supabase Setup](#supabase-setup)
4. [Backend Setup (Koyeb)](#backend-setup-koyeb)
5. [Frontend Setup (Vercel)](#frontend-setup-vercel)
6. [Role Assignment & Configuration](#role-assignment--configuration)
7. [Environment Variables](#environment-variables)
8. [Database Schema](#database-schema)
9. [Deployment Instructions](#deployment-instructions)
10. [Troubleshooting](#troubleshooting)

---

## Project Overview

**ABIFRESH & KIDDIES VENTURES** is a Progressive Web App (PWA) for sales management with the following features:

- **Role-Based Access Control**: Admin, Sales, Commission Staff, Non-Commission Staff
- **Real-Time Updates**: Inventory, sales, and notifications
- **Payment Processing**: Cash, POS, Transfer with admin approval
- **Multi-Store System**: Main Store (inventory) + Active Store (selling)
- **Location-Based Pricing**: Fixed in Jalingo, additional logistics fare outside
- **Comprehensive Reporting**: Sales analytics, staff performance, expenses

### Tech Stack
- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Real-Time**: Supabase Realtime + WebSockets
- **Deployment**: Vercel (Frontend) + Koyeb (Backend)
- **Authentication**: Supabase Auth + JWT

---

## Prerequisites

### Required Tools
- Node.js 18+ and npm/yarn
- Git
- PostgreSQL client (optional, for local testing)
- Docker (optional, for local backend)

### Accounts Required
1. **Supabase** account: https://supabase.com
2. **Vercel** account: https://vercel.com
3. **Koyeb** account: https://www.koyeb.com
4. **GitHub** account (for deployments)

---

## Supabase Setup

### Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click **New Project**
3. Fill in details:
   - **Project name**: `abifresh-kiddies-ventures`
   - **Database password**: Create a strong password (save this!)
   - **Region**: Select closest to your location (e.g., `eu-west-1` for Europe)
4. Click **Create new project** (wait 2-3 minutes)

### Step 2: Get API Keys

1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon key**: (public key for client-side)
   - **service_role key**: (secret key for server-side)
3. Save these in a secure location

### Step 3: Enable Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** (default)
3. Go to **URL Configuration**:
   - Add **Redirect URLs**:
     ```
     http://localhost:3000/auth/callback
     http://localhost:3001/auth/callback
     https://your-frontend-domain.vercel.app/auth/callback
     ```

### Step 4: Create Database Tables

Copy and run the following SQL in Supabase SQL Editor (**SQL Editor** → **New Query**):

```sql
-- Users table (extends Supabase auth)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'sales', 'staff_commission', 'staff_non_commission')),
    is_active BOOLEAN DEFAULT TRUE,
    store_location TEXT DEFAULT 'Jalingo',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Staff commissions configuration
CREATE TABLE staff_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    commission_percentage DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(staff_id, item_id)
);

-- Items/Products table
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    base_price DECIMAL(12,2) NOT NULL,
    commission_amount DECIMAL(10,2) DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inventory - Main Store
CREATE TABLE inventory_main_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(item_id)
);

-- Inventory - Active Store
CREATE TABLE inventory_active_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(item_id)
);

-- Sales transactions
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_person_id UUID NOT NULL REFERENCES users(id),
    item_id UUID NOT NULL REFERENCES items(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'pos', 'transfer')),
    buyer_type TEXT NOT NULL CHECK (buyer_type IN ('customer', 'staff')),
    buyer_id UUID REFERENCES users(id),
    store_location TEXT DEFAULT 'Jalingo',
    receipt_reference TEXT,
    is_printed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Daily sales summary (for dashboard - resets at 12 AM)
CREATE TABLE daily_sales_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_date DATE DEFAULT CURRENT_DATE,
    sales_person_id UUID NOT NULL REFERENCES users(id),
    total_items_sold INTEGER DEFAULT 0,
    total_amount_sold DECIMAL(12,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(sales_date, sales_person_id)
);

-- Posted items (from sales to staff)
CREATE TABLE posted_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_person_id UUID NOT NULL REFERENCES users(id),
    receiver_staff_id UUID NOT NULL REFERENCES users(id),
    item_id UUID NOT NULL REFERENCES items(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payments from staff
CREATE TABLE staff_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES users(id),
    posted_item_id UUID NOT NULL REFERENCES posted_items(id),
    amount_paid DECIMAL(12,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'pos', 'transfer')),
    receipt_reference TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Expenses tracking
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES users(id),
    expense_type TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type TEXT NOT NULL CHECK (type IN ('posted_item', 'payment_approved', 'payment_rejected', 'item_request')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Activity logs
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_sales_person_id ON sales(sales_person_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_posted_items_receiver ON posted_items(receiver_staff_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_daily_sales_summary_date ON daily_sales_summary(sales_date);
CREATE INDEX idx_users_role ON users(role);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE posted_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (see detailed setup in backend documentation)
```

### Step 5: Set Up Row Level Security (RLS) Policies

In Supabase, go to **Authentication** → **Policies** and create policies for data access control. The backend will handle most of this, but basic policies:

```sql
-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can see sales if they're the salesperson or admin
CREATE POLICY "Sales visibility" ON sales
    FOR SELECT USING (
        auth.uid() = sales_person_id 
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

-- Staff can see posted items sent to them
CREATE POLICY "Posted items visibility" ON posted_items
    FOR SELECT USING (
        auth.uid() = receiver_staff_id 
        OR auth.uid() = sales_person_id
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );
```

---

## Backend Setup (Koyeb)

### Step 1: Initialize Backend Project Locally

```bash
cd backend
npm init -y
npm install express cors dotenv axios supabase @supabase/supabase-js typescript ts-node @types/node @types/express
npm install --save-dev nodemon
```

### Step 2: Create Backend Structure

See [Backend Project Structure](#backend-project-structure) section below for complete code.

### Step 3: Environment Variables (.env)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
PORT=5000
NODE_ENV=production

# JWT (generate using: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=7d

# CORS
CORS_ORIGIN=https://your-frontend.vercel.app,http://localhost:3000

# Supabase Realtime
SUPABASE_REALTIME_URL=wss://your-project.supabase.co/realtime/v1
```

### Step 4: Create Koyeb Account & Deploy

1. Go to https://www.koyeb.com
2. Sign up and create an account
3. Connect GitHub repository
4. Create new service:
   - **Name**: `abifresh-backend`
   - **Repository**: Your backend repo
   - **Build command**: `npm run build` (or keep blank for Node)
   - **Start command**: `npm run start`
   - **Port**: `5000`
5. Add environment variables in **Settings** → **Environment**
6. Deploy

Koyeb will give you a URL like: `https://abifresh-backend-xxxxx.koyeb.app`

---

## Frontend Setup (Vercel)

### Step 1: Initialize Frontend Project

```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --eslint
```

### Step 2: Environment Variables (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=https://abifresh-backend-xxxxx.koyeb.app
NEXT_PUBLIC_APP_NAME=ABIFRESH & KIDDIES VENTURES
```

### Step 3: Deploy to Vercel

1. Go to https://vercel.com
2. Connect GitHub repository
3. Import project → Select frontend folder
4. Add environment variables
5. Deploy

---

## Role Assignment & Configuration

### 1. Creating Admin Account

After deployment, create the first admin:

**POST** `/api/auth/register`
```json
{
    "email": "admin@abifresh.com",
    "password": "SecurePassword123!",
    "full_name": "System Administrator",
    "role": "admin"
}
```

Admin credentials should be shared securely.

### 2. Staff Role Types

**Four Role Types:**

| Role | Permissions |
|------|-------------|
| `admin` | Full system access, manage staff, approvals, reports |
| `sales` | View inventory, make sales, post items to staff |
| `staff_commission` | View posted items, make payments, earn commissions |
| `staff_non_commission` | View posted items, make payments, no commissions |

### 3. Assigning Roles

**Admin endpoint to create staff:**

**POST** `/api/admin/staff/create`
```json
{
    "email": "salesperson@abifresh.com",
    "password": "SecurePassword123!",
    "full_name": "John Salesperson",
    "role": "sales",
    "store_location": "Jalingo"
}
```

For commission staff:

**POST** `/api/admin/staff/create`
```json
{
    "email": "commission@abifresh.com",
    "password": "SecurePassword123!",
    "full_name": "Jane Commission",
    "role": "staff_commission",
    "store_location": "Jalingo"
}
```

### 4. Setting Commissions

**POST** `/api/admin/commissions/set`
```json
{
    "staff_id": "uuid-of-commission-staff",
    "item_id": "uuid-of-item",
    "commission_percentage": 5.5
}
```

---

## Environment Variables

### Supabase Variables
```env
# Get from Supabase Dashboard → Settings → API
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Backend (Koyeb)
```env
PORT=5000
NODE_ENV=production
JWT_SECRET=base64_encoded_secret
CORS_ORIGIN=https://domain.vercel.app
```

### Frontend (Vercel)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=https://backend.koyeb.app
NEXT_PUBLIC_APP_NAME=ABIFRESH & KIDDIES VENTURES
```

---

## Database Schema

### Tables Overview

1. **users** - Staff and admin accounts with roles
2. **items** - Product catalog
3. **inventory_main_store** - Main inventory
4. **inventory_active_store** - Active store inventory
5. **sales** - All sales transactions
6. **daily_sales_summary** - Daily totals (resets at 12 AM)
7. **posted_items** - Items posted from sales to staff
8. **staff_payments** - Payment records for posted items
9. **expenses** - Staff expenses
10. **notifications** - User notifications
11. **activity_logs** - Audit trail

### Key Features
- **RLS enabled** for security
- **Foreign keys** for data integrity
- **Indexes** for performance
- **Timestamps** for all records
- **JSONB** for flexible data storage

---

## Deployment Instructions

### Step 1: Prepare Repository Structure

```
.
├── backend/
│   ├── src/
│   ├── .env
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile (optional)
├── frontend/
│   ├── app/
│   ├── components/
│   ├── .env.local
│   ├── package.json
│   └── next.config.js
├── docs/
└── README.md
```

### Step 2: Deploy Backend to Koyeb

1. Push code to GitHub
2. Koyeb Dashboard → Create Service
3. Connect GitHub
4. Configure:
   ```
   Build command: npm install && npm run build
   Start command: npm run start
   Port: 5000
   ```
5. Add environment variables
6. Deploy

### Step 3: Deploy Frontend to Vercel

1. Vercel Dashboard → Add New → Project
2. Import GitHub repository
3. Select `/frontend` directory
4. Add environment variables
5. Deploy

### Step 4: Update URLs

After deployment, update:
- **Frontend**: Update `NEXT_PUBLIC_API_URL` with Koyeb URL
- **Backend**: Update `CORS_ORIGIN` with Vercel URL
- **Supabase**: Update redirect URLs with Vercel domain

---

## Troubleshooting

### Common Issues & Solutions

#### 1. CORS Error
**Problem**: Frontend can't communicate with backend
**Solution**:
```env
# Backend .env
CORS_ORIGIN=https://your-vercel-domain.vercel.app
```

#### 2. Supabase Authentication Failed
**Problem**: Login not working
**Solution**:
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Check redirect URLs in Supabase Auth settings

#### 3. Database Connection Issues
**Problem**: Backend can't connect to Supabase
**Solution**:
```bash
# Test connection
curl -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://your-project.supabase.co/rest/v1/users
```

#### 4. Environment Variables Not Loading
**Problem**: Variables undefined in deployed app
**Solution**:
- Use `NEXT_PUBLIC_` prefix for frontend variables
- Verify variables in deployment dashboard
- Restart deployment after updating variables

#### 5. Real-Time Updates Not Working
**Problem**: Changes not reflecting instantly
**Solution**:
- Enable Realtime in Supabase: **Settings** → **Realtime**
- Check browser console for WebSocket errors

---

## Monitoring & Maintenance

### Regular Tasks

1. **Weekly**:
   - Check error logs in Koyeb and Vercel
   - Review activity logs in Supabase
   - Backup database

2. **Monthly**:
   - Generate reports
   - Review staff performance
   - Update item prices if needed

3. **Quarterly**:
   - Security audit
   - Performance optimization
   - User feedback review

### Useful Commands

```bash
# View backend logs
koyeb service logs abifresh-backend

# View frontend logs
vercel logs

# Check Supabase performance
# Visit Supabase Dashboard → Performance

# Database backup
pg_dump postgresql://user:password@host/db > backup.sql
```

---

## Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Express Docs**: https://expressjs.com
- **Koyeb Docs**: https://www.koyeb.com/docs
- **Vercel Docs**: https://vercel.com/docs

---

**Last Updated**: January 2026
**Version**: 1.0.0
