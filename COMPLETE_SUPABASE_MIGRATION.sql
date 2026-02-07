-- ============================================================================
-- COMPLETE AKV SUPABASE MIGRATION - ALL IN ONE FILE
-- ============================================================================
-- This comprehensive SQL script creates the entire database schema
-- Run this ONCE in Supabase SQL Editor - includes all migrations and setups
-- Date: February 7, 2026
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENABLE EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 2: CREATE BASE TABLES
-- ============================================================================

-- 1. USERS TABLE (Core authentication and user management)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'sales', 'staff_commission', 'staff_non_commission')),
  is_active BOOLEAN DEFAULT true,
  store_location VARCHAR(255),
  phone_number VARCHAR(20),
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- 2. ITEMS/PRODUCTS TABLE (Product catalog)
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(100),
  unit_price DECIMAL(10, 2) NOT NULL,
  unit_of_measurement VARCHAR(50) DEFAULT 'piece',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  commission DECIMAL(10, 2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_items_sku ON public.items(sku);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_items_is_active ON public.items(is_active);

-- 3. INVENTORY - MAIN STORE (Administrator controlled inventory)
CREATE TABLE IF NOT EXISTS public.inventory_main_store (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantity_in_stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  max_stock INTEGER,
  last_restocked TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(item_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_main_item ON public.inventory_main_store(item_id);

-- 4. INVENTORY - ACTIVE STORE (Sales/Staff accessible inventory)
CREATE TABLE IF NOT EXISTS public.inventory_active_store (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantity_available INTEGER NOT NULL DEFAULT 0,
  quantity_sold INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(item_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_active_item ON public.inventory_active_store(item_id);

-- ============================================================================
-- SECTION 3: CORE TRANSACTION / OPERATIONS TABLES
-- ============================================================================

-- 5. SALES TRANSACTIONS (Sales records)
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id),
  salesperson_id UUID NOT NULL REFERENCES public.users(id),
  quantity_sold INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_item ON public.sales(item_id);
CREATE INDEX IF NOT EXISTS idx_sales_salesperson ON public.sales(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(transaction_date);

-- 6. DAILY SALES SUMMARY (Aggregate sales data by date and salesperson)
CREATE TABLE IF NOT EXISTS public.daily_sales_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salesperson_id UUID NOT NULL REFERENCES public.users(id),
  sale_date DATE NOT NULL,
  total_items_sold INTEGER DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  number_of_transactions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(salesperson_id, sale_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_sales_salesperson ON public.daily_sales_summary(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON public.daily_sales_summary(sale_date);

-- 7. POSTED ITEMS (Items posted by sales to staff)
CREATE TABLE IF NOT EXISTS public.posted_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id),
  posted_by_id UUID NOT NULL REFERENCES public.users(id),
  posted_to_id UUID NOT NULL REFERENCES public.users(id),
  staff_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  posted_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completion_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posted_items_item ON public.posted_items(item_id);
CREATE INDEX IF NOT EXISTS idx_posted_items_posted_by ON public.posted_items(posted_by_id);
CREATE INDEX IF NOT EXISTS idx_posted_items_posted_to ON public.posted_items(posted_to_id);
CREATE INDEX IF NOT EXISTS idx_posted_items_status ON public.posted_items(status);
CREATE INDEX IF NOT EXISTS idx_posted_items_staff ON public.posted_items(staff_id);

-- ============================================================================
-- SECTION 4: STAFF & COMMISSION TABLES
-- ============================================================================

-- 8. STAFF STORE TABLE - Tracks items assigned to each staff member
CREATE TABLE IF NOT EXISTS public.staff_store (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  quantity_sold INTEGER DEFAULT 0,
  quantity_available INTEGER GENERATED ALWAYS AS (quantity - COALESCE(quantity_sold, 0)) STORED,
  posted_from_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  posted_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(staff_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_store_staff ON public.staff_store(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_store_item ON public.staff_store(item_id);
CREATE INDEX IF NOT EXISTS idx_staff_store_quantity ON public.staff_store(quantity);
CREATE INDEX IF NOT EXISTS idx_staff_store_posted_date ON public.staff_store(posted_date);

-- 9. POSTED ITEMS MAPPING TABLE - Map posted items to staff store entries
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

CREATE INDEX IF NOT EXISTS idx_posted_items_mapping_posted ON public.posted_items_mapping(posted_item_id);
CREATE INDEX IF NOT EXISTS idx_posted_items_mapping_staff_store ON public.posted_items_mapping(staff_store_id);
CREATE INDEX IF NOT EXISTS idx_posted_items_mapping_status ON public.posted_items_mapping(status);

-- 10. STAFF SALES TABLE - Track sales made by staff from their store
CREATE TABLE IF NOT EXISTS public.staff_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  commission DECIMAL(12, 2) DEFAULT 0,
  payment_method VARCHAR(50),
  buyer_type VARCHAR(50) DEFAULT 'customer',
  buyer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  receipt_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_sales_staff ON public.staff_sales(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_sales_item ON public.staff_sales(item_id);
CREATE INDEX IF NOT EXISTS idx_staff_sales_date ON public.staff_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_staff_sales_receipt ON public.staff_sales(receipt_number);
CREATE INDEX IF NOT EXISTS idx_staff_sales_commission ON public.staff_sales(staff_id, commission);

-- 11. STAFF COMMISSIONS (Commission configuration and tracking)
CREATE TABLE IF NOT EXISTS public.staff_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES public.users(id),
  commission_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  effective_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_staff_commission_staff ON public.staff_commissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_commission_active ON public.staff_commissions(is_active);

-- 12. STAFF PAYMENTS (Payment requests and approval)
CREATE TABLE IF NOT EXISTS public.staff_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES public.users(id),
  amount DECIMAL(12, 2) NOT NULL,
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('commission', 'salary', 'bonus', 'advance', 'other')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  requested_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.users(id),
  paid_by UUID REFERENCES public.users(id),
  notes TEXT,
  items_paid_for JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_payments_staff ON public.staff_payments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_payments_status ON public.staff_payments(status);
CREATE INDEX IF NOT EXISTS idx_staff_payments_date ON public.staff_payments(requested_date);

-- ============================================================================
-- SECTION 5: EXPENSE & RECEIPT TABLES
-- ============================================================================

-- 13. STAFF EXPENSES (Expense tracking for staff)
CREATE TABLE IF NOT EXISTS public.staff_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES public.users(id),
  expense_amount DECIMAL(10, 2) NOT NULL,
  expense_category VARCHAR(100) NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT,
  receipt_url TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_date TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_expenses_staff ON public.staff_expenses(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_expenses_status ON public.staff_expenses(status);
CREATE INDEX IF NOT EXISTS idx_staff_expenses_date ON public.staff_expenses(expense_date);

-- 14. RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(255) NOT NULL UNIQUE,
  staff_id UUID NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'pos', 'transfer')),
  sold_outside_jalingo BOOLEAN DEFAULT FALSE,
  items_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_receipts_staff_id ON public.receipts(staff_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON public.receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_payment_method ON public.receipts(payment_method);

-- 15. RECEIPT ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL,
  item_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receipt_id) REFERENCES public.receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON public.receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_item_id ON public.receipt_items(item_id);

-- ============================================================================
-- SECTION 6: INVENTORY & OPERATIONAL TABLES
-- ============================================================================

-- 16. INVENTORY TRANSFERS (Track inventory movements)
CREATE TABLE IF NOT EXISTS public.inventory_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_location VARCHAR(255) NOT NULL,
  to_location VARCHAR(255) NOT NULL,
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantity INTEGER NOT NULL,
  reason VARCHAR(255),
  transfer_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  transferred_by UUID NOT NULL REFERENCES public.users(id),
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'in_transit', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_item ON public.inventory_transfers(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_date ON public.inventory_transfers(transfer_date);

-- 17. DAMAGE/LOSS REPORTS (Track damaged or lost items)
CREATE TABLE IF NOT EXISTS public.damage_loss_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantity_affected INTEGER NOT NULL,
  damage_type VARCHAR(50) NOT NULL CHECK (damage_type IN ('damaged', 'lost', 'expired', 'other')),
  reported_by UUID NOT NULL REFERENCES public.users(id),
  report_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  description TEXT,
  status VARCHAR(50) DEFAULT 'reported' CHECK (status IN ('reported', 'investigated', 'approved', 'rejected')),
  investigated_by UUID REFERENCES public.users(id),
  investigation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_damage_loss_item ON public.damage_loss_reports(item_id);
CREATE INDEX IF NOT EXISTS idx_damage_loss_reported_by ON public.damage_loss_reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_damage_loss_status ON public.damage_loss_reports(status);

-- ============================================================================
-- SECTION 7: SYSTEM TABLES
-- ============================================================================

-- 18. NOTIFICATIONS (System notifications for users)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  action_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);

-- 19. ACTIVITY LOGS (Audit trail for admin)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at);

-- 20. SYSTEM SETTINGS (Admin configuration)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  setting_type VARCHAR(50) DEFAULT 'string',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(setting_key);

-- ============================================================================
-- SECTION 8: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_main_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_active_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.daily_sales_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.posted_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.posted_items_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.damage_loss_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 9: CREATE RLS POLICIES - USERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "users_view_own_profile" ON public.users;
CREATE POLICY "users_view_own_profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "admin_view_all_users" ON public.users;
CREATE POLICY "admin_view_all_users" ON public.users
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin_update_users" ON public.users;
CREATE POLICY "admin_update_users" ON public.users
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin_insert_users" ON public.users;
CREATE POLICY "admin_insert_users" ON public.users
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- ============================================================================
-- SECTION 10: CREATE RLS POLICIES - ITEMS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "items_view_all" ON public.items;
CREATE POLICY "items_view_all" ON public.items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_manage_items" ON public.items;
CREATE POLICY "admin_manage_items" ON public.items
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin_update_items" ON public.items;
CREATE POLICY "admin_update_items" ON public.items
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- ============================================================================
-- SECTION 11: CREATE RLS POLICIES - INVENTORY TABLES
-- ============================================================================

DROP POLICY IF EXISTS "admin_view_main_inventory" ON public.inventory_main_store;
CREATE POLICY "admin_view_main_inventory" ON public.inventory_main_store
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin_manage_main_inventory" ON public.inventory_main_store;
CREATE POLICY "admin_manage_main_inventory" ON public.inventory_main_store
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

DROP POLICY IF EXISTS "all_view_active_inventory" ON public.inventory_active_store;
CREATE POLICY "all_view_active_inventory" ON public.inventory_active_store
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_manage_active_inventory" ON public.inventory_active_store;
CREATE POLICY "admin_manage_active_inventory" ON public.inventory_active_store
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin_update_active_inventory" ON public.inventory_active_store;
CREATE POLICY "admin_update_active_inventory" ON public.inventory_active_store
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- ============================================================================
-- SECTION 12: CREATE RLS POLICIES - SALES & POSTED ITEMS
-- ============================================================================

DROP POLICY IF EXISTS "users_view_own_sales" ON public.sales;
CREATE POLICY "users_view_own_sales" ON public.sales
  FOR SELECT USING (
    auth.uid() = salesperson_id OR
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

DROP POLICY IF EXISTS "sales_insert_own" ON public.sales;
CREATE POLICY "sales_insert_own" ON public.sales
  FOR INSERT WITH CHECK (
    auth.uid() = salesperson_id
  );

-- ============================================================================
-- SECTION 13: CREATE RLS POLICIES - STAFF STORE TABLES
-- ============================================================================

DROP POLICY IF EXISTS "Staff can view their own store" ON public.staff_store;
CREATE POLICY "Staff can view their own store" ON public.staff_store
  FOR SELECT USING (
    auth.uid() = staff_id OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admin and posted staff can insert" ON public.staff_store;
CREATE POLICY "Only admin and posted staff can insert" ON public.staff_store
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'sales')
    )
  );

DROP POLICY IF EXISTS "Only admin and staff can update" ON public.staff_store;
CREATE POLICY "Only admin and staff can update" ON public.staff_store
  FOR UPDATE USING (
    auth.uid() = staff_id OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'sales')
    )
  );

-- ============================================================================
-- SECTION 14: CREATE RLS POLICIES - STAFF SALES
-- ============================================================================

DROP POLICY IF EXISTS "Staff can view their own sales" ON public.staff_sales;
CREATE POLICY "Staff can view their own sales" ON public.staff_sales
  FOR SELECT USING (
    auth.uid() = staff_id OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Staff can insert their own sales" ON public.staff_sales;
CREATE POLICY "Staff can insert their own sales" ON public.staff_sales
  FOR INSERT WITH CHECK (auth.uid() = staff_id);

DROP POLICY IF EXISTS "Staff can update their own sales" ON public.staff_sales;
CREATE POLICY "Staff can update their own sales" ON public.staff_sales
  FOR UPDATE USING (auth.uid() = staff_id);

-- ============================================================================
-- SECTION 15: CREATE RLS POLICIES - NOTIFICATIONS
-- ============================================================================

DROP POLICY IF EXISTS "users_view_own_notifications" ON public.notifications;
CREATE POLICY "users_view_own_notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "system_insert_notifications" ON public.notifications;
CREATE POLICY "system_insert_notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
CREATE POLICY "users_update_own_notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- SECTION 16: CREATE RLS POLICIES - RECEIPTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view receipts created by them" ON public.receipts;
CREATE POLICY "Users can view receipts created by them" ON public.receipts
  FOR SELECT USING (
    auth.uid()::text = staff_id::text OR
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::uuid AND role = 'admin')
  );

DROP POLICY IF EXISTS "Sales staff can insert receipts they create" ON public.receipts;
CREATE POLICY "Sales staff can insert receipts they create" ON public.receipts
  FOR INSERT WITH CHECK (
    auth.uid()::text = staff_id::text OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::uuid AND role LIKE '%admin%')
  );

DROP POLICY IF EXISTS "Users can update own receipts" ON public.receipts;
CREATE POLICY "Users can update own receipts" ON public.receipts
  FOR UPDATE USING (
    auth.uid()::text = staff_id::text OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::uuid AND role LIKE '%admin%')
  );

DROP POLICY IF EXISTS "Users can view receipt items" ON public.receipt_items;
CREATE POLICY "Users can view receipt items" ON public.receipt_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.receipts 
      WHERE id = receipt_items.receipt_id AND 
      (staff_id::text = auth.uid()::text OR auth.role() = 'authenticated')
    )
  );

DROP POLICY IF EXISTS "Users can insert receipt items for their receipts" ON public.receipt_items;
CREATE POLICY "Users can insert receipt items for their receipts" ON public.receipt_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.receipts 
      WHERE id = receipt_items.receipt_id AND 
      (staff_id::text = auth.uid()::text OR EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid()::uuid AND role LIKE '%admin%'
      ))
    )
  );

-- ============================================================================
-- SECTION 17: CREATE RPC FUNCTIONS FOR EXPENSES
-- ============================================================================

DROP FUNCTION IF EXISTS get_staff_expenses(UUID);
CREATE FUNCTION get_staff_expenses(p_staff_id UUID)
RETURNS TABLE (
  id UUID,
  staff_id UUID,
  expense_amount DECIMAL,
  expense_category VARCHAR,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
  SELECT id, staff_id, expense_amount, expense_category, description, created_at, updated_at
  FROM public.staff_expenses
  WHERE staff_id = p_staff_id
  ORDER BY created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER;

DROP FUNCTION IF EXISTS get_all_expenses(UUID);
CREATE FUNCTION get_all_expenses(p_staff_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  staff_id UUID,
  expense_amount DECIMAL,
  expense_category VARCHAR,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
  SELECT id, staff_id, expense_amount, expense_category, description, created_at, updated_at
  FROM public.staff_expenses
  WHERE (p_staff_id IS NULL OR staff_id = p_staff_id)
  ORDER BY created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER;

DROP FUNCTION IF EXISTS create_expense(UUID, DECIMAL, VARCHAR, TEXT);
CREATE FUNCTION create_expense(
  p_staff_id UUID,
  p_expense_amount DECIMAL,
  p_expense_category VARCHAR,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  staff_id UUID,
  expense_amount DECIMAL,
  expense_category VARCHAR,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
  INSERT INTO public.staff_expenses (staff_id, expense_amount, expense_category, description)
  VALUES (p_staff_id, p_expense_amount, p_expense_category, p_description)
  RETURNING id, staff_id, expense_amount, expense_category, description, created_at, updated_at;
$$ LANGUAGE sql SECURITY DEFINER;

DROP FUNCTION IF EXISTS get_staff_expenses_total(UUID);
CREATE FUNCTION get_staff_expenses_total(p_staff_id UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(expense_amount), 0)
  FROM public.staff_expenses
  WHERE staff_id = p_staff_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- SECTION 18: ADD COMMISSION COLUMN COMMENT
-- ============================================================================

COMMENT ON COLUMN public.staff_sales.commission IS 'Commission earned by staff member from this sale (calculated from item commission * quantity)';
COMMENT ON COLUMN public.items.commission IS 'Commission value per unit (used to calculate staff commission on sales)';

-- ============================================================================
-- FINAL: VERIFICATION QUERIES (Run these to verify setup)
-- ============================================================================

-- Verify all tables exist
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Verify commission columns exist
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name IN ('items', 'staff_sales') AND column_name = 'commission';

-- ============================================================================
-- COMPLETE MIGRATION FINISHED
-- ============================================================================
-- All tables, indexes, RLS policies, and functions have been created.
-- The system is now ready for deployment.
-- ============================================================================
