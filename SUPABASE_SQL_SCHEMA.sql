-- ============================================================================
-- ABIFRESH & KIDDIES VENTURES - SUPABASE DATABASE SCHEMA
-- ============================================================================
-- This SQL script creates all necessary tables for the AKV system
-- Execute this in Supabase SQL Editor (Copy entire content and paste)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS TABLE (Core authentication and user management)
-- ============================================================================
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

-- Index for faster queries
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_is_active ON public.users(is_active);

-- ============================================================================
-- 2. ITEMS/PRODUCTS TABLE (Product catalog)
-- ============================================================================
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
  created_by UUID REFERENCES public.users(id)
);

CREATE INDEX idx_items_sku ON public.items(sku);
CREATE INDEX idx_items_category ON public.items(category);
CREATE INDEX idx_items_is_active ON public.items(is_active);

-- ============================================================================
-- 3. INVENTORY - MAIN STORE (Administrator controlled inventory)
-- ============================================================================
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

CREATE INDEX idx_inventory_main_item ON public.inventory_main_store(item_id);

-- ============================================================================
-- 4. INVENTORY - ACTIVE STORE (Sales/Staff accessible inventory)
-- ============================================================================
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

CREATE INDEX idx_inventory_active_item ON public.inventory_active_store(item_id);

-- ============================================================================
-- 5. SALES TRANSACTIONS (Sales records)
-- ============================================================================
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

CREATE INDEX idx_sales_item ON public.sales(item_id);
CREATE INDEX idx_sales_salesperson ON public.sales(salesperson_id);
CREATE INDEX idx_sales_date ON public.sales(transaction_date);

-- ============================================================================
-- 6. DAILY SALES SUMMARY (Aggregate sales data by date and salesperson)
-- ============================================================================
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

CREATE INDEX idx_daily_sales_salesperson ON public.daily_sales_summary(salesperson_id);
CREATE INDEX idx_daily_sales_date ON public.daily_sales_summary(sale_date);

-- ============================================================================
-- 7. POSTED ITEMS (Items posted by sales to staff)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.posted_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id),
  posted_by_id UUID NOT NULL REFERENCES public.users(id),
  posted_to_id UUID NOT NULL REFERENCES public.users(id),
  quantity INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  posted_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completion_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_posted_items_item ON public.posted_items(item_id);
CREATE INDEX idx_posted_items_posted_by ON public.posted_items(posted_by_id);
CREATE INDEX idx_posted_items_posted_to ON public.posted_items(posted_to_id);
CREATE INDEX idx_posted_items_status ON public.posted_items(status);

-- ============================================================================
-- 8. STAFF COMMISSIONS (Commission configuration and tracking)
-- ============================================================================
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

CREATE INDEX idx_staff_commission_staff ON public.staff_commissions(staff_id);
CREATE INDEX idx_staff_commission_active ON public.staff_commissions(is_active);

-- ============================================================================
-- 9. STAFF PAYMENTS (Payment requests and approval)
-- ============================================================================
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_staff_payments_staff ON public.staff_payments(staff_id);
CREATE INDEX idx_staff_payments_status ON public.staff_payments(status);
CREATE INDEX idx_staff_payments_date ON public.staff_payments(requested_date);

-- ============================================================================
-- 10. STAFF EXPENSES (Expense tracking for staff)
-- ============================================================================
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

CREATE INDEX idx_staff_expenses_staff ON public.staff_expenses(staff_id);
CREATE INDEX idx_staff_expenses_status ON public.staff_expenses(status);
CREATE INDEX idx_staff_expenses_date ON public.staff_expenses(expense_date);

-- ============================================================================
-- 11. INVENTORY TRANSFERS (Track inventory movements)
-- ============================================================================
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

CREATE INDEX idx_inventory_transfers_item ON public.inventory_transfers(item_id);
CREATE INDEX idx_inventory_transfers_date ON public.inventory_transfers(transfer_date);

-- ============================================================================
-- 12. DAMAGE/LOSS REPORTS (Track damaged or lost items)
-- ============================================================================
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

CREATE INDEX idx_damage_loss_item ON public.damage_loss_reports(item_id);
CREATE INDEX idx_damage_loss_reported_by ON public.damage_loss_reports(reported_by);
CREATE INDEX idx_damage_loss_status ON public.damage_loss_reports(status);

-- ============================================================================
-- 13. NOTIFICATIONS (System notifications for users)
-- ============================================================================
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

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(is_read);

-- ============================================================================
-- 14. ACTIVITY LOGS (Audit trail for admin)
-- ============================================================================
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

CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at);

-- ============================================================================
-- 15. SYSTEM SETTINGS (Admin configuration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  setting_type VARCHAR(50) DEFAULT 'string',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES public.users(id)
);

CREATE INDEX idx_system_settings_key ON public.system_settings(setting_key);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_main_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_active_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sales_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posted_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_loss_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICY: USERS TABLE
-- ============================================================================
-- Policy: Users can view their own profile
CREATE POLICY "users_view_own_profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Admin can view all users
CREATE POLICY "admin_view_all_users" ON public.users
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- Policy: Admin can update users
CREATE POLICY "admin_update_users" ON public.users
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- Policy: Admin can insert users
CREATE POLICY "admin_insert_users" ON public.users
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- ============================================================================
-- RLS POLICY: ITEMS TABLE
-- ============================================================================
-- Everyone can view items
CREATE POLICY "items_view_all" ON public.items
  FOR SELECT USING (true);

-- Only admin can insert/update/delete items
CREATE POLICY "admin_manage_items" ON public.items
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

CREATE POLICY "admin_update_items" ON public.items
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- ============================================================================
-- RLS POLICY: INVENTORY MAIN STORE (Admin only)
-- ============================================================================
CREATE POLICY "admin_view_main_inventory" ON public.inventory_main_store
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

CREATE POLICY "admin_manage_main_inventory" ON public.inventory_main_store
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- ============================================================================
-- RLS POLICY: INVENTORY ACTIVE STORE (Everyone can view)
-- ============================================================================
CREATE POLICY "all_view_active_inventory" ON public.inventory_active_store
  FOR SELECT USING (true);

-- Only admin can manage
CREATE POLICY "admin_manage_active_inventory" ON public.inventory_active_store
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

CREATE POLICY "admin_update_active_inventory" ON public.inventory_active_store
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- ============================================================================
-- RLS POLICY: SALES
-- ============================================================================
-- Users can view their own sales, admin can view all
CREATE POLICY "users_view_own_sales" ON public.sales
  FOR SELECT USING (
    auth.uid() = salesperson_id OR
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- Salespeople can insert their own sales
CREATE POLICY "sales_insert_own" ON public.sales
  FOR INSERT WITH CHECK (
    auth.uid() = salesperson_id
  );

-- ============================================================================
-- RLS POLICY: NOTIFICATIONS
-- ============================================================================
-- Users can only view their own notifications
CREATE POLICY "users_view_own_notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- System can insert notifications (via function/trigger)
CREATE POLICY "system_insert_notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Users can update their own notifications
CREATE POLICY "users_update_own_notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- Sample Data (Optional - uncomment to add demo data)
-- ============================================================================
-- INSERT INTO public.items (name, sku, description, category, unit_price)
-- VALUES 
--   ('Rice (25kg)', 'RICE-25', 'Quality long grain rice', 'Grains', 15000.00),
--   ('Sugar (50kg)', 'SUGAR-50', 'Refined sugar', 'Sweeteners', 25000.00),
--   ('Oil (5L)', 'OIL-5', 'Vegetable cooking oil', 'Oils', 8000.00),
--   ('Flour (25kg)', 'FLOUR-25', 'Wheat flour', 'Grains', 12000.00),
--   ('Beans (25kg)', 'BEANS-25', 'Black eyed beans', 'Legumes', 18000.00);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
