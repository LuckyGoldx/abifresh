# Staff Login Instructions

## ✅ CORRECT Login Credentials

To login as **non-commission staff**, use:

**Username:** `staff`  
**Password:** `staff123`

## ❌ Common Mistakes

- ❌ **DON'T** use email address `staff@abifresh.com` as username
- ❌ **DON'T** use `Staff@123456` as password
- ✅ **DO** use username: `staff`
- ✅ **DO** use password: `staff123`

## 🌐 Correct URL

After login, you should be redirected to:
```
http://localhost:3000/staff/dashboard
```

If you see `http://localhost:3001` in your browser, manually change it to port **3000**.

## 📝 Step-by-Step Login Process

1. Open browser and go to: `http://localhost:3000/login`
2. Enter username: `staff` (NOT the email)
3. Enter password: `staff123`
4. Click "Sign In"
5. You will be redirected to: `http://localhost:3000/staff/dashboard`

## 🔍 What You Should See

After successful login, the dashboard will display:

- **Total Sales Amount**: ₦0 (if no sales yet)
- **Total Items Sold**: 0
- **Posted Items Accepted**: 0
- **Approved Payments**: ₦0
- Quick action cards for:
  - Posted Items
  - Make Payment
  - Track Expenses
  - Notifications

## 🐛 Troubleshooting

### Issue: "Invalid credentials" error
**Solution:** Make sure you're using username `staff`, not `staff@abifresh.com`

### Issue: Redirected to port 3001
**Solution:** The frontend runs on port 3000. Manually change the URL to `http://localhost:3000/staff/dashboard`

### Issue: Blank/empty page
**Solution:** 
1. Check that both servers are running:
   - Backend: http://localhost:5000
   - Frontend: http://localhost:3000
2. Open browser console (F12) and check for errors
3. Clear browser cache and try again

### Issue: Redirected to login after refresh
**Solution:** This means the token is not being stored. Check browser console for errors and try clearing all site data.

## ✅ Current Status

- ✅ Backend server running on port 5000
- ✅ Frontend server running on port 3000
- ✅ Database schema updated with staff dashboard columns
- ✅ Staff routes implemented with correct column names
- ✅ Login API tested and working
- ✅ Dashboard API tested and returning data

## 🎯 Test the Full Flow

```powershell
# Test backend health
Invoke-WebRequest -Uri "http://localhost:5000/health"

# Test login API
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body (@{username="staff"; password="staff123"} | ConvertTo-Json) -ContentType "application/json"
Write-Host "Token: $($response.token.Substring(0,20))..."

# Test dashboard API
$dashboard = Invoke-RestMethod -Uri "http://localhost:5000/api/staff/dashboard" -Method Get -Headers @{Authorization="Bearer $($response.token)"}
$dashboard | ConvertTo-Json
```
