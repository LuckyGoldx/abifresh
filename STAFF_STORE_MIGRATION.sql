-- ============================================================================
-- STAFF STORE MIGRATION
-- Creates tables for staff store functionality
-- ============================================================================

-- ============================================================================
-- 1. STAFF STORE TABLE - Tracks items assigned to each staff member
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff_store (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  quantity_sold INTEGER DEFAULT 0,
  quantity_available INTEGER GENERATED ALWAYS AS (quantity - COALESCE(quantity_sold, 0)) STORED,
  posted_from_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Who posted the items
  posted_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(staff_id, item_id) -- Each staff can only have one entry per item
);

CREATE INDEX idx_staff_store_staff ON public.staff_store(staff_id);
CREATE INDEX idx_staff_store_item ON public.staff_store(item_id);
CREATE INDEX idx_staff_store_quantity ON public.staff_store(quantity);
CREATE INDEX idx_staff_store_posted_date ON public.staff_store(posted_date);

-- ============================================================================
-- 2. POSTED ITEMS MAPPING TABLE - Map posted items to staff store entries
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.posted_items_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  posted_item_id UUID NOT NULL REFERENCES public.posted_items(id) ON DELETE CASCADE,
  staff_store_id UUID REFERENCES public.staff_store(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  staff_comment TEXT,
  accepted_date TIMESTAMP WITH TIME ZONE,
  rejected_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_posted_items_mapping_posted ON public.posted_items_mapping(posted_item_id);
CREATE INDEX idx_posted_items_mapping_staff_store ON public.posted_items_mapping(staff_store_id);
CREATE INDEX idx_posted_items_mapping_status ON public.posted_items_mapping(status);

-- ============================================================================
-- 3. STAFF SALES TABLE - Track sales made by staff from their store
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50),
  buyer_type VARCHAR(50) DEFAULT 'customer', -- customer, reseller, etc
  buyer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  receipt_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_staff_sales_staff ON public.staff_sales(staff_id);
CREATE INDEX idx_staff_sales_item ON public.staff_sales(item_id);
CREATE INDEX idx_staff_sales_date ON public.staff_sales(sale_date);
CREATE INDEX idx_staff_sales_receipt ON public.staff_sales(receipt_number);

-- ============================================================================
-- 4. ALTER POSTED_ITEMS TABLE - Add staff_id column if not exists
-- ============================================================================
ALTER TABLE IF EXISTS public.posted_items 
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.posted_items 
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2);

-- Create index for staff_id if not exists
CREATE INDEX IF NOT EXISTS idx_posted_items_staff ON public.posted_items(staff_id);

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Staff Store RLS
ALTER TABLE public.staff_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view their own store"
  ON public.staff_store
  FOR SELECT
  USING (
    auth.uid() = staff_id OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admin and posted staff can insert"
  ON public.staff_store
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'sales')
    )
  );

CREATE POLICY "Only admin and staff can update"
  ON public.staff_store
  FOR UPDATE
  USING (
    auth.uid() = staff_id OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'sales')
    )
  );

-- Posted Items Mapping RLS
ALTER TABLE public.posted_items_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view their posted items mapping"
  ON public.posted_items_mapping
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_store ss
      WHERE ss.id = staff_store_id AND ss.staff_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Staff Sales RLS
ALTER TABLE public.staff_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view their own sales"
  ON public.staff_sales
  FOR SELECT
  USING (
    auth.uid() = staff_id OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Staff can insert their own sales"
  ON public.staff_sales
  FOR INSERT
  WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "Staff can update their own sales"
  ON public.staff_sales
  FOR UPDATE
  USING (auth.uid() = staff_id);
