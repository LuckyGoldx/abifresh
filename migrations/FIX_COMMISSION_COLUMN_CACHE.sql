-- ============================================================================
-- FIX: Add missing commission column to staff_sales table
-- This fixes the "Could not find the 'commission' column" schema cache error
-- ============================================================================

-- STEP 1: Add commission column to staff_sales (if not already present)
ALTER TABLE IF EXISTS public.staff_sales 
ADD COLUMN IF NOT EXISTS commission DECIMAL(12, 2) DEFAULT 0;

-- STEP 2: Add sold_outside_jalingo column to staff_sales (related fix)
ALTER TABLE IF EXISTS public.staff_sales
ADD COLUMN IF NOT EXISTS sold_outside_jalingo BOOLEAN DEFAULT false;

-- STEP 3: Create index on commission for performance
CREATE INDEX IF NOT EXISTS idx_staff_sales_commission 
ON public.staff_sales(staff_id, commission);

-- STEP 4: CRITICAL - Reload PostgREST schema cache
-- This tells PostgREST to re-read the database schema immediately
NOTIFY pgrst, 'reload schema';

-- STEP 5: Verify the commission column now exists and PostgREST can see it
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'staff_sales' AND column_name IN ('commission', 'sold_outside_jalingo')
ORDER BY ordinal_position;

-- STEP 6: Show all columns in staff_sales table to verify schema
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'staff_sales'
ORDER BY ordinal_position;
