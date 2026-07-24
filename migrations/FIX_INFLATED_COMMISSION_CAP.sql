-- FIX_INFLATED_COMMISSION_CAP.sql
-- 0. Fill missing commission_rate from current items table
-- 1. Syncs commission (estimated) with commission_rate for consistent reporting
-- 2. Caps over-allocated approved_commission at quantity * commission_rate
--
-- SAFE for production: Steps 0-2, 4 are safe on any database.
-- Step 3 is ONLY safe when ALL items have been fully paid (paid qty = sold qty).
-- In production with unpaid items, SKIP Step 3.

-- Step 0: Fill missing commission_rate from current items table
-- Backfill script Step 1.5 missed some sales; this picks them up.
UPDATE staff_sales ss
SET commission_rate = i.commission
FROM items i
WHERE ss.item_id = i.id
  AND i.commission IS NOT NULL
  AND i.commission > 0
  AND (ss.commission_rate IS NULL OR ss.commission_rate = 0);

-- Step 1: Recalculate commission to match current commission_rate
UPDATE staff_sales
SET commission = ROUND((quantity * COALESCE(commission_rate, 0))::numeric, 2)
WHERE COALESCE(commission_rate, 0) > 0
  AND COALESCE(quantity, 0) > 0
  AND commission IS DISTINCT FROM ROUND((quantity * COALESCE(commission_rate, 0))::numeric, 2);

-- Step 2: Cap over-allocated approved_commission at quantity * commission_rate
UPDATE staff_sales
SET approved_commission = ROUND((quantity * COALESCE(commission_rate, 0))::numeric, 2)
WHERE approved_commission > quantity * COALESCE(commission_rate, 0)
  AND COALESCE(commission_rate, 0) > 0
  AND COALESCE(quantity, 0) > 0;

-- Step 3: Top up under-paid sales (approved < qty*rate) to full amount.
-- All items have been paid for (paid qty = sold qty), so every sale should
-- have approved_commission = quantity * commission_rate.
UPDATE staff_sales
SET approved_commission = ROUND((quantity * COALESCE(commission_rate, 0))::numeric, 2)
WHERE approved_commission < quantity * COALESCE(commission_rate, 0)
  AND COALESCE(commission_rate, 0) > 0
  AND COALESCE(quantity, 0) > 0;

-- Step 4: Zero out commission on sales with no rate.
-- Items where commission_rate is 0 or NULL earn no commission.
-- Also clears stale estimated values from old rates that no longer exist.
UPDATE staff_sales
SET commission = 0,
    approved_commission = 0
WHERE (commission_rate IS NULL OR commission_rate = 0)
  AND COALESCE(quantity, 0) > 0
  AND (COALESCE(commission, 0) > 0 OR COALESCE(approved_commission, 0) > 0);
