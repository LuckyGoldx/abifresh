-- Add sold_outside_jalingo to staff_sales so the actual selling context
-- (inside vs. outside Jalingo) is recorded for each transaction.
-- price_jalingo and price_outside live on the items table;
-- staff_sales.unit_price already stores the actual sold price per unit
-- (either price_jalingo, or price_outside + logistics_fee per unit).
-- This column lets the dashboard and history table show the correct label.

ALTER TABLE public.staff_sales
ADD COLUMN IF NOT EXISTS sold_outside_jalingo BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.staff_sales.sold_outside_jalingo
  IS 'TRUE when the item was sold outside Jalingo. unit_price in this row = price_outside + logistics_fee_per_unit; FALSE means price_jalingo was used.';
