-- ============================================================================
-- STAFF STORE RECOVERY SCRIPT
-- ============================================================================
-- WHY THIS IS NEEDED:
--   A "replace mode" restore operation deleted all staff_store rows but then
--   failed to re-insert them (GENERATED ALWAYS column error, now fixed).
--   Evidence: posted_items has 19 accepted rows, posted_items_mapping has
--   20 rows all with staff_store_id = NULL (set by ON DELETE SET NULL).
--
-- WHAT THIS DOES:
--   1. Rebuilds staff_store entries from accepted posted_items
--   2. Re-links posted_items_mapping.staff_store_id to the new entries
--
-- RUN IN: Supabase SQL Editor
-- ============================================================================

-- ── Step 1: Rebuild staff_store from accepted posted_items ──────────────────
--    Groups by (staff_id, item_id) and accumulates quantities.
--    quantity_sold is reconstructed from staff_sales if available.
--    NOTE: quantity_available is GENERATED ALWAYS - never set it explicitly.
INSERT INTO public.staff_store (
  staff_id,
  item_id,
  quantity,
  quantity_sold,
  posted_from_id,
  posted_date,
  last_updated,
  created_at,
  updated_at
)
SELECT
  pi.staff_id,
  pi.item_id,
  SUM(pi.quantity)                                              AS quantity,
  -- quantity_sold: sum of actual sales, capped at total quantity assigned
  LEAST(
    COALESCE((
      SELECT SUM(ss_sales.quantity)
      FROM   public.staff_sales ss_sales
      WHERE  ss_sales.staff_id = pi.staff_id
        AND  ss_sales.item_id  = pi.item_id
    ), 0),
    SUM(pi.quantity)
  )                                                             AS quantity_sold,
  -- Use the poster_id from the earliest accepted item for this staff+item pair
  (
    SELECT pi2.poster_id
    FROM   public.posted_items pi2
    WHERE  pi2.staff_id = pi.staff_id
      AND  pi2.item_id  = pi.item_id
      AND  pi2.status   = 'accepted'
    ORDER  BY pi2.created_at ASC
    LIMIT  1
  )                                                             AS posted_from_id,
  MIN(pi.created_at)                                           AS posted_date,
  NOW()                                                         AS last_updated,
  NOW()                                                         AS created_at,
  NOW()                                                         AS updated_at
FROM public.posted_items pi
WHERE pi.status = 'accepted'
GROUP BY pi.staff_id, pi.item_id
ON CONFLICT (staff_id, item_id)
  DO UPDATE SET
    quantity        = EXCLUDED.quantity,
    quantity_sold   = EXCLUDED.quantity_sold,
    last_updated    = NOW();

-- ── Step 2: Re-link posted_items_mapping → staff_store ─────────────────────
--    After the DELETE, all mapping rows were set to NULL (ON DELETE SET NULL).
--    Now we can link them back to the newly created staff_store rows.
UPDATE public.posted_items_mapping pim
SET    staff_store_id = ss.id
FROM   public.posted_items pi
JOIN   public.staff_store  ss
  ON   ss.staff_id = pi.staff_id
  AND  ss.item_id  = pi.item_id
WHERE  pim.posted_item_id   = pi.id
  AND  pim.staff_store_id   IS NULL;

-- ── Step 3: Verify the recovery ────────────────────────────────────────────
SELECT
  'staff_store entries rebuilt'       AS check,
  COUNT(*)                            AS total_entries,
  SUM(quantity)                       AS total_quantity_assigned,
  SUM(quantity_sold)                  AS total_quantity_sold,
  SUM(quantity_available)             AS total_quantity_available
FROM public.staff_store;

SELECT
  'posted_items_mapping re-linked'    AS check,
  COUNT(*) FILTER (WHERE staff_store_id IS NOT NULL)  AS linked,
  COUNT(*) FILTER (WHERE staff_store_id IS NULL)      AS still_null
FROM public.posted_items_mapping;
