-- Create expense_categories table for persistent, cross-system expense types
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  is_built_in BOOLEAN DEFAULT false,
  scope VARCHAR(20) DEFAULT 'all',
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed built-in categories with scope
-- Admin-specific
INSERT INTO public.expense_categories (name, is_built_in, scope) VALUES
  ('Rent', true, 'admin'),
  ('Vehicle License Renewal', true, 'admin'),
  ('Local Government Levy', true, 'admin'),
  ('Vehicle Maintenance', true, 'admin'),
  ('Others', true, 'admin');

-- Staff/Sales-specific
INSERT INTO public.expense_categories (name, is_built_in, scope) VALUES
  ('Transport', true, 'staff'),
  ('Supplies', true, 'staff'),
  ('Food & Refreshments', true, 'staff'),
  ('Maintenance', true, 'staff'),
  ('Communication', true, 'staff'),
  ('Fuel', true, 'staff'),
  ('Other', true, 'staff');

-- Shared
INSERT INTO public.expense_categories (name, is_built_in, scope) VALUES
  ('Utilities', true, 'all')
ON CONFLICT (name) DO NOTHING;
