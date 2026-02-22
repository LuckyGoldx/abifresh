# Database Clear Data Script Plan

## Question
Is it possible to have a SQL script to clear all table contents (not the tables themselves, just the data), excluding the users table?

## Answer
**YES, absolutely possible!** ✅

This is a straightforward operation using SQL `DELETE FROM` or `TRUNCATE` statements. This approach:
- ✅ Keeps all table structures intact
- ✅ Removes all data from specified tables
- ✅ Preserves the `users` table with all existing users
- ✅ Can be run in one transaction for safety
- ✅ Can include `CASCADE` to handle foreign key relationships automatically

---

## All Tables in Your Database

### Total Tables: **21**

#### Tables to be CLEARED (20):
1. `returned_items`
2. `restock_orders`
3. `restock_order_items`
4. `items`
5. `inventory_main_store`
6. `inventory_active_store`
7. `sales`
8. `daily_sales_summary`
9. `posted_items`
10. `staff_commissions`
11. `staff_payments`
12. `staff_expenses`
13. `inventory_transfers`
14. `damage_loss_reports`
15. `notifications`
16. `activity_logs`
17. `system_settings`
18. `staff_store`
19. `posted_items_mapping`
20. `staff_sales`

#### Tables to be PRESERVED (1):
- `users` ← **Will NOT be touched**

---

## Sample SQL Script Structure

### Option 1: Using TRUNCATE (Fastest - Recommended)
```sql
-- Clear all data while preserving structure
-- Note: TRUNCATE automatically handles cascading deletes due to FK constraints

BEGIN;

TRUNCATE TABLE returned_items CASCADE;
TRUNCATE TABLE restock_order_items CASCADE;
TRUNCATE TABLE restock_orders CASCADE;
TRUNCATE TABLE staff_sales CASCADE;
TRUNCATE TABLE posted_items_mapping CASCADE;
TRUNCATE TABLE posted_items CASCADE;
TRUNCATE TABLE sales CASCADE;
TRUNCATE TABLE daily_sales_summary CASCADE;
TRUNCATE TABLE staff_commissions CASCADE;
TRUNCATE TABLE staff_payments CASCADE;
TRUNCATE TABLE staff_expenses CASCADE;
TRUNCATE TABLE inventory_transfers CASCADE;
TRUNCATE TABLE damage_loss_reports CASCADE;
TRUNCATE TABLE inventory_active_store CASCADE;
TRUNCATE TABLE inventory_main_store CASCADE;
TRUNCATE TABLE items CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE activity_logs CASCADE;
TRUNCATE TABLE system_settings CASCADE;
TRUNCATE TABLE staff_store CASCADE;

COMMIT;
```

### Option 2: Using DELETE FROM (More Control)
```sql
-- Alternative approach with DELETE (slower but safer if you need rollback)

BEGIN;

DELETE FROM returned_items;
DELETE FROM restock_order_items;
DELETE FROM restock_orders;
DELETE FROM staff_sales;
DELETE FROM posted_items_mapping;
DELETE FROM posted_items;
DELETE FROM sales;
DELETE FROM daily_sales_summary;
DELETE FROM staff_commissions;
DELETE FROM staff_payments;
DELETE FROM staff_expenses;
DELETE FROM inventory_transfers;
DELETE FROM damage_loss_reports;
DELETE FROM inventory_active_store;
DELETE FROM inventory_main_store;
DELETE FROM items;
DELETE FROM notifications;
DELETE FROM activity_logs;
DELETE FROM system_settings;
DELETE FROM staff_store;

COMMIT;
```

---

## Important Considerations

### ⚠️ Before Running:
1. **Backup your database** - This is permanent
2. **Test in a development environment first**
3. **Decide on order** - Tables with foreign keys must be cleared first
4. **Expected duration** - TRUNCATE is very fast (< 1 second for most databases)

### 📊 What Happens:
| Item | Status |
|------|--------|
| Table structures | ✅ Preserved |
| All data in 20 tables | ❌ Deleted |
| `users` table data | ✅ Preserved |
| Sequences/Auto-increment | ✅ Reset to start fresh |
| Permissions/Roles | ✅ Preserved |

### 🔄 Foreign Key Handling:
Using `CASCADE` keyword ensures that related records are deleted in the correct order, respecting all foreign key constraints.

---

## Ready When You Are

Just let me know when you want to implement this, and I'll:
1. Create the SQL script file
2. Review for any missing tables
3. Set it up with proper error handling
4. Push to git when confirmed

**No implementation yet** - just awaiting your confirmation! ✅
