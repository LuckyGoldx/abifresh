-- ============================================
-- ABIFRESH & KIDDIES VENTURES - COMPLETE DATABASE SETUP
-- ALTER existing tables to ensure all columns exist
-- Run all these SQL statements in Supabase SQL Editor
-- ============================================

-- 1. ALTER USERS TABLE - Add missing columns if they don't exist
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS store_location VARCHAR(100) DEFAULT 'Jalingo';
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'sales_staff';
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Drop existing check constraint if it exists (to allow any role value)
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new check constraint that allows both old and new role naming conventions
ALTER TABLE IF EXISTS users ADD CONSTRAINT users_role_check CHECK (
  role IN ('admin', 'sales', 'sales_staff', 'staff_commission', 'commission_staff', 'staff_non_commission', 'non_commission_staff')
);

-- 2. ALTER ITEMS TABLE - Add missing columns if they don't exist
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS sku VARCHAR(100) UNIQUE;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS active_store_quantity INT DEFAULT 0;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS main_store_quantity INT DEFAULT 0;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS commission DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3. ALTER SALES TABLE - Add missing columns if they don't exist
ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100) UNIQUE;
ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2);
ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash';
ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS sold_outside_jalingo BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 4. ALTER SALES_ITEMS TABLE - Add missing columns if they don't exist
ALTER TABLE IF EXISTS sales_items ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS sales_items ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES sales(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS sales_items ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES items(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS sales_items ADD COLUMN IF NOT EXISTS quantity INT;
ALTER TABLE IF EXISTS sales_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2);
ALTER TABLE IF EXISTS sales_items ADD COLUMN IF NOT EXISTS logistics_fee DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE IF EXISTS sales_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 5. ALTER POSTED_ITEMS TABLE - Add missing columns if they don't exist
ALTER TABLE IF EXISTS posted_items ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS posted_items ADD COLUMN IF NOT EXISTS poster_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS posted_items ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS posted_items ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES items(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS posted_items ADD COLUMN IF NOT EXISTS quantity INT;
ALTER TABLE IF EXISTS posted_items ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE IF EXISTS posted_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS posted_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 6. ALTER SETTINGS TABLE - Add missing columns if they don't exist
ALTER TABLE IF EXISTS settings ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS settings ADD COLUMN IF NOT EXISTS setting_key VARCHAR(100) UNIQUE;
ALTER TABLE IF EXISTS settings ADD COLUMN IF NOT EXISTS setting_value VARCHAR(255);
ALTER TABLE IF EXISTS settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 7. INSERT DEFAULT SETTINGS
INSERT INTO settings (setting_key, setting_value) VALUES
  ('logistics_price', '500'),
  ('company_name', 'ABIFRESH & KIDDIES VENTURES'),
  ('currency', '₦')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- 8. INSERT DEMO USERS
INSERT INTO users (email, username, password, full_name, phone_number, role, store_location, is_active) VALUES
  ('admin@abifresh.com', 'admin_user', '$2b$10$YourHashedPasswordHere', 'Admin User', '+2348012345670', 'admin', 'Jalingo', true),
  ('john@abifresh.com', 'john_sales', '$2b$10$YourHashedPasswordHere', 'John Doe', '+2348012345671', 'sales_staff', 'Jalingo', true),
  ('jane@abifresh.com', 'jane_commission', '$2b$10$YourHashedPasswordHere', 'Jane Smith', '+2348012345672', 'commission_staff', 'Jalingo', true),
  ('bob@abifresh.com', 'bob_noncomm', '$2b$10$YourHashedPasswordHere', 'Bob Johnson', '+2348012345673', 'non_commission_staff', 'Jalingo', true)
ON CONFLICT (email) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  phone_number = COALESCE(users.phone_number, EXCLUDED.phone_number),
  store_location = COALESCE(users.store_location, EXCLUDED.store_location),
  is_active = COALESCE(users.is_active, EXCLUDED.is_active);

-- 9. INSERT DEMO ITEMS
INSERT INTO items (name, sku, category, unit_price, active_store_quantity, main_store_quantity, commission) VALUES
  ('Milk (1L)', 'MILK-001', 'Dairy', 500.00, 50, 30, 50.00),
  ('Bread (Sliced)', 'BREAD-001', 'Bakery', 350.00, 100, 50, 25.00),
  ('Eggs (Crate)', 'EGGS-001', 'Dairy', 1500.00, 20, 10, 100.00),
  ('Rice (10kg)', 'RICE-001', 'Grains', 4500.00, 15, 8, 200.00),
  ('Cooking Oil (5L)', 'OIL-001', 'Cooking', 2500.00, 25, 15, 150.00),
  ('Sugar (5kg)', 'SUGAR-001', 'Sweetener', 1800.00, 30, 20, 100.00),
  ('Flour (10kg)', 'FLOUR-001', 'Grains', 3500.00, 18, 10, 150.00),
  ('Tomato Paste (400g)', 'TOMATO-001', 'Canned', 800.00, 60, 40, 50.00),
  ('Butter (200g)', 'BUTTER-001', 'Dairy', 1200.00, 25, 15, 80.00),
  ('Tea Leaves (500g)', 'TEA-001', 'Beverages', 2000.00, 20, 10, 120.00),
  ('Coffee (500g)', 'COFFEE-001', 'Beverages', 3500.00, 12, 6, 200.00),
  ('Honey (500ml)', 'HONEY-001', 'Condiments', 2500.00, 15, 8, 150.00),
  ('Soap (Bar)', 'SOAP-001', 'Hygiene', 250.00, 150, 100, 20.00),
  ('Shampoo (500ml)', 'SHAMPOO-001', 'Hygiene', 1500.00, 30, 20, 100.00),
  ('Toothpaste (100g)', 'TOOTHPASTE-001', 'Hygiene', 400.00, 100, 50, 30.00)
ON CONFLICT (sku) DO UPDATE SET 
  active_store_quantity = EXCLUDED.active_store_quantity,
  main_store_quantity = EXCLUDED.main_store_quantity;

-- 10. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_sales_staff_id ON sales(staff_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_items_sale_id ON sales_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_item_id ON sales_items(item_id);
CREATE INDEX IF NOT EXISTS idx_posted_items_staff_id ON posted_items(staff_id);
CREATE INDEX IF NOT EXISTS idx_posted_items_poster_id ON posted_items(poster_id);
CREATE INDEX IF NOT EXISTS idx_posted_items_status ON posted_items(status);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_available ON items(is_available);

-- 11. ENABLE ROW LEVEL SECURITY (RLS) FOR SECURITY
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE posted_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 12. CREATE RLS POLICIES (Allow all for now - adjust in production)
DROP POLICY IF EXISTS "users_all" ON users;
DROP POLICY IF EXISTS "items_all" ON items;
DROP POLICY IF EXISTS "sales_all" ON sales;
DROP POLICY IF EXISTS "sales_items_all" ON sales_items;
DROP POLICY IF EXISTS "posted_items_all" ON posted_items;
DROP POLICY IF EXISTS "settings_all" ON settings;

CREATE POLICY "users_all" ON users FOR ALL USING (true);
CREATE POLICY "items_all" ON items FOR ALL USING (true);
CREATE POLICY "sales_all" ON sales FOR ALL USING (true);
CREATE POLICY "sales_items_all" ON sales_items FOR ALL USING (true);
CREATE POLICY "posted_items_all" ON posted_items FOR ALL USING (true);
CREATE POLICY "settings_all" ON settings FOR ALL USING (true);

-- ============================================
-- OPTIONAL: Sample data for testing
-- ============================================

-- Add more items if needed
INSERT INTO items (name, sku, category, unit_price, active_store_quantity, main_store_quantity, commission) VALUES
  ('Noodles (Pack)', 'NOODLES-001', 'Instant Food', 200.00, 200, 100, 15.00),
  ('Maggi (Pack)', 'MAGGI-001', 'Instant Food', 150.00, 250, 150, 10.00),
  ('Biscuits (200g)', 'BISCUITS-001', 'Snacks', 600.00, 80, 40, 40.00),
  ('Chocolate (Bar)', 'CHOCOLATE-001', 'Snacks', 500.00, 120, 60, 35.00),
  ('Water (500ml x 24)', 'WATER-001', 'Beverages', 4000.00, 30, 15, 200.00)
ON CONFLICT (sku) DO NOTHING;

-- ============================================
-- Verification queries (run these to verify setup)
-- ============================================

-- Check all tables created
SELECT 
  table_name 
FROM 
  information_schema.tables 
WHERE 
  table_schema = 'public' 
AND 
  table_name IN ('users', 'items', 'sales', 'sales_items', 'posted_items', 'settings')
ORDER BY 
  table_name;

-- Check user count
SELECT COUNT(*) as user_count FROM users;

-- Check items count
SELECT COUNT(*) as items_count FROM items;

-- Check settings
SELECT * FROM settings;

-- ============================================
-- END OF COMPLETE DATABASE SETUP
-- ============================================
