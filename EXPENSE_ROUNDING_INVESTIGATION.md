# Expense Amount Rounding Issue - Investigation Summary

## Problem Statement
When users input an expense amount (e.g., 3000), it records and displays as 2999.99 in all expense pages:
- Admin expenses (`/admin/expenses`, `/admin/my-expenses`)
- Staff expenses (`/staff/expenses`)
- Commission staff expenses (if they have expense pages)
- Non-commission staff expenses (if they have expense pages)
- Sales staff expenses (`/sales/expenses`)
- Super admin expenses (`/superadmin/expenses`, `/superadmin/my-expenses`)

The amount is consistently 0.01 LESS than what was input.

## Investigation Steps Taken

### 1. **Checked Frontend Form Input**
- **Location**: All expense pages use identical form structure
- **Pattern**: All use HTML5 `<input type="number" step="0.01" />`
- **Method**: parseFloat(amount) before sending to API
- **Finding**: Code looks correct, no obvious formatting issues

**Files Checked**:
- `frontend/app/admin/my-expenses/page.tsx`
- `frontend/app/staff/expenses/page.tsx`
- `frontend/app/sales/expenses/page.tsx`

### 2. **Checked API Routes**
- **Admin Create**: `backend/src/routes/admin.routes.ts` - parseFloat(amount)
- **Staff Create**: `backend/src/routes/staff.routes.ts` - parseFloat(amount)
- **Sales Create**: `backend/src/routes/sales.routes.ts` - parseFloat(amount)
- **Finding**: All routes parse correctly, no suspicious logic

### 3. **Checked Database Service**
- **Service File**: `backend/src/services/expenses.service.ts`
- **Method**: createExpense() - receives parsed amount, inserts via Supabase
- **Column**: DECIMAL(10, 2) - correct precision
- **Finding**: Service does parseFloat(amount.toString()), which is fine

### 4. **Checked Database Schema**
- **Location**: COMPLETE_SUPABASE_MIGRATION.sql, line 263
- **Definition**: `expense_amount DECIMAL(10, 2) NOT NULL`
- **Finding**: Column type is correct

### 5. **Checked API Response Handling**
- **Display**: expense.amount.toLocaleString()
- **Fetch**: All amounts parsed as numbers before display
- **Finding**: No obvious rounding in display code

## Debugging Approach

Since we cannot immediately identify the bug through code inspection, we've added comprehensive logging to trace the value at each stage:

### Logging Added

**Frontend** (`frontend/app/admin/my-expenses/page.tsx`):
- Form submission logs: shows state value, type, parseFloat result, and final value sent
- Display logs: shows fetched amount, type, and JSON representation

**Backend Routes** (admin, staff, sales):
- Request logging: shows raw amount, type, parsed value
- Service logging: shows what's sent to Supabase

**Backend Service** (`backend/src/services/expenses.service.ts`):
- Input logging: raw amount received, parsed value
- Output logging: what Supabase returns, including expense_amount with type

## Why This Matters

The logs will pinpoint exactly WHERE the value changes from 3000 to 2999.99:
- **If it changes in frontend**: UI/form handling issue
- **If it changes during API call**: Data serialization issue
- **If it changes in backend route**: Request parsing issue
- **If it changes in service**: Supabase operation issue
- **If it changes in database**: Trigger or constraint issue

## Next Steps

1. **Restart backend server** to apply logging changes
2. **Test via admin my-expenses page**: Input 3000, submit
3. **Check browser console** for frontend logs
4. **Check server console** for backend logs
5. **Share logs** to pinpoint exact issue location

## Files Modified for Debugging

- `frontend/app/admin/my-expenses/page.tsx` - Added logging in handleSubmit() and display
- `backend/src/routes/admin.routes.ts` - Added logging in /expenses/create
- `backend/src/routes/staff.routes.ts` - Added logging in /expenses/create
- `backend/src/routes/sales.routes.ts` - Added logging in /expenses/create
- `backend/src/services/expenses.service.ts` - Added logging in createExpense()

## Important

All logging is console.log() based, so it won't affect production if this code is deployed. The logging should be removed once the issue is identified and fixed.

## Possible Root Causes to Investigate

### Known Issues with HTML Number Inputs
- Some browsers handle large numbers with step="0.01" differently
- Number input might have JavaScript float precision issues

### Potential Backend Issues
- Request middleware modifying values
- JSON serialization/deserialization issue
- Supabase client library quirk

### Potential Database Issues
- PostgreSQL trigger modifying the value
- Constraint causing rounding
- Type casting issue in RPC function

### Potential Display Issues
- toLocaleString() with specific locale settings
- Currency formatter applied somewhere
- Component re-rendering with stale value

---

**Created**: January 2025  
**Ticket**: Expense amount rounding issue (3000 → 2999.99)  
**Status**: Under Investigation (Logging Added)
