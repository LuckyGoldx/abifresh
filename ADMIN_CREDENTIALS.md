# 🔐 ABIFRESH (AKV) - ADMIN & TEST CREDENTIALS

**Status:** ✅ Configured for Supabase  
**Date:** January 25, 2026  
**Environment:** Localhost Testing

---

## 👨‍💼 PRIMARY ADMIN ACCOUNT

### Admin User (Full System Access)

```
Email:    admin@abifresh.com
Password: Admin@123456
Role:     admin
Access:   /admin/dashboard
```

**Permissions:**
- ✅ View all dashboards
- ✅ Manage users (create, edit, delete)
- ✅ View all sales records
- ✅ Approve payments
- ✅ Manage inventory
- ✅ Generate reports
- ✅ System settings
- ✅ View activity logs

---

## 👥 TEST USERS - ALL ROLES

### Sales Representatives (Can record sales, post items)

#### Sales User 1
```
Email:    sales@abifresh.com
Password: Sales@123456
Role:     sales
Access:   /sales/dashboard
```

#### Sales User 2
```
Email:    seller@abifresh.com
Password: Seller@123456
Role:     sales
Access:   /sales/dashboard
```

**Permissions:**
- ✅ View own sales dashboard
- ✅ Record new sales
- ✅ View available inventory
- ✅ Post items to staff
- ✅ View own sales history
- ✅ View commission info
- ❌ Cannot view other users' sales
- ❌ Cannot approve payments

---

### Staff - WITH COMMISSION (Inventory management + commission tracking)

```
Email:    staff.comm@abifresh.com
Password: StaffComm@123456
Role:     staff_commission
Access:   /staff/dashboard
```

**Permissions:**
- ✅ View active inventory
- ✅ Accept/reject posted items
- ✅ Request payments
- ✅ View commission balance
- ✅ Submit expense reports
- ✅ View own dashboard
- ❌ Cannot record sales
- ❌ Cannot manage other staff

---

### Staff - WITHOUT COMMISSION (Inventory management only)

```
Email:    staff@abifresh.com
Password: Staff@123456
Role:     staff_non_commission
Access:   /staff/dashboard
```

**Permissions:**
- ✅ View active inventory
- ✅ Accept/reject posted items
- ✅ Submit expense reports
- ✅ View own dashboard
- ❌ Cannot see commission (N/A)
- ❌ Cannot record sales
- ❌ Cannot request payment

---

## 📋 Testing Checklist

Use these credentials to test each role's functionality:

### Admin Testing
- [ ] Login as admin
- [ ] View admin dashboard with analytics
- [ ] Navigate to User Management
- [ ] View all sales records
- [ ] View all staff
- [ ] View pending payments
- [ ] Check inventory overview
- [ ] View activity logs
- [ ] Logout successfully

### Sales Testing
- [ ] Login as sales (user 1)
- [ ] View sales dashboard
- [ ] See today's sales summary
- [ ] Check personal performance chart
- [ ] View inventory quick lookup
- [ ] Logout and login as sales (user 2)
- [ ] Verify both users have separate data
- [ ] Logout successfully

### Staff - Commission Testing
- [ ] Login as staff (with commission)
- [ ] View staff dashboard
- [ ] See commission balance
- [ ] View pending items
- [ ] Accept/reject posted items
- [ ] Submit expense report
- [ ] View commission tracking
- [ ] Logout successfully

### Staff - Non-Commission Testing
- [ ] Login as staff (without commission)
- [ ] View staff dashboard
- [ ] Notice commission section is hidden/grayed
- [ ] View pending items
- [ ] Accept/reject posted items
- [ ] Submit expense report
- [ ] Verify no commission data shown
- [ ] Logout successfully

---

## 🔄 How to Create New Users

### Via Supabase Dashboard

1. Go to your Supabase project: https://app.supabase.com
2. Click **"Authentication"** in left sidebar
3. Click **"Users"** tab
4. Click **"Add user"** button
5. Enter email and password
6. Click **"Create user"**
7. Go to **"SQL Editor"** and insert user role:

```sql
INSERT INTO public.users (
  email,
  full_name,
  role,
  is_active,
  store_location
) VALUES (
  'newemail@abifresh.com',
  'New User Name',
  'sales',  -- or 'staff_commission', 'staff_non_commission'
  true,
  'Jalingo'
);
```

---

## ⚠️ Security Guidelines

### Password Policy

For **Localhost Testing:**
- Use the provided test passwords above
- Simple passwords are OK for development

For **Production (Before Deployment):**
- Change all passwords to strong ones (16+ characters)
- Use: `Admin!@#$%^&*2026Secure`
- Include: Uppercase, lowercase, numbers, special chars
- Different password for each environment (localhost, staging, production)

### Key Security

- 🔴 **NEVER** share SERVICE_ROLE_KEY
- 🔴 **NEVER** commit .env files to Git
- 🔴 **NEVER** expose keys on public channels
- 🟢 Keep API keys in secure password manager
- 🟢 Rotate keys every 90 days in production
- 🟢 Use different keys for each environment

### Authentication Flow

```
User Login (email/password)
    ↓
Backend validates against Supabase
    ↓
If valid: Generate JWT token
    ↓
Return token to frontend
    ↓
Frontend stores in localStorage
    ↓
Frontend includes token in API requests
    ↓
Backend validates JWT on protected routes
    ↓
User gets access to role-specific pages
```

---

## 🧪 Testing Login Flow

### Step 1: Start Servers

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 2: Open Browser

```
http://localhost:3000/login
```

### Step 3: Test Each Login

```
Admin Login:
  Email:    admin@abifresh.com
  Password: Admin@123456
  Expected: Redirects to /admin/dashboard

Sales Login:
  Email:    sales@abifresh.com
  Password: Sales@123456
  Expected: Redirects to /sales/dashboard

Staff Commission Login:
  Email:    staff.comm@abifresh.com
  Password: StaffComm@123456
  Expected: Redirects to /staff/dashboard (with commission)

Staff Non-Commission Login:
  Email:    staff@abifresh.com
  Password: Staff@123456
  Expected: Redirects to /staff/dashboard (no commission)
```

### Step 4: Verify

- [ ] Correct dashboard loads
- [ ] User info displays correctly
- [ ] Navigation sidebar shows appropriate menu items
- [ ] Dark mode toggle works
- [ ] Responsive design works (F12 → mobile)
- [ ] Console has no errors (F12 → Console)
- [ ] Network requests show 200/201 responses (F12 → Network)

---

## 🔑 API Testing with Tokens

### Get Auth Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@abifresh.com",
    "password": "Admin@123456"
  }'
```

Response:
```json
{
  "user": {
    "id": "user-id-uuid",
    "email": "admin@abifresh.com",
    "full_name": "Admin User",
    "role": "admin",
    "created_at": "2026-01-25T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

### Use Token to Access Protected Routes

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get current user
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Get admin dashboard data
curl -X GET http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer $TOKEN"

# Get sales dashboard data
curl -X GET http://localhost:5000/api/sales/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📚 Useful Links

- **Supabase Dashboard:** https://app.supabase.com
- **Your Project:** https://app.supabase.com/project/cifzlksxpjghpgxhrwkg
- **Local Frontend:** http://localhost:3000
- **Local Backend:** http://localhost:5000
- **API Documentation:** See `docs/API_DOCUMENTATION.md`

---

## 🚀 Before Deploying to Production

- [ ] Change all passwords to strong ones
- [ ] Create separate admin user for production
- [ ] Enable 2FA on admin account
- [ ] Configure CORS properly
- [ ] Update JWT_SECRET to production value
- [ ] Set NODE_ENV=production
- [ ] Configure production Supabase keys
- [ ] Test all logins on production URLs
- [ ] Set up monitoring and logging

---

**Last Updated:** January 25, 2026  
**Status:** ✅ Ready for localhost testing  
**Next:** Deploy to Koyeb & Vercel
