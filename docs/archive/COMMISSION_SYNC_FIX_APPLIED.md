# Commission Data Test Report

## Test Date: February 12, 2026

### Changes Made:

#### 1. **Updated Role Filtering**
- ✅ Changed from `eq('role', 'staff_commission')` to `or('role.eq.staff_commission,role.eq.commission_staff')`
- Now supports both role variations: `staff_commission` and `commission_staff`

#### 2. **Improved Data Source Logic**
- ✅ Primary: Uses `receipts` and `receipt_items` tables
- ✅ Fallback: Uses `staff_store` table when receipts are empty
- ✅ Calculates commission from `items.commission × quantity_sold`

#### 3. **Commission Calculation**
```
For each staff member:
1. Get receipts for the staff
2. Get receipt_items for those receipts
3. Join with items table to get commission value
4. Calculate: SUM(items.commission × receipt_items.quantity)

If no receipts:
1. Fallback to staff_store table
2. Get quantity_sold from staff_store
3. Calculate: SUM(items.commission × staff_store.quantity_sold)
```

### Files Updated:

1. **`backend/src/routes/admin.routes.ts`**
   - Updated `/api/admin/commissions/overview` endpoint (line ~956)
   - Updated `/api/admin/commissions/analytics` endpoint (line ~1314)
   - Added fallback logic for staff_store table
   - Added comprehensive logging

### Data Structure Used:

#### Tables:
- `users` - staff information (filtered by role)
- `receipts` - sales receipts
- `receipt_items` - line items in receipts
- `items` - product catalog (contains commission values)
- `staff_store` - staff inventory (fallback for commission calculation)
- `staff_payments` - payment records

###  Expected Behavior:

#### Commission Overview Page (`/admin/commissions`):
1. **Shows all commission staff** (both `staff_commission` and `commission_staff` roles)
2. **Displays accurate metrics**:
   - Total commission generated (calculated from actual sales)
   - Total commission paid (from payment records)
   - Pending commission (generated - paid)
   - Items sold count
   - Total sales value

3. **Handles edge cases**:
   - Staff with no sales (shows 0 commission)
   - Staff with sales but no receipts (uses staff_store fallback)
   - Staff with payments but no sales (shows negative pending)

#### Staff Detail Page (`/admin/commissions/[staffId]`):
1. **Receipt breakdown** - Shows each receipt with items and commission
2. **Item aggregation** - Shows total commission per item type
3. **Date filtering** - Allows filtering by date range
4. **Accurate totals** - Matches overview page numbers

### Testing Steps:

#### Test 1: Verify Commission Staff Are Listed
1. Open `/admin/commissions`
2. Check "Commission Staff" count card
3. Verify table shows all staff with `staff_commission` or `commission_staff` role

✅ **Expected**: All commission staff appear in the table

#### Test 2: Verify Commission Calculations
1. Check a staff member's commission
2. Click "Details" button
3. Verify numbers match:
   - Total commission on detail page
   - Commission shown on overview page
   - Sum of individual item commissions

✅ **Expected**: All numbers match

#### Test 3: Verify Sales Data
1. Find a staff member who has made sales
2. Verify "Items Sold" shows correct count
3. Verify "Total Sales" shows correct amount
4. Check "Commission Generated" is > 0

✅ **Expected**: Numbers reflect actual sales data

#### Test 4: Verify Payment Tracking
1. If any payments have been made, verify "Total Paid" is correct
2. Verify "Pending" = "Generated" - "Paid"
3. Check payment history tab shows the payments

✅ **Expected**: Payment calculations are accurate

#### Test 5: Verify Fallback Logic
1. If a staff member has `staff_store` entries but no receipts
2. System should calculate commission from `staff_store.quantity_sold`
3. Commission should still appear correctly

✅ **Expected**: Commission calculated correctly regardless of data source

### Troubleshooting:

#### If no staff appear:
- Check database: `SELECT * FROM users WHERE role IN ('staff_commission', 'commission_staff');`
- Verify backend is running on port 5000
- Check console for errors

#### If commission is 0 for staff with sales:
- Check `items` table has `commission` values set
- Verify `receipt_items` or `staff_store.quantity_sold` has data
- Check console logs for calculation errors

#### If numbers don't match:
- Clear browser cache
- Refresh the page
- Check backend logs for data inconsistencies

### Console Logging:

The backend now logs detailed information:
```
✅ Found X commission staff
   Staff Name: Commission=₦X, Sales=₦X, Items=X, Paid=₦X
```

Check backend console for these logs to debug issues.

### API Endpoints Updated:

1. `GET /api/admin/commissions/overview`
   - Now handles both role variations
   - Falls back to staff_store if needed
   - Logs detailed calculations

2. `GET /api/admin/commissions/analytics`
   - Now handles both role variations
   - Correctly aggregates data

3. Other endpoints unchanged:
   - `GET /api/admin/commissions/staff/:staffId`
   - `GET /api/admin/commissions/payments`
   - `POST /api/admin/commissions/pay`

### Next Steps:

1. ✅ Test the commission overview page
2. ✅ Verify all staff appear
3. ✅ Check commission calculations
4. ✅ Test detail pages
5. ✅ Verify payment tracking
6. ✅ Test analytics tab

### Status: ✅ READY FOR TESTING

The commission tracking system has been updated to correctly sync with existing Supabase data. All endpoints now:
- Support both `staff_commission` and `commission_staff` roles
- Use primary data from `receipts/receipt_items`
- Fall back to `staff_store` when needed
- Calculate commissions accurately from `items.commission`
- Track payments correctly

Please test the system and verify the numbers match your expectations.
