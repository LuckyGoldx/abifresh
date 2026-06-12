-- Add scope column to control which user types see which categories
ALTER TABLE public.expense_categories
ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'all';

-- Admin-specific categories
UPDATE public.expense_categories SET scope = 'admin' WHERE name IN (
  'Rent',
  'Vehicle License Renewal',
  'Local Government Levy',
  'Vehicle Maintenance'
);

-- Staff/Sales-specific categories
UPDATE public.expense_categories SET scope = 'staff' WHERE name IN (
  'Transport',
  'Supplies',
  'Food & Refreshments',
  'Maintenance',
  'Communication',
  'Fuel',
  'Other'
);

-- Shared categories
UPDATE public.expense_categories SET scope = 'all' WHERE name IN (
  'Utilities'
);

-- Admin-specific (including the existing ones for fresh setup)
UPDATE public.expense_categories SET scope = 'admin' WHERE name IN (
  'Rent',
  'Vehicle License Renewal',
  'Local Government Levy',
  'Vehicle Maintenance',
  'Others'
);
