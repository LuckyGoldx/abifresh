-- ============================================================================
-- FIX: receipt_items missing item_name column + sales_items table
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Add item_name column to receipt_items
ALTER TABLE IF EXISTS public.receipt_items
  ADD COLUMN IF NOT EXISTS item_name TEXT;

-- 2. Create sales_items table if it doesn't exist
-- (Missing from main migration, required by /api/sales/create-sale and /api/sales/record)
CREATE TABLE IF NOT EXISTS public.sales_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  logistics_fee DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_items_sale_id ON public.sales_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_item_id ON public.sales_items(item_id);

-- 3. Reload PostgREST schema cache (critical!)
NOTIFY pgrst, 'reload schema';

-- 4. Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'receipt_items'
ORDER BY ordinal_position;
