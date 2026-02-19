-- Create restock_orders table to store order history
CREATE TABLE IF NOT EXISTS restock_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_items INTEGER NOT NULL DEFAULT 0,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  total_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  show_current_stock BOOLEAN NOT NULL DEFAULT true,
  show_unit_price BOOLEAN NOT NULL DEFAULT true,
  show_subtotal BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create restock_order_items table to store individual items per order
CREATE TABLE IF NOT EXISTS restock_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES restock_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  sku TEXT DEFAULT '',
  category TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  package_type TEXT DEFAULT '',
  current_stock INTEGER NOT NULL DEFAULT 0,
  order_quantity INTEGER NOT NULL CHECK (order_quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_restock_orders_created_by ON restock_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_restock_orders_status ON restock_orders(status);
CREATE INDEX IF NOT EXISTS idx_restock_orders_created_at ON restock_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_restock_orders_order_number ON restock_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_restock_order_items_order_id ON restock_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_restock_order_items_item_id ON restock_order_items(item_id);

-- Enable RLS
ALTER TABLE restock_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for restock_orders
-- Admin can see all orders
DROP POLICY IF EXISTS "admin_can_see_all_orders" ON restock_orders;
CREATE POLICY "admin_can_see_all_orders" ON restock_orders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_can_create_orders" ON restock_orders;
CREATE POLICY "admin_can_create_orders" ON restock_orders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "admin_can_update_orders" ON restock_orders;
CREATE POLICY "admin_can_update_orders" ON restock_orders
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_can_delete_orders" ON restock_orders;
CREATE POLICY "admin_can_delete_orders" ON restock_orders
  FOR DELETE USING (true);

-- RLS Policies for restock_order_items
DROP POLICY IF EXISTS "admin_can_see_all_order_items" ON restock_order_items;
CREATE POLICY "admin_can_see_all_order_items" ON restock_order_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_can_create_order_items" ON restock_order_items;
CREATE POLICY "admin_can_create_order_items" ON restock_order_items
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "admin_can_delete_order_items" ON restock_order_items;
CREATE POLICY "admin_can_delete_order_items" ON restock_order_items
  FOR DELETE USING (true);
