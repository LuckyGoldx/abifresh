import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { amount, category, description, expense_date } = await req.json();

    if (!amount || !category) {
      return NextResponse.json({ error: 'amount and category are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('staff_expenses')
      .insert({
        staff_id: authResult.id,
        expense_category: category,
        expense_amount: parseFloat(amount.toString()),
        description: description || null,
        expense_date: expense_date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json(
      { expense: data, message: 'Expense recorded successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
