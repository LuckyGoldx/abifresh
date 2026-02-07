# 🎁 Commission Tracking Implementation Guide

## Overview
Commission staff members now have a **Commission Card** on their dashboard that displays the **total commission earned** from all items they've sold.

## How It Works

### 1. **Commission Setup**
- Each item in the inventory has a `commission` field (amount per unit)
- When an item is sold by commission staff, the commission is automatically calculated and stored
- **Formula:** `Total Commission = commission_per_unit × quantity_sold`

### 2. **Data Flow**
```
Commission Staff Makes a Sale:
  ↓
Backend fetches item commission from `items` table
  ↓
Calculates: commission_per_unit × quantity
  ↓
Stores commission in `staff_sales.commission` field
  ↓
Dashboard endpoint sums all commission from staff_sales
  ↓
Frontend displays commission card (only for commission staff)
```

### 3. **Database Changes**
- **New Column:** `staff_sales.commission` (DECIMAL 12,2)
- **Contains:** Total commission earned from each sale
- **Indexed:** For fast dashboard queries

---

## Testing Checklist

### Prerequisites
- [ ] Run the migration: `add_commission_to_staff_sales.sql`
- [ ] Restart backend server
- [ ] Clear browser cache

### Test 1: Commission Staff Dashboard
1. Login as commission staff
   - Email: `staff.comm@abifresh.com`
   - Password: `StaffComm@123456`

2. Verify dashboard displays:
   - [ ] "Total Commission" card visible (orange color, TrendingUp icon)
   - [ ] Card shows commission amount in ₦ currency
   - [ ] Subtitle shows "Commission earned"

3. Expected value:
   - [ ] Should show sum of all commission from staff_sales
   - [ ] Initially will be 0 if no sales made yet

### Test 2: Non-Commission Staff Dashboard
1. Login as non-commission staff
   - Email: `staff@abifresh.com`
   - Password: `Staff@123456`

2. Verify dashboard:
   - [ ] "Total Commission" card is NOT visible
   - [ ] Other stats cards are visible normally
   - [ ] Welcome message shows "Non-Commission Staff"

### Test 3: Make a Sale and Verify Commission
1. Have commission staff make a sale:
   - Login as commission staff
   - Go to `/staff/make-sale`
   - Select an item that has a commission value
   - Enter quantity and complete sale

2. Verify the sale record:
   - In Supabase dashboard, check `staff_sales` table
   - Find the new sale record
   - Verify `commission` column has value = `item.commission × quantity`
   - Example: If item has commission 10 and quantity 5, commission should be 50

3. Check dashboard:
   - [ ] Refresh dashboard
   - [ ] "Total Commission" card should increase
   - [ ] Value should match the sum of all sales with commission

### Test 4: Multiple Sales Commission Aggregation
1. Make several sales as commission staff
2. Each sale should add to the total in the commission card
3. Verify: 
   - [ ] Total commission = Sum of all (item.commission × sale.quantity)
   - [ ] Display shows formatted currency value

### Test 5: Edge Cases
- [ ] Test with items that have 0 commission
- [ ] Test with items that have high commission values
- [ ] Verify commission persists after refresh
- [ ] Verify commission is visible immediately after sale

---

## Verification Queries

Run these in Supabase SQL Editor to verify:

### Check commission column exists
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'staff_sales' 
AND column_name = 'commission';
```

### Check recent sales with commission
```sql
SELECT 
  id, 
  staff_id, 
  item_id, 
  quantity, 
  unit_price, 
  total_amount,
  commission,
  sale_date
FROM staff_sales 
ORDER BY sale_date DESC 
LIMIT 10;
```

### Calculate total commission for a staff member
```sql
SELECT 
  staff_id,
  SUM(commission) as total_commission,
  COUNT(*) as total_sales,
  AVG(commission) as avg_commission_per_sale
FROM staff_sales 
WHERE staff_id = 'YOUR_STAFF_ID_HERE'
GROUP BY staff_id;
```

---

## Implementation Details

### Backend Changes
- **File:** `backend/src/routes/staff.routes.ts`
  - Dashboard endpoint now checks: `req.user!.role`
  - Calculates: `isCommissionStaff` flag
  - Returns: `total_commission` and `is_commission_staff` in response

- **File:** `backend/src/services/staff-store.service.ts`
  - `recordStaffSale()` now fetches commission from items table
  - Calculates: `totalCommission = commissionPerUnit × quantity`
  - Stores in `staff_sales.commission`

### Database Migration
- **File:** `backend/migrations/add_commission_to_staff_sales.sql`
  - Adds `commission` column with default 0
  - Creates index for query performance
  - Adds helpful comments

### Frontend Changes
- **File:** `frontend/app/staff/dashboard/page.tsx`
  - Updated `StaffDashboard` interface with new fields
  - Added conditional commission card display
  - Icon: `TrendingUp` (orange color)
  - Only shows for commission staff

---

## Troubleshooting

### Commission Card Not Showing
- [ ] User logged in with commission staff role?
- [ ] Backend migration has been run?
- [ ] Backend server restarted after changes?
- [ ] Check browser console for API errors

### Commission Value Always 0
- [ ] Items have commission values set?
- [ ] Check Supabase: select commission from items;
- [ ] Are sales being recorded with commissioned items?

### Visual Issues
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Hard refresh dashboard (Ctrl+F5)
- [ ] Check dark mode toggle

---

## Configuration

### Item Commission (Database)
Items in the inventory should have `commission` field populated:
```sql
UPDATE items 
SET commission = 10 
WHERE id = 'item-uuid-here';
```

This determines how much commission staff earns per unit sold.

---

## Next Steps

After verification:
1. [ ] Test in production environment
2. [ ] Verify with real sales data
3. [ ] Train staff on commission feature
4. [ ] Create documentation for users

---

## Support Reference

**Related Tables:**
- `users` - Staff member roles
- `items` - Commission per unit
- `staff_sales` - Individual sale records with commission
- `staff_payments` - Payment records

**Related API Endpoints:**
- `GET /api/staff/dashboard` - Returns total_commission
- `POST /api/staff/store/make-sale` - Records commission on sale
- `GET /api/staff/store/sales-history` - Sales with commission details
