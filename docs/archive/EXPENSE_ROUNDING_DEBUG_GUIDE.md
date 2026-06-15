# Expense Amount Rounding Bug - Debug Guide

## Issue Summary
Users report that when they input an expense amount (e.g., 3000), it records as 2999.99.

## Changes Made for Debugging

Added detailed console logging at multiple points in the system to trace where the rounding occurs:

### 1. **Frontend Changes** (Admin My-Expenses Page)
- `frontend/app/admin/my-expenses/page.tsx`
  - Added logging in `handleSubmit()` to show:
    - Amount state value
    - Type of amount
    - parseFloat() result
    - Final amount being sent
  - Added logging when displaying expenses to show:
    - Expense id
    - Amount value
    - Amount type
    - JSON representation

### 2. **Backend Changes** (Express Routes)

**Admin Route** (`backend/src/routes/admin.routes.ts` - `/expenses/create`):
- Logs raw amount received
- Logs parsed amount
- Logs amount type
- Logs category and date
- Logs final amount returned from database

**Staff Route** (`backend/src/routes/staff.routes.ts` - `/expenses/create`):
- Same logging as admin route

**Sales Route** (`backend/src/routes/sales.routes.ts` - `/expenses/create`):
- Same logging as admin route

### 3. **Backend Service Changes**
- `backend/src/services/expenses.service.ts` - `createExpense()`
  - Logs raw amount received
  - Logs parsed amount
  - Logs Supabase insert results
  - Logs expense_amount returned from database with type information

## How to Test and Debug

### Step 1: Start Backend Server with Logging
```bash
npm run dev  # or whatever your start command is
```
Look for console output to see the logging.

### Step 2: Test via Admin My-Expenses Page
1. Navigate to `/admin/my-expenses`
2. Fill in form:
   - Expense Date: Today
   - Amount: **3000**
   - Expense Type: Select any category
   - Description: "Test 3000"
3. Click "Record Expense"

### Step 3: Check Console Logs
Open the browser console (F12) and server console logs.

**You should see logs like:**

**Frontend Console:**
```
💰 [ADMIN MY-EXPENSES FORM] Submitting expense:
  amount (state): "3000" (type: string)
  parseFloat(amount): 3000
  category: "Rent"
  expenseDate: "2024-01-10"
  Final amount being sent: 3000
```

**Frontend Console (Displaying):**
```
📊 Displaying expense: {
  id: "uuid...",
  amount: 3000,
  amountType: "number",
  amountRepr: "3000"
}
```

**Backend Console:**
```
🔍 [ADMIN EXPENSE CREATE] Received request:
  Raw amount: 3000 (type: number)
  Parsed amount: 3000 (type: number)
  Amount string: 3000
  Category: Rent
  Expense date: 2024-01-10
  Final parsed amount before service: 3000

📊 [EXPENSE SERVICE] createExpense called:
  Raw amount received: 3000 (type: number)
  Parsed amount: 3000
  Staff ID: uuid...
  Expense type: Rent
  Expense date: 2024-01-10

✅ Expense inserted and returned from Supabase:
  Data: {id: "...", expense_amount: 3000, ...}
  expense_amount: 3000 (type: number)
```

### Step 4: Test Other Roles
Repeat the test for other roles:
- `/staff/expenses` - Staff expenses
- `/sales/expenses` - Sales staff expenses

## Expected Output vs Problematic Output

### Expected (Correct):
- Frontend shows: `amount (state): "3000"`
- Backend received: `Raw amount: 3000`
- Database stored: `expense_amount: 3000`
- Displayed: `₦3,000`

### Problematic (Current Bug):
- Frontend shows: `amount (state): "3000"` or similar
- Backend received: `Raw amount: 3000`
- but displayed: `₦2,999.99`

## Possible Root Causes Based on Logs

### If logs show amount is correctly 3000 throughout but displays as 2999.99:
- **Likely Cause**: Frontend formatting/display issue
- **Check**: Look at `toLocaleString()` behavior or currency formatter
- **Location**: Where the amount is displayed in the UI

### If logs show 3000 becomes 2999.99 at any point:
- **Likely Cause**: Mathematical operation truncating/rounding
- **Check**: Search for `-` (minus) operations, division, or other calculations
- **Location**: Frontend state mutations or API response handling

### If logs show correct value but database returns 2999.99:
- **Likely Cause**: PostgreSQL/Supabase trigger or constraint
- **Check**: Database triggers on staff_expenses table
- **Location**: COMPLETE_SUPABASE_MIGRATION.sql for triggers

## Test Multiple Values
Try these amounts to identify patterns:
- `1000` → should be `1000.00`
- `500.50` → should be `500.50`
- `2999.99` → should be `2999.99`
- `3000` → should be `3000.00` (currently 2999.99?)
- `10000` → should be `10000.00`
- `0.99` → should be `0.99`

## Reporting Back
Please run the tests and share:

1. **Browser console logs** when submitting 3000
2. **Server console logs** at same time
3. **All four values** tested (1000, 500.50, 2999.99, 3000, 10000, 0.99)
4. **Which page it happens on** (admin, staff, sales)
5. **What displays in the table** after recording

This will help identify exactly where the rounding is happening.

## Database Schema Reference

From `COMPLETE_SUPABASE_MIGRATION.sql` line 263:
```sql
CREATE TABLE IF NOT EXISTS public.staff_expenses (
  ...
  expense_amount DECIMAL(10, 2) NOT NULL,
  ...
);
```

The column is correctly defined as DECIMAL(10, 2), which should handle 3000.00 without issue.

## Quick Reference: Files Changed

- `frontend/app/admin/my-expenses/page.tsx` - Frontend logging
- `backend/src/routes/admin.routes.ts` - Admin route logging
- `backend/src/routes/staff.routes.ts` - Staff route logging
- `backend/src/routes/sales.routes.ts` - Sales route logging
- `backend/src/services/expenses.service.ts` - Service logging

After you test and share the logs, we can pinpoint the exact location of the issue.
