-- ============================================================================
-- AKV - CLEAR ALL TABLE DATA FOR CLIENT DELIVERY
-- ============================================================================
-- PURPOSE: Delete all rows from every table EXCEPT:
--   ✅ users              (KEPT)
--   ✅ items               (KEPT)
--
-- SAFETY:
--   - Does NOT drop any tables or columns
--   - Does NOT alter schema in any way
--   - Only deletes ROW DATA
--   - Wrapped in a transaction — all or nothing
--   - Deletes children before parents to respect foreign keys
--
-- HOW TO RUN: Copy this entire script and paste into Supabase SQL Editor, then click "Run"
-- DATE: March 9, 2026
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- GROUP 1: Child tables (must be cleared first due to foreign key references)
-- ════════════════════════════════════════════════════════════════════════════

-- receipt_items depends on receipts(id) ON DELETE CASCADE
DELETE FROM public.receipt_items;

-- posted_items_mapping depends on posted_items(id) and staff_store(id)
DELETE FROM public.posted_items_mapping;

-- restock_order_items depends on restock_orders(id) ON DELETE CASCADE
DELETE FROM public.restock_order_items;

-- ════════════════════════════════════════════════════════════════════════════
-- GROUP 2: All other tables (depend only on users/items which are KEPT)
-- ════════════════════════════════════════════════════════════════════════════

-- Sales & transactions
DELETE FROM public.staff_sales;
DELETE FROM public.sales;
DELETE FROM public.daily_sales_summary;
DELETE FROM public.receipts;

-- Staff store & posted items
DELETE FROM public.staff_store;
DELETE FROM public.posted_items;

-- Staff finance
DELETE FROM public.staff_commissions;
DELETE FROM public.staff_payments;
DELETE FROM public.staff_expenses;

-- Inventory
DELETE FROM public.inventory_main_store;
DELETE FROM public.inventory_active_store;
DELETE FROM public.inventory_transfers;

-- Damage & returns
DELETE FROM public.damage_loss_reports;
DELETE FROM public.returned_items;

-- Restock orders (parent — cleared after restock_order_items)
DELETE FROM public.restock_orders;

-- System / audit
DELETE FROM public.notifications;
DELETE FROM public.activity_logs;
DELETE FROM public.system_settings;
DELETE FROM public.backup_history;

-- ════════════════════════════════════════════════════════════════════════════
-- GROUP 3: Optional — expenses table (may or may not exist in your DB)
-- ════════════════════════════════════════════════════════════════════════════

-- The "expenses" table (separate from staff_expenses) may exist
-- Using DO block so it doesn't fail if the table doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
    EXECUTE 'DELETE FROM public.expenses';
  END IF;
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICATION: Show row counts for all tables after cleanup
-- ════════════════════════════════════════════════════════════════════════════
SELECT 
  t.table_name,
  (xpath('/cnt/text()', xml_count))[1]::text::bigint AS row_count
FROM information_schema.tables t
CROSS JOIN LATERAL (
  SELECT query_to_xml(format('SELECT COUNT(*) AS cnt FROM public.%I', t.table_name), false, true, '') AS xml_count
) x
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
