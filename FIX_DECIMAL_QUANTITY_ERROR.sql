-- ============================================================================
-- HOTFIX: ALLOW DECIMAL QUANTITIES (HALF BAGS 0.5) IN TRANSACTION TABLES
-- Run this in your Supabase SQL Editor
-- ============================================================================

BEGIN;

-- 1. Alter sales_items quantity column to support decimals (0.5)
ALTER TABLE public.sales_items 
ALTER COLUMN quantity TYPE NUMERIC(10, 1);

-- 2. Alter receipt_items quantity column to support decimals (0.5) just in case
ALTER TABLE public.receipt_items 
ALTER COLUMN quantity TYPE NUMERIC(10, 1);

-- 3. Alter staff_sales quantity column to support decimals (0.5) just in case
ALTER TABLE public.staff_sales 
ALTER COLUMN quantity TYPE NUMERIC(10, 1);

-- 4. Reload PostgREST schema cache to make Supabase aware of the changes immediately
NOTIFY pgrst, 'reload schema';

COMMIT;
