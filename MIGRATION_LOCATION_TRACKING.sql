-- ============================================================================
-- LOCATION TRACKING MIGRATION
-- Adds location-aware stock and sales tracking
-- ============================================================================

-- 1. Add location column to posted_items
ALTER TABLE public.posted_items 
ADD COLUMN IF NOT EXISTS location VARCHAR(50) DEFAULT 'Inside Jalingo';

-- 2. Add location column to staff_store
ALTER TABLE public.staff_store 
ADD COLUMN IF NOT EXISTS location VARCHAR(50) DEFAULT 'Inside Jalingo';

-- 3. Update UNIQUE constraint on staff_store
-- First, remove the old constraint
ALTER TABLE public.staff_store 
DROP CONSTRAINT IF EXISTS staff_store_staff_id_item_id_key;

-- Then add the new constraint including location
ALTER TABLE public.staff_store 
ADD CONSTRAINT staff_store_staff_id_item_id_location_key UNIQUE(staff_id, item_id, location);

-- 4. Add location column to staff_sales
ALTER TABLE public.staff_sales 
ADD COLUMN IF NOT EXISTS location VARCHAR(50) DEFAULT 'Inside Jalingo';

-- 5. Add index for location columns for better filtering
CREATE INDEX IF NOT EXISTS idx_posted_items_location ON public.posted_items(location);
CREATE INDEX IF NOT EXISTS idx_staff_store_location ON public.staff_store(location);
CREATE INDEX IF NOT EXISTS idx_staff_sales_location ON public.staff_sales(location);
