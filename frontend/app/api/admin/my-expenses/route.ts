import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('staff_expenses')
    .select('*')
    .eq('staff_id', authResult.id)
    .order('expense_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const expenses = (data || []).map((e: any) => ({
    id: e.id,
    amount: parseFloat(e.expense_amount) || 0,
    category: e.expense_category || 'Other',
    description: e.description || '',
    expense_date: e.expense_date,
    created_at: e.created_at,
    status: e.status,
  }));

  return NextResponse.json(expenses);
}
