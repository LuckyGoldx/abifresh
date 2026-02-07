-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;

-- Create new RLS policies that work with anon and service roles
CREATE POLICY "Users can view their own expenses" ON public.expenses
  FOR SELECT
  USING (
    auth.uid()::text = staff_id::text 
    OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );

CREATE POLICY "Users can insert their own expenses" ON public.expenses
  FOR INSERT
  WITH CHECK (auth.uid()::text = staff_id::text);

CREATE POLICY "Users can update their own expenses" ON public.expenses
  FOR UPDATE
  USING (auth.uid()::text = staff_id::text);

CREATE POLICY "Users can delete their own expenses" ON public.expenses
  FOR DELETE
  USING (auth.uid()::text = staff_id::text);

-- Allow service role (used by backend) to query expenses
CREATE POLICY "Service role can access all expenses" ON public.expenses
  FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can insert expenses" ON public.expenses
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can update expenses" ON public.expenses
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can delete expenses" ON public.expenses
  FOR DELETE
  USING (auth.jwt()->>'role' = 'service_role');
