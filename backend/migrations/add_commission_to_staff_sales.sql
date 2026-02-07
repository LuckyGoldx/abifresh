-- Add commission column to staff_sales table to track commission earned per sale

ALTER TABLE public.staff_sales
ADD COLUMN IF NOT EXISTS commission DECIMAL(12, 2) DEFAULT 0;

-- Add index on staff_id and commission for faster queries
CREATE INDEX IF NOT EXISTS idx_staff_sales_commission ON public.staff_sales(staff_id, commission);

-- Add comment explaining the field
COMMENT ON COLUMN public.staff_sales.commission IS 'Commission earned by staff member from this sale (calculated from item commission * quantity)';
