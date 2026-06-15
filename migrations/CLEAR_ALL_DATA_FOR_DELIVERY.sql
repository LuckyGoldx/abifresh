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
-- DATE: June 1, 2026 (updated — now includes credit system tables)
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- GROUP 1: Deepest child tables (cleared first for foreign key compliance)
-- ════════════════════════════════════════════════════════════════════════════

-- Sales / receipt children
DELETE FROM public.receipt_items;            -- depends on receipts(id)
DELETE FROM public.sales_items;              -- depends on sales(id)

-- Posted items children
DELETE FROM public.posted_items_mapping;     -- depends on posted_items(id), staff_store(id)

-- Restock order items
DELETE FROM public.restock_order_items;      -- depends on restock_orders(id)

-- Credit system deepest children
DELETE FROM public.credit_payment_items;     -- depends on credit_payments(id), credit_sale_items(id)
DELETE FROM public.credit_activities;        -- depends on creditors(id), credit_sales(id), credit_payments(id)

-- ════════════════════════════════════════════════════════════════════════════
-- GROUP 2: Mid-level tables (depend on users/items or GROUP 1 parents)
-- ════════════════════════════════════════════════════════════════════════════

-- Credit system mid-level
DELETE FROM public.credit_payments;          -- depends on creditors(id), credit_sales(id)
DELETE FROM public.credit_store;             -- depends on credit_sales(id), credit_sale_items(id), creditors(id)
DELETE FROM public.credit_sale_items;        -- depends on credit_sales(id)
DELETE FROM public.credit_sales;             -- depends on creditors(id)
DELETE FROM public.creditors;                -- depends on users(id)

-- Finance & payments
DELETE FROM public.staff_commissions;
DELETE FROM public.staff_payments;
DELETE FROM public.staff_expenses;

-- Sales & transactions
DELETE FROM public.staff_sales;
DELETE FROM public.sales;
DELETE FROM public.daily_sales_summary;
DELETE FROM public.receipts;

-- Staff store & posted items
DELETE FROM public.staff_store;
DELETE FROM public.posted_items;

-- Inventory
DELETE FROM public.inventory_main_store;
DELETE FROM public.inventory_active_store;
DELETE FROM public.inventory_transfers;

-- Damage & returns
DELETE FROM public.damage_loss_reports;
DELETE FROM public.returned_items;

-- Restock orders (parent table)
DELETE FROM public.restock_orders;

-- PWA tracking
DELETE FROM public.pwa_downloads;

-- System / audit
DELETE FROM public.notifications;
DELETE FROM public.activity_logs;
DELETE FROM public.system_settings;
DELETE FROM public.backup_history;

-- ════════════════════════════════════════════════════════════════════════════
-- GROUP 3: Optional tables (checked via DO block so they won't fail if absent)
-- ════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
    EXECUTE 'DELETE FROM public.expenses';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'remittance') THEN
    EXECUTE 'DELETE FROM public.remittance';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'commission_rates') THEN
    EXECUTE 'DELETE FROM public.commission_rates';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sales_items') THEN
    EXECUTE 'DELETE FROM public.sales_items';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'debtors') THEN
    EXECUTE 'DELETE FROM public.debtors';
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
  AND t.table_name NOT IN ('users', 'items')
ORDER BY t.table_name;

-- ════════════════════════════════════════════════════════════════════════════
-- CONFIRMATION: Show that users and items are untouched
-- ════════════════════════════════════════════════════════════════════════════
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM public.users
UNION ALL
SELECT 'items', COUNT(*) FROM public.items;
