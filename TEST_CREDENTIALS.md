# 🔑 Test Credentials & Demo Users Guide

## ✅ Demo Users Available for Localhost Testing

All demo users are pre-configured and ready to use on **http://localhost:3000**. Use the credentials below to test each role:

### 🏢 Admin User
```
Email:    admin@abifresh.com
Password: admin@123
Role:     Administrator
Access:   Full system access, user management, analytics, settings
```

**Admin Dashboard Features:**
- Revenue and sales analytics
- User management
- System settings and configuration
- Inventory overview
- Staff performance tracking

---

### 👨‍💼 Salesperson 1
```
Email:    sales@abifresh.com
Password: sales@123
Role:     Sales (Salesperson)
Access:   Sales entry, personal performance, inventory lookup
```

**Sales Dashboard Features:**
- Quick sale entry form
- Daily/weekly/monthly performance
- Commission tracking
- Transaction history
- Top selling items
- Customer history

---

### 👩‍💼 Salesperson 2
```
Email:    seller@abifresh.com
Password: seller@123
Role:     Sales (Salesperson)
Access:   Sales entry, personal performance, inventory lookup
```

**Same access as Salesperson 1** - Use this to test multiple salesperson scenarios.

---

### 📦 Staff - Commission Based
```
Email:    staff.comm@abifresh.com
Password: staff@123
Role:     Staff (Commission)
Access:   Inventory tasks, stock management, transfer requests
```

**Staff Dashboard Features:**
- Inventory level monitoring
- Stock items requiring restocking
- Low-stock alerts
- Item transfer between stores
- Damage/loss reporting
- Daily task checklist
- Commission calculations

---

### 📦 Staff - Non-Commission Based
```
Email:    staff@abifresh.com
Password: staff@123
Role:     Staff (Non-Commission)
Access:   Inventory tasks, stock management (limited commission features)
```

**Same as Commission Staff** but with different commission settings.

---

## 🧪 How to Test Each Role

### Step 1: Access Login Page
Open **http://localhost:3000/login** in your browser.

### Step 2: Enter Credentials
Copy and paste one of the credential sets above into the login form.

### Step 3: View Role-Specific Dashboard
After logging in, you'll be automatically redirected to the appropriate dashboard:

| Role | Dashboard URL |
|------|---------------|
| Admin | http://localhost:3000/admin/dashboard |
| Sales | http://localhost:3000/sales/dashboard |
| Staff | http://localhost:3000/staff/dashboard |

---

## 📊 Testing Checklist

### Test Admin Role ✓
- [ ] Login with `admin@abifresh.com` / `admin@123`
- [ ] View admin dashboard
- [ ] Check revenue analytics
- [ ] View all users
- [ ] Check system settings
- [ ] Dark/light mode toggle works
- [ ] Can view staff performance

### Test Salesperson Role ✓
- [ ] Login with `sales@abifresh.com` / `sales@123`
- [ ] View sales dashboard
- [ ] Test quick sale entry form
- [ ] Check personal performance chart
- [ ] View transaction history
- [ ] Check inventory lookup
- [ ] Dark/light mode toggle works

### Test Staff Commission Role ✓
- [ ] Login with `staff.comm@abifresh.com` / `staff@123`
- [ ] View staff dashboard
- [ ] Check inventory levels
- [ ] Check low-stock alerts
- [ ] Test item transfer request
- [ ] Check damage/loss log
- [ ] Verify commission features visible

### Test Staff Non-Commission Role ✓
- [ ] Login with `staff@abifresh.com` / `staff@123`
- [ ] Verify limited commission features
- [ ] All other features work same as commission staff

---

## 🔄 Testing Multiple Roles Simultaneously

1. **Open in Different Browsers:**
   - Login as Admin in Chrome
   - Login as Salesperson in Firefox
   - Test cross-role functionality

2. **Test Role-Based Access:**
   - Try accessing `/admin/dashboard` as salesperson (should redirect)
   - Try accessing `/sales/dashboard` as admin (should be accessible or redirect appropriately)
   - Try accessing `/staff/dashboard` as salesperson (should redirect)

---

## 📝 Creating Custom Test Users

While logged in as Admin, you can create new test users via the API:

```bash
# Create a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@abifresh.com",
    "password": "newuser@123",
    "full_name": "New Test User",
    "role": "sales",
    "store_location": "Jalingo"
  }'
```

---

## 🔐 Getting Demo Users List

You can fetch all available demo users from the API:

```bash
curl http://localhost:5000/api/auth/demo-users
```

**Response:**
```json
{
  "demo_users": [
    {
      "id": "admin-001",
      "email": "admin@abifresh.com",
      "full_name": "Admin User",
      "role": "admin",
      "is_active": true,
      "store_location": "Jalingo",
      "created_at": "2026-01-24T...",
      "updated_at": "2026-01-24T..."
    },
    ...
  ],
  "message": "Demo users available for localhost testing"
}
```

---

## 🧠 What to Test

### Authentication
- [ ] Login works with correct credentials
- [ ] Invalid credentials show error
- [ ] Tokens are generated and stored
- [ ] Users stay logged in after page refresh
- [ ] Logout works

### Navigation
- [ ] Dashboard redirects based on role
- [ ] Navigation menu shows role-appropriate items
- [ ] All links work without 404 errors
- [ ] Back button works

### Features
- [ ] Dark/light mode toggles
- [ ] Responsive design (test on mobile)
- [ ] Forms submit without errors
- [ ] Charts and graphs display
- [ ] Tables show data correctly

### Data
- [ ] Revenue calculations correct
- [ ] Sales numbers add up
- [ ] Inventory counts accurate
- [ ] Performance metrics show

---

## 🐛 Troubleshooting Login Issues

### "Invalid credentials" error
- Double-check email spelling
- Ensure password is exactly: `admin@123` or `sales@123` or `staff@123`
- Try clearing browser cache (Ctrl+Shift+Delete)
- Refresh page and try again

### "Route not found" (404) error
- Ensure backend is running on http://localhost:5000
- Check that `/api/auth/login` endpoint exists
- Verify backend has `npm run build` completed
- Check browser console for network errors

### "Failed to fetch" error
- Verify backend server is running: `Get-Process node`
- Verify port 5000 is listening: `netstat -ano | findstr :5000`
- Check CORS is enabled in backend
- Ensure API_URL in frontend .env.local is correct

---

## 📱 Testing on Mobile Device

To test responsive design:

1. **In Chrome/Firefox:**
   - Press `F12` to open DevTools
   - Click device toggle icon (or Ctrl+Shift+M)
   - Select different device sizes

2. **Verify on actual mobile:**
   - Get your computer's IP: `ipconfig` (look for IPv4)
   - On mobile, visit: `http://YOUR_IP:3000`

---

## 🚀 Backend API Endpoints for Testing

### Health Check
```bash
GET http://localhost:5000/health
```

### Demo Users List
```bash
GET http://localhost:5000/api/auth/demo-users
```

### Login
```bash
POST http://localhost:5000/api/auth/login
Body: { "email": "admin@abifresh.com", "password": "admin@123" }
```

### Register New User
```bash
POST http://localhost:5000/api/auth/register
Body: {
  "email": "test@example.com",
  "password": "test@123",
  "full_name": "Test User",
  "role": "sales",
  "store_location": "Jalingo"
}
```

---

## ✅ Everything Ready

All demo accounts are active and ready to use on localhost!

**Start testing:** http://localhost:3000

---

**Created:** January 24, 2026  
**System:** AKV (ABIFRESH & KIDDIES VENTURES)  
**Environment:** Local Development
