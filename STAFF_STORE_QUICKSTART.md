# Staff Store - Quick Start Deployment Guide

## Prerequisites
- Supabase project set up
- Backend running
- Frontend running

## Step 1: Database Migration

1. Go to Supabase Dashboard
2. Open SQL Editor
3. Copy entire content of `STAFF_STORE_MIGRATION.sql`
4. Paste into SQL Editor
5. Click "Run"
6. Wait for completion ✓

## Step 2: Backend Changes

The backend has been updated with:
- ✓ New `/backend/src/services/staff-store.service.ts`
- ✓ Updated `/backend/src/routes/sales.routes.ts` (batch post endpoint)
- ✓ Updated `/backend/src/routes/staff.routes.ts` (new store endpoints)
- ✓ Updated `/backend/src/routes/admin.routes.ts` (new admin endpoints)

**To deploy**:
```bash
cd backend
npm install
npm run build
npm start
```

## Step 3: Frontend Changes

The frontend has been updated with:
- ✓ Updated `/frontend/app/sales/post-items/page.tsx` (already supports batch)
- ✓ Updated `/frontend/app/staff/make-sale/page.tsx` (now uses staff store)
- ✓ New `/frontend/app/admin/staff-stores/page.tsx` (dashboard)
- ✓ Updated `/frontend/app/admin/layout.tsx` (added menu link)

**To deploy**:
```bash
cd frontend
npm install
npm run build
npm start
```

## Step 4: Test the Flow

### Test 1: Post Items from Sales Staff

1. Login as sales staff
2. Go to `/sales/post-items`
3. Search and select items
4. Select a commission or non-commission staff
5. Add items to cart
6. Click "Post Items to Staff"
7. **Expected**: Items deducted from active store

### Test 2: Accept Items as Staff

1. Login as commission/non-commission staff
2. Go to `/staff/posted-items`
3. View pending items
4. Click "Accept" on items
5. Add optional comment
6. Confirm
7. **Expected**: Items appear in staff store

### Test 3: Make Sale as Staff

1. Still logged in as staff
2. Go to `/staff/make-sale`
3. View items in store
4. Select item and quantity
5. Choose payment method
6. Click "Complete Sale"
7. **Expected**: Sale recorded, quantity_available decreases

### Test 4: Admin Dashboard

1. Login as admin
2. Go to `/admin/staff-stores`
3. View all staff stores
4. See summary statistics
5. Search/filter staff
6. Click "View" on a staff
7. See detailed inventory
8. **Expected**: All data displays correctly

## API Endpoints Reference

### For Testing with Postman/Curl

**Post Items (Sales Staff)**
```
POST /api/sales/post-items
Authorization: Bearer {token}
Content-Type: application/json

{
  "staff_id": "uuid",
  "items": [
    {"item_id": "uuid", "quantity": 10, "unit_price": 5000}
  ]
}
```

**Accept Items (Staff)**
```
POST /api/staff/store/accept-items
Authorization: Bearer {token}
Content-Type: application/json

{
  "posted_item_ids": ["uuid1", "uuid2"]
}
```

**Make Sale (Staff)**
```
POST /api/staff/store/make-sale
Authorization: Bearer {token}
Content-Type: application/json

{
  "item_id": "uuid",
  "quantity": 5,
  "payment_method": "cash"
}
```

**Get All Staff Stores (Admin)**
```
GET /api/admin/staff-stores
Authorization: Bearer {token}
```

**Get Staff Store Stats (Admin)**
```
GET /api/admin/staff-stores-stats
Authorization: Bearer {token}
```

## Common Issues & Fixes

### Issue: Migration fails
**Fix**: 
- Ensure you're in the correct Supabase project
- Copy the entire file, not just partial content
- Try running individual CREATE TABLE statements

### Issue: Post items shows no staff
**Fix**:
- Verify you have commission_staff or non_commission_staff users
- Check user roles in Supabase
- Ensure they're not the currently logged-in user

### Issue: Make sale fails
**Fix**:
- Ensure items have been accepted first
- Check quantity_available > 0
- Verify you're posting to correct item_id from staff_store

### Issue: Admin dashboard is empty
**Fix**:
- Verify staff_store has entries
- Check if any staff have accepted items
- Verify you're logged in as admin

## Monitoring

### Check Staff Store Data
```sql
SELECT * FROM staff_store;
```

### Check Posted Items
```sql
SELECT * FROM posted_items WHERE status = 'pending';
```

### Check Staff Sales
```sql
SELECT * FROM staff_sales;
```

### Check Mappings
```sql
SELECT * FROM posted_items_mapping;
```

## Performance Tips

1. **Batch Operations**: Always post multiple items in one request
2. **Pagination**: Use limit in sales-history query
3. **Indexing**: All key columns are indexed
4. **Caching**: Clear browser cache if seeing stale data

## Support

If you encounter any issues:

1. Check console logs in browser (F12)
2. Check backend logs for API errors
3. Verify Supabase RLS policies are enabled
4. Run the migration again if data looks corrupted
5. Check all environment variables are set correctly

## Rollback (If Needed)

To remove staff store feature:

```sql
DROP TABLE IF EXISTS posted_items_mapping;
DROP TABLE IF EXISTS staff_sales;
DROP TABLE IF EXISTS staff_store;

-- Remove columns from posted_items if needed
ALTER TABLE posted_items DROP COLUMN IF EXISTS staff_id;
ALTER TABLE posted_items DROP COLUMN IF EXISTS unit_price;
```

Then revert code changes in git.
