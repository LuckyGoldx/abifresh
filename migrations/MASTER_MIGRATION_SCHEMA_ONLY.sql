-- ============================================================================
-- AKV SCHEMA ONLY MIGRATION
-- Source: cifzlkspxjghpgxhrwkg (OLD)
-- Target: wkyakaunbejmuzqnvgno (NEW)
-- Generated: 2026-05-10T03:21:28.482Z
-- ============================================================================

-- ⚠️ Run this in the NEW project's Supabase SQL Editor
-- This file contains SCHEMA + STORAGE only (no data)
-- ============================================================================

-- ============================================================================
-- AKV COMPLETE SCHEMA - Matches actual old database structure
-- Run this FIRST in the new Supabase SQL Editor
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  username VARCHAR(255) UNIQUE,
  role VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  store_location VARCHAR(255),
  phone_number VARCHAR(20),
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE,
  last_notifications_read_at TIMESTAMP WITH TIME ZONE,
  auth_user_id UUID
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- ============================================================================
-- 2. ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(100),
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  active_store_quantity DECIMAL(10,1) DEFAULT 0,
  main_store_quantity DECIMAL(10,1) DEFAULT 0,
  commission DECIMAL(10, 2) DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  brand VARCHAR(255),
  package_type VARCHAR(255),
  price_jalingo DECIMAL(10, 2) DEFAULT 0,
  price_outside DECIMAL(10, 2) DEFAULT 0,
  image_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_items_sku ON public.items(sku);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_items_is_active ON public.items(is_available);

-- ============================================================================
-- 3. INVENTORY MAIN STORE
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

CREATE INDEX IF NOT EXISTS idx_inventory_main_item ON public.inventory_main_store(item_id);

-- ============================================================================
-- 4. INVENTORY ACTIVE STORE
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

CREATE INDEX IF NOT EXISTS idx_inventory_active_item ON public.inventory_active_store(item_id);

-- ============================================================================
-- 5. SALES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number VARCHAR(255),
  staff_id UUID NOT NULL REFERENCES public.users(id),
  total_amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50),
  sold_outside_jalingo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_staff ON public.sales(staff_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_receipt ON public.sales(receipt_number);

-- ============================================================================
-- 6. SALES ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sales_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  logistics_fee DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_items_sale_id ON public.sales_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_item_id ON public.sales_items(item_id);

-- ============================================================================
-- 7. DAILY SALES SUMMARY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_sales_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salesperson_id UUID NOT NULL REFERENCES public.users(id),
  sale_date DATE NOT NULL,
  total_items_sold DECIMAL(10,1) DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  number_of_transactions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(salesperson_id, sale_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_sales_salesperson ON public.daily_sales_summary(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON public.daily_sales_summary(sale_date);

-- ============================================================================
-- 8. POSTED ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.posted_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poster_id UUID NOT NULL REFERENCES public.users(id),
  staff_id UUID NOT NULL REFERENCES public.users(id),
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantity DECIMAL(10,1) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  staff_comment TEXT,
  unit_price DECIMAL(10, 2)
);

CREATE INDEX IF NOT EXISTS idx_posted_items_poster ON public.posted_items(poster_id);
CREATE INDEX IF NOT EXISTS idx_posted_items_staff ON public.posted_items(staff_id);
CREATE INDEX IF NOT EXISTS idx_posted_items_item ON public.posted_items(item_id);
CREATE INDEX IF NOT EXISTS idx_posted_items_status ON public.posted_items(status);

-- ============================================================================
-- 9. STAFF STORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff_store (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity DECIMAL(10,1) NOT NULL DEFAULT 0,
  quantity_sold DECIMAL(10,1) DEFAULT 0,
  posted_from_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  posted_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  quantity_available DECIMAL(10,1) GENERATED ALWAYS AS (quantity - COALESCE(quantity_sold, 0)) STORED,
  UNIQUE(staff_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_store_staff ON public.staff_store(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_store_item ON public.staff_store(item_id);
CREATE INDEX IF NOT EXISTS idx_staff_store_posted_date ON public.staff_store(posted_date);

-- ============================================================================
-- 10. POSTED ITEMS MAPPING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.posted_items_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  posted_item_id UUID NOT NULL REFERENCES public.posted_items(id) ON DELETE CASCADE,
  staff_store_id UUID REFERENCES public.staff_store(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending',
  staff_comment TEXT,
  accepted_date TIMESTAMP WITH TIME ZONE,
  rejected_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posted_items_mapping_posted ON public.posted_items_mapping(posted_item_id);
CREATE INDEX IF NOT EXISTS idx_posted_items_mapping_staff_store ON public.posted_items_mapping(staff_store_id);
CREATE INDEX IF NOT EXISTS idx_posted_items_mapping_status ON public.posted_items_mapping(status);

-- ============================================================================
-- 11. STAFF SALES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity DECIMAL(10,1) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50),
  buyer_type VARCHAR(50) DEFAULT 'customer',
  buyer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  receipt_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sold_outside_jalingo BOOLEAN DEFAULT false,
  commission DECIMAL(12, 2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_staff_sales_staff ON public.staff_sales(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_sales_item ON public.staff_sales(item_id);
CREATE INDEX IF NOT EXISTS idx_staff_sales_date ON public.staff_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_staff_sales_receipt ON public.staff_sales(receipt_number);

-- ============================================================================
-- 12. STAFF COMMISSIONS
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

CREATE INDEX IF NOT EXISTS idx_staff_commission_staff ON public.staff_commissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_commission_active ON public.staff_commissions(is_active);

-- ============================================================================
-- 13. STAFF PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES public.users(id),
  amount DECIMAL(12, 2) NOT NULL,
  payment_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  requested_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.users(id),
  paid_by UUID REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  items_paid_for JSONB,
  receipt_url TEXT,
  reference_number VARCHAR(100),
  approved_amount DECIMAL(12, 2),
  staff_name VARCHAR(255),
  staff_email VARCHAR(255),
  staff_phone VARCHAR(20),
  payment_method VARCHAR(50),
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_staff_payments_staff ON public.staff_payments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_payments_status ON public.staff_payments(status);
CREATE INDEX IF NOT EXISTS idx_staff_payments_date ON public.staff_payments(requested_date);

-- ============================================================================
-- 14. STAFF EXPENSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES public.users(id),
  expense_amount DECIMAL(10, 2) NOT NULL,
  expense_category VARCHAR(100) NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT,
  receipt_url TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  approved_date TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_expenses_staff ON public.staff_expenses(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_expenses_status ON public.staff_expenses(status);
CREATE INDEX IF NOT EXISTS idx_staff_expenses_date ON public.staff_expenses(expense_date);

-- ============================================================================
-- 15. RECEIPTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(255) NOT NULL UNIQUE,
  staff_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  sold_outside_jalingo BOOLEAN DEFAULT false,
  items_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_receipts_staff_id ON public.receipts(staff_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON public.receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_payment_method ON public.receipts(payment_method);

-- ============================================================================
-- 16. RECEIPT ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  quantity DECIMAL(10,1) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  item_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON public.receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_item_id ON public.receipt_items(item_id);

-- ============================================================================
-- 17. INVENTORY TRANSFERS
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
  status VARCHAR(50) DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_item ON public.inventory_transfers(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_date ON public.inventory_transfers(transfer_date);

-- ============================================================================
-- 18. DAMAGE/LOSS REPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.damage_loss_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantity_affected INTEGER NOT NULL,
  damage_type VARCHAR(50) NOT NULL,
  reported_by UUID NOT NULL REFERENCES public.users(id),
  report_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  description TEXT,
  status VARCHAR(50) DEFAULT 'reported',
  investigated_by UUID REFERENCES public.users(id),
  investigation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_damage_loss_item ON public.damage_loss_reports(item_id);
CREATE INDEX IF NOT EXISTS idx_damage_loss_reported_by ON public.damage_loss_reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_damage_loss_status ON public.damage_loss_reports(status);

-- ============================================================================
-- 19. NOTIFICATIONS
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notification_type VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);

-- ============================================================================
-- 20. ACTIVITY LOGS
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

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at);

-- ============================================================================
-- 21. SYSTEM SETTINGS
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

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(setting_key);

-- ============================================================================
-- 22. RESTOCK ORDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.restock_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_items INTEGER NOT NULL DEFAULT 0,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  total_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  show_item_name BOOLEAN NOT NULL DEFAULT true,
  show_sku BOOLEAN NOT NULL DEFAULT false,
  show_category BOOLEAN NOT NULL DEFAULT false,
  show_brand_name BOOLEAN NOT NULL DEFAULT true,
  show_package_type BOOLEAN NOT NULL DEFAULT true,
  show_current_stock BOOLEAN NOT NULL DEFAULT false,
  show_order_quantity BOOLEAN NOT NULL DEFAULT true,
  show_unit_price BOOLEAN NOT NULL DEFAULT true,
  show_subtotal BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restock_orders_created_by ON public.restock_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_restock_orders_status ON public.restock_orders(status);
CREATE INDEX IF NOT EXISTS idx_restock_orders_created_at ON public.restock_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_restock_orders_order_number ON public.restock_orders(order_number);

-- ============================================================================
-- 23. RESTOCK ORDER ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.restock_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.restock_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  sku TEXT DEFAULT '',
  category TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  package_type TEXT DEFAULT '',
  current_stock INTEGER NOT NULL DEFAULT 0,
  order_quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restock_order_items_order_id ON public.restock_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_restock_order_items_item_id ON public.restock_order_items(item_id);

-- ============================================================================
-- 24. RETURNED ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.returned_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  requester_staff_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_staff_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quantity DECIMAL(10,1) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returned_items_requester ON public.returned_items(requester_staff_id);
CREATE INDEX IF NOT EXISTS idx_returned_items_receiver ON public.returned_items(receiver_staff_id);
CREATE INDEX IF NOT EXISTS idx_returned_items_item ON public.returned_items(item_id);
CREATE INDEX IF NOT EXISTS idx_returned_items_status ON public.returned_items(status);
CREATE INDEX IF NOT EXISTS idx_returned_items_created_at ON public.returned_items(created_at);

-- ============================================================================
-- 25. BACKUP HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.backup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  triggered_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  triggered_by_name TEXT,
  tables_count INTEGER NOT NULL DEFAULT 0,
  total_rows BIGINT NOT NULL DEFAULT 0,
  format VARCHAR(20) NOT NULL,
  file_name TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  table_names JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(10) NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backup_history_triggered_at ON public.backup_history(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_history_triggered_by ON public.backup_history(triggered_by);
CREATE INDEX IF NOT EXISTS idx_backup_history_status ON public.backup_history(status);
CREATE INDEX IF NOT EXISTS idx_backup_history_format ON public.backup_history(format);

-- ============================================================================
-- 26. PWA DOWNLOADS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pwa_downloads (
  id BIGSERIAL PRIMARY KEY,
  platform VARCHAR(50) DEFAULT 'web',
  user_agent TEXT,
  ip_address INET,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pwa_downloads_downloaded_at ON public.pwa_downloads(downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pwa_downloads_platform ON public.pwa_downloads(platform);
CREATE INDEX IF NOT EXISTS idx_pwa_downloads_created_at ON public.pwa_downloads(created_at DESC);

-- ============================================================================
-- SCHEMA CREATION COMPLETE
-- ============================================================================
-- Now run the data dump SQL file after this
-- ============================================================================
-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- 1. Payments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payments', 'payments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Product images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Payments bucket policies
DROP POLICY IF EXISTS "Allow authenticated to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read on payments bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files" ON storage.objects;

CREATE POLICY "Allow authenticated to upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'payments' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to read" ON storage.objects
FOR SELECT USING (bucket_id = 'payments' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to update" ON storage.objects
FOR UPDATE USING (bucket_id = 'payments' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to delete" ON storage.objects
FOR DELETE USING (bucket_id = 'payments' AND auth.role() = 'authenticated');

-- Product-images bucket policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'product-images');

CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'product-images');

CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'product-images');

-- ============================================================================
-- SCHEMA + STORAGE MIGRATION COMPLETE
-- ============================================================================
