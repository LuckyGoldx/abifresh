# Staff Store Testing Guide

## Quick Start Testing

### Step 1: Start Servers

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### Step 2: Login as Sales Staff

1. Go to `http://localhost:3000/login`
2. Login with sales credentials
3. Navigate to `/sales/post-items`

**Expected Result:**
- ✅ Staff dropdown should load and show commission/non-commission staff
- ✅ Can search and add items to cart
- ✅ Can post items to selected staff

**What to Check:**
```
Browser Console: No errors about 401 Unauthorized or "staff" endpoint
Network Tab: GET /api/admin/staff should return 200 OK with staff list
```

---

### Step 3: Login as Commission/Non-Commission Staff

1. Logout from sales account
2. Login with staff credentials (commission or non-commission staff)
3. Check navigation menu

**Expected Result:**
- ✅ Menu should show "Make Sale" option
- ✅ Menu items:
  - Dashboard
  - Posted Items ← Check this
  - Make Sale ← Check this
  - Make Payment
  - Expenses
  - Notifications

---

### Step 4: Test Posted Items Page

1. Navigate to `/staff/posted-items`
2. Should see items posted by sales staff

**Expected Result:**
- ✅ Items appear with details (name, quantity, status, posted by)
- ✅ "Accept" button works
- ✅ "Reject" button works
- ✅ Can add comment when accepting/rejecting

**What to Check:**
```
Network Tab: GET /api/staff/posted-items should return 200 OK
Response should include: id, item_name, quantity, status, posted_by, unit_price
```

---

### Step 5: Accept Items

1. Click "Accept" on a pending item
2. Optionally add a comment
3. Confirm acceptance

**Expected Result:**
- ✅ Item status changes to "accepted"
- ✅ Item appears in staff store
- ✅ Sales person gets notification

**What to Check:**
```
Network Tab: POST /api/staff/posted-items/{id}/accept should return 200 OK
After accepting, GET /api/staff/store should show the item
```

---

### Step 6: Test Make Sale Page

1. Navigate to `/staff/make-sale`
2. Should see store summary and items

**Expected Result:**
- ✅ Store summary cards show:
  - Total Items
  - Total Quantity
  - Total Sold
  - Available
- ✅ Items dropdown populated with accepted items
- ✅ Can select item, enter quantity, select payment method
- ✅ Can record sale

**What to Check:**
```
Network Tab: 
- GET /api/staff/store should return items
- GET /api/staff/store/summary should return summary stats
- POST /api/staff/store/make-sale should work
```

---

### Step 7: Make a Sale

1. Select an item from dropdown
2. Enter quantity (must be ≤ available quantity)
3. Select payment method
4. Click "Record Sale"

**Expected Result:**
- ✅ Sale recorded successfully
- ✅ quantity_sold increments
- ✅ quantity_available decrements
- ✅ Sale appears in sales history below
- ✅ Store summary updates

**What to Check:**
```
Network Tab: POST /api/staff/store/make-sale returns 201 Created
Response includes: sale_id, item details, receipt_number
After sale, GET /api/staff/store/summary should show updated numbers
```

---

### Step 8: Test Admin Dashboard

1. Logout and login as admin
2. Navigate to `/admin/staff-stores`

**Expected Result:**
- ✅ Summary cards show totals across all staff
- ✅ Staff table shows all staff with inventory
- ✅ Can search staff by name
- ✅ Can sort by quantity, sold, available
- ✅ Clicking a staff shows detail modal

**What to Check:**
```
Network Tab: 
- GET /api/admin/staff-stores should return all stores
- GET /api/admin/staff-stores-stats should return statistics
```

---

## Common Issues and Solutions

### Issue 1: Staff Dropdown Empty
**Symptom**: Dropdown on /sales/post-items shows no staff
**Check**: 
```bash
# Check if backend is running
curl http://localhost:5000/health

# Check if endpoint works (replace TOKEN with actual token)
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/admin/staff
```
**Solution**: Ensure backend is running and sales role has access to /api/admin/staff

---

### Issue 2: "Make Sale" Not in Menu
**Symptom**: Staff navigation doesn't show "Make Sale"
**Check**: 
- Verify `frontend/app/staff/layout.tsx` has Make Sale in menuItems
- Hard refresh browser (Ctrl+Shift+R)
**Solution**: Clear browser cache or restart frontend

---

### Issue 3: Posted Items Not Showing
**Symptom**: /staff/posted-items is empty
**Check**:
```bash
# Check network tab for errors
# Should see: GET /api/staff/posted-items returning 200 OK
```
**Possible Causes**:
- No items have been posted yet (post some from sales account first)
- Wrong staff_id being used in query
- Database migration not run

---

### Issue 4: Cannot Accept/Reject Items
**Symptom**: Clicking accept/reject doesn't work
**Check**:
```bash
# Check network tab
# POST /api/staff/posted-items/{id}/accept should return 200 OK
```
**Solution**: Ensure backend has updated routes with staffStoreService

---

### Issue 5: Staff Store Endpoints 404
**Symptom**: /api/staff/store returns 404
**Check**:
- Verify `export default router` is at END of staff.routes.ts
- Restart backend server
**Solution**: Move export to end of file, restart backend

---

## Verification Checklist

### Backend Health
```bash
# Check backend is running
curl http://localhost:5000/health

# Should return:
{
  "status": "OK",
  "timestamp": "...",
  "service": "ABIFRESH & KIDDIES VENTURES API",
  "database": { "supabase": "CONNECTED" }
}
```

### Frontend Health
```bash
# Open browser to:
http://localhost:3000

# Should load login page without errors
```

### Database Tables
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('staff_store', 'posted_items_mapping', 'staff_sales');

-- Should return 3 rows
```

### Staff Store Data
```sql
-- Check if any staff have store items
SELECT ss.*, u.full_name, i.name as item_name
FROM staff_store ss
JOIN users u ON ss.staff_id = u.id
JOIN items i ON ss.item_id = i.id
LIMIT 10;
```

---

## Success Criteria

✅ Sales staff can post items to commission/non-commission staff
✅ Staff dropdown loads correctly
✅ Staff can see posted items
✅ Staff can accept items with optional comment
✅ Staff can reject items with optional comment
✅ Rejected items return to active store
✅ Accepted items appear in staff store
✅ Staff can make sales from their store
✅ Quantity tracking works correctly
✅ Admin can view all staff stores
✅ Admin can see detailed statistics

---

## Quick Debug Commands

### Check Backend Routes
```bash
cd backend
grep -n "router.get\|router.post" src/routes/staff.routes.ts | tail -20
```

### Check Frontend Build
```bash
cd frontend
npm run build
# Should complete without errors
```

### Check Database Connection
```bash
# In Supabase SQL Editor:
SELECT current_database(), current_user;
```

### View Recent Posted Items
```sql
SELECT 
  pi.id,
  pi.staff_id,
  u.full_name as staff_name,
  i.name as item_name,
  pi.quantity,
  pi.status,
  pi.created_at
FROM posted_items pi
LEFT JOIN users u ON pi.staff_id = u.id
LEFT JOIN items i ON pi.item_id = i.id
ORDER BY pi.created_at DESC
LIMIT 10;
```

---

## Testing Complete! 🎉

If all steps pass, the Staff Store feature is fully functional and ready for production.
