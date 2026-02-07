-- ============================================================================
-- RPC FUNCTIONS FOR EXPENSES (Bypasses PostgREST schema cache)
-- ============================================================================

-- Function: Get expenses for a specific staff member
CREATE OR REPLACE FUNCTION get_staff_expenses(p_staff_id UUID)
RETURNS TABLE (
  id UUID,
  staff_id UUID,
  expense_type VARCHAR,
  amount DECIMAL,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
  SELECT id, staff_id, expense_type, amount, description, created_at, updated_at
  FROM public.expenses
  WHERE staff_id = p_staff_id
  ORDER BY created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function: Get all expenses (for admin)
CREATE OR REPLACE FUNCTION get_all_expenses(p_staff_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  staff_id UUID,
  expense_type VARCHAR,
  amount DECIMAL,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
  SELECT id, staff_id, expense_type, amount, description, created_at, updated_at
  FROM public.expenses
  WHERE (p_staff_id IS NULL OR staff_id = p_staff_id)
  ORDER BY created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function: Create a new expense
CREATE OR REPLACE FUNCTION create_expense(
  p_staff_id UUID,
  p_expense_type VARCHAR,
  p_amount DECIMAL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  staff_id UUID,
  expense_type VARCHAR,
  amount DECIMAL,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
  INSERT INTO public.expenses (staff_id, expense_type, amount, description)
  VALUES (p_staff_id, p_expense_type, p_amount, p_description)
  RETURNING id, staff_id, expense_type, amount, description, created_at, updated_at;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function: Get total expenses amount for a staff member (used in dashboard)
CREATE OR REPLACE FUNCTION get_staff_expenses_total(p_staff_id UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.expenses
  WHERE staff_id = p_staff_id;
$$ LANGUAGE sql SECURITY DEFINER;
