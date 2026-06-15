-- Create returned_items table for the Return Items feature
CREATE TABLE IF NOT EXISTS returned_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  requester_staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  reject_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_returned_items_requester_staff_id ON returned_items(requester_staff_id);
CREATE INDEX IF NOT EXISTS idx_returned_items_receiver_staff_id ON returned_items(receiver_staff_id);
CREATE INDEX IF NOT EXISTS idx_returned_items_item_id ON returned_items(item_id);
CREATE INDEX IF NOT EXISTS idx_returned_items_status ON returned_items(status);
CREATE INDEX IF NOT EXISTS idx_returned_items_created_at ON returned_items(created_at);

-- Enable RLS if needed
ALTER TABLE returned_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for security
-- Allow staff to see their own return requests
DROP POLICY IF EXISTS "staff_can_see_own_returns" ON returned_items;
CREATE POLICY "staff_can_see_own_returns" ON returned_items
  FOR SELECT
  USING (auth.uid() = requester_staff_id);

-- Allow sales staff to see returns sent to them
DROP POLICY IF EXISTS "sales_can_see_assigned_returns" ON returned_items;
CREATE POLICY "sales_can_see_assigned_returns" ON returned_items
  FOR SELECT
  USING (auth.uid() = receiver_staff_id);

-- Allow staff to create returns
DROP POLICY IF EXISTS "staff_can_create_returns" ON returned_items;
CREATE POLICY "staff_can_create_returns" ON returned_items
  FOR INSERT
  WITH CHECK (auth.uid() = requester_staff_id);

-- Allow sales staff to update returns (accept/reject)
DROP POLICY IF EXISTS "sales_can_update_returns" ON returned_items;
CREATE POLICY "sales_can_update_returns" ON returned_items
  FOR UPDATE
  USING (auth.uid() = receiver_staff_id)
  WITH CHECK (auth.uid() = receiver_staff_id);
