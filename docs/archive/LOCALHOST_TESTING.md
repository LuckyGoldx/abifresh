# LOCALHOST TESTING GUIDE
## Complete Testing Workflow for All Features

---

## Quick Setup Summary

### Terminal 1: Backend
```powershell
cd c:\Users\LuckyGold\Desktop\AKV\backend
npm install
npm run dev
```
✅ Runs on `http://localhost:5000`

### Terminal 2: Frontend
```powershell
cd c:\Users\LuckyGold\Desktop\AKV\frontend
npm install
npm run dev
```
✅ Runs on `http://localhost:3000`

### Terminal 3: Python AI (Optional)
```powershell
cd c:\Users\LuckyGold\Desktop\AKV\ai-service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```
✅ Runs on `http://localhost:8000`

---

## Browser Testing Checklist

### Step 1: Access Application
```
URL: http://localhost:3000
Expected: Login page appears with pink theme
```

### Step 2: Login
```
Email: admin@abifresh.com
Password: SecurePassword123!
Expected: Admin dashboard loads
```

> **Note:** If login fails, you need to create the user first (see LOCAL_DEVELOPMENT.md)

---

## Feature Testing by Role

### 🔒 ADMIN DASHBOARD TESTING

#### Location: http://localhost:3000/admin/dashboard

**Tests to Run:**

1. **View Statistics**
   - [ ] Total Sales Amount card displays
   - [ ] Items Sold card displays
   - [ ] Total Transactions card displays
   - [ ] Pending Approvals card displays

2. **View Charts**
   - [ ] Line chart renders (sales over time)
   - [ ] Bar chart renders (items by category)
   - [ ] Charts have proper labels and axes

3. **Theme Toggle**
   - [ ] Click moon icon (top right)
   - [ ] Page switches to dark mode
   - [ ] Click sun icon
   - [ ] Page switches to light mode
   - [ ] Refresh page - theme persists

4. **User Menu**
   - [ ] Click user profile (top right)
   - [ ] Dropdown shows "Logout"
   - [ ] Click Logout
   - [ ] Redirects to login page

#### Sub-Features to Test:

**Inventory Management**
- [ ] Navigate to inventory section
- [ ] See all items with quantities
- [ ] Add new item (name, price, quantity)
- [ ] Edit item details
- [ ] Delete item (should fail if in use)
- [ ] Move items from main to active store

**Staff Management**
- [ ] View all staff with their activities
- [ ] Create new staff account
- [ ] Assign role (commission/non-commission)
- [ ] View staff performance metrics

**Payment Approvals**
- [ ] View pending payment requests
- [ ] See payment details (amount, reference, staff)
- [ ] Approve payment
- [ ] Reject payment with reason

**Commission Configuration**
- [ ] Set commission % per item
- [ ] View commission history
- [ ] Update commission amounts

---

### 💰 SALES DASHBOARD TESTING

#### Location: http://localhost:3000/sales/dashboard

**Tests to Run:**

1. **View Statistics**
   - [ ] Today's Sales Amount
   - [ ] Today's Items Sold
   - [ ] All-Time Sales Amount
   - [ ] All-Time Items Sold

2. **List Available Items**
   - [ ] Items display with prices
   - [ ] Quantities shown accurately
   - [ ] Can select items for sale

3. **Record a Sale**
   - [ ] Click "Record Sale" button
   - [ ] Modal opens with form
   - [ ] Select item from dropdown
   - [ ] Enter quantity
   - [ ] Select payment method (cash/POS/transfer)
   - [ ] Click Save
   - [ ] Item quantity decreases
   - [ ] Sale added to today's total

4. **Post Items to Staff**
   - [ ] Click "Post Items" button
   - [ ] Select staff member
   - [ ] Select items and quantities
   - [ ] Submit
   - [ ] Staff receives notification
   - [ ] Items move to "Posted" status

5. **Real-Time Updates**
   - [ ] Open sales dashboard in 2 browser tabs
   - [ ] Record sale in tab 1
   - [ ] Tab 2 updates automatically (every 30 seconds)

#### Test Pricing Logic:

```
Location: Jalingo
- Item base price: ₦1,000
- Selling price: ₦1,000 (no logistics)

Location: Other (e.g., Enugu)
- Item base price: ₦1,000
- Selling price: ₦1,500 (+₦500 logistics)
```

---

### 👥 STAFF DASHBOARD TESTING

#### Location: http://localhost:3000/staff/dashboard

**Login with:**
```
Email: staff@abifresh.com
Password: Password123!
Role: staff_commission (or staff_non_commission)
```

**Tests to Run:**

1. **View Posted Items**
   - [ ] See items posted by sales people
   - [ ] Shows item name, quantity, price
   - [ ] Shows sender name
   - [ ] Shows status (pending/accepted/rejected)

2. **Accept/Reject Items**
   - [ ] Click Accept on a posted item
   - [ ] Status changes to "Accepted"
   - [ ] Click Reject on another item
   - [ ] Status changes to "Rejected"
   - [ ] Admin gets notification

3. **Make Payments**
   - [ ] View accepted items requiring payment
   - [ ] Click "Make Payment"
   - [ ] Enter amount
   - [ ] Upload receipt screenshot
   - [ ] Submit payment
   - [ ] Status becomes "Pending Approval"

4. **Track Commissions** (if commission staff)
   - [ ] View commission per item
   - [ ] Total earnings this month
   - [ ] Commission history

5. **Add Expenses**
   - [ ] Click "Add Expense"
   - [ ] Enter expense type (transport, food, etc)
   - [ ] Enter amount
   - [ ] Add description
   - [ ] Submit
   - [ ] Expense appears in list

6. **View Notifications**
   - [ ] See notification bell (top right)
   - [ ] Click bell to see notifications
   - [ ] Notifications for: Posted items, Payments, Approvals

---

## API Testing (Postman / cURL)

### Test 1: User Registration

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@abifresh.com",
    "password": "Test123!",
    "full_name": "Test User",
    "role": "sales"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "test@abifresh.com",
    "role": "sales"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Test 2: User Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@abifresh.com",
    "password": "SecurePassword123!"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "admin@abifresh.com",
    "role": "admin"
  },
  "token": "jwt-token-here"
}
```

### Test 3: Get User Profile

```bash
# Use token from login response
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 4: Get Available Items (Sales)

```bash
curl -X GET http://localhost:5000/api/sales/available-items \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 5: Record a Sale

```bash
curl -X POST http://localhost:5000/api/sales/record \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "item_id": "item-uuid",
    "quantity": 5,
    "unit_price": 1500,
    "total_amount": 7500,
    "payment_method": "cash",
    "buyer_type": "customer",
    "store_location": "Jalingo"
  }'
```

### Test 6: Get Admin Dashboard Data

```bash
curl -X GET http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "total_sales": 50000,
  "total_items_sold": 100,
  "total_transactions": 25,
  "pending_approvals": 3
}
```

### Test 7: Get Inventory Summary

```bash
curl -X GET http://localhost:5000/api/inventory/summary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 8: Post Items to Staff

```bash
curl -X POST http://localhost:5000/api/sales/post-items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "receiver_staff_id": "staff-uuid",
    "items": [
      {
        "item_id": "item-uuid",
        "quantity": 5
      }
    ]
  }'
```

---

## Database Testing

### View Data in Supabase Console

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** or **Data**
4. Run queries to verify data:

```sql
-- View all users
SELECT id, email, role FROM users;

-- View sales transactions
SELECT * FROM sales ORDER BY created_at DESC LIMIT 10;

-- View inventory
SELECT item_id, name, main_store_quantity, active_store_quantity 
FROM inventory_view;

-- View posted items
SELECT * FROM posted_items WHERE status = 'pending';

-- View pending payments
SELECT * FROM staff_payments WHERE status = 'pending';

-- View today's sales summary
SELECT * FROM daily_sales_summary 
WHERE sales_date = CURRENT_DATE;
```

---

## PWA Testing

### Install PWA on Desktop

1. Open Chrome
2. Go to `http://localhost:3000`
3. Click **Install** button (appears in address bar)
4. Click "Install"
5. App should open as standalone window

### Check Service Worker

1. Open Chrome DevTools (`F12`)
2. Go to **Application** tab
3. Click **Service Workers**
4. Should show `sw.ts` with status "activated and running"

### Test Offline Mode

1. Open DevTools (`F12`)
2. Go to **Network** tab
3. Check **Offline** checkbox
4. Refresh page
5. Should show offline page (not 404)
6. Some features work offline (dashboards cached)

### Check App Manifest

1. Open DevTools (`F12`)
2. Go to **Application** → **Manifest**
3. Should show:
   - Name: "ABIFRESH & KIDDIES VENTURES"
   - Short name: "ABIFRESH"
   - Theme color: Pink (#ec4899)
   - Icons listed

---

## Performance Testing

### Check Load Time

```powershell
# Time to First Byte (TTFB)
Measure-Command { curl.exe -o $null -s -w "%{time_starttransfer}\n" http://localhost:3000 }

# Should be < 200ms locally
```

### Check Bundle Size

```powershell
cd frontend
npm run build

# Check .next/static folder size
ls -r .next/static | Measure-Object -Sum Length
```

Should be < 100KB compressed

### Monitor Network Requests

1. Open DevTools (`F12`)
2. Go to **Network** tab
3. Perform actions:
   - Login
   - Navigate to dashboard
   - Make a sale
4. Check:
   - All requests return 200 (success)
   - No failed requests
   - API calls < 500ms

---

## Security Testing

### Test Authentication

```bash
# Try to access protected route WITHOUT token
curl -X GET http://localhost:5000/api/admin/dashboard

# Should return 401 Unauthorized
```

```bash
# Try with invalid token
curl -X GET http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer invalid-token"

# Should return 401 Unauthorized
```

### Test Role-Based Access

```bash
# Login as SALES user
# Token = sales_token

# Try to access ADMIN endpoint
curl -X GET http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer sales_token"

# Should return 403 Forbidden
```

### Test CORS

```bash
# From browser console (http://localhost:3000)
fetch('http://localhost:5000/api/auth/me', {
  headers: { 'Authorization': 'Bearer token' }
})

# Should work (CORS enabled)

# From different origin
fetch('http://example.com', ...)

# Should fail (CORS blocks)
```

---

## Error Handling Testing

### Test Invalid Login

```
Email: fake@email.com
Password: wrongpassword
Expected: "Invalid email or password" error message
```

### Test Duplicate Email Registration

```
Register twice with same email
Expected: "Email already registered" error
```

### Test Missing Required Fields

```bash
curl -X POST http://localhost:5000/api/sales/record \
  -H "Authorization: Bearer token" \
  -d '{}' # Empty body

# Should return 400 Bad Request
```

### Test Database Connection Error

```
Disconnect from internet
Try to login
Expected: Error message about database connection
```

---

## Cross-Browser Testing

Test in multiple browsers:

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | ✅ Must test | Primary browser |
| Firefox | ✅ Should work | Check dark mode |
| Safari | ✅ Should work | Check responsive |
| Edge | ✅ Should work | Chromium-based |
| Mobile Chrome | ✅ Important | Test responsive |
| Mobile Safari | ✅ Important | iOS PWA |

### Mobile Testing

1. Get your local machine IP:
```powershell
ipconfig | findstr "IPv4"
# e.g., 192.168.x.x
```

2. On phone, visit:
```
http://192.168.x.x:3000
```

3. Test:
   - [ ] Layout responsive (no horizontal scroll)
   - [ ] Touch targets large enough (tap buttons)
   - [ ] Sidebar navigation works on mobile
   - [ ] Dark mode works
   - [ ] Charts display properly
   - [ ] Forms are usable on small screens

---

## Test Data to Create

### Sample Items for Testing

```bash
curl -X POST http://localhost:5000/api/inventory/add \
  -H "Authorization: Bearer admin_token" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "name": "Tomatoes",
      "category": "Vegetables",
      "base_price": 1000,
      "commission_amount": 100,
      "main_store_quantity": 100
    },
    {
      "name": "Carrots",
      "category": "Vegetables",
      "base_price": 800,
      "commission_amount": 80,
      "main_store_quantity": 80
    },
    {
      "name": "Rice",
      "category": "Grains",
      "base_price": 2000,
      "commission_amount": 200,
      "main_store_quantity": 50
    }
  ]'
```

### Sample Staff Members

Use admin dashboard to create:
- `sales@abifresh.com` (Role: Sales)
- `staff1@abifresh.com` (Role: Staff Commission, 10% commission)
- `staff2@abifresh.com` (Role: Staff Non-Commission)

---

## Troubleshooting During Testing

### Issue: Login doesn't work
**Solution:**
1. Check admin user exists in Supabase
2. Verify credentials are correct
3. Check backend `.env` has SUPABASE_URL and keys
4. Check frontend `.env.local` has API_URL
5. Make sure backend is running (`npm run dev`)

### Issue: Styles/Colors not showing (white page)
**Solution:**
```powershell
cd frontend
npm run build
npm run dev
```

### Issue: API calls failing with 401
**Solution:**
1. Check JWT_SECRET in backend `.env`
2. Clear browser localStorage (DevTools → Application → localStorage)
3. Login again to get fresh token

### Issue: Port already in use
**Solution:**
```powershell
# Find process using port
Get-NetTCPConnection -LocalPort 5000

# Kill process
Stop-Process -Id PID -Force

# Or change port in .env
PORT=5001
```

### Issue: Charts not rendering
**Solution:**
1. Check recharts is installed: `npm list recharts`
2. Refresh page (hard refresh: Ctrl+Shift+R)
3. Check browser console for errors (F12)

---

## Success Checklist

When everything works, you should be able to:

- [ ] Login with default credentials
- [ ] View admin dashboard with stats
- [ ] View sales dashboard
- [ ] View staff dashboard
- [ ] Record a sale
- [ ] Items quantity decreases after sale
- [ ] Post items to staff
- [ ] Accept/reject posted items
- [ ] Make payment as staff
- [ ] Approve payment as admin
- [ ] Dark mode toggles
- [ ] All pages are responsive
- [ ] Notifications appear
- [ ] Can logout
- [ ] PWA installs as app
- [ ] Works offline (partial)
- [ ] All API endpoints return proper responses
- [ ] No errors in browser console
- [ ] No errors in backend console

---

## CI/CD & Production Deployment Testing

When ready for production:

1. **Backend Deployment to Koyeb**
   - Follow DEPLOYMENT_GUIDE.md
   - Test all API endpoints from live URL
   - Monitor logs for errors

2. **Frontend Deployment to Vercel**
   - Follow DEPLOYMENT_GUIDE.md
   - Test all pages load correctly
   - Check performance metrics

3. **Database on Supabase**
   - Verify backups enabled
   - Check RLS policies working
   - Monitor query performance

---

**Ready to test? Start with localhost testing and work your way through the checklist! 🧪**
