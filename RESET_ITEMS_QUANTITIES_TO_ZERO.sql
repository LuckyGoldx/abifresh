-- ============================================================================
-- AKV - RESET ITEMS TABLE QUANTITIES TO ZERO
-- ============================================================================
-- PURPOSE: Set active_store_quantity and main_store_quantity to 0 for ALL items
--
-- COLUMNS UPDATED:
--   ✅ active_store_quantity → 0
--   ✅ main_store_quantity → 0
--
-- COLUMNS NOT CHANGED:
--   ❌ All other columns remain unchanged
--
-- SAFETY:
--   - Only updates the two specified quantity columns
--   - Does NOT delete any rows
--   - Does NOT alter schema in any way
--   - Wrapped in a transaction — all or nothing
--   - Can be easily rolled back if needed
--
-- HOW TO RUN: Copy this entire script and paste into Supabase SQL Editor, then click "Run"
-- DATE: March 26, 2026
-- ============================================================================

BEGIN;

UPDATE public.items
SET 
  active_store_quantity = 0,
  main_store_quantity = 0;

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICATION: Confirm all quantities are now 0
-- ════════════════════════════════════════════════════════════════════════════
SELECT 
  id,
  active_store_quantity,
  main_store_quantity
FROM public.items
ORDER BY id;
