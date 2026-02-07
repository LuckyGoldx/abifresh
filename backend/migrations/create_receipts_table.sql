-- Create receipts table to store all receipt transactions
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(255) NOT NULL UNIQUE,
  staff_id UUID NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'pos', 'transfer')),
  sold_outside_jalingo BOOLEAN DEFAULT FALSE,
  items_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create receipt_items table to store individual items in each receipt
CREATE TABLE IF NOT EXISTS receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL,
  item_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_receipts_staff_id ON receipts(staff_id);
CREATE INDEX idx_receipts_created_at ON receipts(created_at DESC);
CREATE INDEX idx_receipts_payment_method ON receipts(payment_method);
CREATE INDEX idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX idx_receipt_items_item_id ON receipt_items(item_id);

-- Enable RLS (Row Level Security)
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for receipts
CREATE POLICY "Users can view receipts created by them" ON receipts
  FOR SELECT USING (
    auth.uid()::text = staff_id::text OR
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin')
  );

CREATE POLICY "Sales staff can insert receipts they create" ON receipts
  FOR INSERT WITH CHECK (
    auth.uid()::text = staff_id::text OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role LIKE '%admin%')
  );

CREATE POLICY "Users can update own receipts" ON receipts
  FOR UPDATE USING (
    auth.uid()::text = staff_id::text OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role LIKE '%admin%')
  );

-- Create RLS policies for receipt_items
CREATE POLICY "Users can view receipt items" ON receipt_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM receipts 
      WHERE id = receipt_items.receipt_id AND 
      (staff_id::text = auth.uid()::text OR auth.role() = 'authenticated')
    )
  );

CREATE POLICY "Users can insert receipt items for their receipts" ON receipt_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM receipts 
      WHERE id = receipt_items.receipt_id AND 
      (staff_id::text = auth.uid()::text OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role LIKE '%admin%'
      ))
    )
  );
