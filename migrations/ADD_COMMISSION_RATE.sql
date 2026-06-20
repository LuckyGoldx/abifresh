-- ============================================================================
-- ADD APPROVED_COMMISSION + COMMISSION_RATE TO staff_sales
-- Run this in Supabase SQL Editor ONCE
-- ============================================================================

-- 1. Add commission_rate column (snapshot of item commission at sale time)
ALTER TABLE public.staff_sales
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN public.staff_sales.commission_rate
IS 'Item commission rate from inventory at the time of sale.';

-- 2. Add approved_commission column (only set after payment is approved)
ALTER TABLE public.staff_sales
ADD COLUMN IF NOT EXISTS approved_commission DECIMAL(12, 2) DEFAULT 0;

COMMENT ON COLUMN public.staff_sales.approved_commission
IS 'Commission earned. 0 until the payment for this sale is approved by admin.';

-- 3. Refresh commission_rate from current items.commission for ALL existing sales
--    Re-run this step whenever you change commission prices in inventory.
UPDATE public.staff_sales ss
SET commission_rate = i.commission
FROM public.items i
WHERE ss.item_id = i.id
  AND i.commission IS NOT NULL;

-- 4. Verify column setup
SELECT 
  COUNT(*) AS total_sales,
  COUNT(*) FILTER (WHERE commission_rate > 0) AS sales_with_rate,
  COUNT(*) FILTER (WHERE approved_commission > 0) AS sales_with_approved_commission
FROM public.staff_sales;

-- ============================================================================
-- NEXT: Run the backfill script to calculate approved_commission ONLY
--       for sales with approved payments:
--       
--       npx ts-node backfill-commissions.ts
-- ============================================================================
