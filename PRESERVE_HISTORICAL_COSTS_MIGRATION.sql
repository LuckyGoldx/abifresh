-- ============================================================================
-- MIGRATION: ADD COST PRICE FOR FINANCIAL INTEGRITY
-- ============================================================================

BEGIN;

-- 1. Add cost_price column to public.receipt_items
ALTER TABLE public.receipt_items 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0.00;

COMMENT ON COLUMN public.receipt_items.cost_price IS 'Immutable cost/purchase price of the item at the exact moment of checkout';

-- 2. Add cost_price column to public.sales_items
ALTER TABLE public.sales_items 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0.00;

COMMENT ON COLUMN public.sales_items.cost_price IS 'Immutable cost/purchase price of the item at the exact moment of checkout';

-- 3. Add cost_price column to public.staff_sales
ALTER TABLE public.staff_sales 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0.00;

COMMENT ON COLUMN public.staff_sales.cost_price IS 'Immutable cost/purchase price of the item at the exact moment of checkout';

-- ============================================================================
-- SAFE BACKFILL: POPULATE HISTORICAL TRANSACTIONS WITH BASELINE COST
-- ============================================================================

-- Backfill receipt_items from items.unit_price
UPDATE public.receipt_items ri
SET cost_price = COALESCE(i.unit_price, 0.00)
FROM public.items i
WHERE ri.item_id = i.id AND (ri.cost_price IS NULL OR ri.cost_price = 0.00);

-- Backfill sales_items from items.unit_price
UPDATE public.sales_items si
SET cost_price = COALESCE(i.unit_price, 0.00)
FROM public.items i
WHERE si.item_id = i.id AND (si.cost_price IS NULL OR si.cost_price = 0.00);

-- Backfill staff_sales from items.unit_price
UPDATE public.staff_sales ss
SET cost_price = COALESCE(i.unit_price, 0.00)
FROM public.items i
WHERE ss.item_id = i.id AND (ss.cost_price IS NULL OR ss.cost_price = 0.00);

COMMIT;
